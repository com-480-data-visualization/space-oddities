import './VizBox.css'

export default function VizBox({ label, height = '200px', note }) {
  return (
    <div className="vizbox" style={{ height }}>
      <span className="vizbox-label">{label}</span>
      {note && <span className="vizbox-note">{note}</span>}
    </div>
  )
}
