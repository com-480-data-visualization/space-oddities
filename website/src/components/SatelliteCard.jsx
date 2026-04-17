import './SatelliteCard.css'

export default function SatelliteCard({ sat, role = 'primary', label }) {
  return (
    <div className={`sat-card sat-card--${role === 'primary' ? 'cyan' : 'amber'}`}>
      <div className="sat-card-label">{label}</div>

      {sat ? (
        <>
          <div className="sat-card-name">{sat.name}</div>
          <dl className="sat-card-fields">
            {[
              ['Operator', sat.operator ?? '—'],
              ['Orbit',    sat.orbitBand],
              ['Type',     sat.category],
              ['Launched', Number.isFinite(sat.launchYear) ? sat.launchYear : '—'],
            ].map(([key, val]) => (
              <div key={key} className="sat-field">
                <dt>{key}</dt>
                <dd>{val}</dd>
              </div>
            ))}
          </dl>
        </>
      ) : (
        <>
          <div className="sat-card-name sat-card-name--empty">—</div>
          <dl className="sat-card-fields">
            {['Operator', 'Orbit', 'Type', 'Launched'].map(k => (
              <div key={k} className="sat-field">
                <dt>{k}</dt>
                <dd><span className="sat-field-empty" /></dd>
              </div>
            ))}
          </dl>
        </>
      )}
    </div>
  )
}
