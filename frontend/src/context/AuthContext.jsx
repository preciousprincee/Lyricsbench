import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { api, ApiError } from '../lib/apiClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined) // undefined = not checked yet, null = signed out
  const [summary, setSummary] = useState(null) // { profile, usage, subscription }
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [authError, setAuthError] = useState('')

  const refreshSummary = useCallback(async () => {
    setSummaryLoading(true)
    try {
      const data = await api.get('/accounts/me/summary/')
      setSummary(data)
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 401)) {
        // eslint-disable-next-line no-console
        console.error('Failed to load account summary', err)
      }
    } finally {
      setSummaryLoading(false)
    }
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      if (!newSession) setSummary(null)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session) refreshSummary()
  }, [session, refreshSummary])

  async function signUp(email, password) {
    setAuthError('')
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) { setAuthError(error.message); throw error }
  }

  async function signIn(email, password) {
    setAuthError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setAuthError(error.message); throw error }
  }

  async function signInWithGoogle() {
    setAuthError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    })
    if (error) { setAuthError(error.message); throw error }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  const value = {
    session,
    isAuthenticated: !!session,
    authLoading: session === undefined,
    summary,
    summaryLoading,
    refreshSummary,
    authError,
    signUp,
    signIn,
    signInWithGoogle,
    signOut
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
