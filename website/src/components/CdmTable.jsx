import { useState } from 'react'
import './CdmTable.css'

const DUMMY_CDMS = [
  {
    cdm_id: '1380052835',
    tca_utc: '2026-03-14T11:33:26Z',
    min_rng_m: 385,
    pc: 0.001137,
    norad_id_1: '15825', sat_name_1: 'ARABSAT 1B',
    norad_id_2: '20041', sat_name_2: 'DFS 1',
  },
  {
    cdm_id: '1380053218',
    tca_utc: '2026-03-13T23:40:10Z',
    min_rng_m: 61,
    pc: 0.000323,
    norad_id_1: '23205', sat_name_1: 'COSMOS 2288',
    norad_id_2: '23398', sat_name_2: 'COSMOS 2294',
  },
  {
    cdm_id: '1430464366',
    tca_utc: '2026-04-13T03:44:28Z',
    min_rng_m: 103,
    pc: 0.000141,
    norad_id_1: '54316', sat_name_1: 'STARLINK-5420',
    norad_id_2: '60693', sat_name_2: 'SL-8 R/B',
  },
  {
    cdm_id: '1430468818',
    tca_utc: '2026-04-10T18:51:51Z',
    min_rng_m: 84,
    pc: 0.000370,
    norad_id_1: '55189', sat_name_1: 'STARLINK-5701',
    norad_id_2: '33917', sat_name_2: 'COSMOS 2251 DEB',
  },
  {
    cdm_id: '1430529063',
    tca_utc: '2026-04-12T04:13:06Z',
    min_rng_m: 500,
    pc: 0.001899,
    norad_id_1: '60214', sat_name_1: 'ONEWEB-0512',
    norad_id_2: '62733', sat_name_2: 'IRIDIUM 33 DEB',
  },
  {
    cdm_id: '1430470791',
    tca_utc: '2026-04-11T22:55:31Z',
    min_rng_m: 1240,
    pc: null,
    norad_id_1: '56239', sat_name_1: 'STARLINK-5890',
    norad_id_2: '60688', sat_name_2: 'COSMOS 2004 DEB',
  },
]

const SORTERS = {
  tca_utc:   (a, b) => new Date(a.tca_utc)  - new Date(b.tca_utc),
  min_rng_m: (a, b) => a.min_rng_m - b.min_rng_m,
  pc:        (a, b) => (a.pc ?? 0) - (b.pc ?? 0),
}

function formatTca(iso) {
  return new Date(iso).toISOString().slice(0, 16).replace('T', ' ') + ' UTC'
}

function formatPc(pc) {
  if (pc == null) return '—'
  if (pc < 0.0001) return '< 1×10⁻⁴'
  return pc.toExponential(2)
}

function rangeClass(m) {
  if (m < 100) return 'range-critical'
  if (m < 500) return 'range-warning'
  return 'range-ok'
}

export default function CdmTable({ selectedCdm, onSelect }) {
  const [sortKey, setSortKey] = useState('min_rng_m')
  const [sortDir, setSortDir] = useState('asc')
  const [filterText, setFilterText] = useState('')
  const [maxRange, setMaxRange] = useState(5000)

  function handleHeader(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const filtered = DUMMY_CDMS.filter(row => {
    if (row.min_rng_m > maxRange) return false
    if (filterText) {
      const q = filterText.toLowerCase()
      return row.sat_name_1.toLowerCase().includes(q) || row.sat_name_2.toLowerCase().includes(q)
    }
    return true
  })

  const sorted = [...filtered].sort((a, b) =>
    sortDir === 'asc' ? SORTERS[sortKey](a, b) : SORTERS[sortKey](b, a)
  )

  const renderArrow = (col) => {
    if (sortKey !== col) return <span className="sort-neutral">⇅</span>
    return <span className="sort-active">{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  return (
    <div className="cdm-table-panel">
      <div className="cdm-table-header">
        <span className="cdm-table-title">Conjunction Events</span>
        <span className="cdm-table-count">{sorted.length} / {DUMMY_CDMS.length} shown</span>
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
          Max range
          <span className="cdm-range-value">{maxRange.toLocaleString()} m</span>
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
            {sorted.length === 0 && (
              <tr>
                <td colSpan={4} className="cdm-empty">No events match the current filters.</td>
              </tr>
            )}
          </tbody>
        </table>
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
