import { useMemo } from 'react'
import * as d3 from 'd3'
import './TypeOwnershipWheel.css'

const TYPE_LABELS = {
  payload: 'Payloads',
  debris: 'Debris',
  'rocket body': 'Rocket bodies',
  other: 'Other',
}

const TYPE_COLORS = {
  payload: '#7dd3fc',
  debris: '#fb7185',
  'rocket body': '#fbbf24',
  other: '#9ca3af',
}

const TYPE_ORDER = ['payload', 'debris', 'rocket body', 'other']
const TOP_COUNTRIES = 7
const TOP_OPERATORS = 6

function countBy(rows, key) {
  const counts = new Map()
  for (const row of rows) counts.set(row[key], (counts.get(row[key]) || 0) + 1)
  return counts
}

function topGroups(counts, limit) {
  const named = [...counts.entries()]
    .filter(([label]) => label !== 'Unknown')
    .sort((a, b) => b[1] - a[1])

  const groups = named.slice(0, limit).map(([label, value]) => ({ label, value, values: [label] }))
  const otherValues = named.slice(limit)
  const otherTotal = d3.sum(otherValues, d => d[1])
  if (otherTotal > 0) {
    groups.push({ label: 'Other named', value: otherTotal, values: otherValues.map(d => d[0]) })
  }
  return groups
}

function buildTree(satellites) {
  const root = { label: 'All objects', children: [] }

  for (const category of TYPE_ORDER) {
    const typeRows = satellites.filter(sat => sat.category === category)
    if (!typeRows.length) continue

    const typeNode = {
      label: TYPE_LABELS[category],
      value: typeRows.length,
      filter: { category, country: null, operator: null },
      color: TYPE_COLORS[category],
      children: [],
    }

    for (const country of topGroups(countBy(typeRows, 'country'), TOP_COUNTRIES)) {
      const countryRows = typeRows.filter(sat => country.values.includes(sat.country))
      const countryFilter = country.values.length === 1
        ? { category, country: country.values[0], operator: null }
        : { category, country: country.label, countryValues: country.values, operator: null }

      const countryNode = {
        label: country.label,
        value: country.value,
        filter: countryFilter,
        color: TYPE_COLORS[category],
        muted: country.muted,
        children: [],
      }

      for (const operator of topGroups(countBy(countryRows, 'operator'), TOP_OPERATORS)) {
        countryNode.children.push({
          label: operator.label,
          value: operator.value,
          filter: operator.values.length === 1
            ? { ...countryFilter, operator: operator.values[0] }
            : { ...countryFilter, operator: operator.label, operatorValues: operator.values },
          color: TYPE_COLORS[category],
          muted: operator.muted,
        })
      }
      typeNode.children.push(countryNode)
    }
    root.children.push(typeNode)
  }

  return root
}

function sameFilter(a, b) {
  return a?.category === b?.category
    && a?.country === b?.country
    && a?.operator === b?.operator
}

export default function TypeOwnershipWheel({ satellites, filter, onFilterChange }) {
  const nodes = useMemo(() => {
    const root = d3.hierarchy(buildTree(satellites)).sum(d => d.value || 0)
    return d3.partition().size([Math.PI * 2, 92])(root).descendants().filter(d => d.depth > 0)
  }, [satellites])

  const arc = d3.arc()
    .startAngle(d => d.x0)
    .endAngle(d => d.x1)
    .innerRadius(d => 28 + d.y0)
    .outerRadius(d => 28 + d.y1 - 2)
    .padAngle(0.006)
    .cornerRadius(2)

  const activeLabel = filter.category === 'all'
    ? 'All objects'
    : [TYPE_LABELS[filter.category], filter.country, filter.operator].filter(Boolean).join(' / ')

  return (
    <div className="wheel-panel">
      <div className="wheel-header">
        <span className="wheel-selection">{activeLabel}</span>
        <button className="wheel-reset" onClick={() => onFilterChange({ category: 'all', country: null, operator: null })}>
          Reset
        </button>
      </div>

      <svg className="ownership-wheel" viewBox="-135 -135 270 270" aria-label="Type, country, and operator wheel">
        {nodes.map(node => {
          const active = sameFilter(node.data.filter, filter)
          return (
            <g key={`${node.depth}-${node.ancestors().map(d => d.data.label).join('/')}`}>
              <path
                d={arc(node)}
                fill={node.data.color}
                opacity={filter.category !== 'all' && !active && node.data.filter?.category !== filter.category ? 0.28 : 0.86}
                className={`wheel-segment${active ? ' wheel-segment--active' : ''}`}
                onClick={() => onFilterChange(node.data.filter)}
              >
                <title>{`${node.ancestors().reverse().slice(1).map(d => d.data.label).join(' / ')}: ${node.value.toLocaleString()}`}</title>
              </path>
            </g>
          )
        })}
        <circle r="30" className="wheel-center" onClick={() => onFilterChange({ category: 'all', country: null, operator: null })} />
        <text className="wheel-center-label" textAnchor="middle" y="-3">All</text>
        <text className="wheel-center-sub" textAnchor="middle" y="13">objects</text>
      </svg>

      <div className="wheel-note">
        Inner: type · middle: country · outer: operator · Unknown values hidden
      </div>
    </div>
  )
}
