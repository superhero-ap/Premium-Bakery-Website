import { useEffect, useState, type FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { products, type Product } from '../data/demo'

type OrderItem = { product_name_snapshot: string; variant_name_snapshot: string | null; quantity: number; unit_price: number }
type Order = { id: string; order_number: string; status: string; total_amount: number; customer_note: string | null; scheduled_date: string | null; scheduled_time: string | null; editable_until: string | null; created_at: string; order_items: OrderItem[] }
type Props = { onClose: () => void }
const money = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
const cleanPhone = (value: string) => { const digits = value.replace(/\D/g, ''); return digits.startsWith('91') && digits.length === 12 ? digits.slice(2) : digits }
const phoneAuthEmail = (phone: string) => `${cleanPhone(phone)}@phone.blackforest.local`

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
  const [discountOrder, setDiscountOrder] = useState<string | null>(null)
  const [discountNote, setDiscountNote] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editTime, setEditTime] = useState('')

  const loadAccount = async (userId: string) => {
    if (!supabase) return
    const [{ data: orderData }, { data: profile }] = await Promise.all([
      supabase.from('orders').select('id,order_number,status,total_amount,customer_note,scheduled_date,scheduled_time,editable_until,created_at,order_items(product_name_snapshot,variant_name_snapshot,quantity,unit_price)').eq('customer_id', userId).order('created_at', { ascending: false }),
      supabase.from('customer_profiles').select('cashback_balance').eq('id', userId).maybeSingle(),
    ])
    if (orderData) setOrders(orderData as unknown as Order[])
    setCashback(Number(profile?.cashback_balance || 0))
  }

  useEffect(() => {
    if (!supabase) return
    void supabase.auth.getSession().then(({ data }) => { setSession(data.session); if (data.session?.user) void loadAccount(data.session.user.id) })
    const { data } = supabase.auth.onAuthStateChange((_event, next) => { setSession(next); if (next?.user) void loadAccount(next.user.id); else { setOrders([]); setCashback(0) } })
    return () => data.subscription.unsubscribe()
  }, [])

  const submitAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase) return
    setBusy(true); setMessage('')
    try {
      if (password.length < 8) throw new Error('Password must be at least 8 characters.')
      if (mode === 'signup' && password !== confirmPassword) throw new Error('Passwords do not match.')
      if (method === 'phone') {
        const mobile = cleanPhone(phone)
        if (!/^[6-9]\d{9}$/.test(mobile)) throw new Error('Enter a valid 10-digit Indian mobile number.')
        const authEmail = phoneAuthEmail(mobile)
        if (mode === 'signup') {
          const { data, error } = await supabase.auth.signUp({ email: authEmail, password, options: { data: { full_name: name.trim(), phone: `+91${mobile}`, login_method: 'phone' } } })
          if (error) throw error
          if (data.user) await supabase.from('customer_profiles').upsert({ id: data.user.id, full_name: name.trim(), phone: `+91${mobile}` }, { onConflict: 'id' })
          setMessage(data.session ? 'Account created and signed in.' : 'Account created. If email confirmation is enabled, disable it for password-only phone login.')
        } else {
          const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password })
          if (error) throw error
          setMessage('Signed in successfully.')
        }
      } else if (mode === 'signup') {
        if (!email.trim()) throw new Error('Enter your email address.')
        const mobile = phone ? cleanPhone(phone) : ''
        if (mobile && !/^[6-9]\d{9}$/.test(mobile)) throw new Error('Enter a valid 10-digit Indian mobile number or leave it blank.')
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { full_name: name.trim(), phone: mobile ? `+91${mobile}` : '', login_method: 'email' } } })
        if (error) throw error
        if (data.user) await supabase.from('customer_profiles').upsert({ id: data.user.id, full_name: name.trim(), phone: mobile ? `+91${mobile}` : null }, { onConflict: 'id' })
        setMessage(data.session ? 'Account created and signed in.' : 'Account created. If email confirmation is enabled, complete it once before signing in.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) throw error
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to continue.')
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

  const saveEdit = async (order: Order) => {
    if (!supabase) return
    setBusy(true); setMessage('')
    const { error } = await supabase.rpc('update_customer_order', { payload: { orderId: order.id, scheduledDate: editDate, scheduledTime: editTime, customerNote: discountNote } })
    if (error) setMessage(error.message); else { setMessage('Order update saved.'); if (session?.user) await loadAccount(session.user.id); setDiscountOrder(null) }
    setBusy(false)
  }

  const requestDiscount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase || !discountOrder) return
    setBusy(true); setMessage('')
    const { error } = await supabase.rpc('request_discount', { payload: { orderId: discountOrder, note: discountNote } })
    setMessage(error ? error.message : 'Discount request sent to the bakery.')
    if (!error) { setDiscountOrder(null); setDiscountNote('') }
    setBusy(false)
  }

  if (!supabase) return <div className="account-overlay"><div className="account-panel"><button className="orders-close" onClick={onClose} aria-label="Close">×</button><h2>Customer account</h2><p>Supabase is not configured for this deployment.</p></div></div>

  if (!session) return <div className="account-overlay"><div className="account-panel account-auth"><button className="orders-close" onClick={onClose} aria-label="Close">×</button><div className="eyebrow">CUSTOMER ACCOUNT</div><h2>{mode === 'login' ? 'Welcome back.' : 'Create your bakery account.'}</h2><p>Login is password-only for now. No OTP is required. Your account and orders are saved in Supabase.</p><div className="account-tabs"><button type="button" className={method === 'email' ? 'active' : ''} onClick={() => { setMethod('email'); setMessage('') }}>Email + password</button><button type="button" className={method === 'phone' ? 'active' : ''} onClick={() => { setMethod('phone'); setMessage('') }}>Mobile + password</button></div><form onSubmit={submitAuth} className="account-form">{mode === 'signup' && <label>Name *<input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} autoComplete="name" /></label>}{method === 'phone' ? <label>Mobile number *<input inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile number" required autoComplete="tel" /></label> : <label>Email *<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></label>}{mode === 'signup' && method === 'email' && <label>Mobile number (optional)<input inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile number" autoComplete="tel" /></label>}<label>Password *<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder="Minimum 8 characters" /></label>{mode === 'signup' && <label>Confirm password *<input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} autoComplete="new-password" /></label>}<button className="btn primary full" type="submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button></form>{message && <div className="info-note" role="alert">{message}</div>}<button type="button" className="text-btn" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMessage(''); setPassword(''); setConfirmPassword('') }}>{mode === 'login' ? 'New here? Create an account' : 'Already have an account? Sign in'}</button></div></div>

  return <div className="account-overlay"><div className="account-panel account-dashboard"><div className="account-head"><div><div className="eyebrow">MY ACCOUNT</div><h2>{session.user.user_metadata?.full_name || 'Welcome back.'}</h2><p>{session.user.user_metadata?.phone || session.user.email}</p></div><button className="orders-close" onClick={onClose} aria-label="Close">×</button></div><div className="reward-card"><div><small>CASHBACK BALANCE</small><strong>{money(cashback)}</strong></div><span>Rewards are managed by the bakery and stored with your customer account.</span></div>{message && <div className="info-note">{message}</div>}<div className="account-section"><div className="section-head"><div><div className="eyebrow">ORDER HISTORY</div><h3>Your orders</h3></div><span>{orders.length} saved</span></div>{orders.length ? <div className="orders-list">{orders.map((order) => <OrderCard key={order.id} order={order} busy={busy} discountOrder={discountOrder} discountNote={discountNote} editDate={editDate} editTime={editTime} setDiscountOrder={setDiscountOrder} setDiscountNote={setDiscountNote} setEditDate={setEditDate} setEditTime={setEditTime} reorder={reorder} saveEdit={saveEdit} requestDiscount={requestDiscount} />)}</div> : <div className="empty"><h2>No linked orders yet.</h2><p>Orders placed while signed in will appear here.</p></div>}</div><div className="account-footer"><button className="btn secondary" onClick={() => void supabase!.auth.signOut()}>Sign out</button><button className="text-btn" onClick={onClose}>Continue shopping</button></div></div></div>
}

type CardProps = { order: Order; busy: boolean; discountOrder: string | null; discountNote: string; editDate: string; editTime: string; setDiscountOrder: (value: string | null) => void; setDiscountNote: (value: string) => void; setEditDate: (value: string) => void; setEditTime: (value: string) => void; reorder: (order: Order) => void; saveEdit: (order: Order) => Promise<void>; requestDiscount: (event: FormEvent<HTMLFormElement>) => Promise<void> }
function OrderCard({ order, busy, discountOrder, discountNote, editDate, editTime, setDiscountOrder, setDiscountNote, setEditDate, setEditTime, reorder, saveEdit, requestDiscount }: CardProps) {
  const editable = order.status === 'awaiting_confirmation' && !!order.editable_until && Date.now() < new Date(order.editable_until).getTime()
  return <article className="order-card"><div className="order-card-head"><strong>{order.order_number}</strong><span>{new Date(order.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span></div><p className="order-status">{order.status.replaceAll('_', ' ')}</p><div className="order-items">{order.order_items.map((item, index) => <span key={`${order.id}-${index}`}>{item.quantity} × {item.product_name_snapshot}{item.variant_name_snapshot ? ` (${item.variant_name_snapshot})` : ''}</span>)}</div><div className="order-actions"><strong>{money(Number(order.total_amount))}</strong><button className="btn secondary" onClick={() => reorder(order)}>Order again</button>{editable && <button className="text-btn" onClick={() => { setDiscountOrder(`edit:${order.id}`); setEditDate(order.scheduled_date || ''); setEditTime(order.scheduled_time?.slice(0, 5) || ''); setDiscountNote(order.customer_note || '') }}>Edit order</button>}{order.status !== 'cancelled' && <button className="text-btn" onClick={() => { setDiscountOrder(order.id); setDiscountNote('') }}>Request discount</button>}</div>{editable && discountOrder === `edit:${order.id}` && <form className="discount-form" onSubmit={(event) => { event.preventDefault(); void saveEdit(order) }}><label>Preferred date<input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} /></label><label>Preferred time<input type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)} /></label><label>Instructions<textarea value={discountNote} onChange={(e) => setDiscountNote(e.target.value)} /></label><div><button className="btn primary" disabled={busy}>Save changes</button><button type="button" className="text-btn" onClick={() => setDiscountOrder(null)}>Cancel</button></div></form>}{discountOrder === order.id && <form className="discount-form" onSubmit={requestDiscount}><label>Discount request<textarea value={discountNote} onChange={(e) => setDiscountNote(e.target.value)} placeholder="Tell the bakery what offer you are requesting." required minLength={3} /></label><div><button className="btn primary" disabled={busy}>Send request</button><button type="button" className="text-btn" onClick={() => setDiscountOrder(null)}>Cancel</button></div></form>}</article>
}
