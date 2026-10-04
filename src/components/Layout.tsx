import {
  Apple,
  BookOpen,
  ChevronRight,
  Droplets,
  ListChecks,
  Menu,
  Mountain,
  PackageCheck,
  Scale,
  X,
} from 'lucide-react'
import { useState } from 'react'
import type { ReactNode } from 'react'
import type { Route } from '../types'

const NAV_ITEMS: {
  route: Route
  label: string
  detail: string
  icon: typeof Mountain
}[] = [
  {
    route: 'planner',
    label: 'Meal planner',
    detail: 'Build each trail day',
    icon: Mountain,
  },
  {
    route: 'shopping',
    label: 'Shopping list',
    detail: 'Everything to pack',
    icon: PackageCheck,
  },
  {
    route: 'foods',
    label: 'Food library',
    detail: 'Browse & add foods',
    icon: Apple,
  },
  {
    route: 'electrolytes',
    label: 'Electrolytes',
    detail: 'Compare 138 options',
    icon: Droplets,
  },
  {
    route: 'sodium',
    label: 'Na/K calculator',
    detail: 'Balance hot days',
    icon: Scale,
  },
  {
    route: 'guide',
    label: 'Trail guide',
    detail: 'How the ratings work',
    icon: BookOpen,
  },
]

export function Layout({
  route,
  onRoute,
  children,
  pageTitle,
  pageDescription,
  headerActions,
}: {
  route: Route
  onRoute: (route: Route) => void
  children: ReactNode
  pageTitle: string
  pageDescription: string
  headerActions?: ReactNode
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  const navigate = (next: Route) => {
    onRoute(next)
    setMenuOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">
            <Mountain size={23} strokeWidth={2.4} />
          </div>
          <div>
            <strong>Trail Rations</strong>
            <span>Backcountry meal planner</span>
          </div>
          <button
            className="mobile-close icon-button"
            type="button"
            onClick={() => setMenuOpen(false)}
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>

        <nav>
          <span className="nav-label">Plan</span>
          {NAV_ITEMS.slice(0, 3).map((item) => (
            <NavItem
              key={item.route}
              {...item}
              active={route === item.route}
              onClick={() => navigate(item.route)}
            />
          ))}
          <span className="nav-label nav-label-spaced">Reference</span>
          {NAV_ITEMS.slice(3).map((item) => (
            <NavItem
              key={item.route}
              {...item}
              active={route === item.route}
              onClick={() => navigate(item.route)}
            />
          ))}
        </nav>

        <div className="sidebar-note">
          <ListChecks size={17} />
          <div>
            <strong>Saved automatically</strong>
            <span>Your plan stays in this browser.</span>
          </div>
        </div>
      </aside>
      {menuOpen && (
        <button
          className="sidebar-scrim"
          type="button"
          onClick={() => setMenuOpen(false)}
          aria-label="Close navigation"
        />
      )}

      <main className="main">
        <header className="topbar">
          <button
            className="menu-button icon-button"
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={21} />
          </button>
          <div className="page-heading">
            <h1>{pageTitle}</h1>
            <p>{pageDescription}</p>
          </div>
          {headerActions && <div className="header-actions">{headerActions}</div>}
        </header>
        <div className="page-content">{children}</div>
      </main>
    </div>
  )
}

function NavItem({
  label,
  detail,
  icon: Icon,
  active,
  onClick,
}: {
  label: string
  detail: string
  icon: typeof Mountain
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      className={`nav-item ${active ? 'active' : ''}`}
      type="button"
      onClick={onClick}
    >
      <Icon size={19} />
      <span>
        <strong>{label}</strong>
        <small>{detail}</small>
      </span>
      <ChevronRight className="nav-chevron" size={16} />
    </button>
  )
}
