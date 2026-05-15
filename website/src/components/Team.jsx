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
    </section>
  )
}
