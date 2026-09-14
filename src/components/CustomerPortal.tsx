import { useEffect, useState, type FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { products, type Product } from '../data/demo'

type OrderItem = { product_name_snapshot: string; variant_name_snapshot: string | null; quantity: number; unit_price: number }
type Order = { id: string; order_number: string; status: string; total_amount: number; customer_note: string | null; scheduled_date: string | null; scheduled_time: string | null; editable_until: string | null; created_at: string; order_items: OrderItem[] }
type Props = { onClose: () => void }
const money = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
const phoneDigits = (v: string) => v.replace(/\D/g, '').replace(/^91/, '')
const phoneE164 = (v: string) => `+91${phoneDigits(v)}`

export default function CustomerPortal({ onClose }: Props) {
  const [session, setSession] = useState<Session | null>(null)
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [method, setMethod] = useState<'email' | 'phone'>('phone')
  const [email, setEmail] = useState(''); const [phone, setPhone] = useState(''); const [name, setName] = useState('')
  const [password, setPassword] = useState(''); const [confirmPassword, setConfirmPassword] = useState('')
  const [orders, setOrders] = useState<Order[]>([]); const [cashback, setCashback] = useState(0)
  const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false)
  const [actionOrder, setActionOrder] = useState<string | null>(null); const [note, setNote] = useState(''); const [editDate, setEditDate] = useState(''); const [editTime, setEditTime] = useState('')

  const loadAccount = async (userId: string) => {
    const [{ data: orderData }, { data: profile }] = await Promise.all([
      supabase.from('orders').select('id,order_number,status,total_amount,customer_note,scheduled_date,scheduled_time,editable_until,created_at,order_items(product_name_snapshot,variant_name_snapshot,quantity,unit_price)').eq('customer_id', userId).order('created_at', { ascending: false }),
      supabase.from('customer_profiles').select('cashback_balance').eq('id', userId).maybeSingle(),
    ])
    if (orderData) setOrders(orderData as unknown as Order[])
    setCashback(Number(profile?.cashback_balance || 0))
  }

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => { setSession(data.session); if (data.session?.user) void loadAccount(data.session.user.id) })
    const { data } = supabase.auth.onAuthStateChange((_event, next) => { setSession(next); if (next?.user) void loadAccount(next.user.id); else { setOrders([]); setCashback(0) } })
    return () => data.subscription.unsubscribe()
  }, [])

  const submitAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setMessage('')
    try {
      if (password.length < 8) throw new Error('Password must be at least 8 characters.')
      if (mode === 'signup' && password !== confirmPassword) throw new Error('Password and confirm password must match.')
      if (method === 'phone') {
        const digits = phoneDigits(phone); if (!/^[6-9]\d{9}$/.test(digits)) throw new Error('Enter a valid 10-digit Indian mobile number.')
        const phoneValue = phoneE164(phone)
        if (mode === 'signup') {
          const { data, error } = await supabase.auth.signUp({ phone: phoneValue, password, options: { data: { full_name: name.trim(), phone: phoneValue } } })
          if (error) throw error; if (!data.user) throw new Error('Account could not be created.')
          if (!data.session) throw new Error('Mobile confirmation is enabled. Please complete the confirmation before signing in.')
          await supabase.from('customer_profiles').upsert({ id: data.user.id, full_name: name.trim(), phone: phoneValue }, { onConflict: 'id' })
          setMessage('Account created successfully.')
        } else {
          const { error } = await supabase.auth.signInWithPassword({ phone: phoneValue, password }); if (error) throw error; setMessage('Signed in successfully.')
        }
      } else if (mode === 'signup') {
        const value = email.trim(); if (!value) throw new Error('Enter your email address.')
        const { data, error } = await supabase.auth.signUp({ email: value, password, options: { data: { full_name: name.trim(), phone: phoneDigits(phone) } } })
        if (error) throw error; if (!data.user) throw new Error('Account could not be created.')
        if (!data.session) throw new Error('Email confirmation is enabled. Please complete the confirmation before signing in.')
        await supabase.from('customer_profiles').upsert({ id: data.user.id, full_name: name.trim(), phone: phoneDigits(phone) }, { onConflict: 'id' }); setMessage('Account created successfully.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password }); if (error) throw error; setMessage('Signed in successfully.')
      }
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Unable to continue.'
      setMessage(text.toLowerCase().includes('rate limit') ? 'Too many signup attempts right now. Please wait a while, then try again, or use Mobile + password.' : text)
    } finally { setBusy(false) }
  }

  const reorder = (order: Order) => {
    try {
      const cart = JSON.parse(localStorage.getItem('bakery-cart') || '[]') as Array<{ product: Product; variant?: string; price: number; quantity: number }>
      order.order_items.forEach(item => { const product = products.find(p => p.name.toLowerCase() === item.product_name_snapshot.toLowerCase()); if (!product) return; const variant = item.variant_name_snapshot || undefined; const price = product.variants?.find(v => v.name === variant)?.price ?? product.price; const existing = cart.find(line => `${line.product.slug}:${line.variant || ''}` === `${product.slug}:${variant || ''}`); if (existing) existing.quantity += item.quantity; else cart.push({ product, variant, price, quantity: item.quantity }) })
      localStorage.setItem('bakery-cart', JSON.stringify(cart)); window.dispatchEvent(new Event('storage')); setMessage('Previous order added back to your cart.')
    } catch { setMessage('Could not restore this order.') }
  }

  const editOrder = async (order: Order) => {
    setBusy(true); setMessage(''); const { error } = await supabase.rpc('update_customer_order', { payload: { orderId: order.id, scheduledDate: editDate, scheduledTime: editTime, customerNote: note } }); setBusy(false); if (error) setMessage(error.message); else { setMessage('Order update saved.'); if (session?.user) await loadAccount(session.user.id); setActionOrder(null) }
  }
  const discount = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!actionOrder) return; setBusy(true); const { error } = await supabase.rpc('request_discount', { payload: { orderId: actionOrder, note } }); setBusy(false); setMessage(error ? error.message : 'Discount request sent to the bakery.'); if (!error) { setActionOrder(null); setNote('') } }

  if (!session) return <div className="account-overlay"><div className="account-panel account-auth"><button className="orders-close" onClick={onClose} aria-label="Close">×</button><div className="eyebrow">CUSTOMER ACCOUNT</div><h2>{mode === 'login' ? 'Welcome back.' : 'Create your bakery account.'}</h2><p>{mode === 'login' ? 'Sign in to see orders, reorder favourites and manage requests.' : 'Your account and order history stay securely saved for your next visit.'}</p><div className="account-tabs"><button type="button" className={method === 'email' ? 'active' : ''} onClick={() => setMethod('email')}>Email + password</button><button type="button" className={method === 'phone' ? 'active' : ''} onClick={() => setMethod('phone')}>Mobile + password</button></div><form onSubmit={submitAuth} className="account-form">{mode === 'signup' && <label>Name *<input value={name} onChange={e => setName(e.target.value)} required minLength={2} autoComplete="name" /></label>}{method === 'email' ? <label>Email *<input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" /></label> : <label>Mobile number *<input inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="10-digit mobile number" required autoComplete="tel" /></label>}<label>Password *<input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></label>{mode === 'signup' && <label>Confirm password *<input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={8} autoComplete="new-password" /></label>}<button className="btn primary full" type="submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button></form>{message && <div className="info-note" role="alert">{message}</div>}<button type="button" className="text-btn" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMessage(''); setPassword(''); setConfirmPassword('') }}>{mode === 'login' ? 'New here? Create an account' : 'Already have an account? Sign in'}</button></div></div>

  return <div className="account-overlay"><div className="account-panel account-dashboard"><div className="account-head"><div><div className="eyebrow">MY ACCOUNT</div><h2>{session.user.user_metadata?.full_name || 'Welcome back.'}</h2><p>{session.user.email || session.user.phone}</p></div><button className="orders-close" onClick={onClose} aria-label="Close">×</button></div><div className="reward-card"><div><small>CASHBACK BALANCE</small><strong>{money(cashback)}</strong></div><span>Rewards are bakery-managed and credited after eligible orders are confirmed.</span></div>{message && <div className="info-note">{message}</div>}<div className="account-section"><div className="section-head"><div><div className="eyebrow">ORDER HISTORY</div><h3>Your orders</h3></div><span>{orders.length} saved</span></div>{orders.length ? <div className="orders-list">{orders.map(order => { const editable = order.status === 'awaiting_confirmation' && !!order.editable_until && Date.now() < new Date(order.editable_until).getTime(); return <article className="order-card" key={order.id}><div className="order-card-head"><strong>{order.order_number}</strong><span>{new Date(order.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span></div><p className="order-status">{order.status.replaceAll('_', ' ')}</p><div className="order-items">{order.order_items.map((item,i) => <span key={`${order.id}-${i}`}>{item.quantity} × {item.product_name_snapshot}{item.variant_name_snapshot ? ` (${item.variant_name_snapshot})` : ''}</span>)}</div><div className="order-actions"><strong>{money(Number(order.total_amount))}</strong><button className="btn secondary" onClick={() => reorder(order)}>Order again</button>{editable && <button className="text-btn" onClick={() => { setActionOrder(`edit:${order.id}`); setEditDate(order.scheduled_date || ''); setEditTime(order.scheduled_time?.slice(0,5) || ''); setNote(order.customer_note || '') }}>Edit order</button>}{order.status !== 'cancelled' && <button className="text-btn" onClick={() => { setActionOrder(order.id); setNote('') }}>Request discount</button>}</div>{editable && actionOrder === `edit:${order.id}` && <form className="discount-form" onSubmit={e => { e.preventDefault(); void editOrder(order) }}><label>Preferred date<input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} /></label><label>Preferred time<input type="time" value={editTime} onChange={e => setEditTime(e.target.value)} /></label><label>Instructions<textarea value={note} onChange={e => setNote(e.target.value)} /></label><button className="btn primary" disabled={busy}>Save changes</button><button type="button" className="text-btn" onClick={() => setActionOrder(null)}>Cancel</button></form>}{actionOrder === order.id && <form className="discount-form" onSubmit={discount}><label>Discount request<textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Tell the bakery what you need help with" required /></label><button className="btn primary" disabled={busy}>Send request</button><button type="button" className="text-btn" onClick={() => setActionOrder(null)}>Cancel</button></form>}</article> })}</div> : <div className="empty"><h2>No linked orders yet.</h2><p>New orders placed while signed in will appear here.</p></div>}</div><div className="account-footer"><button className="btn secondary" onClick={() => void supabase.auth.signOut()}>Sign out</button><button className="text-btn" onClick={onClose}>Continue shopping</button></div></div></div>
}
