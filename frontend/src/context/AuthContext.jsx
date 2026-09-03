import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { clearToken, getToken, setToken } from '../lib/authClient'
import { api, ApiError } from '../lib/apiClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  // undefined = not checked yet, null = signed out, string = signed in (token)
  const [token, setTokenState] = useState(undefined)
  const [summary, setSummary] = useState(null) // { profile, usage }
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
      } else {
        setTokenState(null)
      }
    } finally {
      setSummaryLoading(false)
    }
  }, [])

  useEffect(() => {
    setTokenState(getToken() || null)
  }, [])

  useEffect(() => {
    if (token) refreshSummary()
    else setSummary(null)
  }, [token, refreshSummary])

  async function signUp(email, password) {
    setAuthError('')
    try {
      const data = await api.post('/accounts/register/', { email, password }, { auth: false })
      setToken(data.token)
      setTokenState(data.token)
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Something went wrong.'
      setAuthError(message)
      throw err
    }
  }

  async function signIn(email, password) {
    setAuthError('')
    try {
      const data = await api.post('/accounts/login/', { email, password }, { auth: false })
      setToken(data.token)
      setTokenState(data.token)
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Something went wrong.'
      setAuthError(message)
      throw err
    }
  }

  async function signOut() {
    try {
      await api.post('/accounts/logout/', {})
    } catch {
      // token may already be invalid — fine, we're clearing it either way
    }
    clearToken()
    setTokenState(null)
  }

  const value = {
    isAuthenticated: !!token,
    authLoading: token === undefined,
    summary,
    summaryLoading,
    refreshSummary,
    authError,
    signUp,
    signIn,
    signOut
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
