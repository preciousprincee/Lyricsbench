import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { signIn, signUp, signInWithGoogle } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/'

  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setInfo('')
    setBusy(true)
    try {
      if (mode === 'signup') {
        await signUp(email, password)
        setInfo('Check your inbox to confirm your email, then sign in.')
        setMode('signin')
      } else {
        await signIn(email, password)
        navigate(from, { replace: true })
      }
    } catch (err) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  async function handleGoogle() {
    setError('')
    try {
      await signInWithGoogle()
    } catch (err) {
      setError(err.message || 'Could not start Google sign-in.')
    }
  }

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white/60 border border-rule rounded-2xl shadow-notebook p-8 animate-fade-up">
        <h1 className="font-display text-3xl text-ink mb-1">LyricBench</h1>
        <p className="text-ink-soft text-sm mb-6">
          {mode === 'signin' ? 'Welcome back. Sign in to your notebook.' : 'Create your notebook.'}
        </p>

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
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-rule bg-white px-3 py-2 text-ink text-sm focus:outline-none"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-rust text-sm">{error}</p>}
          {info && <p className="text-moss text-sm">{info}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full bg-ink text-paper rounded-lg py-2.5 text-sm font-medium hover:bg-ink/90 disabled:opacity-50 transition"
          >
            {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <div className="flex items-center gap-3 my-5">
          <div className="h-px bg-rule flex-1" />
          <span className="text-xs text-ink-soft">or</span>
          <div className="h-px bg-rule flex-1" />
        </div>

        <button
          onClick={handleGoogle}
          className="w-full border border-rule rounded-lg py-2.5 text-sm font-medium text-ink hover:bg-paper-dim transition"
        >
          Continue with Google
        </button>

        <p className="text-center text-sm text-ink-soft mt-6">
          {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button
            className="text-rust font-medium hover:underline"
            onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setInfo('') }}
          >
            {mode === 'signin' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  )
}
