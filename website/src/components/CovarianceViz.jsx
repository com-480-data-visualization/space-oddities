import { useMemo } from 'react'
import './CovarianceViz.css'

const ALONG_TRACK_KM_PER_DAY = 1.8
const CROSS_TRACK_KM_PER_DAY = 0.28

const W = 480
const H = 280
const margin = { top: 40, right: 24, bottom: 60, left: 30 }

function tleEpochToDate(satrec) {
  if (!satrec) return null
  const yr   = satrec.epochyr < 57 ? 2000 + satrec.epochyr : 1900 + satrec.epochyr
  const jan1 = new Date(Date.UTC(yr, 0, 1))
  return new Date(jan1.getTime() + (satrec.epochdays - 1) * 86400 * 1000)
}

function getEllipseAxes(satrec, tcaDate) {
  const epoch = tleEpochToDate(satrec)
  if (!epoch) return { along: 20, cross: 3, ageDays: 0 }
  const ageDays = Math.max(0, Math.min((tcaDate - epoch) / (1000 * 86400), 60))
  return {
    along:   Math.max(0.5, ageDays * ALONG_TRACK_KM_PER_DAY),
    cross:   Math.max(0.1, ageDays * CROSS_TRACK_KM_PER_DAY),
    ageDays,
  }
}

function useEllipseLayout(cdm, satMap) {
  return useMemo(() => {
    if (!cdm || !satMap) return null

    const sat1 = satMap.get(cdm.norad_id_1)
    const sat2 = satMap.get(cdm.norad_id_2)
    if (!sat1?.satrec || !sat2?.satrec) return null

    const tca    = new Date(cdm.tca_utc)
    const e1     = getEllipseAxes(sat1.satrec, tca)
    const e2     = getEllipseAxes(sat2.satrec, tca)
    const missKm = cdm.min_rng_m / 1000

    const innerW = W - margin.left - margin.right
    const innerH = H - margin.top  - margin.bottom

    // Initial scale: fit the larger ellipse in ~38% of the drawing area
    let sx = (innerW * 0.38) / Math.max(e1.along, e2.along)
    let sy = (innerH * 0.38) / Math.max(e1.cross, e2.cross)

    const cx = W / 2
    const cy = margin.top + innerH / 2

    // Check if the two ellipses + gap fit vertically. If not, scale down.
    // Total vertical space needed: missPx + half of each ellipse (ry) + margins
    const neededH = (missKm * sy) + (e1.cross * sy) + (e2.cross * sy) + 16
    if (neededH > innerH) {
      const shrink = innerH / neededH
      sx *= shrink
      sy *= shrink
    }

    const missPx = missKm * sy

    return {
      e1, e2, missKm,
      e1rx: e1.along * sx, e1ry: e1.cross * sy,
      e2rx: e2.along * sx, e2ry: e2.cross * sy,
      cx, cy,
      o1y: cy - missPx / 2,
      o2y: cy + missPx / 2,
      missPx,
    }
  }, [cdm, satMap])
}

export default function CovarianceViz({ cdm, satMap }) {
  const layout = useEllipseLayout(cdm, satMap)
  const pc     = cdm?.pc

  const noTle = cdm && !layout

  if (!layout) {
    return (
      <div className="covariance-wrap">
        <p className="covariance-title">Position uncertainty at closest approach</p>
        <svg viewBox={`0 0 ${W} ${H}`} className="covariance-svg">
          <rect width={W} height={H} fill="#040810" />
          <text
            x={W / 2} y={H / 2 - 10}
            textAnchor="middle" dominantBaseline="middle"
            fill="#4b5563" fontSize={13}
            fontFamily='"Space Grotesk", sans-serif'
          >
            {noTle ? 'TLE data unavailable for one of these objects' : 'Select a conjunction event'}
          </text>
          {noTle && (
            <text
              x={W / 2} y={H / 2 + 12}
              textAnchor="middle" dominantBaseline="middle"
              fill="#374151" fontSize={10}
              fontFamily='"Space Grotesk", sans-serif'
            >
              Some recently catalogued objects do not yet have a tracked orbit
            </text>
          )}
        </svg>
      </div>
    )
  }

  const { e1, e2, e1rx, e1ry, e2rx, e2ry, cx, cy, o1y, o2y, missPx } = layout
  const overlapRx = Math.min(e1rx, e2rx) * 0.6
  const overlapRy = Math.abs(missPx / 2) + Math.min(e1ry, e2ry) * 0.4

  return (
    <div className="covariance-wrap">
      <p className="covariance-title">Position uncertainty at closest approach</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="covariance-svg">
        <defs>
          <pattern id="cov-hatch" patternUnits="userSpaceOnUse" width={6} height={6} patternTransform="rotate(45)">
            <line x1={0} y1={0} x2={0} y2={6} stroke="#ef4444" strokeWidth={1.5} opacity={0.4} />
          </pattern>
        </defs>

        <rect width={W} height={H} fill="#040810" />

        {/* Axis labels */}
        <text
          x={cx} y={margin.top - 16}
          textAnchor="middle" fontSize={10} fill="#4b5563"
          fontFamily='"Space Grotesk", sans-serif'
        >
          ← along-track (velocity direction)
        </text>
        <text
          x={margin.left - 10} y={cy}
          textAnchor="middle" fontSize={10} fill="#4b5563"
          fontFamily='"Space Grotesk", sans-serif'
          transform={`rotate(-90, ${margin.left - 10}, ${cy})`}
        >
          cross-track →
        </text>

        {/* Overlap zone */}
        <ellipse cx={cx} cy={cy} rx={overlapRx} ry={overlapRy} fill="url(#cov-hatch)" />
        <ellipse cx={cx} cy={cy} rx={overlapRx} ry={overlapRy}
          fill="rgba(239,68,68,0.06)" stroke="rgba(239,68,68,0.25)" strokeWidth={1} />

        {/* Sat 1 — cyan, tilted along velocity */}
        <ellipse
          cx={cx} cy={o1y} rx={e1rx} ry={e1ry}
          transform={`rotate(-15,${cx},${o1y})`}
          fill="rgba(34,211,238,0.07)"
          stroke="rgba(34,211,238,0.55)" strokeWidth={1.5} strokeDasharray="5 3"
        />

        {/* Sat 2 — amber, different inclination */}
        <ellipse
          cx={cx} cy={o2y} rx={e2rx} ry={e2ry}
          transform={`rotate(25,${cx},${o2y})`}
          fill="rgba(249,115,22,0.07)"
          stroke="rgba(249,115,22,0.55)" strokeWidth={1.5} strokeDasharray="5 3"
        />

        {/* Object dots */}
        <circle cx={cx} cy={o1y} r={4} fill="#22d3ee" stroke="#0f172a" strokeWidth={1.5} />
        <text x={cx + e1rx + 6} y={o1y + 4} fontSize={10} fill="#22d3ee" fontFamily='"Space Grotesk", sans-serif'>
          {cdm.sat_name_1?.split(' ').slice(0, 2).join(' ')}
        </text>

        <circle cx={cx} cy={o2y} r={4} fill="#f97316" stroke="#0f172a" strokeWidth={1.5} />
        <text x={cx + e2rx + 6} y={o2y + 4} fontSize={10} fill="#f97316" fontFamily='"Space Grotesk", sans-serif'>
          {cdm.sat_name_2?.split(' ').slice(0, 2).join(' ')}
        </text>

        {/* Miss distance line */}
        {missPx > 2 && (
          <>
            <line
              x1={cx + 8} x2={cx + 8} y1={o1y} y2={o2y}
              stroke="#ef4444" strokeWidth={1} strokeDasharray="3 2"
            />
            <text x={cx + 13} y={cy + 4} fontSize={9.5} fill="#ef4444" fontFamily='"Space Mono", monospace'>
              {cdm.min_rng_m.toLocaleString()} m
            </text>
          </>
        )}

        {/* Footer bar */}
        <rect x={0} y={H - 36} width={W} height={36} fill="#0c1220" />

        <text x={12} y={H - 22} fontSize={9} fill="#22d3ee" fillOpacity={0.5} fontFamily='"Space Mono", monospace'>
          Object 1 uncertainty: ~{e1.along.toFixed(0)} × {e1.cross.toFixed(1)} km ({e1.ageDays.toFixed(0)}d TLE)
        </text>
        <text x={12} y={H - 10} fontSize={9} fill="#f97316" fillOpacity={0.5} fontFamily='"Space Mono", monospace'>
          Object 2 uncertainty: ~{e2.along.toFixed(0)} × {e2.cross.toFixed(1)} km ({e2.ageDays.toFixed(0)}d TLE)
        </text>

        {pc != null && (
          <text
            x={W - 12} y={H - 13}
            textAnchor="end" fontSize={13} fontWeight={700}
            fill={pc > 0.001 ? '#ef4444' : '#f97316'}
            fontFamily='"Space Grotesk", sans-serif'
          >
            Pc = {pc.toExponential(2)}
          </text>
        )}

        <text x={cx} y={H - 2} textAnchor="middle" fontSize={8.5} fill="#374151" fontFamily='"Space Mono", monospace'>
          Uncertainty estimated from TLE epoch age · not from covariance matrices
        </text>
      </svg>
    </div>
  )
}
