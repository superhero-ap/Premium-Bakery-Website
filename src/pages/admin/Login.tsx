import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function AdminLogin() {
  const nav = useNavigate()
  const [identifier, setIdentifier] = useState('admin')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError('')
    if (!supabase) { setError('Supabase is not configured.'); return }
    const email = identifier.includes('@') ? identifier.trim() : `${identifier.trim()}@blackforest.local`
    setBusy(true)
    const result = await supabase.auth.signInWithPassword({ email, password })
    if (result.error) { setBusy(false); setError('Unable to sign in. Check the Admin ID and password.'); return }
    const user = result.data.user
    const { data: profile } = await supabase.from('profiles').select('is_active,role').eq('id', user.id).maybeSingle()
    const allowed = Boolean(profile?.is_active && ['owner', 'admin', 'manager', 'staff'].includes(profile.role))
    if (!allowed) { await supabase.auth.signOut(); setBusy(false); setError('This account is not authorised for the admin panel.'); return }
    setBusy(false); nav('/admin')
  }
  return <div className="page"><div className="container narrow simple"><div className="eyebrow">STAFF ACCESS</div><h1>Sign in to your bakery workspace.</h1><p>Use your Admin ID. For the default ID <strong>admin</strong>, the corresponding Supabase Auth email is <strong>admin@blackforest.local</strong>. Passwords are never stored in the application database.</p><form className="checkout" onSubmit={submit}><div className="form-grid"><label className="span-2">Admin ID *<input required value={identifier} onChange={e=>setIdentifier(e.target.value)} autoComplete="username"/></label><label className="span-2">Password *<input type="password" required value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password"/></label></div>{error&&<p className="form-hint" role="alert">{error}</p>}<button className="btn primary full" disabled={busy}>{busy?'Signing in…':'Sign in'}</button><Link className="text-btn" to="/">Back to storefront</Link></form></div></div>
}
