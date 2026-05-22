import { useMemo } from 'react'
import { LinePath, AreaClosed } from '@visx/shape'
import { AxisBottom } from '@visx/axis'
import { Group } from '@visx/group'
import { scaleLinear } from '@visx/scale'
import * as d3 from 'd3'
import './GrowthChart.css'

const W      = 360
const H      = 160
const margin = { top: 8, right: 8, bottom: 22, left: 28 }

function buildCumulative(satellites, minYear, maxYear) {
  const byYear = d3.rollup(
    satellites.filter(s => Number.isFinite(s.launchYear)),
    v => v.length,
    s => s.launchYear,
  )
  let running = 0
  return Array.from({ length: maxYear - minYear + 1 }, (_, i) => {
    const year = minYear + i
    running += byYear.get(year) ?? 0
    return { year, cumulative: running }
  })
}

export default function GrowthChart({ satellites, currentYear, yearRange, isActive }) {
  const [minYear, maxYear] = yearRange

  const data = useMemo(
    () => (satellites.length ? buildCumulative(satellites, minYear, maxYear) : []),
    [satellites, minYear, maxYear],
  )

  const innerWidth  = W - margin.left - margin.right
  const innerHeight = H - margin.top  - margin.bottom

  const xScale = useMemo(
    () => scaleLinear({ domain: [minYear, maxYear], range: [0, innerWidth] }),
    [minYear, maxYear, innerWidth],
  )
  const yScale = useMemo(() => {
    const maxVal = d3.max(data, d => d.cumulative) ?? 1
    return scaleLinear({ domain: [0, maxVal], range: [innerHeight, 0], nice: true })
  }, [data, innerHeight])

  const focusYear  = Math.max(minYear, Math.min(maxYear, currentYear))
  const focusX     = xScale(focusYear)
  const focusPoint = data.find(d => d.year === focusYear) ?? data[data.length - 1]

  return (
    <div className="growth-chart-wrap">
      <p className="growth-chart-title">Cumulative objects in orbit</p>
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        className="growth-chart-svg"
      >
        <Group top={margin.top} left={margin.left}>
          {data.length > 0 && (
            <>
              <AreaClosed
                data={data}
                x={d => xScale(d.year)}
                y={d => yScale(d.cumulative)}
                yScale={yScale}
                curve={d3.curveMonotoneX}
                fill="rgba(142,215,255,0.13)"
              />
              <LinePath
                data={data}
                x={d => xScale(d.year)}
                y={d => yScale(d.cumulative)}
                curve={d3.curveMonotoneX}
                stroke="#8ed7ff"
                strokeWidth={1.8}
              />
            </>
          )}

          {/* Scrubber line */}
          <line
            x1={focusX} x2={focusX} y1={0} y2={innerHeight}
            stroke="#f8fafc"
            strokeOpacity={isActive ? 0.85 : 0.2}
            strokeDasharray="4 5"
          />

          {/* Count callout */}
          {focusPoint && isActive && (
            <text
              x={focusX + 4} y={10}
              fontSize={10} fill="#8ed7ff"
              fontFamily='"Space Grotesk", sans-serif'
            >
              {focusPoint.cumulative.toLocaleString()}
            </text>
          )}

          <AxisBottom
            top={innerHeight}
            scale={xScale}
            tickValues={[minYear, Math.round((minYear + maxYear) / 2), maxYear]}
            tickFormat={d => String(d)}
            stroke="transparent"
            tickStroke="transparent"
            tickLabelProps={() => ({
              fill: '#9dafcc',
              fontSize: 10,
              fontFamily: '"Space Grotesk", sans-serif',
              textAnchor: 'middle',
            })}
          />
        </Group>
      </svg>
    </div>
  )
}
