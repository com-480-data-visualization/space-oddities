import { useRef, useEffect, useCallback, useState } from 'react'
import * as d3 from 'd3'
import { propagateAll } from '../hooks/useSatelliteData'
import './OrbitScene.css'

const EARTH_RADIUS_KM = 6371
const MAX_PLOT_RADIUS_KM = 50000
const LOGICAL_SIZE = 1000

const BAND_REFERENCE_KM = {
  LEO: EARTH_RADIUS_KM + 1200,
  MEO: EARTH_RADIUS_KM + 20200,
  GEO: 42164,
}

const ORBIT_BAND_COLORS = {
  LEO: '#67e8f9',
  MEO: '#f59e0b',
  GEO: '#f472b6',
}

const CATEGORY_COLORS = {
  payload: '#7dd3fc',
  debris: '#fb7185',
  'rocket body': '#fbbf24',
  other: '#9ca3af',
}

const radialScale = d3.scaleSqrt()
  .domain([0, MAX_PLOT_RADIUS_KM])
  .range([104, 470])

const EARTH_R = 88
const center = { x: LOGICAL_SIZE / 2, y: LOGICAL_SIZE / 2 }

function isVisible(sat, chapter, currentYear) {
  if (chapter === 'growth') {
    return Number.isFinite(sat.launchYear) && sat.launchYear <= currentYear
  }
  return true
}

export default function OrbitScene({ satellites, activeChapter, currentYear, hoverBand }) {
  const canvasRef = useRef(null)
  const hoveredRef = useRef(null)
  const quadtreeRef = useRef(null)
  const lastPropMsRef = useRef(0)
  const [tooltip, setTooltip] = useState(null)

  // size canvas once on mount
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpi = window.devicePixelRatio || 1
    canvas.width = LOGICAL_SIZE * dpi
    canvas.height = LOGICAL_SIZE * dpi
    canvas.getContext('2d').setTransform(dpi, 0, 0, dpi, 0, 0)
  }, [])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    ctx.clearRect(0, 0, LOGICAL_SIZE, LOGICAL_SIZE)

    // orbit rings
    ctx.save()
    ctx.setLineDash([4, 8])
    ctx.strokeStyle = 'rgba(144, 165, 196, 0.22)'
    ctx.lineWidth = 1.2
    Object.entries(BAND_REFERENCE_KM).forEach(([key, km]) => {
      const r = radialScale(Math.min(km, MAX_PLOT_RADIUS_KM))
      ctx.beginPath()
      ctx.arc(center.x, center.y, r, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = activeChapter === 'altitudes' ? ORBIT_BAND_COLORS[key] : 'rgba(220, 232, 246, 0.46)'
      ctx.font = '11px "Space Grotesk", sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(key, center.x, center.y - r - 12)
      ctx.setLineDash([4, 8])
    })
    ctx.restore()

    // Earth atmosphere glow
    const glow = ctx.createRadialGradient(center.x, center.y, EARTH_R, center.x, center.y, EARTH_R + 40)
    glow.addColorStop(0, 'rgba(105, 183, 255, 0.24)')
    glow.addColorStop(1, 'rgba(105, 183, 255, 0)')
    ctx.beginPath()
    ctx.fillStyle = glow
    ctx.arc(center.x, center.y, EARTH_R + 40, 0, Math.PI * 2)
    ctx.fill()

    // Earth sphere
    const earthGrad = ctx.createRadialGradient(center.x - 30, center.y - 30, 20, center.x, center.y, EARTH_R)
    earthGrad.addColorStop(0, '#6ec8ff')
    earthGrad.addColorStop(0.62, '#1a67d4')
    earthGrad.addColorStop(1, '#062553')
    ctx.beginPath()
    ctx.fillStyle = earthGrad
    ctx.arc(center.x, center.y, EARTH_R, 0, Math.PI * 2)
    ctx.fill()

    ctx.beginPath()
    ctx.strokeStyle = 'rgba(198, 228, 255, 0.32)'
    ctx.lineWidth = 1.6
    ctx.arc(center.x, center.y, EARTH_R + 8, 0, Math.PI * 2)
    ctx.stroke()

    ctx.fillStyle = 'rgba(227, 239, 255, 0.9)'
    ctx.font = '700 22px "Space Grotesk", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Earth', center.x, center.y + 8)

    // satellites
    const rendered = []
    const hovered = hoveredRef.current

    for (const sat of satellites) {
      if (!isVisible(sat, activeChapter, currentYear)) continue

      const angle = sat._angle ?? 0
      const r = radialScale(Math.min(sat.xyKm || 0, MAX_PLOT_RADIUS_KM))
      sat.cx = center.x + Math.cos(angle) * r
      sat.cy = center.y + Math.sin(angle) * r

      const color = activeChapter === 'altitudes'
        ? (ORBIT_BAND_COLORS[sat.orbitBand] ?? ORBIT_BAND_COLORS.LEO)
        : (CATEGORY_COLORS[sat.category] ?? CATEGORY_COLORS.other)

      let alpha
      if (activeChapter === 'altitudes' && hoverBand && sat.orbitBand !== hoverBand) {
        alpha = 0.1
      } else if (hovered && hovered.id !== sat.id) {
        alpha = 0.22
      } else {
        alpha = activeChapter === 'altitudes' ? 0.9 : 0.82
      }

      ctx.beginPath()
      ctx.fillStyle = color
      ctx.globalAlpha = alpha
      ctx.arc(sat.cx, sat.cy, 1.9, 0, Math.PI * 2)
      ctx.fill()
      rendered.push(sat)
    }

    ctx.globalAlpha = 1

    if (hovered && isVisible(hovered, activeChapter, currentYear)) {
      ctx.beginPath()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 1.4
      ctx.arc(hovered.cx, hovered.cy, 5.7, 0, Math.PI * 2)
      ctx.stroke()
    }

    quadtreeRef.current = d3.quadtree(rendered, d => d.cx, d => d.cy)
  }, [satellites, activeChapter, currentYear, hoverBand])

  // animation loop
  useEffect(() => {
    if (!satellites.length) return
    let rafId

    function tick() {
      const now = Date.now()
      if (now - lastPropMsRef.current > 2000) {
        propagateAll(satellites, new Date(now))
        lastPropMsRef.current = now
      }
      draw()
      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [satellites, draw])

  function onMouseMove(e) {
    const canvas = canvasRef.current
    const qt = quadtreeRef.current
    if (!qt || !canvas) return
    const rect = canvas.getBoundingClientRect()
    const mx = ((e.clientX - rect.left) / rect.width) * LOGICAL_SIZE
    const my = ((e.clientY - rect.top) / rect.height) * LOGICAL_SIZE
    const found = qt.find(mx, my, 10) || null
    hoveredRef.current = found
    setTooltip(found ? { sat: found } : null)
  }

  function onMouseLeave() {
    hoveredRef.current = null
    setTooltip(null)
  }

  return (
    <div className="orbit-scene">
      <canvas
        ref={canvasRef}
        className="orbit-canvas"
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        aria-label="Earth-centered orbit scene"
      />
      {tooltip && (
        <div className="orbit-tooltip">
          <div className="ot-name">{tooltip.sat.name}</div>
          <div className="ot-line"><span>Orbit</span>{tooltip.sat.orbitBand}</div>
          <div className="ot-line"><span>Type</span>{tooltip.sat.category}</div>
          <div className="ot-line">
            <span>Launched</span>
            {Number.isFinite(tooltip.sat.launchYear) ? tooltip.sat.launchYear : '—'}
          </div>
        </div>
      )}
    </div>
  )
}
