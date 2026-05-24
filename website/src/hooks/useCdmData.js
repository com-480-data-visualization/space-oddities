import { useState, useEffect } from 'react'
import * as d3 from 'd3'

const BASE = import.meta.env.BASE_URL

export function useCdmData(satellites) {
  const [cdms, setCdms] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!satellites.length) return

    const nameMap = new Map(satellites.map(s => [String(s.id), s.name]))

    d3.csv(`${BASE}data/conjunction_events.csv`).then(rows => {
      const parsed = rows
        .map(r => ({
          cdm_id: r.cdm_id,
          tca_utc: r.tca_utc,
          min_rng_m: +r.min_rng_m,
          pc: r.pc !== '' && r.pc != null ? +r.pc : null,
          norad_id_1: String(r.norad_id_1),
          norad_id_2: String(r.norad_id_2),
          sat_name_1: nameMap.get(String(r.norad_id_1)) || `NORAD ${r.norad_id_1}`,
          sat_name_2: nameMap.get(String(r.norad_id_2)) || `NORAD ${r.norad_id_2}`,
        }))
        .filter(r => Number.isFinite(r.min_rng_m))
        // deduplicate: each pair appears twice (A×B and B×A) — keep the one where norad_id_1 < norad_id_2
        .filter(r => Number(r.norad_id_1) < Number(r.norad_id_2))

      setCdms(parsed)
      setLoading(false)
    })
  }, [satellites])

  return { cdms, loading }
}
