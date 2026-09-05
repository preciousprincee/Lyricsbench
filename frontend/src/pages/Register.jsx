import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const FEATURES = [
  'A rhyme panel and cadence ruler while you write',
  'Your own Sound Bible — the AI learns your style',
  'Songs synced across every device, automatically',
]

export default function Register() {
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords don\u2019t match.')
      return
    }

    setBusy(true)
    try {
      await signUp(email, password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-paper-dim flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white border border-rule rounded-2xl shadow-notebook p-8 animate-fade-up">
        <p className="text-xs uppercase tracking-[0.2em] text-rust mb-2">Free to start</p>
        <h1 className="font-display text-3xl italic text-ink mb-1">Start your notebook</h1>
        <p className="text-ink-soft text-sm mb-5">Create your LyricsBench account — no card required.</p>

        <ul className="space-y-1.5 mb-6">
          {FEATURES.map((f) => (
            <li key={f} className="flex gap-2 text-xs text-ink-soft">
              <span className="text-moss mt-0.5">✓</span>
              <span>{f}</span>
            </li>
          ))}
        </ul>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-ink-soft mb-1" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-rule bg-white px-3 py-2 text-ink text-sm focus:outline-none"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-soft mb-1" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-rule bg-white px-3 py-2 text-ink text-sm focus:outline-none"
              placeholder="At least 6 characters"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-soft mb-1" htmlFor="confirm-password">Confirm password</label>
            <input
              id="confirm-password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-rule bg-white px-3 py-2 text-ink text-sm focus:outline-none"
              placeholder="Type it again"
            />
          </div>

          {error && <p className="text-rust text-sm">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full bg-rust text-paper rounded-lg py-2.5 text-sm font-medium hover:bg-rust/90 disabled:opacity-50 transition"
          >
            {busy ? 'Creating your notebook…' : 'Create account'}
          </button>
        </form>

        <p className="text-center text-sm text-ink-soft mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-ink font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
