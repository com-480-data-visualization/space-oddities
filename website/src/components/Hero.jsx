import { Badge } from '@mantine/core'
import './Hero.css'

export default function Hero() {
  return (
    <section className="hero" id="intro">
      <div className="hero-inner">
        <Badge variant="outline" color="cyan" mb="sm">EPFL COM-480 · Data Visualization 2025</Badge>
        <h1 className="hero-title">Space Oddities</h1>
        <p className="hero-sub">
          Two objects that cannot steer are headed for each other at 14 km/s.<br />
          Everything that brought them here was entirely predictable.
        </p>
        <p className="hero-desc">
          A scrollytelling data visualization of Earth's increasingly congested orbital
          environment — from Sputnik to Starlink, and the 68,000 tracked objects in between.
        </p>
        <div className="hero-stats">
          <div className="stat">
            <span className="stat-value">68,147</span>
            <span className="stat-label">tracked objects</span>
          </div>
          <div className="stat">
            <span className="stat-value">35,749</span>
            <span className="stat-label">debris pieces</span>
          </div>
          <div className="stat">
            <span className="stat-value">3,762</span>
            <span className="stat-label">CDM alerts</span>
          </div>
          <div className="stat">
            <span className="stat-value">385 m</span>
            <span className="stat-label">closest approach</span>
          </div>
        </div>
        <a href="#chapter-1" className="hero-cta">Start exploring ↓</a>
      </div>
    </section>
  )
}
