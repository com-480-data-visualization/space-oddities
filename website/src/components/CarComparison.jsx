import { useMemo } from 'react'
import './CarComparison.css'

// Orbital → car scale
// LEO relative speed ~7 km/s, highway ~80 km/h
const ORBITAL_SPEED_MS = 7000
const CAR_SPEED_MS     = 80 / 3.6
const SCALE            = CAR_SPEED_MS / ORBITAL_SPEED_MS   // ≈ 1/315

const CAR_LENGTH_M = 4.5

// Canvas dimensions
const W       = 580
const ROAD_H  = 120
const INFO_H  = 90
const H       = ROAD_H + INFO_H
const ROAD_CY = ROAD_H / 2

// Top-down car: 54 × 22 px
const CAR_W = 54
const CAR_H = 22
const PX_PER_M = CAR_H / CAR_LENGTH_M   // ≈ 4.9 px/m

// Interpolate the 3-D separation from approachData at a given time offset (minutes)
function interpDist(approachData, offsetMin) {
  if (!approachData?.length) return null
  const pts = [...approachData].sort((a, b) => a.t - b.t)
  let lo = pts[0]
  let hi = pts[pts.length - 1]
  for (let i = 0; i < pts.length - 1; i++) {
    if (pts[i].t <= offsetMin && pts[i + 1].t >= offsetMin) {
      lo = pts[i]; hi = pts[i + 1]; break
    }
  }
  if (lo.t === hi.t) return lo.distM
  const frac = Math.max(0, Math.min(1, (offsetMin - lo.t) / (hi.t - lo.t)))
  return lo.distM + frac * (hi.distM - lo.distM)
}

function formatM(m) {
  if (m < 0.001) return `${(m * 1000).toFixed(1)} mm`
  if (m < 1)     return `${(m * 100).toFixed(0)} cm`
  if (m < 1000)  return `${m.toFixed(2)} m`
  return `${(m / 1000).toFixed(1)} km`
}

function formatOrb(m) {
  if (m >= 1e6)  return `${(m / 1e6).toFixed(2)} Mm`
  if (m >= 1000) return `${(m / 1000).toFixed(0)} km`
  return `${m.toFixed(0)} m`
}

// ── car shape ─────────────────────────────────────────────────────────────────

function CarTopDown({ cx, cy, fill, facingRight = true }) {
  const hw = CAR_W / 2
  const hh = CAR_H / 2
  const s  = facingRight ? 1 : -1

  return (
    <g>
      <rect x={cx - hw} y={cy - hh} width={CAR_W} height={CAR_H}
        rx={3} fill={fill} fillOpacity={0.92} />
      <path
        d={[
          `M${cx + s * (hw - 14)} ${cy - hh + 1}`,
          `L${cx + s * (hw - 2)}  ${cy - hh + 4}`,
          `L${cx + s * (hw - 2)}  ${cy + hh - 4}`,
          `L${cx + s * (hw - 14)} ${cy + hh - 1} Z`,
        ].join(' ')}
        fill="rgba(190,235,255,0.22)"
      />
      <rect x={cx - 9} y={cy - hh + 3} width={18} height={CAR_H - 6}
        rx={2} fill={fill} fillOpacity={0.40} />
    </g>
  )
}

// ── main component ────────────────────────────────────────────────────────────

export default function CarComparison({ offsetMin, cdm, approachData }) {
  const layout = useMemo(() => {
    if (!cdm) return null

    // CDM-reported miss distance (Y gap — authoritative, time-invariant)
    const scaledMinM  = cdm.min_rng_m * SCALE
    const maxGapPx    = ROAD_H * 0.65 - CAR_H
    const clampedGapPx = Math.min(Math.max(scaledMinM * PX_PER_M, 0.5), maxGapPx)
    const laneOffset  = clampedGapPx / 2 + CAR_H / 2
    const car1CY     = ROAD_CY + laneOffset
    const car2CY     = ROAD_CY - laneOffset

    // Current 3-D separation from SGP4 at this time offset
    const currentDistM   = interpDist(approachData, offsetMin)
    const scaledCurrentM = currentDistM != null ? currentDistM * SCALE : null

    // Car X positions driven by actual scaled separation.
    // Car 1 (→) is fixed near the right edge; Car 2 (←) approaches from the left.
    // Both cars move off-screen when separation is large.
    const car1CX  = W - CAR_W / 2 - 16
    const sepPx   = scaledCurrentM != null ? scaledCurrentM * PX_PER_M : W * 4
    const car2CX  = car1CX - sepPx
    const car2Visible = car2CX > -CAR_W / 2

    return {
      scaledMinM, car1CY, car2CY,
      car1CX, car2CX, car2Visible,
      currentDistM, scaledCurrentM,
    }
  }, [cdm, approachData, offsetMin])

  // ── empty state ──────────────────────────────────────────────────────────
  if (!layout) {
    return (
      <div className="car-comparison-wrap">
        <p className="car-comparison-title">Speed comparison — orbital distance at highway scale</p>
        <svg viewBox={`0 0 ${W} ${H}`} className="car-comparison-svg">
          <rect width={W} height={H} fill="#050810" />
          <text x={W / 2} y={H / 2} textAnchor="middle" dominantBaseline="middle"
            fill="#4b5563" fontSize={13} fontFamily='"Space Grotesk", sans-serif'>
            Select a conjunction event
          </text>
        </svg>
      </div>
    )
  }

  const {
    scaledMinM,
    car1CY, car2CY, car1CX, car2CX, car2Visible,
    currentDistM, scaledCurrentM,
  } = layout

  const car1InnerY = car1CY - CAR_H / 2
  const car2InnerY = car2CY + CAR_H / 2
  const isAtTCA    = Math.abs(offsetMin) <= 1

  const infoTop = ROAD_H

  // Gap indicator (shown only when both cars are close enough to TCA)
  const showGap      = car2Visible && car2CX + CAR_W / 2 < car1CX - CAR_W / 2 + 4
  const gapArrowY1   = car2InnerY
  const gapArrowY2   = car1InnerY
  const gapMidX      = (car1CX + car2CX) / 2

  // Labels
  const tLabel = offsetMin === 0 ? 'at TCA'
    : `TCA ${offsetMin > 0 ? '+' : ''}${offsetMin} min`

  const orbNowLabel = currentDistM != null ? formatOrb(currentDistM) : '—'
  const carNowLabel = scaledCurrentM != null ? formatM(scaledCurrentM) : '—'
  const orbMinLabel = formatOrb(cdm.min_rng_m)
  const carMinLabel = formatM(scaledMinM)

  // Colour: red if extremely close, amber otherwise
  const nowColor  = (scaledCurrentM != null && scaledCurrentM < 2) ? '#ef4444' : '#fb923c'
  const minColor  = scaledMinM * PX_PER_M < 2 ? '#ef4444' : '#fb923c'

  return (
    <div className="car-comparison-wrap">
      <p className="car-comparison-title">Speed comparison — orbital distance at highway scale</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="car-comparison-svg">

        {/* ── background ─────────────────────────────────────────────── */}
        <rect width={W} height={H} fill="#050810" />

        {/* ── road ───────────────────────────────────────────────────── */}
        <rect y={0} width={W} height={ROAD_H} fill="#111827" />
        <line x1={0} y1={0} x2={W} y2={0} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
        <line x1={0} y1={ROAD_H} x2={W} y2={ROAD_H} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
        <line x1={0} y1={ROAD_CY} x2={W} y2={ROAD_CY}
          stroke="rgba(251,191,36,0.18)" strokeWidth={1} strokeDasharray="24 10" />

        {/* Lane direction arrows */}
        {[1, 2, 3].map(i => {
          const ax = (W / 4) * i
          return (
            <g key={i}>
              <polygon points={`${ax - 4},${car1CY - 3} ${ax + 6},${car1CY} ${ax - 4},${car1CY + 3}`}
                fill="rgba(34,211,238,0.12)" />
              <polygon points={`${ax + 4},${car2CY - 3} ${ax - 6},${car2CY} ${ax + 4},${car2CY + 3}`}
                fill="rgba(249,115,22,0.12)" />
            </g>
          )
        })}

        {/* Off-screen indicator for Car 2 when it is not visible */}
        {!car2Visible && (
          <g>
            <text x={16} y={car2CY + 4} fontSize={9} fill="rgba(249,115,22,0.6)"
              fontFamily='"Space Mono", monospace'>
              ◄ car 2 is {carNowLabel} away
            </text>
          </g>
        )}

        {/* Gap indicator between the two cars when they are on screen */}
        {showGap && gapArrowY2 > gapArrowY1 + 1 && (
          <g opacity={isAtTCA ? 1 : 0.55} style={{ transition: 'opacity 200ms' }}>
            <line x1={gapMidX} x2={gapMidX} y1={gapArrowY1} y2={gapArrowY2}
              stroke="#ef4444" strokeWidth={1.5} strokeDasharray="2 2" />
            <line x1={gapMidX - 4} x2={gapMidX + 4} y1={gapArrowY1} y2={gapArrowY1}
              stroke="#ef4444" strokeWidth={1.5} />
            <line x1={gapMidX - 4} x2={gapMidX + 4} y1={gapArrowY2} y2={gapArrowY2}
              stroke="#ef4444" strokeWidth={1.5} />
            <text
              x={gapMidX + 7} y={(gapArrowY1 + gapArrowY2) / 2 + 4}
              fontSize={9.5} fontWeight={700} fill="#ef4444"
              fontFamily='"Space Mono", monospace'>
              {formatM(scaledMinM)}
            </text>
          </g>
        )}

        {/* Cars */}
        <CarTopDown cx={car1CX} cy={car1CY} fill="rgba(34,211,238,0.9)" facingRight={true} />
        {car2Visible && (
          <CarTopDown cx={car2CX} cy={car2CY} fill="rgba(249,115,22,0.9)" facingRight={false} />
        )}

        {/* Corner labels */}
        <text x={10} y={12} fontSize={9.5} fill="#475569" fontFamily='"Space Mono", monospace'>
          miss (TCA): {orbMinLabel}
        </text>
        <text x={W - 10} y={12} textAnchor="end" fontSize={9.5} fill="#475569"
          fontFamily='"Space Mono", monospace'>
          {tLabel}
        </text>

        {/* ── info section ───────────────────────────────────────────── */}
        <rect x={0} y={infoTop} width={W} height={INFO_H} fill="#0c1624" />
        <line x1={0} y1={infoTop} x2={W} y2={infoTop}
          stroke="rgba(255,255,255,0.07)" strokeWidth={1} />
        {/* Divider between now and TCA rows */}
        <line x1={20} y1={infoTop + 46} x2={W - 20} y2={infoTop + 46}
          stroke="rgba(255,255,255,0.05)" strokeWidth={1} />

        {/* Column headers */}
        <text x={20} y={infoTop + 13} fontSize={9} fill="#374151"
          fontFamily='"Space Grotesk", sans-serif' fontWeight={600} textTransform="uppercase">
          AT ORBITAL SPEED
        </text>
        <text x={W / 2} y={infoTop + 13} textAnchor="middle" fontSize={8} fill="#374151"
          fontFamily='"Space Mono", monospace'>1 : 315</text>
        <text x={W - 20} y={infoTop + 13} textAnchor="end" fontSize={9} fill="#374151"
          fontFamily='"Space Grotesk", sans-serif' fontWeight={600}>
          AT HIGHWAY SPEED
        </text>

        {/* Row 1: current separation */}
        <text x={20} y={infoTop + 30} fontSize={9} fill="#64748b"
          fontFamily='"Space Grotesk", sans-serif'>
          Now ({tLabel})
        </text>
        <text x={W - 20} y={infoTop + 30} textAnchor="end" fontSize={13} fontWeight={700}
          fill={nowColor} fontFamily='"Space Grotesk", sans-serif'>
          {carNowLabel}
        </text>
        <text x={20} y={infoTop + 42} fontSize={12} fontWeight={700}
          fill="#8ed7ff" fontFamily='"Space Grotesk", sans-serif'>
          {orbNowLabel}
        </text>

        {/* Row 2: TCA miss distance */}
        <text x={20} y={infoTop + 60} fontSize={9} fill="#64748b"
          fontFamily='"Space Grotesk", sans-serif'>
          Miss distance (TCA)
        </text>
        <text x={W - 20} y={infoTop + 60} textAnchor="end" fontSize={13} fontWeight={700}
          fill={minColor} fontFamily='"Space Grotesk", sans-serif'>
          {carMinLabel}
        </text>
        <text x={20} y={infoTop + 73} fontSize={12} fontWeight={700}
          fill="#8ed7ff" fontFamily='"Space Grotesk", sans-serif'>
          {orbMinLabel}
        </text>
        {scaledMinM * PX_PER_M < 3 && (
          <text x={W - 20} y={infoTop + 73} textAnchor="end" fontSize={8.5}
            fill="#ef444488" fontFamily='"Space Grotesk", sans-serif' fontStyle="italic">
            narrower than a human hair
          </text>
        )}
      </svg>
    </div>
  )
}
