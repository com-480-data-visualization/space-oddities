import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import './GrowthChart.css'

export default function GrowthChart({ satellites, currentYear, yearRange, isActive }) {
  const svgRef = useRef(null)

  useEffect(() => {
    if (!satellites.length || !svgRef.current) return

    const [minYear, maxYear] = yearRange
    const validYears = satellites.map(d => d.launchYear).filter(Number.isFinite).sort((a, b) => a - b)
    const byYear = d3.rollups(validYears, v => v.length, d => d).sort((a, b) => a[0] - b[0])

    let running = 0
    const yearly = byYear.map(([year, count]) => ({ year, count }))
    const cumulative = yearly.map(d => { running += d.count; return { year: d.year, count: running } })

    const width = 360
    const height = 160
    const m = { top: 8, right: 8, bottom: 22, left: 28 }

    const x = d3.scaleLinear().domain([minYear, maxYear]).range([m.left, width - m.right])
    const yL = d3.scaleLinear().domain([0, d3.max(yearly, d => d.count) || 1]).nice().range([height - m.bottom, m.top])
    const yC = d3.scaleLinear().domain([0, d3.max(cumulative, d => d.count) || 1]).nice().range([height - m.bottom, m.top])

    const line = d3.line().x(d => x(d.year)).y(d => yL(d.count)).curve(d3.curveMonotoneX)
    const area = d3.area().x(d => x(d.year)).y0(height - m.bottom).y1(d => yC(d.count)).curve(d3.curveMonotoneX)

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    svg.append('path')
      .datum(cumulative)
      .attr('d', area)
      .attr('fill', 'rgba(142, 215, 255, 0.15)')

    svg.append('path')
      .datum(yearly)
      .attr('d', line)
      .attr('fill', 'none')
      .attr('stroke', '#8ed7ff')
      .attr('stroke-width', 1.7)

    const focusX = x(Math.max(minYear, Math.min(maxYear, currentYear)))
    svg.append('line')
      .attr('x1', focusX).attr('x2', focusX)
      .attr('y1', m.top).attr('y2', height - m.bottom)
      .attr('stroke', '#f8fafc')
      .attr('stroke-opacity', isActive ? 0.85 : 0.2)
      .attr('stroke-dasharray', '4 5')

    // year axis ticks
    const ticks = [minYear, Math.round((minYear + maxYear) / 2), maxYear]
    svg.selectAll('text.xt')
      .data(ticks)
      .join('text')
      .attr('class', 'xt')
      .attr('x', d => x(d))
      .attr('y', height - 5)
      .attr('text-anchor', 'middle')
      .attr('font-size', 10)
      .attr('fill', '#9dafcc')
      .text(d => d)

    // count label at focus
    const focusData = cumulative.find(d => d.year === Math.max(minYear, Math.min(maxYear, currentYear)))
      || cumulative[cumulative.length - 1]
    if (focusData && isActive) {
      svg.append('text')
        .attr('x', focusX + 5)
        .attr('y', m.top + 10)
        .attr('font-size', 10)
        .attr('fill', '#8ed7ff')
        .text(focusData.count.toLocaleString())
    }
  }, [satellites, currentYear, yearRange, isActive])

  return (
    <div className="growth-chart-wrap">
      <p className="growth-chart-title">Yearly launches + cumulative</p>
      <svg
        ref={svgRef}
        className="growth-chart-svg"
        viewBox="0 0 360 160"
        preserveAspectRatio="none"
      />
    </div>
  )
}
