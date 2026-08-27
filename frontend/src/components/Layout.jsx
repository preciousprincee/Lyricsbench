import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { summary, signOut } = useAuth()

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

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  const plan = summary?.profile?.plan
  const remaining = summary?.usage?.remaining

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col">
      <header className="border-b border-rule px-5 sm:px-8 py-4 flex items-center justify-between sticky top-0 bg-paper/95 backdrop-blur-sm z-30">
        <Link to="/" className="flex items-baseline gap-2">
          <span className="font-display text-xl sm:text-2xl font-semibold italic">LyricBench</span>
          {plan === 'pro' && (
            <span className="text-[10px] uppercase tracking-wide bg-ink text-paper px-1.5 py-0.5 rounded">Pro</span>
          )}
        </Link>
        <nav className="flex items-center gap-5 sm:gap-7">
          {navItem('/', 'Library')}
          {navItem('/sound-bible', 'Sound Bible')}
          {navItem('/settings', 'Settings')}
          {typeof remaining === 'number' && (
            <span className="hidden sm:inline text-xs text-ink-soft border border-rule rounded-full px-2.5 py-1">
              {remaining} AI {remaining === 1 ? 'gen' : 'gens'} left
            </span>
          )}
          <button
            onClick={handleSignOut}
            className="text-sm text-ink-soft hover:text-rust transition-colors"
          >
            Sign out
          </button>
        </nav>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
