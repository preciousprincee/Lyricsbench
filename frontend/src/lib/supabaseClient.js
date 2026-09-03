import { createClient } from '@supabase/supabase-js'
import { isDevMode } from './devAuth'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

let client = null

if (!isDevMode && url && anonKey) {
  client = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  })
} else if (!isDevMode) {
  // eslint-disable-next-line no-console
  console.warn(
    'Supabase env vars are missing. Either copy .env.example to .env and fill in ' +
    'VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY from your Supabase project settings, ' +
    'or set VITE_DEV_MODE=true to run without Supabase entirely (local testing only).'
  )
}

// null in dev mode or when misconfigured — every caller (AuthContext,
// apiClient) checks isDevMode before touching this, so it's never used
// unset in practice.
export const supabase = client

/** Returns the current Supabase access token, or null if signed out. */
export async function getAccessToken() {
  if (!client) return null
  const { data } = await client.auth.getSession()
  return data.session?.access_token || null
}
