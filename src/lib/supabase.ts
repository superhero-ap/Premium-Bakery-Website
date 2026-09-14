import { createClient } from '@supabase/supabase-js'

// The publishable key is intentionally safe for browser use. The fallback prevents
// a missing/mis-copied GitHub Actions secret from breaking the storefront at runtime.
const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || 'https://tdvhvdgwrukbeckxfrum.supabase.co'
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || 'sb_publishable_zB4321BnoVJkoBWAI8oh4A_v492m6tT'

export const supabase = createClient(url, key)
