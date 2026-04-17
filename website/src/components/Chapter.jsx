import { Badge } from '@mantine/core'
import './Chapter.css'

export default function Chapter({ id, number, title, body, isActive, children }) {
  return (
    <article id={id} className={`chapter${isActive ? ' chapter--active' : ''}`}>
      <div className="chapter-card">
        <Badge variant="outline" color="gray" size="sm" mb={8}>Chapter {number}</Badge>
        <h2 className="chapter-title">{title}</h2>
        <p className="chapter-body">{body}</p>
        {children}
      </div>
    </article>
  )
}
