import { useRef, useEffect, useMemo } from 'react'
import * as d3 from 'd3'
import './DebrisHistoryChart.css'

export default function DebrisHistoryChart({ satellites, hoveredEvent, height = '280px' }) {
  const svgRef = useRef(null)

  // Use raw satellite data plus the known kessler events
  const debrisData = useMemo(() => {
    // 1. Group actual debris by launch year
    const debrisSats = satellites.filter(s => s.category === 'debris' && Number.isFinite(s.launchYear))
    const byYear = d3.rollup(debrisSats, v => v.length, d => d.launchYear)
    
    // 2. We need a continuous range of years
    const years = Array.from(byYear.keys())
    const minYear = d3.min(years) || 1957
    const maxYear = d3.max(years) || new Date().getFullYear()
    
    const data = []
    let cumulative = 0

    // Important: we manually add spikes for the major events to ensure they show up prominently,
    // as our dataset might not have every single fragment, or they might be assigned different years.
    const manualSpikes = {
      1996: 50,    // Cerise
      2007: 3500,  // Fengyun-1C
      2009: 2000,  // Iridium x Cosmos
      2021: 1500   // Cosmos 1408
    }

    for (let y = minYear; y <= maxYear; y++) {
      let addedThisYear = byYear.get(y) || 0
      
      // Inject known spikes if they aren't fully represented in the raw data
      if (manualSpikes[y] && addedThisYear < manualSpikes[y] / 2) {
        addedThisYear += manualSpikes[y]
      }
      
      cumulative += addedThisYear
      data.push({ year: y, count: cumulative, added: addedThisYear })
    }
    
    return data
  }, [satellites])

  useEffect(() => {
    if (!debrisData.length || !svgRef.current) return

    const svg = d3.select(svgRef.current)
    const { width, height: clientHeight } = svg.node().getBoundingClientRect()
    
    // Clear previous drawing
    svg.selectAll('*').remove()

    const margin = { top: 20, right: 30, bottom: 30, left: 50 }
    const innerWidth = width - margin.left - margin.right
    const innerHeight = clientHeight - margin.top - margin.bottom

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`)

    // Determine X domain. If hovered, zoom in on the event.
    let xDomain = d3.extent(debrisData, d => d.year)
    if (hoveredEvent && hoveredEvent.year) {
      xDomain = [hoveredEvent.year - 3, hoveredEvent.year + 3]
    }

    const x = d3.scaleLinear()
      .domain(xDomain)
      .range([0, innerWidth])

    // Y domain is always full range to keep context, or could zoom Y too.
    // Let's keep Y fixed to show the massive spikes relative to the whole.
    const maxCount = d3.max(debrisData, d => d.count) || 1
    const y = d3.scaleLinear()
      .domain([0, maxCount])
      .nice()
      .range([innerHeight, 0])

    // Axes
    const xAxis = d3.axisBottom(x).tickFormat(d3.format('d')).ticks(5)
    const yAxis = d3.axisLeft(y).ticks(5).tickFormat(d => d >= 1000 ? `${(d/1000).toFixed(1)}k` : d)

    g.append('g')
      .attr('class', 'debris-chart-axis')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)

    g.append('g')
      .attr('class', 'debris-chart-axis')
      .call(yAxis)

    // Filter data for the line if zoomed
    const visibleData = debrisData.filter(d => d.year >= xDomain[0] && d.year <= xDomain[1])

    // Area and Line
    const area = d3.area()
      .x(d => x(d.year))
      .y0(innerHeight)
      .y1(d => y(d.count))
      .curve(d3.curveMonotoneX)

    const line = d3.line()
      .x(d => x(d.year))
      .y(d => y(d.count))
      .curve(d3.curveMonotoneX)

    g.append('path')
      .datum(visibleData)
      .attr('class', 'debris-chart-area')
      .attr('d', area)

    g.append('path')
      .datum(visibleData)
      .attr('class', 'debris-chart-line')
      .attr('d', line)

    // Event Annotations
    const events = [
      { year: 1996, label: 'Cerise' },
      { year: 2007, label: 'Fengyun-1C' },
      { year: 2009, label: 'Iridium' },
      { year: 2021, label: 'Cosmos 1408' }
    ]

    events.forEach(ev => {
      // Only draw if within current zoomed view
      if (ev.year >= xDomain[0] && ev.year <= xDomain[1]) {
        const isHovered = hoveredEvent && hoveredEvent.year === ev.year
        const eventData = debrisData.find(d => d.year === ev.year)
        
        if (eventData) {
          // Vertical line
          g.append('line')
            .attr('class', `debris-chart-event-line ${isHovered ? 'highlight' : ''}`)
            .attr('x1', x(ev.year))
            .attr('x2', x(ev.year))
            .attr('y1', innerHeight)
            .attr('y2', y(eventData.count))

          // Label
          g.append('text')
            .attr('class', `debris-chart-event-label ${isHovered ? 'highlight' : ''}`)
            .attr('x', x(ev.year) - 5)
            .attr('y', y(eventData.count) - 10)
            .text(ev.label)
            
          // Dot
          if (isHovered) {
             g.append('circle')
              .attr('cx', x(ev.year))
              .attr('cy', y(eventData.count))
              .attr('r', 4)
              .attr('fill', '#fff')
          }
        }
      }
    })

  }, [debrisData, hoveredEvent])

  return (
    <div className="debris-chart-container" style={{ height }}>
      <svg ref={svgRef} className="debris-chart"></svg>
    </div>
  )
}
