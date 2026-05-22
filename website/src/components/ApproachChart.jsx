import { useRef, useMemo, useCallback } from 'react'
import { LinePath, AreaClosed } from '@visx/shape'
import { AxisBottom, AxisLeft } from '@visx/axis'
import { GridRows } from '@visx/grid'
import { Group } from '@visx/group'
import { scaleLinear, scaleLog } from '@visx/scale'
import { localPoint } from '@visx/event'
import * as d3 from 'd3'
import './ApproachChart.css'

const W      = 480
const H      = 180
const margin = { top: 14, right: 20, bottom: 32, left: 60 }

const monoFont = { fontFamily: '"Space Mono", monospace' }

function formatDist(km) {
  return km >= 1 ? `${km.toFixed(1)} km` : `${(km * 1000).toFixed(0)} m`
}

export default function ApproachChart({ cdm, approachData, offsetMin, onOffsetChange }) {
  const svgRef = useRef(null)

  const innerWidth  = W - margin.left - margin.right
  const innerHeight = H - margin.top  - margin.bottom
  const clamped     = Math.max(-20, Math.min(20, offsetMin))

  const windowData = useMemo(
    () => approachData?.filter(d => Math.abs(d.t) <= 20) ?? [],
    [approachData],
  )

  const { xScale, yScale, minPt } = useMemo(() => {
    if (!windowData.length) return {}
    const minDist = d3.min(windowData, d => d.distKm)
    const maxDist = d3.max(windowData, d => d.distKm)
    return {
      xScale: scaleLinear({ domain: [-20, 20], range: [0, innerWidth] }),
      yScale: scaleLog({
        domain: [Math.max(minDist * 0.5, 0.0001), maxDist * 1.2],
        range: [innerHeight, 0],
        clamp: true,
      }),
      minPt: windowData.reduce((a, b) => (b.distKm < a.distKm ? b : a)),
    }
  }, [windowData, innerWidth, innerHeight])

  const nearest = useMemo(() => {
    if (!windowData.length) return null
    return windowData.reduce((a, b) =>
      Math.abs(b.t - clamped) < Math.abs(a.t - clamped) ? b : a,
    )
  }, [windowData, clamped])

  const handlePointer = useCallback(e => {
    if (e.type === 'pointermove' && e.buttons === 0) return
    if (!svgRef.current || !xScale) return
    const pt = localPoint(svgRef.current, e)
    if (!pt) return
    const t = Math.round(Math.max(-20, Math.min(20, xScale.invert(pt.x - margin.left))))
    onOffsetChange(t)
  }, [xScale, onOffsetChange])

  if (!windowData.length || !xScale) {
    return (
      <div className="approach-chart-wrap">
        <p className="approach-chart-title">
          Separation distance · ±20 min around closest approach
        </p>
        <svg viewBox={`0 0 ${W} ${H}`} className="approach-chart-svg">
          <text
            x={W / 2} y={H / 2}
            textAnchor="middle" dominantBaseline="middle"
            fill="#4b5563" fontSize={13}
            fontFamily='"Space Grotesk", sans-serif'
          >
            {cdm ? 'Computing approach…' : 'Select a conjunction event'}
          </text>
        </svg>
      </div>
    )
  }

  const reportedKm = cdm.min_rng_m / 1000
  const showCdmLine = reportedKm >= yScale.domain()[0]

  const playX     = xScale(clamped)
  const playY     = yScale(nearest.distKm)
  const distLabel = formatDist(nearest.distKm)
  const labelLeft = clamped > 10

  const tickLabelStyle = { ...monoFont, fill: '#64748b', fontSize: 9 }

  return (
    <div className="approach-chart-wrap">
      <p className="approach-chart-title">
        Separation distance · ±20 min around closest approach
        <span className="approach-drag-hint"> — drag to scrub</span>
      </p>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="approach-chart-svg"
        onPointerDown={handlePointer}
        onPointerMove={handlePointer}
        style={{ cursor: 'ew-resize' }}
      >
        <Group top={margin.top} left={margin.left}>
          <GridRows
            scale={yScale}
            width={innerWidth}
            numTicks={4}
            stroke="rgba(255,255,255,0.05)"
          />

          {[-20, -10, 0, 10, 20].map(t => (
            <line
              key={t}
              x1={xScale(t)} x2={xScale(t)}
              y1={0} y2={innerHeight}
              stroke={t === 0 ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)'}
              strokeWidth={t === 0 ? 1.5 : 1}
              strokeDasharray={t === 0 ? '4 4' : undefined}
            />
          ))}

          <AreaClosed
            data={windowData}
            x={d => xScale(d.t)}
            y={d => yScale(d.distKm)}
            yScale={yScale}
            curve={d3.curveMonotoneX}
            fill="rgba(56,189,248,0.07)"
          />
          <LinePath
            data={windowData}
            x={d => xScale(d.t)}
            y={d => yScale(d.distKm)}
            curve={d3.curveMonotoneX}
            stroke="#38bdf8"
            strokeWidth={2}
          />

          {showCdmLine && (
            <>
              <line
                x1={0} x2={innerWidth}
                y1={yScale(reportedKm)} y2={yScale(reportedKm)}
                stroke="#ef4444" strokeWidth={1.2} strokeDasharray="5 4"
              />
              <text
                x={4} y={yScale(reportedKm) - 4}
                fontSize={9.5} fill="#ef4444"
                {...monoFont}
              >
                CDM: {cdm.min_rng_m.toLocaleString()} m
              </text>
            </>
          )}

          <circle
            cx={xScale(minPt.t)} cy={yScale(minPt.distKm)}
            r={4} fill="#38bdf8" stroke="#0f172a" strokeWidth={1.5}
          />

          {/* Playhead */}
          <line
            x1={playX} x2={playX} y1={0} y2={innerHeight}
            stroke="#f8fafc" strokeWidth={1.5} strokeDasharray="3 3" opacity={0.7}
          />
          <circle
            cx={playX} cy={playY}
            r={5} fill="#f8fafc" stroke="#0f172a" strokeWidth={1.5}
          />
          <text
            x={playX + (labelLeft ? -6 : 9)}
            y={playY - 9}
            fontSize={10} fill="#e2e8f0"
            textAnchor={labelLeft ? 'end' : 'start'}
            {...monoFont}
          >
            {distLabel}
          </text>

          <AxisLeft
            scale={yScale}
            numTicks={4}
            tickFormat={d => (d < 1 ? `${(d * 1000).toFixed(0)} m` : `${d.toFixed(0)} km`)}
            stroke="transparent"
            tickStroke="transparent"
            tickLabelProps={() => ({
              ...tickLabelStyle,
              textAnchor: 'end',
              dx: '-0.3em',
              dy: '0.33em',
            })}
          />
          <AxisBottom
            top={innerHeight}
            scale={xScale}
            tickValues={[-20, -10, 0, 10, 20]}
            tickFormat={d => (d === 0 ? 'TCA' : `${d > 0 ? '+' : ''}${d}m`)}
            stroke="rgba(255,255,255,0.1)"
            tickStroke="transparent"
            tickLabelProps={d => ({
              ...tickLabelStyle,
              textAnchor: 'middle',
              fill: d === 0 ? '#e2e8f0' : '#64748b',
            })}
          />
        </Group>
      </svg>
    </div>
  )
}
