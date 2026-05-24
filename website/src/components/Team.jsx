import { Divider } from '@mantine/core'
import './Team.css'

const members = [
  { name: 'Vincent Fiszbin', sciper: '394790' },
  { name: 'Philip Hamelink', sciper: '311769' },
  { name: 'Julien Schluchter', sciper: '342745' },
]

export default function Team() {
  return (
    <section id="team" className="team-section">
      <Divider mb="xl" />
      <h2 className="team-heading">Team</h2>
      <div className="team-grid">
        {members.map(m => (
          <div key={m.sciper} className="team-card">
            <div className="team-avatar" />
            <div>
              <p className="team-name">{m.name}</p>
              <p className="team-sciper">SCIPER {m.sciper}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="team-course">EPFL COM-480 Data Visualization · Spring 2026</p>

      <div className="team-data-notice">
        <p className="team-data-heading">Data sources &amp; freshness</p>
        <ul className="team-data-list">
          <li>
            <strong>Orbital elements (TLEs)</strong> — fetched from{' '}
            <a href="https://celestrak.org" target="_blank" rel="noopener noreferrer">CelesTrak</a>{' '}
            and <a href="https://www.space-track.org" target="_blank" rel="noopener noreferrer">Space-Track.org</a>{' '}
            on <strong>24 May 2026</strong>. Positions shown are propagated from this snapshot using SGP4.
          </li>
          <li>
            <strong>Conjunction events (CDMs)</strong> — last 30 days retrieved from Space-Track
            on <strong>24 May 2026</strong> (2,129 deduplicated events; Space-Track publishes only those above internal risk thresholds — this is not an exhaustive catalogue).
          </li>
          <li>
            <strong>Historical debris counts</strong> — sourced from the ESA Space Debris Office annual reports.
          </li>
        </ul>
        <p className="team-data-caveat">
          This visualisation is a snapshot. Satellite positions, conjunction warnings, and debris counts change continuously. Some events show no collision probability (Pc) because Space-Track only computes Pc for "emergency reportable" events above a risk threshold.
        </p>
      </div>
    </section>
  )
}
