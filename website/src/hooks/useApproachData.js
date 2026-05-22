import { useMemo } from 'react'
import * as satellite from 'satellite.js'

export function useApproachData(cdm, satMap) {
  return useMemo(() => {
    if (!cdm || !satMap) return null
    const sat1 = satMap.get(cdm.norad_id_1)
    const sat2 = satMap.get(cdm.norad_id_2)
    if (!sat1?.satrec || !sat2?.satrec) return null

    const tca = new Date(cdm.tca_utc)
    const points = []

    for (let t = -60; t <= 60; t += 2) {
      const when = new Date(tca.getTime() + t * 60 * 1000)
      const p1 = satellite.propagate(sat1.satrec, when)
      const p2 = satellite.propagate(sat2.satrec, when)
      if (!p1?.position || !p2?.position) continue
      const dx = p1.position.x - p2.position.x
      const dy = p1.position.y - p2.position.y
      const dz = p1.position.z - p2.position.z
      const distKm = Math.sqrt(dx * dx + dy * dy + dz * dz)
      if (!Number.isFinite(distKm)) continue
      points.push({ t, distKm, distM: distKm * 1000 })
    }

    return points.length > 0 ? points : null
  }, [cdm, satMap])
}
