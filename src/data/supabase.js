import { createClient } from '@supabase/supabase-js'

// The publishable key is safe to ship in the client bundle — data access is
// protected by Row Level Security + the shared team login, not by this key.
// Env vars override these so the project can be swapped without a code change.
const url =
  import.meta.env.VITE_SUPABASE_URL || 'https://sonegdhenebdpknhiuit.supabase.co'
const key =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_v97Vukgq5m1GlmfUCOyFCg_zuLKqKAu'

export const supabase = createClient(url, key)

// One shared login for Ricky + Mac. Only the password is typed at sign-in.
export const TEAM_EMAIL = 'team@callbax.app'
