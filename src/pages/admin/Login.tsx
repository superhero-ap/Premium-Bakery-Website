import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function AdminLogin() {
  const nav = useNavigate()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    const email = identifier.trim().toLowerCase()
    if (!email.includes('@')) {
      setError('Enter the email address used when the staff account was created.')
      return
    }
    setBusy(true)
    const result = await supabase.auth.signInWithPassword({ email, password })
    if (result.error) {
      setBusy(false)
      setError('Unable to sign in. Check the staff email and password.')
      return
    }
    const user = result.data.user
    const { data: profile, error: profileError } = await supabase.from('profiles').select('is_active,role').eq('id', user.id).maybeSingle()
    const allowed = !profileError && Boolean(profile?.is_active && ['owner', 'admin', 'manager', 'staff'].includes(profile.role))
    if (!allowed) {
      await supabase.auth.signOut()
      setBusy(false)
      setError('This account is not authorised for the admin panel.')
      return
    }
    setBusy(false)
    nav('/admin')
  }

  return <div className="page"><div className="container narrow simple"><div className="eyebrow">STAFF ACCESS</div><h1>Sign in to your bakery workspace.</h1><p>Use the staff email and password for your authorised bakery account.</p><form className="checkout" onSubmit={submit}><div className="form-grid"><label className="span-2">Staff email *<input type="email" required value={identifier} onChange={e=>setIdentifier(e.target.value)} autoComplete="username" placeholder="Enter staff email"/></label><label className="span-2">Password *<input type="password" required value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password"/></label></div>{error&&<p className="form-hint" role="alert">{error}</p>}<button className="btn primary full" disabled={busy}>{busy?'Signing in…':'Sign in'}</button><Link className="text-btn" to="/">Back to storefront</Link></form></div></div>
}
