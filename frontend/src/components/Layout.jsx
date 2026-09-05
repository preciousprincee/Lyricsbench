import { useEffect, useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { summary, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  // Close the mobile menu automatically whenever the route changes, so it
  // never stays open covering the new page after tapping a link.
  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  // Prevent the page behind the dropdown from scrolling while it's open —
  // without this, scrolling the (invisible, underneath) Library list while
  // the menu is open feels broken/janky, especially on iOS.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  const navItem = (to, label, onClick) => {
    const active = location.pathname === to
    return (
      <Link
        to={to}
        onClick={onClick}
        className={`text-sm tracking-wide transition-colors ${
          active ? 'text-rust font-medium' : 'text-ink-soft hover:text-ink'
        }`}
      >
        {label}
      </Link>
    )
  }

  async function handleSignOut() {
    setMenuOpen(false)
    await signOut()
    navigate('/login', { replace: true })
  }

  const remaining = summary?.usage?.remaining

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col">
      {/* Wrapping header + dropdown together in one sticky, relatively-
          positioned box lets the dropdown anchor to "right below the
          header" via top-full, regardless of the header's actual rendered
          height (which varies by font scaling/safe-area insets) — no
          fragile hardcoded pixel offset needed. */}
      <div className="relative sticky top-0 z-30">
        <header className="border-b border-rule px-5 sm:px-8 py-4 flex items-center justify-between bg-paper/95 backdrop-blur-sm">
          <Link to="/" className="flex items-baseline gap-2">
            <span className="font-display text-xl sm:text-2xl font-semibold italic">LyricsBench</span>
          </Link>

          {/* Desktop nav — unchanged, always visible at sm+ */}
          <nav className="hidden sm:flex items-center gap-5 sm:gap-7">
            {navItem('/', 'Library')}
            {navItem('/sound-bible', 'Sound Bible')}
            {navItem('/settings', 'Settings')}
            {typeof remaining === 'number' && (
              <span className="text-xs text-ink-soft border border-rule rounded-full px-2.5 py-1">
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

          {/* Mobile hamburger toggle */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            className="sm:hidden text-ink w-9 h-9 flex items-center justify-center -mr-2"
          >
            {menuOpen ? (
              <span className="text-xl leading-none">✕</span>
            ) : (
              <span className="flex flex-col gap-[5px]">
                <span className="block w-5 h-[1.5px] bg-ink" />
                <span className="block w-5 h-[1.5px] bg-ink" />
                <span className="block w-5 h-[1.5px] bg-ink" />
              </span>
            )}
          </button>
        </header>

        {/* Mobile menu panel — anchored to the header's bottom edge */}
        {menuOpen && (
          <nav className="absolute top-full left-0 right-0 sm:hidden border-b border-rule bg-paper px-5 py-4 flex flex-col gap-4 shadow-notebook animate-fade-up">
            {navItem('/', 'Library')}
            {navItem('/sound-bible', 'Sound Bible')}
            {navItem('/settings', 'Settings')}
            {typeof remaining === 'number' && (
              <span className="text-xs text-ink-soft border border-rule rounded-full px-2.5 py-1 self-start">
                {remaining} AI {remaining === 1 ? 'gen' : 'gens'} left
              </span>
            )}
            <button
              onClick={handleSignOut}
              className="text-sm text-ink-soft hover:text-rust transition-colors text-left"
            >
              Sign out
            </button>
          </nav>
        )}
      </div>

      {/* Tap-outside-to-close backdrop — sits above page content, below
          the header/menu (which live in the z-30 wrapper above). */}
      {menuOpen && (
        <button
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
          className="sm:hidden fixed inset-0 z-20 bg-ink/10"
        />
      )}

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
