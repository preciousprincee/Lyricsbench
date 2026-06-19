import { Outlet, Link, useLocation } from 'react-router-dom'

export default function Layout() {
  const location = useLocation()

  const navItem = (to, label) => {
    const active = location.pathname === to
    return (
      <Link
        to={to}
        className={`text-sm tracking-wide transition-colors ${
          active ? 'text-rust font-medium' : 'text-ink-soft hover:text-ink'
        }`}
      >
        {label}
      </Link>
    )
  }

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col">
      <header className="border-b border-rule px-5 sm:px-8 py-4 flex items-center justify-between sticky top-0 bg-paper/95 backdrop-blur-sm z-30">
        <Link to="/" className="flex items-baseline gap-2">
          <span className="font-display text-xl sm:text-2xl font-semibold italic">LyricBench</span>
        </Link>
        <nav className="flex items-center gap-5 sm:gap-7">
          {navItem('/', 'Library')}
          {navItem('/sound-bible', 'Sound Bible')}
          {navItem('/settings', 'Settings')}
        </nav>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
