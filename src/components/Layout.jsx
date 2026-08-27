import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'

const NAV = [
  { to: '/', label: 'Dashboard', icon: 'grid', end: true },
  { to: '/companies', label: 'Companies', icon: 'building' },
  { to: '/contacts', label: 'Contacts', icon: 'user' },
  { to: '/leads', label: 'Leads', icon: 'spark' },
  { to: '/deals', label: 'Deals', icon: 'briefcase' },
  { to: '/engagements', label: 'Engagements', icon: 'chat' },
  { to: '/follow-ups', label: 'Follow-ups', icon: 'check' },
  { to: '/team', label: 'Team', icon: 'users' },
]

const ICONS = {
  grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  building: 'M5 21V5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v16M14 10h4a1 1 0 0 1 1 1v10M3 21h18M8 8h3M8 12h3M8 16h3',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0',
  spark: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18M12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z',
  briefcase: 'M3 8h18v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM9 8V6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3 13h18',
  chat: 'M21 12a8 8 0 0 1-8 8H4l2-3a8 8 0 1 1 15-5Z',
  check: 'M4 7h9M4 12h6M4 17h6M14 16l2.5 2.5L21 14',
  users: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM2 20a7 7 0 0 1 14 0M17 5.2a3.5 3.5 0 0 1 0 6.6M18 14.3A6 6 0 0 1 22 20',
}

function Icon({ name }) {
  return (
    <svg className="nav__icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d={ICONS[name]} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem('altrium-theme') ?? 'system')

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', theme)
    localStorage.setItem('altrium-theme', theme)
  }, [theme])

  return [theme, setTheme]
}

export function Layout() {
  const [theme, setTheme] = useTheme()
  const [navOpen, setNavOpen] = useState(false)

  const cycleTheme = () => {
    setTheme((current) => (current === 'light' ? 'dark' : current === 'dark' ? 'system' : 'light'))
  }

  return (
    <div className={`shell${navOpen ? ' shell--nav-open' : ''}`}>
      <aside className="sidebar">
        <div className="brand">
          <span className="brand__mark" aria-hidden="true">
            A
          </span>
          <span className="brand__text">
            Altrium
            <small>CRM</small>
          </span>
        </div>

        <nav className="nav">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav__item${isActive ? ' is-active' : ''}`}
              onClick={() => setNavOpen(false)}
            >
              <Icon name={item.icon} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__foot">
          <button type="button" className="theme-toggle" onClick={cycleTheme}>
            <span className="theme-toggle__dot" aria-hidden="true" />
            Theme: {theme}
          </button>
        </div>
      </aside>

      <div className="shell__main">
        <button
          type="button"
          className="nav-burger"
          onClick={() => setNavOpen((open) => !open)}
          aria-label="Toggle navigation"
        >
          <span aria-hidden="true" />
        </button>
        <main className="content">
          <Outlet />
        </main>
      </div>

      <div
        className="shell__scrim"
        onClick={() => setNavOpen(false)}
        aria-hidden="true"
      />
    </div>
  )
}
