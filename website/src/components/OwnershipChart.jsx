import { useMemo } from 'react'
import './OwnershipChart.css'

const TOP_N = 7

function topCounts(satellites, key) {
  const counts = new Map()
  for (const sat of satellites) {
    const label = sat[key]
    if (!label || label === 'Unknown') continue
    counts.set(label, (counts.get(label) || 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_N)
    .map(([label, value]) => ({ label, value }))
}

function OwnershipBars({ title, kind, data, highlight, onHighlight }) {
  const max = Math.max(...data.map(d => d.value), 1)

  return (
    <div className={`ownership-group ownership-group--${kind}`}>
      <p className="ownership-title">{title}</p>
      <div className="ownership-bars">
        {data.map(d => (
          <div
            key={d.label}
            className={`ownership-row${highlight?.kind === kind && highlight.value === d.label ? ' ownership-row--active' : ''}`}
            onMouseEnter={() => onHighlight({ kind, value: d.label })}
            onMouseLeave={() => onHighlight(null)}
          >
            <span className="ownership-label">{d.label}</span>
            <div className="ownership-track">
              <div className="ownership-fill" style={{ width: `${(d.value / max) * 100}%` }} />
            </div>
            <span className="ownership-value">{d.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function OwnershipChart({ satellites, highlight, onHighlight }) {
  const countries = useMemo(() => topCounts(satellites, 'country'), [satellites])
  const operators = useMemo(() => topCounts(satellites, 'operator'), [satellites])

  return (
    <div className="ownership-chart">
      <OwnershipBars title="Satellites by country" kind="country" data={countries} highlight={highlight} onHighlight={onHighlight} />
      <OwnershipBars title="Satellites by operator" kind="operator" data={operators} highlight={highlight} onHighlight={onHighlight} />
    </div>
  )
}
