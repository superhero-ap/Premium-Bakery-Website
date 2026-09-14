import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { Eye, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { products, type Product } from '../data/demo'

type OrderItem = { product_name_snapshot: string; variant_name_snapshot: string | null; quantity: number; unit_price: number }
type Order = { id: string; order_number: string; status: string; total_amount: number; created_at: string; order_items: OrderItem[] }
type Props = { onClose: () => void }
const money = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
const cleanPhone = (value: string) => { const digits = value.replace(/\D/g, ''); return digits.startsWith('91') && digits.length === 12 ? digits.slice(2) : digits }

function PasswordField({ value, onChange, autoComplete, placeholder, label }: { value: string; onChange: (value: string) => void; autoComplete: string; placeholder: string; label: string }) {
  const [visible, setVisible] = useState(false)
  return <label>{label} *<span className="password-field"><input type={visible ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} placeholder={placeholder} minLength={8} /><button type="button" className="password-eye" aria-label={visible ? 'Hide password' : 'Show password'} title={visible ? 'Hide password' : 'Show password'} onClick={() => setVisible((current) => !current)}>{visible ? <EyeOff size={19} /> : <Eye size={19} />}</button></span></label>
}

export default function CustomerPasswordPortal({ onClose }: Props) {
  const [session, setSession] = useState<Session | null>(null)
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [method, setMethod] = useState<'email' | 'phone'>('email')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [orders, setOrders] = useState<Order[]>([])
  const [cashback, setCashback] = useState(0)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const loadAccount = async (userId: string) => {
    if (!supabase) return
    const [{ data: orderData }, { data: profile }] = await Promise.all([
      supabase.from('orders').select('id,order_number,status,total_amount,created_at,order_items(product_name_snapshot,variant_name_snapshot,quantity,unit_price)').eq('customer_id', userId).order('created_at', { ascending: false }),
      supabase.from('customer_profiles').select('cashback_balance').eq('id', userId).maybeSingle(),
    ])
    if (orderData) setOrders(orderData as unknown as Order[])
    setCashback(Number(profile?.cashback_balance || 0))
  }

  useEffect(() => {
    if (!supabase) return
    void supabase.auth.getSession().then(({ data }) => { setSession(data.session); if (data.session?.user) void loadAccount(data.session.user.id) })
    const { data } = supabase.auth.onAuthStateChange((_event, next) => { setSession(next); if (next?.user) void loadAccount(next.user.id); else setOrders([]) })
    return () => data.subscription.unsubscribe()
  }, [])

  const submitAuth = async () => {
    if (!supabase || busy) return
    setMessage('')
    if (mode === 'signup' && name.trim().length < 2) { setMessage('Please enter your full name.'); return }
    if (password.length < 8) { setMessage('Password must be at least 8 characters.'); return }
    if (mode === 'signup' && password !== confirmPassword) { setMessage('Passwords do not match.'); return }
    setBusy(true)
    try {
      const mobile = cleanPhone(phone)
      if (mobile && !/^[6-9]\d{9}$/.test(mobile)) throw new Error('Enter a valid 10-digit Indian mobile number or leave it blank.')

      if (method === 'phone') {
        if (!/^[6-9]\d{9}$/.test(mobile)) throw new Error('Enter a valid 10-digit Indian mobile number.')
        const authPhone = `+91${mobile}`
        if (mode === 'signup') {
          const { data, error } = await supabase.auth.signUp({ phone: authPhone, password, options: { data: { full_name: name.trim(), phone: authPhone, email: email.trim().toLowerCase() || null, login_method: 'phone' } } })
          if (error) throw error
          if (!data.session) throw new Error('Phone account was created, but phone confirmation is enabled. Turn off phone confirmation in Supabase Auth settings to keep this password-only flow without OTP.')
          const { error: profileError } = await supabase.from('customer_profiles').upsert({ id: data.user.id, full_name: name.trim(), phone: authPhone }, { onConflict: 'id' })
          if (profileError) throw profileError
          setSession(data.session); setMessage('Account created. No OTP was required.')
        } else {
          const { data, error } = await supabase.auth.signInWithPassword({ phone: authPhone, password })
          if (error) throw error
          setSession(data.session); setMessage('Signed in successfully.')
        }
      } else if (mode === 'signup') {
        const normalizedEmail = email.trim().toLowerCase()
        if (!normalizedEmail) throw new Error('Enter your email address.')
        const { data, error } = await supabase.auth.signUp({ email: normalizedEmail, password, options: { data: { full_name: name.trim(), phone: mobile ? `+91${mobile}` : null, login_method: 'email' } } })
        if (error) {
          if (/rate limit|too many requests|email.*limit/i.test(error.message)) throw new Error('Email verification could not be sent because the Supabase email sender is rate-limited. Configure custom SMTP for the project, then try again.')
          throw error
        }
        if (!data.session) {
          const { error: profileError } = await supabase.from('customer_profiles').upsert({ id: data.user.id, full_name: name.trim(), phone: mobile ? `+91${mobile}` : null }, { onConflict: 'id' })
          if (profileError) throw profileError
          setMessage('Account created. Check your email to verify it, then sign in. Phone is optional.')
          return
        }
        const { error: profileError } = await supabase.from('customer_profiles').upsert({ id: data.user.id, full_name: name.trim(), phone: mobile ? `+91${mobile}` : null }, { onConflict: 'id' })
        if (profileError) throw profileError
        setSession(data.session); setMessage('Account created. Your details are saved.')
      } else {
        const normalizedEmail = email.trim().toLowerCase()
        if (!normalizedEmail) throw new Error('Enter your email address.')
        const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password })
        if (error) throw error
        setSession(data.session); setMessage('Signed in successfully.')
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to complete account access. Please try again.')
    } finally { setBusy(false) }
  }

  const reorder = (order: Order) => {
    try {
      const cart = JSON.parse(localStorage.getItem('bakery-cart') || '[]') as Array<{ product: Product; variant?: string; price: number; quantity: number }>
      order.order_items.forEach((item) => {
        const product = products.find((p) => p.name.toLowerCase() === item.product_name_snapshot.toLowerCase())
        if (!product) return
        const variant = item.variant_name_snapshot || undefined
        const price = product.variants?.find((v) => v.name === variant)?.price ?? product.variants?.[0]?.price ?? product.price
        const existing = cart.find((line) => `${line.product.slug}:${line.variant || ''}` === `${product.slug}:${variant || ''}`)
        if (existing) existing.quantity += item.quantity
        else cart.push({ product, variant, price, quantity: item.quantity })
      })
      localStorage.setItem('bakery-cart', JSON.stringify(cart)); window.dispatchEvent(new Event('storage')); setMessage('Previous order added back to your cart.')
    } catch { setMessage('Could not restore this order.') }
  }

  if (!supabase) return <div className="account-overlay"><div className="account-panel"><button className="orders-close" onClick={onClose} aria-label="Close">×</button><h2>Customer account</h2><p>Supabase is not configured for this deployment.</p></div></div>

  if (!session) return <div className="account-overlay"><div className="account-panel account-auth"><button className="orders-close" onClick={onClose} aria-label="Close">×</button><div className="eyebrow">CUSTOMER ACCOUNT</div><h2>{mode === 'login' ? 'Welcome back.' : 'Create your bakery account.'}</h2><p>Choose email or mobile password sign-in. Mobile accounts do not use OTP; email accounts can use email verification.</p><div className="account-tabs"><button type="button" className={method === 'email' ? 'active' : ''} onClick={() => { setMethod('email'); setMessage('') }}>Email + password</button><button type="button" className={method === 'phone' ? 'active' : ''} onClick={() => { setMethod('phone'); setMessage('') }}>Mobile + password</button></div><div className="account-form">{mode === 'signup' && <label>Full name *<input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></label>}{method === 'phone' ? <><label>Mobile number *<input inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile number" autoComplete="tel" /></label><label>Email (optional)<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="you@example.com" /></label></> : <><label>Email *<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></label>{mode === 'signup' && <label>Mobile number (optional)<input inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile number" autoComplete="tel" /></label>}</>}{mode === 'signup' && method === 'phone' ? null : null}<PasswordField value={password} onChange={setPassword} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder="Minimum 8 characters" label="Password" />{mode === 'signup' && <PasswordField value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" placeholder="Repeat password" label="Confirm password" />}<button className="btn primary full" type="button" disabled={busy} onClick={() => void submitAuth()}>{busy ? (mode === 'login' ? 'Signing in…' : 'Creating account…') : mode === 'login' ? 'Sign in' : 'Create account & continue'}</button></div>{message && <div className="info-note" role="alert">{message}</div>}<button type="button" className="text-btn" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMessage(''); setPassword(''); setConfirmPassword('') }}>{mode === 'login' ? 'New here? Create an account' : 'Already have an account? Sign in'}</button><button type="button" className="text-btn" onClick={onClose}>Continue later</button></div></div>

  return <div className="account-overlay"><div className="account-panel account-dashboard"><div className="account-head"><div><div className="eyebrow">MY ACCOUNT</div><h2>{session.user.user_metadata?.full_name || 'Welcome back.'}</h2><p>{session.user.user_metadata?.phone || session.user.email}</p></div><button className="orders-close" onClick={onClose} aria-label="Close">×</button></div><div className="reward-card"><div><small>CASHBACK BALANCE</small><strong>{money(cashback)}</strong></div><span>Your account details and orders are saved securely.</span></div>{message && <div className="info-note">{message}</div>}<div className="account-section"><div className="section-head"><div><div className="eyebrow">ORDER HISTORY</div><h3>Your orders</h3></div><span>{orders.length} saved</span></div>{orders.length ? <div className="orders-list">{orders.map((order) => <article className="order-card" key={order.id}><div className="order-card-head"><strong>{order.order_number}</strong><span>{new Date(order.created_at).toLocaleString('en-IN')}</span></div><p className="order-status">{order.status.replaceAll('_', ' ')}</p><div className="order-items">{order.order_items.map((item, index) => <span key={`${order.id}-${index}`}>{item.quantity} × {item.product_name_snapshot}{item.variant_name_snapshot ? ` (${item.variant_name_snapshot})` : ''}</span>)}</div><div className="order-actions"><strong>{money(Number(order.total_amount))}</strong><button className="btn secondary" type="button" onClick={() => reorder(order)}>Order again</button></div></article>)}</div> : <div className="empty"><h2>No linked orders yet.</h2><p>Orders placed while signed in will appear here.</p></div>}</div><div className="account-footer"><button className="btn secondary" type="button" onClick={() => void supabase!.auth.signOut()}>Sign out</button><button className="text-btn" type="button" onClick={onClose}>Continue shopping</button></div></div></div>
}
