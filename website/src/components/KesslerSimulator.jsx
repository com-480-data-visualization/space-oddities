import { useRef, useEffect, useState } from 'react'
import './KesslerSimulator.css'

const RINGS = [105, 152, 200]
const OBJECTS_PER_RING = 20
const FRAGS_PER_HIT = 16
const DEBRIS_SPEED = 2.8
const HIT_RADIUS = 11
const EARTH_R = 52

function initState(W, H) {
  const cx = W / 2, cy = H / 2
  const payloads = []
  let id = 0
  RINGS.forEach((r, ri) => {
    for (let i = 0; i < OBJECTS_PER_RING; i++) {
      const angle = (2 * Math.PI * i) / OBJECTS_PER_RING + ri * 0.55
      const dir = i % 3 === 0 ? -1 : 1
      const omega = dir * (0.0009 + ri * 0.00015) * (0.85 + Math.random() * 0.3)
      payloads.push({ id: id++, r, angle, omega, x: 0, y: 0, alive: true })
    }
  })
  return { cx, cy, payloads, debris: [], explosions: [] }
}

export default function KesslerSimulator({ height = '400px' }) {
  const canvasRef = useRef(null)
  const stateRef = useRef(null)
  const rafRef = useRef(null)
  const [stats, setStats] = useState({ payloads: RINGS.length * OBJECTS_PER_RING, debris: 0, status: 'nominal' })
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const container = canvas.parentElement
    const W = container.clientWidth || 680
    const H = parseInt(height) || 380
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')
    stateRef.current = initState(W, H)
    let frameCount = 0

    function tick() {
      frameCount++
      const s = stateRef.current
      const { cx, cy } = s

      // Orbital motion
      for (const p of s.payloads) {
        p.angle += p.omega
        p.x = cx + p.r * Math.cos(p.angle)
        p.y = cy + p.r * Math.sin(p.angle)
      }

      // Debris motion + collision detection
      if (s.debris.length > 0) {
        for (const d of s.debris) {
          d.x += d.vx
          d.y += d.vy
        }

        // Check debris vs payloads
        const newFrags = []
        const newBursts = []
        for (const p of s.payloads) {
          if (!p.alive) continue
          for (const d of s.debris) {
            const dx = p.x - d.x, dy = p.y - d.y
            if (dx * dx + dy * dy < HIT_RADIUS * HIT_RADIUS) {
              p.alive = false
              newBursts.push({ x: p.x, y: p.y, r: 0, maxR: 45, life: 1 })
              for (let i = 0; i < FRAGS_PER_HIT; i++) {
                const a = Math.random() * Math.PI * 2
                const spd = Math.random() * DEBRIS_SPEED + 0.6
                newFrags.push({ x: p.x, y: p.y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd })
              }
              break
            }
          }
        }
        s.explosions.push(...newBursts)
        s.debris.push(...newFrags)

        s.debris = s.debris.filter(d =>
          d.x > -80 && d.x < W + 80 && d.y > -80 && d.y < H + 80
        )
        s.payloads = s.payloads.filter(p => p.alive)
      }

      // Explosion animation
      for (const e of s.explosions) {
        e.r += (e.maxR - e.r) * 0.14
        e.life -= 0.035
      }
      s.explosions = s.explosions.filter(e => e.life > 0)

      // Stats update (every 6 frames to avoid excessive re-renders)
      if (frameCount % 6 === 0) {
        const alive = s.payloads.length
        const deb = s.debris.length
        setStats({
          payloads: alive,
          debris: deb,
          status: deb > 350 ? 'cascading' : deb > 40 ? 'critical' : 'nominal',
        })
      }

      // --- Render ---
      ctx.clearRect(0, 0, W, H)

      // Space background
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.75)
      bg.addColorStop(0, 'rgba(18, 30, 60, 0.5)')
      bg.addColorStop(1, 'rgba(4, 8, 18, 1)')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, W, H)

      // Orbit rings
      RINGS.forEach((r, ri) => {
        ctx.beginPath()
        ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.strokeStyle = ri === 0 ? 'rgba(59,130,246,0.12)' : ri === 1 ? 'rgba(59,130,246,0.09)' : 'rgba(59,130,246,0.06)'
        ctx.lineWidth = 1
        ctx.setLineDash([4, 8])
        ctx.stroke()
        ctx.setLineDash([])
      })

      // Earth glow halo
      const halo = ctx.createRadialGradient(cx, cy, EARTH_R * 0.9, cx, cy, EARTH_R * 1.8)
      halo.addColorStop(0, 'rgba(59,130,246,0.18)')
      halo.addColorStop(1, 'rgba(59,130,246,0)')
      ctx.beginPath()
      ctx.arc(cx, cy, EARTH_R * 1.8, 0, Math.PI * 2)
      ctx.fillStyle = halo
      ctx.fill()

      // Earth
      const eg = ctx.createRadialGradient(cx - EARTH_R * 0.3, cy - EARTH_R * 0.3, 0, cx, cy, EARTH_R)
      eg.addColorStop(0, '#2563eb')
      eg.addColorStop(0.7, '#1d4ed8')
      eg.addColorStop(1, '#1e3a8a')
      ctx.beginPath()
      ctx.arc(cx, cy, EARTH_R, 0, Math.PI * 2)
      ctx.fillStyle = eg
      ctx.fill()

      // Explosion rings
      for (const e of s.explosions) {
        ctx.beginPath()
        ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(251,113,133,${e.life * 0.9})`
        ctx.lineWidth = 2.5
        ctx.stroke()
        // inner flash
        if (e.life > 0.6) {
          ctx.beginPath()
          ctx.arc(e.x, e.y, e.r * 0.35, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(254,215,170,${(e.life - 0.6) * 2})`
          ctx.fill()
        }
      }

      // Alive payloads
      for (const p of s.payloads) {
        ctx.shadowColor = '#38bdf8'
        ctx.shadowBlur = 7
        ctx.beginPath()
        ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2)
        ctx.fillStyle = '#7dd3fc'
        ctx.fill()
      }
      ctx.shadowBlur = 0

      // Debris
      for (const d of s.debris) {
        ctx.beginPath()
        ctx.arc(d.x, d.y, 1.8, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(251,113,133,0.75)'
        ctx.fill()
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)

    function handleClick(e) {
      const rect = canvas.getBoundingClientRect()
      const mx = (e.clientX - rect.left) * (W / rect.width)
      const my = (e.clientY - rect.top) * (H / rect.height)
      const s = stateRef.current
      let best = null, bestD = Infinity
      for (const p of s.payloads) {
        const d = Math.hypot(p.x - mx, p.y - my)
        if (d < bestD) { best = p; bestD = d }
      }
      if (best && bestD < 22) {
        best.alive = false
        s.explosions.push({ x: best.x, y: best.y, r: 0, maxR: 45, life: 1 })
        for (let i = 0; i < FRAGS_PER_HIT; i++) {
          const a = Math.random() * Math.PI * 2
          const spd = Math.random() * DEBRIS_SPEED + 0.6
          s.debris.push({ x: best.x, y: best.y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd })
        }
        s.payloads = s.payloads.filter(p => p.alive)
        setStarted(true)
      }
    }

    canvas.addEventListener('click', handleClick)
    return () => {
      cancelAnimationFrame(rafRef.current)
      canvas.removeEventListener('click', handleClick)
    }
  }, [height])

  function handleReset() {
    const canvas = canvasRef.current
    if (!canvas) return
    stateRef.current = initState(canvas.width, canvas.height)
    setStarted(false)
    setStats({ payloads: RINGS.length * OBJECTS_PER_RING, debris: 0, status: 'nominal' })
  }

  return (
    <div className="kessler-sim-container" style={{ height }}>
      <canvas ref={canvasRef} className="kessler-canvas" />

      {!started && (
        <div className="kessler-prompt">Click any satellite to trigger a collision</div>
      )}

      <div className="kessler-overlay">
        <div className="kessler-stat kessler-stat--payload">Satellites: {stats.payloads}</div>
        <div className="kessler-stat kessler-stat--debris">Debris fragments: {stats.debris}</div>
      </div>

      <div className={`kessler-status ${stats.status}`}>
        {stats.status === 'nominal' ? 'Nominal' : stats.status === 'critical' ? '⚠ Critical' : '✕ Cascading Failure'}
      </div>

      <button className="kessler-reset" onClick={handleReset}>Reset</button>
    </div>
  )
}
