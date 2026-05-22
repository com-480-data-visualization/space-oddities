import { useState, useEffect, useMemo } from 'react'
import { AreaStack } from '@visx/shape'
import { AxisBottom, AxisLeft } from '@visx/axis'
import { GridRows } from '@visx/grid'
import { Group } from '@visx/group'
import { scaleLinear } from '@visx/scale'
import { ParentSize } from '@visx/responsive'
import * as d3 from 'd3'
import './DebrisGrowthChart.css'

const EVENTS = [
  {
    year: 2007, label: 'Fengyun-1C ASAT', id: 'fengyun', color: '#ef4444', added: '~3 500', anchor: 'top',
    description: "China destroyed its own Fengyun-1C weather satellite at 865 km altitude — the single largest debris cloud in history. Most of the 3,500+ fragments remain in high orbit and will for centuries.",
    fragments: '~3,500 trackable fragments',
    url: 'https://en.wikipedia.org/wiki/2007_Chinese_anti-satellite_missile_test',
  },
  {
    year: 2009, label: 'Iridium × Cosmos', id: 'iridium', color: '#f97316', added: '~2 000', anchor: 'bottom',
    description: "The first accidental collision between two intact satellites: Iridium 33 struck defunct Cosmos 2251 at 790 km at 11.6 km/s. The debris cloud still threatens spacecraft in the same orbital shell.",
    fragments: '~2,000 trackable fragments',
    url: 'https://en.wikipedia.org/wiki/2009_satellite_collision',
  },
  {
    year: 2019, label: 'Starlink era', id: 'starlink', color: '#8b5cf6', added: null, anchor: 'top',
    description: "SpaceX began mass-deploying Starlink in 2019. The constellation has grown to 6,000+ satellites — more than all satellites launched in the prior six decades combined, fundamentally changing orbital density.",
    fragments: null,
    url: 'https://en.wikipedia.org/wiki/Starlink',
  },
  {
    year: 2021, label: 'Cosmos 1408 ASAT', id: 'cosmos', color: '#ef4444', added: '~1 500', anchor: 'top',
    description: "Russia's Nudol missile struck Cosmos 1408 at 490 km, generating 1,500+ fragments. ISS astronauts were forced to shelter multiple times as debris swept through their orbit.",
    fragments: '~1,500 trackable fragments',
    url: 'https://en.wikipedia.org/wiki/Kosmos_1408',
  },
  {
    year: 2022, label: 'CZ-6A explosion', id: 'cz6a', color: '#f97316', added: '~780', anchor: 'bottom',
    description: "A Chinese CZ-6A rocket upper stage exploded spontaneously after launch, likely from residual propellant overpressurization, scattering ~780 pieces across 300–1,600 km.",
    fragments: '~780 trackable pieces',
    url: 'https://en.wikipedia.org/wiki/Long_March_6A',
  },
]

const STACK_KEYS  = ['payload', 'rocket', 'debris', 'event_debris']
const AREA_COLORS = {
  event_debris: 'rgba(239, 68, 68, 0.75)',
  debris:       'rgba(239, 68, 68, 0.30)',
  rocket:       'rgba(249,115, 22, 0.30)',
  payload:      'rgba( 34,211,238, 0.20)',
}

const LEGEND_ITEMS = [
  { key: 'event_debris', label: 'ASAT/collision debris', fill: 'rgba(239,68,68,0.85)'  },
  { key: 'debris',       label: 'Other debris',          fill: 'rgba(239,68,68,0.45)'  },
  { key: 'rocket',       label: 'Rocket bodies',         fill: 'rgba(249,115,22,0.55)' },
  { key: 'payload',      label: 'Payloads',              fill: 'rgba(34,211,238,0.55)' },
]

const SPLIT   = 0.68
const margin  = { top: 16, right: 132, bottom: 28, left: 46 }
const GAP_PX  = 10

const tickFont = { fontFamily: '"Space Grotesk", sans-serif', fontSize: 9 }
const monoFont = { fontFamily: '"Space Mono", monospace',     fontSize: 9 }

// ── inner chart (SVG only, no interaction logic) ──────────────────────────────

function Chart({ width, height, series, hoveredEvent, activeEvent }) {
  const innerWidth = width  - margin.left - margin.right
  const upperH     = Math.floor((height - margin.top - margin.bottom - GAP_PX) * SPLIT)
  const lowerH     = height - margin.top - margin.bottom - GAP_PX - upperH

  const xScale = useMemo(
    () => scaleLinear({ domain: [1957, 2026], range: [0, innerWidth] }),
    [innerWidth],
  )

  const yMax = useMemo(
    () => d3.max(series, d => d.cum_debris + d.cum_rocket + d.cum_payload + d.cum_event_debris) ?? 0,
    [series],
  )
  const yCumul = useMemo(
    () => scaleLinear({ domain: [0, yMax * 1.05], range: [upperH, 0], nice: true }),
    [yMax, upperH],
  )

  const maxAnnual = useMemo(
    () => d3.max(series, d => d.ann_debris + d.ann_rocket + d.ann_payload + d.ann_event_debris) ?? 1,
    [series],
  )
  const yDelta = useMemo(
    () => scaleLinear({ domain: [0, maxAnnual * 1.1], range: [lowerH, 0], nice: true }),
    [maxAnnual, lowerH],
  )

  if (innerWidth <= 0 || !series.length) return null

  const stackData = series.map(d => ({
    year:         d.year,
    payload:      d.cum_payload,
    rocket:       d.cum_rocket,
    debris:       d.cum_debris,
    event_debris: d.cum_event_debris,
  }))

  const totalPath = d3.line()
    .x(d => xScale(d.year))
    .y(d => yCumul(d.cum_debris + d.cum_rocket + d.cum_payload + d.cum_event_debris))
    .curve(d3.curveLinear)(series)

  const barWidth = Math.max(1, innerWidth / (2026 - 1957))

  return (
    <svg width={width} height={height} style={{ display: 'block', overflow: 'visible' }}>
      {/* ── UPPER PANEL ──────────────────────────────────────────────────── */}
      <Group top={margin.top} left={margin.left}>
        <GridRows scale={yCumul} width={innerWidth} numTicks={4}
          stroke="rgba(255,255,255,0.05)" strokeDasharray="2 3" />

        <AreaStack keys={STACK_KEYS} data={stackData}
          x={d => xScale(d.data.year)}
          y0={d => yCumul(d[0])}
          y1={d => yCumul(d[1])}
          curve={d3.curveLinear}
        >
          {({ stacks, path }) =>
            stacks.map(stack => (
              <path key={stack.key} d={path(stack) ?? ''} fill={AREA_COLORS[stack.key]} />
            ))
          }
        </AreaStack>

        <path d={totalPath ?? ''} fill="none" stroke="rgba(239,68,68,0.45)" strokeWidth={1.5} />

        {EVENTS.map(ev => {
          const highlight = hoveredEvent?.id === ev.id || activeEvent?.id === ev.id
          const ex        = xScale(ev.year)
          const labelY    = ev.anchor === 'top' ? 11 : upperH - 6
          return (
            <g key={ev.id} opacity={highlight ? 1 : 0.38} style={{ transition: 'opacity 150ms ease' }}>
              <line x1={ex} x2={ex} y1={0} y2={upperH}
                stroke={ev.color} strokeWidth={highlight ? 2.5 : 1} strokeDasharray="3 4" />
              {ev.added && (
                <g>
                  <rect x={ex + 3} y={labelY - 10} width={54} height={13}
                    rx={2} fill={`${ev.color}22`} />
                  <text x={ex + 6} y={labelY} fontSize={8.5} fill={highlight ? ev.color : '#64748b'}
                    {...monoFont} fontWeight={highlight ? 700 : 400}>
                    {ev.added} pcs
                  </text>
                </g>
              )}
            </g>
          )
        })}

        <AxisLeft scale={yCumul} numTicks={4}
          tickFormat={d => (d >= 1000 ? `${d / 1000}k` : String(d))}
          stroke="transparent" tickStroke="transparent"
          tickLabelProps={() => ({ ...tickFont, fill: '#64748b', textAnchor: 'end', dx: '-0.4em', dy: '0.33em' })}
        />
        <text x={4} y={8} fontSize={8} fill="#4b5563" {...tickFont}>cumulative total</text>
      </Group>

      {/* ── LOWER PANEL ──────────────────────────────────────────────────── */}
      <Group top={margin.top + upperH + GAP_PX} left={margin.left}>
        {series.map(d => {
          const bx       = xScale(d.year) - barWidth / 2
          const eventH   = yDelta(0) - yDelta(d.ann_event_debris)
          const debrisH  = yDelta(0) - yDelta(d.ann_debris)
          const rocketH  = yDelta(0) - yDelta(d.ann_rocket)
          const payloadH = yDelta(0) - yDelta(d.ann_payload)
          let y0 = lowerH
          return (
            <g key={d.year}>
              {d.ann_payload > 0 && <rect x={bx} y={(y0 -= payloadH)} width={barWidth} height={payloadH} fill="rgba(34,211,238,0.5)" />}
              {d.ann_rocket  > 0 && <rect x={bx} y={(y0 -= rocketH)}  width={barWidth} height={rocketH}  fill="rgba(249,115,22,0.5)" />}
              {d.ann_debris  > 0 && <rect x={bx} y={(y0 -= debrisH)}  width={barWidth} height={debrisH}  fill="rgba(239,68,68,0.5)"  />}
              {d.ann_event_debris > 0 && <rect x={bx} y={(y0 -= eventH)} width={barWidth} height={eventH} fill="rgba(239,68,68,0.9)" />}
            </g>
          )
        })}

        {EVENTS.map(ev => {
          const highlight = hoveredEvent?.id === ev.id || activeEvent?.id === ev.id
          const ex        = xScale(ev.year)
          return (
            <line key={ev.id} x1={ex} x2={ex} y1={0} y2={lowerH}
              stroke={ev.color} strokeWidth={highlight ? 1.5 : 0.8}
              strokeDasharray="3 4" opacity={highlight ? 0.9 : 0.3}
              style={{ transition: 'opacity 150ms ease' }}
            />
          )
        })}

        <AxisLeft scale={yDelta} numTicks={3}
          tickFormat={d => (d >= 1000 ? `${d / 1000}k` : String(d))}
          stroke="transparent" tickStroke="transparent"
          tickLabelProps={() => ({ ...tickFont, fill: '#4b5563', textAnchor: 'end', dx: '-0.4em', dy: '0.33em' })}
        />
        <text x={4} y={8} fontSize={8} fill="#4b5563" {...tickFont}>added per year</text>
      </Group>

      {/* ── X AXIS ───────────────────────────────────────────────────────── */}
      <Group top={margin.top + upperH + GAP_PX + lowerH} left={margin.left}>
        <AxisBottom top={0} scale={xScale}
          tickValues={[1957, 1970, 1980, 1990, 2000, 2010, 2020, 2026]}
          tickFormat={d => String(d)}
          stroke="rgba(255,255,255,0.08)" tickStroke="transparent"
          tickLabelProps={() => ({ ...tickFont, fill: '#64748b', textAnchor: 'middle' })}
        />
      </Group>

      {/* ── LEGEND ───────────────────────────────────────────────────────── */}
      <Group top={margin.top + 4} left={width - margin.right + 12}>
        {LEGEND_ITEMS.map(({ key, label, fill }, i) => (
          <g key={key} transform={`translate(0,${i * 16})`}>
            <rect width={10} height={10} rx={2} fill={fill} />
            <text x={14} y={9} fill="#9dafcc" {...tickFont}>{label}</text>
          </g>
        ))}
      </Group>

      {/* ── EVENT LABELS ─────────────────────────────────────────────────── */}
      <Group top={margin.top + 72} left={width - margin.right + 12}>
        <text y={0} fontSize={8} fill="#4b5563" {...tickFont}>Key events</text>
        {EVENTS.map(({ id, year, color }, i) => {
          const highlight = hoveredEvent?.id === id || activeEvent?.id === id
          return (
            <g key={id} transform={`translate(0,${i * 16 + 10})`}
              opacity={highlight ? 1 : 0.5} style={{ transition: 'opacity 150ms ease' }}>
              <line x1={0} x2={8} y1={4} y2={4} stroke={color} strokeWidth={highlight ? 2.5 : 1.5} />
              <text x={12} y={8} fontSize={8} fill={highlight ? color : '#64748b'} {...tickFont}>{year}</text>
            </g>
          )
        })}
      </Group>
    </svg>
  )
}

// ── outer wrapper ─────────────────────────────────────────────────────────────

export default function DebrisGrowthChart({ hoveredEvent }) {
  const [series,      setSeries]      = useState([])
  const [activeEvent, setActiveEvent] = useState(null)

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/debris_history.json`)
      .then(r => r.json())
      .then(setSeries)
      .catch(console.error)
  }, [])

  const toggleEvent = ev => {
    setActiveEvent(prev => prev?.id === ev.id ? null : ev)
  }

  return (
    <div className="debris-growth-wrap">
      <p className="debris-growth-title">
        Tracked objects by type · 1957–2026
        <span className="debris-growth-sub"> — top: cumulative · bottom: added per year</span>
      </p>

      <ParentSize debounceTime={10}>
        {({ width }) => (
          <Chart
            width={width || 540}
            height={280}
            series={series}
            hoveredEvent={hoveredEvent}
            activeEvent={activeEvent}
          />
        )}
      </ParentSize>

      {/* Clickable event chips */}
      <div className="dg-event-chips">
        {EVENTS.map(ev => (
          <button
            key={ev.id}
            className={`dg-chip${activeEvent?.id === ev.id ? ' dg-chip--active' : ''}`}
            style={{
              '--chip-color': ev.color,
            }}
            onClick={() => toggleEvent(ev)}
          >
            <span className="dg-chip-dot" />
            {ev.year} · {ev.label}
          </button>
        ))}
      </div>

      {/* Event detail panel */}
      {activeEvent && (
        <div className="dg-event-panel" style={{ '--panel-color': activeEvent.color }}>
          <div className="dg-event-panel-header">
            <div className="dg-event-panel-title">
              <span className="dg-event-panel-name">{activeEvent.label}</span>
              <span className="dg-event-panel-year">{activeEvent.year}</span>
            </div>
            <button className="dg-event-panel-close" onClick={() => setActiveEvent(null)}>✕</button>
          </div>
          <p className="dg-event-panel-desc">{activeEvent.description}</p>
          <div className="dg-event-panel-footer">
            {activeEvent.fragments && (
              <span className="dg-event-panel-frags">{activeEvent.fragments}</span>
            )}
            <a
              href={activeEvent.url}
              target="_blank"
              rel="noopener noreferrer"
              className="dg-event-panel-link"
            >
              Wikipedia →
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
