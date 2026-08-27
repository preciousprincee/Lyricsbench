import { getAccessToken, supabase } from './supabaseClient'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

export class ApiError extends Error {
  constructor(message, status, code) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

async function request(path, { method = 'GET', body, params } = {}) {
  const token = await getAccessToken()
  if (!token) {
    throw new ApiError('Not signed in.', 401, 'not_authenticated')
  }

  let url = `${API_BASE}${path}`
  if (params) {
    const qs = new URLSearchParams(params).toString()
    if (qs) url += `?${qs}`
  }

  let res
  try {
    res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: body !== undefined ? JSON.stringify(body) : undefined
    })
  } catch (err) {
    throw new ApiError('Could not reach the server. Check your connection.', 0, 'network_error')
  }

  if (res.status === 401) {
    // Session likely expired mid-flight; force a clean re-auth.
    await supabase.auth.signOut()
    throw new ApiError('Your session expired. Please sign in again.', 401, 'session_expired')
  }

  if (res.status === 204) return null

  let data = null
  try {
    data = await res.json()
  } catch {
    // empty body
  }

  if (!res.ok) {
    const message = data?.error?.message || `Request failed (${res.status}).`
    const code = data?.error?.code
    throw new ApiError(message, res.status, code)
  }

  return data
}

export const api = {
  get: (path, params) => request(path, { method: 'GET', params }),
  post: (path, body) => request(path, { method: 'POST', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  del: (path) => request(path, { method: 'DELETE' })
}
