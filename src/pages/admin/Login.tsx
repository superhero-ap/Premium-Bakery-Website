import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

const normalizePhone = (value: string) => {
  const trimmed = value.trim()
  if (trimmed.startsWith('+')) return `+${trimmed.slice(1).replace(/\D/g, '')}`
  const digits = trimmed.replace(/\D/g, '')
  if (digits.length === 10 && /^[6-9]/.test(digits)) return `+91${digits}`
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`
  return digits
}

export default function AdminLogin() {
  const nav = useNavigate()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')

    const rawIdentifier = identifier.trim()
    const looksLikeEmail = rawIdentifier.includes('@')
    const normalizedPhone = looksLikeEmail ? '' : normalizePhone(rawIdentifier)
    const validEmail = looksLikeEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawIdentifier)
    const validPhone = !looksLikeEmail && /^\+?[1-9]\d{9,14}$/.test(normalizedPhone)

    if (!validEmail && !validPhone) {
      setError('Enter the staff email or a valid mobile number.')
      return
    }

    setBusy(true)
    const result = looksLikeEmail
      ? await supabase.auth.signInWithPassword({ email: rawIdentifier.toLowerCase(), password })
      : await supabase.auth.signInWithPassword({ phone: normalizedPhone, password })

    if (result.error) {
      setBusy(false)
      setError('Unable to sign in. Check the staff email/mobile and password.')
      return
    }

    const user = result.data.user
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_active,role')
      .eq('id', user.id)
      .maybeSingle()
    const allowed = !profileError && Boolean(
      profile?.is_active && ['owner', 'admin', 'manager', 'staff'].includes(profile.role),
    )

    if (!allowed) {
      await supabase.auth.signOut()
      setBusy(false)
      setError('This account is not authorised for the admin panel.')
      return
    }

    setBusy(false)
    nav('/admin')
  }

  return (
    <div className="page">
      <div className="container narrow simple">
        <div className="eyebrow">STAFF ACCESS</div>
        <h1>Sign in to your bakery workspace.</h1>
        <p>Use the authorised staff email or mobile number and password.</p>
        <form className="checkout" onSubmit={submit}>
          <div className="form-grid">
            <label className="span-2">
              Staff email or mobile *
              <input
                type="text"
                inputMode="email"
                required
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                autoComplete="username"
                placeholder="Staff email or mobile"
              />
            </label>
            <label className="span-2">
              Password *
              <input
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
              />
            </label>
          </div>
          {error && <p className="form-hint" role="alert">{error}</p>}
          <button className="btn primary full" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
          <Link className="text-btn" to="/">Back to storefront</Link>
        </form>
      </div>
    </div>
  )
}
