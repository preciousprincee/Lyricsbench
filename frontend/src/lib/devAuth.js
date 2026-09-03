// Local-only stand-in for Supabase Auth so the app can run with zero
// Supabase project configured. Active only when VITE_DEV_MODE=true, which
// must be paired with DEV_AUTH_ENABLED=True on the backend — see
// backend/.env.example. Never enable this outside your own machine.
const KEY = 'lyricbench:dev-user-email'

export const isDevMode = import.meta.env.VITE_DEV_MODE === 'true'

export function getDevEmail() {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function devSignIn(email) {
  const clean = email.trim().toLowerCase()
  try {
    localStorage.setItem(KEY, clean)
  } catch {
    // ignore — worst case the "session" doesn't persist across reloads
  }
  return clean
}

export function devSignOut() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}
