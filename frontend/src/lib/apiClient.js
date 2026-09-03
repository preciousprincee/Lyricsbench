import { clearToken, getToken } from './authClient'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

export class ApiError extends Error {
  constructor(message, status, code) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

async function request(path, { method = 'GET', body, params, auth = true } = {}) {
  const token = getToken()
  if (auth && !token) {
    throw new ApiError('Not signed in.', 401, 'not_authenticated')
  }

  let url = `${API_BASE}${path}`
  if (params) {
    const qs = new URLSearchParams(params).toString()
    if (qs) url += `?${qs}`
  }

  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Token ${token}`

  let res
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined
    })
  } catch (err) {
    throw new ApiError('Could not reach the server. Check your connection.', 0, 'network_error')
  }

  if (res.status === 401) {
    // Token is invalid/expired mid-flight; force a clean re-auth.
    clearToken()
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
    const message = data?.error?.message || firstFieldError(data) || `Request failed (${res.status}).`
    const code = data?.error?.code
    throw new ApiError(message, res.status, code)
  }

  return data
}

/** DRF serializer validation errors look like {field: ["message"]} rather
 *  than the {error: {...}} shape our custom exception handler produces
 *  (that handler only wraps exceptions raised via raise_exception, and
 *  some paths return validation data directly). Pull out something readable. */
function firstFieldError(data) {
  if (!data || typeof data !== 'object') return null
  for (const key of Object.keys(data)) {
    const val = data[key]
    if (Array.isArray(val) && val.length) return val[0]
    if (typeof val === 'string') return val
  }
  return null
}

export const api = {
  get: (path, params) => request(path, { method: 'GET', params }),
  post: (path, body, opts = {}) => request(path, { method: 'POST', body, ...opts }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  del: (path) => request(path, { method: 'DELETE' })
}
