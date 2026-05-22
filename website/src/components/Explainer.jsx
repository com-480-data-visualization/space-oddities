import { useState } from 'react'
import './Explainer.css'

export default function Explainer({ label, variant = 'info', children }) {
  const [open, setOpen] = useState(false)

  const icon = variant === 'warning' ? '⚠' : variant === 'method' ? '⚙' : 'ℹ'

  return (
    <div className={`explainer explainer--${variant}${open ? ' explainer--open' : ''}`}>
      <button className="explainer-toggle" onClick={() => setOpen(o => !o)}>
        <span className="explainer-icon">{icon}</span>
        <span className="explainer-label">{label}</span>
        <svg className="explainer-chevron" width="10" height="10" viewBox="0 0 10 10">
          <polyline points="2,3 5,7 8,3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {/* CSS grid collapse trick — no JS height measuring needed */}
      <div className="explainer-body">
        <div className="explainer-body-inner">
          {children}
        </div>
      </div>
    </div>
  )
}
