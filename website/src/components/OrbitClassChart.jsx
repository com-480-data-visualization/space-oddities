import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import './OrbitClassChart.css'

const COLORS = {
  LEO: '#67e8f9',
  MEO: '#f59e0b',
  GEO: '#f472b6',
}

export default function OrbitClassChart({ satellites, onBandHover }) {
  const svgRef = useRef(null)

  useEffect(() => {
    if (!satellites.length || !svgRef.current) return

    const data = d3.rollups(satellites, v => v.length, d => d.orbitBand)
      .sort((a, b) => d3.ascending(a[0], b[0]))
      .map(([label, value]) => ({ label, value }))

    const width = 360
    const height = 160
    const m = { top: 8, right: 8, bottom: 24, left: 8 }

    const x = d3.scaleBand().domain(data.map(d => d.label)).range([m.left, width - m.right]).padding(0.35)
    const y = d3.scaleLinear().domain([0, d3.max(data, d => d.value) || 1]).nice().range([height - m.bottom, m.top])

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    svg.selectAll('rect.bar')
      .data(data)
      .join('rect')
      .attr('class', 'bar')
      .attr('x', d => x(d.label))
      .attr('y', d => y(d.value))
      .attr('width', x.bandwidth())
      .attr('height', d => y(0) - y(d.value))
      .attr('fill', d => COLORS[d.label] ?? '#9ca3af')
      .attr('rx', 4)
      .attr('opacity', 0.88)
      .on('mouseenter', (_, d) => onBandHover?.(d.label))
      .on('mouseleave', () => onBandHover?.(null))

    // value labels
    svg.selectAll('text.val')
      .data(data)
      .join('text')
      .attr('class', 'val')
      .attr('x', d => x(d.label) + x.bandwidth() / 2)
      .attr('y', d => y(d.value) - 4)
      .attr('text-anchor', 'middle')
      .attr('font-size', 10)
      .attr('fill', d => COLORS[d.label] ?? '#9ca3af')
      .text(d => d.value.toLocaleString())

    svg.selectAll('text.tick')
      .data(data)
      .join('text')
      .attr('class', 'tick')
      .attr('x', d => x(d.label) + x.bandwidth() / 2)
      .attr('y', height - 7)
      .attr('text-anchor', 'middle')
      .attr('font-size', 11)
      .attr('fill', '#9dafcc')
      .text(d => d.label)
  }, [satellites, onBandHover])

  return (
    <div className="orbit-class-wrap">
      <p className="orbit-class-title">Objects by orbit class</p>
      <svg
        ref={svgRef}
        className="orbit-class-svg"
        viewBox="0 0 360 160"
        preserveAspectRatio="none"
      />
    </div>
  )
}
