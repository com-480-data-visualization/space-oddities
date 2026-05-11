import { useMemo } from 'react'
import * as d3 from 'd3'
import './TypeBreakdownChart.css'

const COLORS = {
  payload: '#7dd3fc',
  debris: '#fb7185',
  'rocket body': '#fbbf24',
  other: '#9ca3af',
}

const LABELS = {
  payload: 'Payloads',
  debris: 'Debris',
  'rocket body': 'Rocket bodies',
  other: 'Other',
}

const ORDER = ['payload', 'debris', 'rocket body', 'other']

export default function TypeBreakdownChart({ satellites, selectedCategory, onSelectCategory }) {
  const data = useMemo(() => {
    const counts = new Map(ORDER.map(key => [key, 0]))
    for (const sat of satellites) {
      counts.set(sat.category, (counts.get(sat.category) || 0) + 1)
    }
    return ORDER.map(key => ({ key, label: LABELS[key], value: counts.get(key) || 0 }))
  }, [satellites])

  const total = d3.sum(data, d => d.value)
  const pie = d3.pie().value(d => d.value).sort(null)(data)
  const arc = d3.arc().innerRadius(48).outerRadius(76).cornerRadius(2)

  return (
    <div className="type-chart">
      <svg className="type-donut" viewBox="0 0 180 180" aria-label="Object type breakdown">
        <g transform="translate(90,90)">
          {pie.map(slice => {
            const isActive = selectedCategory === slice.data.key
            const isDimmed = selectedCategory !== 'all' && !isActive
            return (
              <path
                key={slice.data.key}
                d={arc(slice)}
                fill={COLORS[slice.data.key]}
                opacity={isDimmed ? 0.22 : 0.95}
                className="type-slice"
                onClick={() => onSelectCategory(isActive ? 'all' : slice.data.key)}
              />
            )
          })}
          <text className="type-total" textAnchor="middle" y="-4">{total.toLocaleString()}</text>
          <text className="type-total-label" textAnchor="middle" y="15">objects</text>
        </g>
      </svg>

      <div className="type-legend">
        {data.map(d => (
          <button
            key={d.key}
            className={`type-legend-row${selectedCategory === d.key ? ' type-legend-row--active' : ''}`}
            onClick={() => onSelectCategory(selectedCategory === d.key ? 'all' : d.key)}
          >
            <span className="type-swatch" style={{ backgroundColor: COLORS[d.key] }} />
            <span className="type-label">{d.label}</span>
            <span className="type-value">{d.value.toLocaleString()}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
