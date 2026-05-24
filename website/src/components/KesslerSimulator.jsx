import { useRef, useEffect, useState } from 'react'
import './KesslerSimulator.css'

const BASE_RINGS     = [90, 130, 175, 220]
const FRAGS_PER_HIT  = 4
const HIT_RADIUS     = 6
const DEBRIS_MIN_AGE = 220   // frames (~3.7 s) before a fragment can trigger collisions
const EARTH_R        = 52
const MAX_ORBIT_R    = 235
const MAX_DEBRIS     = 2000

function activeRings(objectsPerRing) {
  return objectsPerRing >= 30 ? BASE_RINGS : BASE_RINGS.slice(0, 3)
}

// Build the precomputed orbital constants for one object.
// f0 is the starting absolute angle; argPeri is the periapsis direction (absolute).
function makeOrbit(a, e, argPeri, f0, omegaMean) {
  const e2 = e * e
  return {
    a,
    e,
    argPeri,
    f: f0,
    omegaMean,
    slr:      a * (1 - e2),           // semi-latus rectum  a(1−e²)
    angMomD:  Math.pow(1 - e2, 1.5),  // (1−e²)^1.5 denominator for df/dt
    x: 0, y: 0,
  }
}

// Advance position by one frame using Keplerian angular-momentum conservation.
// df/dt = omegaMean × (1 + e·cosν)² / (1−e²)^1.5   where ν = f − argPeri
function advanceOrbit(obj, cx, cy) {
  const cosNu     = Math.cos(obj.f - obj.argPeri)
  const eccFactor = 1 + obj.e * cosNu          // 1 + e·cosν
  const r         = obj.slr / eccFactor         // r = a(1−e²)/(1+e·cosν)
  obj.x = cx + r * Math.cos(obj.f)
  obj.y = cy + r * Math.sin(obj.f)
  obj.f += obj.omegaMean * eccFactor * eccFactor / obj.angMomD
}

function initState(W, H, objectsPerRing) {
  const cx = W / 2, cy = H / 2
  const rings = activeRings(objectsPerRing)
  const payloads = []
  let id = 0
  rings.forEach((rNom, ri) => {
    for (let i = 0; i < objectsPerRing; i++) {
      const f0      = (2 * Math.PI * i) / objectsPerRing + ri * 0.55
      const dir     = i % 3 === 0 ? -1 : 1
      const omegaMean = dir * (0.0009 + ri * 0.00015) * (0.85 + Math.random() * 0.3)
      // ~30 % of satellites have a slightly elliptical orbit
      const e       = Math.random() < 0.30 ? 0.06 + Math.random() * 0.14 : 0
      const argPeri = Math.random() * Math.PI * 2
      const orbit   = makeOrbit(rNom, e, argPeri, f0, omegaMean)
      payloads.push({ id: id++, ...orbit, alive: true })
    }
  })
  return { cx, cy, payloads, debris: [], explosions: [] }
}

// Spawn debris with genuinely elliptical orbits spreading across shells.
function spawnOrbitalDebris(impactA, impactF, impactOmegaMean, count) {
  const frags = []
  for (let i = 0; i < count; i++) {
    // Eccentricity first so we can clamp a accordingly
    const e       = 0.08 + Math.random() * 0.30
    // Raw semi-major axis spread: ±60 % of impact a
    const rawA    = impactA + (Math.random() - 0.5) * impactA * 1.2
    // Clamp so periapsis > EARTH_R+10 and apoapsis < MAX_ORBIT_R
    const minA    = (EARTH_R + 10) / (1 - e)
    const maxA    = MAX_ORBIT_R    / (1 + e)
    const a       = Math.max(minA, Math.min(maxA, rawA))
    const argPeri = Math.random() * Math.PI * 2
    const f0      = impactF + (Math.random() - 0.5) * 0.7
    const retro   = Math.random() < 0.05 ? -1 : Math.sign(impactOmegaMean)
    const omegaMean = retro * Math.abs(impactOmegaMean) * (impactA / a) * (0.6 + Math.random() * 0.8)
    frags.push({ ...makeOrbit(a, e, argPeri, f0, omegaMean), age: 0 })
  }
  return frags
}

export default function KesslerSimulator({ height = '400px' }) {
  const canvasRef = useRef(null)
  const stateRef  = useRef(null)
  const rafRef    = useRef(null)
  const [objectsPerRing, setObjectsPerRing] = useState(20)
  const [stats, setStats] = useState({ payloads: activeRings(20).length * 20, debris: 0, status: 'nominal' })
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const container = canvas.parentElement
    const W = container.clientWidth || 680
    const H = parseInt(height) || 380
    canvas.width  = W
    canvas.height = H
    const ctx = canvas.getContext('2d')
    stateRef.current = initState(W, H, objectsPerRing)
    setStats({ payloads: activeRings(objectsPerRing).length * objectsPerRing, debris: 0, status: 'nominal' })
    setStarted(false)
    let frameCount = 0

    function tick() {
      frameCount++
      const s = stateRef.current
      const { cx, cy } = s

      // Advance Keplerian orbits for payloads
      for (const p of s.payloads) advanceOrbit(p, cx, cy)

      // Advance Keplerian orbits for debris; age each fragment
      for (const d of s.debris) {
        advanceOrbit(d, cx, cy)
        if (d.age < DEBRIS_MIN_AGE) d.age++
      }

      // Collision detection: only mature debris can trigger hits
      if (s.debris.length > 0) {
        const newFrags  = []
        const newBursts = []
        for (const p of s.payloads) {
          if (!p.alive) continue
          for (const d of s.debris) {
            if (d.age < DEBRIS_MIN_AGE) continue
            const dx = p.x - d.x, dy = p.y - d.y
            if (dx * dx + dy * dy < HIT_RADIUS * HIT_RADIUS) {
              p.alive = false
              newBursts.push({ x: p.x, y: p.y, r: 0, maxR: 45, life: 1 })
              if (s.debris.length + newFrags.length < MAX_DEBRIS) {
                newFrags.push(...spawnOrbitalDebris(p.a, p.f, p.omegaMean, FRAGS_PER_HIT))
              }
              break
            }
          }
        }
        s.explosions.push(...newBursts)
        s.debris.push(...newFrags)
        s.payloads = s.payloads.filter(p => p.alive)
      }

      // Explosion animation
      for (const e of s.explosions) {
        e.r    += (e.maxR - e.r) * 0.14
        e.life -= 0.035
      }
      s.explosions = s.explosions.filter(e => e.life > 0)

      // Stats (every 6 frames)
      if (frameCount % 6 === 0) {
        const alive = s.payloads.length
        const deb   = s.debris.length
        setStats({
          payloads: alive,
          debris:   deb,
          status:   deb > 80 ? 'cascading' : deb > 16 ? 'critical' : 'nominal',
        })
      }

      // ── Render ─────────────────────────────────────────────────────────────
      ctx.clearRect(0, 0, W, H)

      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.75)
      bg.addColorStop(0, 'rgba(18,30,60,0.5)')
      bg.addColorStop(1, 'rgba(4,8,18,1)')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, W, H)

      // Reference altitude rings (nominal circular shells)
      const ringAlphas = [0.12, 0.09, 0.06, 0.04]
      activeRings(objectsPerRing).forEach((r, ri) => {
        ctx.beginPath()
        ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(59,130,246,${ringAlphas[ri] ?? 0.04})`
        ctx.lineWidth = 1
        ctx.setLineDash([4, 8])
        ctx.stroke()
        ctx.setLineDash([])
      })

      // Faint orbital ellipses for eccentric satellites
      for (const p of s.payloads) {
        if (p.e < 0.02) continue
        const b       = p.a * Math.sqrt(1 - p.e * p.e)
        const ecx     = cx - p.a * p.e * Math.cos(p.argPeri)  // ellipse geometric center
        const ecy     = cy - p.a * p.e * Math.sin(p.argPeri)
        ctx.beginPath()
        ctx.ellipse(ecx, ecy, p.a, b, p.argPeri, 0, Math.PI * 2)
        ctx.strokeStyle = 'rgba(56,189,248,0.07)'
        ctx.lineWidth = 0.8
        ctx.stroke()
      }

      // Earth glow
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
        ctx.lineWidth   = 2.5
        ctx.stroke()
        if (e.life > 0.6) {
          ctx.beginPath()
          ctx.arc(e.x, e.y, e.r * 0.35, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(254,215,170,${(e.life - 0.6) * 2})`
          ctx.fill()
        }
      }

      // Alive satellites — draw glow only for eccentric ones to draw the eye
      for (const p of s.payloads) {
        if (p.e > 0.02) {
          ctx.shadowColor = '#38bdf8'
          ctx.shadowBlur  = 7
        }
        ctx.beginPath()
        ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2)
        ctx.fillStyle = '#7dd3fc'
        ctx.fill()
        if (p.e > 0.02) ctx.shadowBlur = 0
      }
      ctx.shadowBlur = 0

      // Debris: amber while incubating, red-pink when active
      const baseAlpha = s.debris.length > 600 ? 0.45 : 0.75
      for (const d of s.debris) {
        const mature = d.age >= DEBRIS_MIN_AGE
        ctx.beginPath()
        ctx.arc(d.x, d.y, mature ? 1.8 : 1.3, 0, Math.PI * 2)
        ctx.fillStyle = mature
          ? `rgba(251,113,133,${baseAlpha})`
          : `rgba(251,200,100,${baseAlpha * 0.55})`
        ctx.fill()
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)

    function handleClick(e) {
      const rect = canvas.getBoundingClientRect()
      const mx   = (e.clientX - rect.left) * (W / rect.width)
      const my   = (e.clientY - rect.top)  * (H / rect.height)
      const s    = stateRef.current
      let best = null, bestD = Infinity
      for (const p of s.payloads) {
        const d = Math.hypot(p.x - mx, p.y - my)
        if (d < bestD) { best = p; bestD = d }
      }
      if (best && bestD < 22) {
        best.alive = false
        s.explosions.push({ x: best.x, y: best.y, r: 0, maxR: 45, life: 1 })
        s.debris.push(...spawnOrbitalDebris(best.a, best.f, best.omegaMean, FRAGS_PER_HIT))
        s.payloads = s.payloads.filter(p => p.alive)
        setStarted(true)
      }
    }

    canvas.addEventListener('click', handleClick)
    return () => {
      cancelAnimationFrame(rafRef.current)
      canvas.removeEventListener('click', handleClick)
    }
  }, [height, objectsPerRing])

  function handleReset() {
    const canvas = canvasRef.current
    if (!canvas) return
    stateRef.current = initState(canvas.width, canvas.height, objectsPerRing)
    setStarted(false)
    setStats({ payloads: activeRings(objectsPerRing).length * objectsPerRing, debris: 0, status: 'nominal' })
  }

  const rings     = activeRings(objectsPerRing)
  const totalSats = objectsPerRing * rings.length

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

      <div className="kessler-sat-control">
        <label className="kessler-sat-label">
          Satellites: <strong>{totalSats}</strong>
          {rings.length === 4 && <span className="kessler-ring-badge"> · 4 rings</span>}
        </label>
        <input
          type="range" min={3} max={60} step={1}
          value={objectsPerRing}
          onChange={e => setObjectsPerRing(Number(e.target.value))}
          className="kessler-sat-slider"
        />
      </div>

      <button className="kessler-reset" onClick={handleReset}>Reset</button>
    </div>
  )
}
