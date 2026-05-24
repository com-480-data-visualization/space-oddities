import { useState, useEffect, useRef, useMemo } from 'react'
import './CarAnimationMiss.css'

// Scale: orbital speed 7 km/s → highway 80 km/h ≈ 1:315
const ORBITAL_SPEED_MS = 7000
const CAR_SPEED_MS     = 80 / 3.6
const SCALE            = CAR_SPEED_MS / ORBITAL_SPEED_MS

// Physical car dimensions (meters)
const CAR_WIDTH_M  = 1.8
const CAR_LENGTH_M = 4.5
const LANE_WIDTH_M = 3.7

const W       = 580
const ROAD_H  = 120
const INFO_H  = 68
const H       = ROAD_H + INFO_H
const ROAD_CY = ROAD_H / 2

const DURATION   = 10    // seconds
const LEFT_EDGE  = 32
const RIGHT_EDGE = W - 32

// Custom easing: slows down in the central ~3 s so the near-miss is dramatic.
function ease(t) {
  if (t < 0.35) return (t / 0.35) * 0.45
  if (t > 0.65) return 0.55 + ((t - 0.65) / 0.35) * 0.45
  return 0.45 + ((t - 0.35) / 0.3) * 0.1
}

function formatM(m) {
  if (m < 0.001) return `${(m * 1000).toFixed(1)} mm`
  if (m < 1)     return `${(m * 100).toFixed(0)} cm`
  if (m < 1000)  return `${m.toFixed(1)} m`
  return `${(m / 1000).toFixed(1)} km`
}

// Dynamic pixel-per-meter scale so the gap renders at true proportion to car size.
// pxPerM is chosen to fit both cars + gap in ROAD_H.
function computeScale(highwayGapM) {
  const totalM   = 2 * LANE_WIDTH_M + Math.max(highwayGapM ?? 0, 0)
  const natural  = ROAD_H / (totalM * 1.18)
  const minPpm   = 8  / CAR_WIDTH_M   // car >= 8 px wide
  const maxPpm   = 36 / CAR_WIDTH_M   // car <= 36 px wide
  return Math.min(Math.max(natural, minPpm), maxPpm)
}

function CarTopDown({ cx, cy, fill, facingRight = true, cw = 54, ch = 22 }) {
  const hw = cw / 2, hh = ch / 2
  const s  = facingRight ? 1 : -1
  return (
    <g>
      <rect x={cx - hw} y={cy - hh} width={cw} height={ch} rx={ch * 0.14}
        fill={fill} fillOpacity={0.92} />
      <path d={[
        `M${cx + s * hw * 0.481} ${cy - hh + ch * 0.045}`,
        `L${cx + s * hw * 0.926} ${cy - hh + ch * 0.18}`,
        `L${cx + s * hw * 0.926} ${cy + hh - ch * 0.18}`,
        `L${cx + s * hw * 0.481} ${cy + hh - ch * 0.045} Z`,
      ].join(' ')} fill="rgba(190,235,255,0.22)" />
      <rect x={cx - hw * 0.333} y={cy - hh + ch * 0.14}
        width={hw * 0.667} height={ch * 0.727}
        rx={ch * 0.09} fill={fill} fillOpacity={0.40} />
    </g>
  )
}

// ── main component ────────────────────────────────────────────────────────────

export default function CarAnimationMiss({ cdm, approachData, mode = 'miss', onProgress }) {
  const [rawProgress, setRawProgress] = useState(0)
  const [playing,     setPlaying]     = useState(false)
  const [done,        setDone]        = useState(false)
  const startRef  = useRef(null)
  const rafRef    = useRef(null)
  const onProgressRef = useRef(onProgress)
  useEffect(() => { onProgressRef.current = onProgress }, [onProgress])

  const gapAtTCA = useMemo(() => {
    if (mode === 'propagation' && approachData?.length) {
      return Math.min(...approachData.map(p => p.distM))
    }
    return cdm?.min_rng_m ?? null
  }, [mode, cdm, approachData])

  const cdmMissM = cdm?.min_rng_m ?? null

  const play = () => {
    cancelAnimationFrame(rafRef.current)
    startRef.current = null
    setRawProgress(0)
    setDone(false)
    setPlaying(true)
  }

  useEffect(() => {
    if (!playing) return
    const step = ts => {
      if (!startRef.current) startRef.current = ts
      const t = Math.min((ts - startRef.current) / (DURATION * 1000), 1)
      setRawProgress(t)
      onProgressRef.current?.((ease(t) - 0.5) * 40)
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step)
      } else {
        setPlaying(false)
        setDone(true)
      }
    }
    rafRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafRef.current)
  }, [playing])

  if (!cdm) {
    return (
      <div className="cam-wrap">
        <p className="cam-title">
          {mode === 'miss' ? 'The miss distance at highway scale' : 'What the model predicts'}
        </p>
        <div className="cam-placeholder">Select a conjunction event</div>
      </div>
    )
  }

  // ── layout geometry ──────────────────────────────────────────────────────
  const highwayGapM = gapAtTCA != null ? gapAtTCA * SCALE : null
  const pxPerM      = computeScale(highwayGapM)
  const dynCarH     = CAR_WIDTH_M  * pxPerM   // car visual height (car width in real space)
  const dynCarW     = CAR_LENGTH_M * pxPerM   // car visual width (car length in real space)

  // Gap in pixels — capped so cars remain inside ROAD_H
  const maxGapDisplay = ROAD_H * 0.82 - dynCarH * 2
  const rawGapPx      = highwayGapM != null ? highwayGapM * pxPerM : dynCarH * 1.2
  const gapPx         = Math.min(Math.max(rawGapPx, 0), maxGapDisplay)

  const laneOffset  = gapPx / 2 + dynCarH / 2
  const car1CY      = ROAD_CY + laneOffset
  const car2CY      = ROAD_CY - laneOffset

  const p = ease(rawProgress)
  const car1CX = LEFT_EDGE  + p * (RIGHT_EDGE - LEFT_EDGE)
  const car2CX = RIGHT_EDGE - p * (RIGHT_EDGE - LEFT_EDGE)

  // Gap indicator geometry
  const gapOpacity   = Math.max(0, 1 - Math.abs(p - 0.5) / 0.12)
  const atTCA        = Math.abs(p - 0.5) < 0.015
  const gapMidX      = W / 2
  const car1InnerY   = car1CY - dynCarH / 2   // top of car1 (nearer center)
  const car2InnerY   = car2CY + dynCarH / 2   // bottom of car2 (nearer center)
  const actualGapPx  = car1InnerY - car2InnerY // may be < 1 for tiny gaps

  // Labels
  const isMiss      = mode === 'miss'
  const titleLabel  = isMiss ? 'The miss distance at highway scale' : 'What the propagation model predicts'
  const gapLabel    = highwayGapM != null ? formatM(highwayGapM) : '—'
  const orbLabel    = gapAtTCA != null
    ? (gapAtTCA >= 1000 ? `${(gapAtTCA / 1000).toFixed(0)} km` : `${gapAtTCA.toFixed(0)} m`)
    : '—'

  // Scale indicator: how many cm per pixel in this view
  const mPerPx     = 1 / pxPerM
  const scaleLabel = mPerPx < 0.01
    ? `1px = ${(mPerPx * 100).toFixed(1)} cm`
    : `1px = ${mPerPx.toFixed(2)} m`

  const infoTop = ROAD_H

  return (
    <div className="cam-wrap">
      <p className="cam-title">{titleLabel}</p>

      <div className="cam-svg-wrap">
        <svg viewBox={`0 0 ${W} ${H}`} className="cam-svg">
          {/* Background */}
          <rect width={W} height={H} fill="#050810" />

          {/* Road */}
          <rect y={0} width={W} height={ROAD_H} fill="#111827" />
          <line x1={0} y1={0} x2={W} y2={0} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
          <line x1={0} y1={ROAD_H} x2={W} y2={ROAD_H} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
          <line x1={0} y1={ROAD_CY} x2={W} y2={ROAD_CY}
            stroke="rgba(251,191,36,0.18)" strokeWidth={1} strokeDasharray="24 10" />

          {/* Direction arrows */}
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

          {/* Gap indicator — fades in near TCA */}
          {gapOpacity > 0.05 && (
            <g opacity={gapOpacity}>
              {actualGapPx >= 1.5 ? (
                // Visible gap: draw bracket lines
                <>
                  <line x1={gapMidX} x2={gapMidX} y1={car2InnerY} y2={car1InnerY}
                    stroke="#ef4444" strokeWidth={1.5} strokeDasharray="2 2" />
                  <line x1={gapMidX - 4} x2={gapMidX + 4} y1={car2InnerY} y2={car2InnerY}
                    stroke="#ef4444" strokeWidth={1.5} />
                  <line x1={gapMidX - 4} x2={gapMidX + 4} y1={car1InnerY} y2={car1InnerY}
                    stroke="#ef4444" strokeWidth={1.5} />
                  <text x={gapMidX + 7} y={(car2InnerY + car1InnerY) / 2 + 4}
                    fontSize={9.5} fontWeight={700} fill="#ef4444"
                    fontFamily='"Space Mono", monospace'>
                    {gapLabel}
                  </text>
                </>
              ) : (
                // Sub-pixel gap: hairline at center
                <>
                  <line x1={gapMidX - 14} x2={gapMidX + 14} y1={ROAD_CY} y2={ROAD_CY}
                    stroke="#ef4444" strokeWidth={0.5} />
                  <text x={gapMidX + 18} y={ROAD_CY + 4}
                    fontSize={8} fontWeight={700} fill="#ef4444"
                    fontFamily='"Space Mono", monospace'>
                    {gapLabel}
                  </text>
                </>
              )}
            </g>
          )}

          {/* "CLOSEST POINT" label at TCA */}
          {atTCA && (
            <text x={W / 2} y={12} textAnchor="middle"
              fontSize={9} fill="rgba(239,68,68,0.7)" fontFamily='"Space Grotesk", sans-serif'
              fontWeight={700} letterSpacing={1}>
              — CLOSEST POINT —
            </text>
          )}

          {/* Cars */}
          <CarTopDown cx={car1CX} cy={car1CY} fill="rgba(34,211,238,0.9)"  facingRight={true}  cw={dynCarW} ch={dynCarH} />
          <CarTopDown cx={car2CX} cy={car2CY} fill="rgba(249,115,22,0.9)"  facingRight={false} cw={dynCarW} ch={dynCarH} />

          {/* Info section */}
          <rect x={0} y={infoTop} width={W} height={INFO_H} fill="#0c1624" />
          <line x1={0} y1={infoTop} x2={W} y2={infoTop} stroke="rgba(255,255,255,0.07)" strokeWidth={1} />

          {isMiss ? (
            <>
              <text x={20} y={infoTop + 16} fontSize={9} fill="#64748b"
                fontFamily='"Space Grotesk", sans-serif' fontWeight={600}>
                ORBITAL MISS DISTANCE (CDM)
              </text>
              <text x={20} y={infoTop + 34} fontSize={14} fontWeight={700}
                fill="#8ed7ff" fontFamily='"Space Grotesk", sans-serif'>
                {orbLabel}
              </text>
              <text x={W / 2} y={infoTop + 28} textAnchor="middle" fontSize={9} fill="#374151"
                fontFamily='"Space Grotesk", sans-serif'>
                →
              </text>
              <text x={W / 2} y={infoTop + 42} textAnchor="middle" fontSize={7.5} fill="#374151"
                fontFamily='"Space Mono", monospace'>
                {scaleLabel}
              </text>
              <text x={W - 20} y={infoTop + 16} textAnchor="end" fontSize={9} fill="#64748b"
                fontFamily='"Space Grotesk", sans-serif' fontWeight={600}>
                SAME GAP AT HIGHWAY SPEED
              </text>
              <text x={W - 20} y={infoTop + 34} textAnchor="end" fontSize={14} fontWeight={700}
                fill={highwayGapM != null && highwayGapM < 0.05 ? '#ef4444' : '#fb923c'}
                fontFamily='"Space Grotesk", sans-serif'>
                {gapLabel}
              </text>
              {highwayGapM != null && highwayGapM < 0.05 && (
                <text x={W / 2} y={infoTop + 58} textAnchor="middle" fontSize={8.5}
                  fill="#ef444488" fontFamily='"Space Grotesk", sans-serif' fontStyle="italic">
                  narrower than a human hair at highway speed
                </text>
              )}
            </>
          ) : (
            <>
              <text x={20} y={infoTop + 16} fontSize={9} fill="#64748b"
                fontFamily='"Space Grotesk", sans-serif' fontWeight={600}>
                SGP4 MODEL PREDICTS (closest)
              </text>
              <text x={20} y={infoTop + 34} fontSize={14} fontWeight={700}
                fill="#8ed7ff" fontFamily='"Space Grotesk", sans-serif'>
                {orbLabel}
              </text>
              <text x={W / 2} y={infoTop + 22} textAnchor="middle" fontSize={9} fill="#ef4444"
                fontFamily='"Space Grotesk", sans-serif' fontWeight={600}>
                ACTUAL: {cdmMissM != null ? (cdmMissM >= 1000 ? `${(cdmMissM/1000).toFixed(0)} km` : `${cdmMissM.toFixed(0)} m`) : '—'}
              </text>
              <text x={W / 2} y={infoTop + 38} textAnchor="middle" fontSize={7.5} fill="#ef444466"
                fontFamily='"Space Mono", monospace'>
                ↑ {cdmMissM != null && approachData?.length
                  ? `${Math.round(Math.min(...approachData.map(p => p.distM)) / cdmMissM)}×`
                  : '?'} off
              </text>
              <text x={W / 2} y={infoTop + 54} textAnchor="middle" fontSize={7} fill="#374151"
                fontFamily='"Space Mono", monospace'>
                {scaleLabel}
              </text>
              <text x={W - 20} y={infoTop + 16} textAnchor="end" fontSize={9} fill="#64748b"
                fontFamily='"Space Grotesk", sans-serif' fontWeight={600}>
                GAP AT HIGHWAY SPEED
              </text>
              <text x={W - 20} y={infoTop + 34} textAnchor="end" fontSize={14} fontWeight={700}
                fill="#fb923c" fontFamily='"Space Grotesk", sans-serif'>
                {gapLabel}
              </text>
            </>
          )}
        </svg>

        {/* Play / Replay button overlay */}
        {!playing && (
          <div className="cam-play-overlay">
            <button className="cam-play-btn" onClick={play} title={done ? 'Replay' : 'Play'}>
              {done
                ? <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M14 9A5 5 0 1 1 9 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    <polyline points="9,1 9,5 13,5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                : <svg width="16" height="18" viewBox="0 0 16 18" fill="currentColor">
                    <polygon points="1,1 15,9 1,17" />
                  </svg>
              }
              <span>{done ? 'Replay' : 'Play'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
