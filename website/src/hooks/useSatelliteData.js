import { useState, useEffect } from 'react'
import * as d3 from 'd3'
import * as satellite from 'satellite.js'

const EARTH_RADIUS_KM = 6371
const BASE = import.meta.env.BASE_URL

const COUNTRY_LABELS = {
  US: 'USA',
  USA: 'USA',
  PRC: 'China',
  China: 'China',
  CIS: 'Russia / USSR',
  Russia: 'Russia / USSR',
  UK: 'United Kingdom',
  'United Kingdom': 'United Kingdom',
  FR: 'France',
  France: 'France',
  JPN: 'Japan',
  Japan: 'Japan',
  IND: 'India',
  India: 'India',
  IT: 'Italy',
  Italy: 'Italy',
  GER: 'Germany',
  Germany: 'Germany',
  CA: 'Canada',
  Canada: 'Canada',
  SPN: 'Spain',
  Spain: 'Spain',
  SKOR: 'South Korea',
  'South Korea': 'South Korea',
  TBD: 'Unknown',
  NR: 'Unknown',
}

function normalizeCategory(row) {
  const token = String(row.OBJECT_TYPE || '').toUpperCase()
  if (token.includes('DEB')) return 'debris'
  if (token.includes('R/B') || token.includes('ROCKET')) return 'rocket body'
  if (token.includes('PAY') || token.trim() === 'P') return 'payload'
  return 'other'
}

function parseLaunchYear(row) {
  const raw = String(row.LAUNCH_YEAR || row.LAUNCH || row.date_of_launch || '').trim()
  if (!raw) return NaN
  const year = Number(raw.slice(0, 4))
  return Number.isFinite(year) ? year : NaN
}

function isDeorbited(row, now) {
  const decayRaw = String(row.DECAY || '').trim()
  if (!decayRaw) return false
  const d = new Date(decayRaw)
  if (Number.isNaN(d.getTime())) return false
  return d <= now
}

function cleanLabel(value) {
  const label = String(value || '').trim()
  return label || 'Unknown'
}

function cleanCountry(row) {
  const raw = cleanLabel(row['country/org_of_un_registry'] || row.COUNTRY)
  if (raw.startsWith('NR ')) return 'Unknown'
  return COUNTRY_LABELS[raw] || raw
}

function inferOrbitBand(altKm) {
  if (!Number.isFinite(altKm)) return 'LEO'
  if (altKm < 2000) return 'LEO'
  if (altKm < 35786) return 'MEO'
  return 'GEO'
}

export function useSatelliteData() {
  const [satellites, setSatellites] = useState([])
  const [loading, setLoading] = useState(true)
  const [yearRange, setYearRange] = useState([1957, 2026])

  useEffect(() => {
    async function load() {
      try {
        const [objectRows, tleRows] = await Promise.all([
          d3.csv(`${BASE}data/objects.csv`),
          d3.csv(`${BASE}data/tle.csv`),
        ])

        const now = new Date()
        const tleMap = new Map()
        for (const row of tleRows) {
          const id = String(row.norad_id || '').trim()
          if (!id || id === 'norad_id' || !row.tle_line1 || !row.tle_line2) continue
          tleMap.set(id, row)
        }

        const sats = []
        for (const row of objectRows) {
          const noradId = String(row.norad_id || '').trim()
          if (!noradId || noradId === 'norad_id') continue
          if (isDeorbited(row, now)) continue
          const tle = tleMap.get(noradId)
          if (!tle) continue
          const satrec = satellite.twoline2satrec(tle.tle_line1, tle.tle_line2)
          if (!satrec || satrec.error) continue

          sats.push({
            id: noradId,
            name: row.OBJECT_NAME || row.object_name || 'Unknown',
            country: cleanCountry(row),
            operator: cleanLabel(row['operator/owner']),
            category: normalizeCategory(row),
            launchYear: parseLaunchYear(row),
            satrec,
            hasPosition: false,
            orbitBand: 'LEO',
            xyKm: 0,
            geoKm: 0,
            x: 0,
            y: 0,
          })
        }

        const years = sats.map(d => d.launchYear).filter(Number.isFinite)
        const minYear = d3.min(years) || 1957
        const maxYear = d3.max(years) || 2026

        propagateAll(sats, now)

        setSatellites(sats)
        setYearRange([minYear, maxYear])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return { satellites, loading, yearRange }
}

export function propagateAll(sats, when) {
  for (const sat of sats) {
    sat.hasPosition = false
    const prop = satellite.propagate(sat.satrec, when)
    if (!prop || !prop.position) continue
    const { x, y, z } = prop.position
    if (![x, y, z].every(Number.isFinite)) continue
    sat.xyKm = Math.sqrt(x * x + y * y)
    sat.geoKm = Math.sqrt(x * x + y * y + z * z)
    sat.orbitBand = inferOrbitBand(sat.geoKm - EARTH_RADIUS_KM)
    sat._angle = Math.atan2(y, x)
    sat.hasPosition = true
  }
}
