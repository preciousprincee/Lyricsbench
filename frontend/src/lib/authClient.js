/**
 * Minimal local auth client: talks to the Django backend's own
 * register/login/logout endpoints and keeps the returned token in
 * localStorage. No third-party auth provider involved.
 */
const TOKEN_KEY = 'lyricbench_auth_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}
