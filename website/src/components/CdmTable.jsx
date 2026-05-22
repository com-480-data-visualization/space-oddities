import { useState, useMemo } from 'react'
import './CdmTable.css'

const SORTERS = {
  tca_utc:   (a, b) => new Date(a.tca_utc) - new Date(b.tca_utc),
  min_rng_m: (a, b) => a.min_rng_m - b.min_rng_m,
  pc:        (a, b) => (a.pc ?? 0) - (b.pc ?? 0),
}

function formatTca(iso) {
  return new Date(iso).toISOString().slice(0, 16).replace('T', ' ') + ' UTC'
}

function formatPc(pc) {
  if (pc == null) return '—'
  if (pc < 0.0001) return '< 1×10⁻⁴'
  const exp = Math.floor(Math.log10(pc))
  const mant = (pc / Math.pow(10, exp)).toFixed(2)
  return `${mant}×10${superscript(exp)}`
}

function superscript(n) {
  return String(n).split('').map(c => '⁰¹²³⁴⁵⁶⁷⁸⁹⁻'['0123456789-'.indexOf(c)] || c).join('')
}

function rangeClass(m) {
  if (m < 100) return 'range-critical'
  if (m < 500) return 'range-warning'
  return 'range-ok'
}

export default function CdmTable({ cdms, loading, selectedCdm, onSelect }) {
  const [sortKey, setSortKey] = useState('min_rng_m')
  const [sortDir, setSortDir] = useState('asc')
  const [filterText, setFilterText] = useState('')
  const [maxRange, setMaxRange] = useState(1000)

  function handleHeader(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const filtered = useMemo(() => {
    if (!cdms.length) return []
    return cdms.filter(row => {
      if (row.min_rng_m > maxRange) return false
      if (filterText) {
        const q = filterText.toLowerCase()
        return row.sat_name_1.toLowerCase().includes(q) || row.sat_name_2.toLowerCase().includes(q)
      }
      return true
    })
  }, [cdms, maxRange, filterText])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) =>
      sortDir === 'asc' ? SORTERS[sortKey](a, b) : SORTERS[sortKey](b, a)
    )
  }, [filtered, sortKey, sortDir])

  const renderArrow = col =>
    sortKey !== col
      ? <span className="sort-neutral">⇅</span>
      : <span className="sort-active">{sortDir === 'asc' ? '↑' : '↓'}</span>

  return (
    <div className="cdm-table-panel">
      <div className="cdm-table-header">
        <span className="cdm-table-title">Conjunction Events</span>
        <span className="cdm-table-count">
          {loading ? 'Loading…' : `${sorted.length} / ${cdms.length} shown`}
        </span>
      </div>

      <div className="cdm-filters">
        <input
          className="cdm-search"
          type="text"
          placeholder="Search satellite name…"
          value={filterText}
          onChange={e => setFilterText(e.target.value)}
        />
        <label className="cdm-range-label">
          Max range <span className="cdm-range-value">{maxRange.toLocaleString()} m</span>
        </label>
        <input
          className="cdm-range-slider"
          type="range"
          min={0}
          max={5000}
          step={50}
          value={maxRange}
          onChange={e => setMaxRange(Number(e.target.value))}
        />
      </div>

      <div className="cdm-table-wrap">
        {loading ? (
          <div className="cdm-loading">Loading conjunction events…</div>
        ) : (
          <table className="cdm-table">
            <thead>
              <tr>
                <th className="col-sats">Satellites</th>
                <th className="col-tca sortable" onClick={() => handleHeader('tca_utc')}>
                  TCA {renderArrow('tca_utc')}
                </th>
                <th className="col-range sortable" onClick={() => handleHeader('min_rng_m')}>
                  Range {renderArrow('min_rng_m')}
                </th>
                <th className="col-pc sortable" onClick={() => handleHeader('pc')}>
                  Pc {renderArrow('pc')}
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(row => (
                <tr
                  key={row.cdm_id}
                  className={`cdm-row${selectedCdm?.cdm_id === row.cdm_id ? ' cdm-row--selected' : ''}`}
                  onClick={() => onSelect(row)}
                >
                  <td className="col-sats">
                    <span className="sat-name sat-name--1">{row.sat_name_1}</span>
                    <span className="sat-name sat-name--2">{row.sat_name_2}</span>
                  </td>
                  <td className="col-tca">{formatTca(row.tca_utc)}</td>
                  <td className={`col-range ${rangeClass(row.min_rng_m)}`}>
                    {row.min_rng_m.toLocaleString()} m
                  </td>
                  <td className="col-pc">{formatPc(row.pc)}</td>
                </tr>
              ))}
              {!loading && sorted.length === 0 && (
                <tr>
                  <td colSpan={4} className="cdm-empty">No events match the current filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {selectedCdm && (
        <div className="cdm-selected-note">
          <strong>{selectedCdm.sat_name_1}</strong>
          <span className="cdm-selected-sep">×</span>
          <strong>{selectedCdm.sat_name_2}</strong>
          <button className="cdm-clear" onClick={() => onSelect(null)}>clear</button>
        </div>
      )}
    </div>
  )
}
