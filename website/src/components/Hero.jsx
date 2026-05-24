import { useMemo } from 'react'
import { Badge } from '@mantine/core'
import './Hero.css'

function fmt(n) {
  return n.toLocaleString('en-US')
}

export default function Hero({ satellites = [], loading }) {
  const stats = useMemo(() => {
    if (!satellites.length) return null
    const debris    = satellites.filter(s => s.category === 'debris').length
    const payloads  = satellites.filter(s => s.category === 'payload').length
    const rocketBodies = satellites.filter(s => s.category === 'rocket body').length
    const total     = satellites.length
    return { total, debris, payloads, rocketBodies }
  }, [satellites])

  const total   = stats?.total   ?? null
  const debris  = stats?.debris  ?? null
  const payloads = stats?.payloads ?? null

  return (
    <section className="hero" id="intro">
      <div className="hero-inner">
        <Badge variant="outline" color="cyan" mb="sm">EPFL COM-480 · Data Visualization 2026</Badge>
        <h1 className="hero-title">Space Oddities</h1>
        <p className="hero-sub">
          Two objects that cannot steer are headed for each other at 14 km/s.<br />
          Everything that brought them here was entirely predictable.
        </p>
        <p className="hero-desc">
          A scrollytelling data visualization of Earth's increasingly congested orbital
          environment — from Sputnik to Starlink, and the{' '}
          {loading ? '…' : <strong>{fmt(total)}</strong>} tracked objects in between.
        </p>
        <div className="hero-stats">
          <div className="stat">
            <span className="stat-value">{loading ? '…' : fmt(total)}</span>
            <span className="stat-label">objects in orbit</span>
          </div>
          <div className="stat">
            <span className="stat-value">{loading ? '…' : fmt(debris)}</span>
            <span className="stat-label">debris pieces</span>
          </div>
          <div className="stat">
            <span className="stat-value">{loading ? '…' : fmt(payloads)}</span>
            <span className="stat-label">active payloads</span>
          </div>
          <div className="stat">
            <span className="stat-value">7 km/s</span>
            <span className="stat-label">orbital speed</span>
          </div>
        </div>
        <a href="#chapter-1" className="hero-cta">Start exploring ↓</a>
      </div>
    </section>
  )
}
