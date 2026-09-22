import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { ROLES, useAuth } from '../auth/auth-context'
import { useAlerts } from '../alerts/alerts-context'
import { Logo } from './Logo'
import { AccountDialog } from './AccountDialog'

// roles: when present, only those roles see the link. Hiding it is a convenience —
// the API refuses the call regardless of what the sidebar shows.
// Ordered to follow the way the work actually runs: the accounts you sell into,
// then a lead, the conversations that qualify it, the deal it becomes, and the
// reminder to chase it.
const NAV = [
  { to: '/', label: 'Dashboard', icon: 'grid', end: true },
  { to: '/companies', label: 'Companies', icon: 'building' },
  { to: '/contacts', label: 'Contacts', icon: 'user' },
  { to: '/leads', label: 'Leads', icon: 'spark' },
  { to: '/engagements', label: 'Engagements', icon: 'chat' },
  { to: '/deals', label: 'Deals', icon: 'briefcase' },
  // due: carries the count of the signed-in user's own overdue and due-today
  // work, so it is visible from every page rather than only the dashboard.
  { to: '/follow-ups', label: 'Follow-ups', icon: 'check', due: true },
  { to: '/team', label: 'Team', icon: 'users', roles: [ROLES.LEADERSHIP] },
  { to: '/archive', label: 'Recently deleted', icon: 'trash', roles: [ROLES.LEADERSHIP] },
]

const ICONS = {
  grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  building: 'M5 21V5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v16M14 10h4a1 1 0 0 1 1 1v10M3 21h18M8 8h3M8 12h3M8 16h3',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0',
  spark: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18M12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z',
  briefcase: 'M3 8h18v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM9 8V6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3 13h18',
  chat: 'M21 12a8 8 0 0 1-8 8H4l2-3a8 8 0 1 1 15-5Z',
  check: 'M4 7h9M4 12h6M4 17h6M14 16l2.5 2.5L21 14',
  trash: 'M4 7h16M10 11v6M14 11v6M5 7l1 13a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1l1-13M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3',
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
  const [accountOpen, setAccountOpen] = useState(false)
  const { user, logout } = useAuth()
  const { dueCount } = useAlerts()

  const visibleNav = NAV.filter((item) => !item.roles || item.roles.includes(user?.userRole))

  const cycleTheme = () => {
    setTheme((current) => (current === 'light' ? 'dark' : current === 'dark' ? 'system' : 'light'))
  }

  return (
    <div className={`shell${navOpen ? ' shell--nav-open' : ''}`}>
      <aside className="sidebar">
        <div className="brand">
          <Logo className="brand__logo" />
          <span className="brand__sub">CRM</span>
        </div>

        <nav className="nav">
          {visibleNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav__item${isActive ? ' is-active' : ''}`}
              onClick={() => setNavOpen(false)}
            >
              <Icon name={item.icon} />
              {item.label}
              {item.due && dueCount > 0 && (
                <span className="nav__badge" title={`${dueCount} due now`}>
                  {dueCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__foot">
          {user && (
            <div className="whoami">
              <button
                type="button"
                className="whoami__who"
                onClick={() => setAccountOpen(true)}
                title="Your account"
              >
                <span className="whoami__identity">
                  <span className="whoami__name">{user.name}</span>
                  <span className="whoami__role">{user.userRole}</span>
                </span>
                <svg className="whoami__edit" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3Z M14 7l3 3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <button type="button" className="whoami__out" onClick={logout}>
                Sign out
              </button>
            </div>
          )}

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

      {accountOpen && <AccountDialog onClose={() => setAccountOpen(false)} />}

      <div
        className="shell__scrim"
        onClick={() => setNavOpen(false)}
        aria-hidden="true"
      />
    </div>
  )
}
