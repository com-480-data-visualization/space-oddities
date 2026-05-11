import './NavBar.css'

const links = [
  { href: '#intro', label: 'Intro' },
  { href: '#chapter-1', label: '1. Growth' },
  { href: '#chapter-2', label: '2. Altitudes' },
  { href: '#chapter-3', label: '3. Debris' },
  { href: '#chapter-4', label: '4. Kessler' },
  { href: '#chapter-5', label: '5. CDMs' },
  { href: '#chapter-6', label: '6. Uncertainty' },
  { href: '#team', label: 'Team' },
]

export default function NavBar() {
  return (
    <nav className="navbar">
      <span className="navbar-brand">Space Oddities</span>
      <ul className="navbar-links">
        {links.map(l => (
          <li key={l.href}><a href={l.href}>{l.label}</a></li>
        ))}
      </ul>
    </nav>
  )
}
