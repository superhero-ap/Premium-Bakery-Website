import { createClient } from '@supabase/supabase-js'

// This is the project's public publishable key. It is safe for browser clients;
// database permissions are enforced by RLS. Keeping the verified value here also
// prevents an outdated GitHub Actions secret from causing an "Invalid API key" error.
const url = 'https://tdvhvdgwrukbeckxfrum.supabase.co'
const key = 'sb_publishable_zB4321BnoVJkoBWAI8oh4A_v492m6tT'

export const supabase = createClient(url, key)
