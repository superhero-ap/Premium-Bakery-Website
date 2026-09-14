import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { products, type Product } from '../data/demo'

type OrderItem = { product_name_snapshot: string; variant_name_snapshot: string | null; quantity: number; unit_price: number }
type Order = { id: string; order_number: string; status: string; subtotal: number; discount_amount: number; delivery_fee: number; total_amount: number; customer_note: string | null; scheduled_date: string | null; scheduled_time: string | null; created_at: string; order_items: OrderItem[] }

type Props = { onClose: () => void }
const money = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)

export default function CustomerPortal({ onClose }: Props) {
  const [session, setSession] = useState<any>(null)
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [orders, setOrders] = useState<Order[]>([])
  const [cashback, setCashback] = useState(0)
  const [discountNote, setDiscountNote] = useState('')
  const [discountOrder, setDiscountOrder] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const loadAccount = async (userId: string) => {
    if (!supabase) return
    const [{ data: orderData }, { data: profile }] = await Promise.all([
      supabase.from('orders').select('id,order_number,status,subtotal,discount_amount,delivery_fee,total_amount,customer_note,scheduled_date,scheduled_time,created_at,order_items(product_name_snapshot,variant_name_snapshot,quantity,unit_price)').eq('customer_id', userId).order('created_at', { ascending: false }),
      supabase.from('customer_profiles').select('cashback_balance').eq('id', userId).maybeSingle(),
    ])
    if (orderData) setOrders(orderData as unknown as Order[])
    setCashback(Number(profile?.cashback_balance || 0))
  }

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session?.user) loadAccount(data.session.user.id)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      if (next?.user) loadAccount(next.user.id)
      else { setOrders([]); setCashback(0) }
    })
    return () => data.subscription.unsubscribe()
  }, [])

  if (!supabase) return <div className="account-overlay"><div className="account-panel"><button className="orders-close" onClick={onClose} aria-label="Close">×</button><h2>Customer account</h2><p>Customer login is not configured yet. Add the Supabase environment variables to enable it.</p></div></div>

  const submitAuth = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage('')
    const cleanPhone = phone.replace(/\D/g, '')
    try {
      if (mode === 'signup') {
        if (password.length < 8) throw new Error('Password must be at least 8 characters.')
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { full_name: name.trim(), phone: cleanPhone } } })
        if (error) throw error
        if (data.user) await supabase.from('customer_profiles').upsert({ id: data.user.id, full_name: name.trim(), phone: cleanPhone }, { onConflict: 'id' })
        setMessage(data.session ? 'Account created.' : 'Account created. Check your email if confirmation is enabled.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) throw error
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to continue.') } finally { setBusy(false) }
  }

  const reorder = (order: Order) => {
    try {
      const cart = JSON.parse(localStorage.getItem('bakery-cart') || '[]') as Array<{ product: Product; variant?: string; price: number; quantity: number }>
      order.order_items.forEach((item) => {
        const product = products.find((p) => p.name.toLowerCase() === item.product_name_snapshot.toLowerCase())
        if (!product) return
        const variant = item.variant_name_snapshot || undefined
        const price = product.variants?.find((v) => v.name === variant)?.price ?? product.variants?.[0]?.price ?? product.price
        const key = `${product.slug}:${variant || ''}`
        const existing = cart.find((line) => `${line.product.slug}:${line.variant || ''}` === key)
        if (existing) existing.quantity += item.quantity
        else cart.push({ product, variant, price, quantity: item.quantity })
      })
      localStorage.setItem('bakery-cart', JSON.stringify(cart)); window.dispatchEvent(new Event('storage')); setMessage('Previous order added back to your cart.')
    } catch { setMessage('Could not restore this order.') }
  }

  const submitDiscountRequest = async (event: React.FormEvent) => {
    event.preventDefault(); if (!discountOrder) return
    setBusy(true); setMessage('')
    const { error } = await supabase.rpc('request_discount', { payload: { orderId: discountOrder, note: discountNote } })
    setMessage(error ? error.message : 'Discount request sent to the bakery for review.')
    if (!error) { setDiscountNote(''); setDiscountOrder(null) }
    setBusy(false)
  }

  if (!session) return <div className="account-overlay"><div className="account-panel account-auth"><button className="orders-close" onClick={onClose} aria-label="Close">×</button><div className="eyebrow">CUSTOMER ACCOUNT</div><h2>{mode === 'login' ? 'Welcome back.' : 'Create your bakery account.'}</h2><p>{mode === 'login' ? 'Sign in to see orders, reorder favourites and manage your requests.' : 'Save your order history and unlock customer rewards when the bakery adds them.'}</p><form onSubmit={submitAuth} className="account-form">{mode === 'signup' && <><label>Name *<input value={name} onChange={(e) => setName(e.target.value)} required minLength={2}/></label><label>Phone (optional)<input inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile number"/></label></>}<label>Email *<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email"/></label><label>Password *<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete={mode === 'login' ? 'current-password' : 'new-password'}/></label><button className="btn primary full" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button></form>{message && <div className="info-note">{message}</div>}<button className="text-btn" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMessage('') }}>{mode === 'login' ? 'New here? Create an account' : 'Already have an account? Sign in'}</button></div></div>

  return <div className="account-overlay"><div className="account-panel account-dashboard"><div className="account-head"><div><div className="eyebrow">MY ACCOUNT</div><h2>{session.user.user_metadata?.full_name || 'Welcome back.'}</h2><p>{session.user.email}</p></div><button className="orders-close" onClick={onClose} aria-label="Close">×</button></div><div className="reward-card"><div><small>CASHBACK BALANCE</small><strong>{money(cashback)}</strong></div><span>Rewards are bakery-managed and only credited after eligible orders are confirmed.</span></div>{message && <div className="info-note">{message}</div>}<div className="account-section"><div className="section-head"><div><div className="eyebrow">ORDER HISTORY</div><h3>Your orders</h3></div><span>{orders.length} saved</span></div>{orders.length ? <div className="orders-list">{orders.map((order) => <article className="order-card" key={order.id}><div className="order-card-head"><strong>{order.order_number}</strong><span>{new Date(order.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span></div><p className="order-status">{order.status.replaceAll('_', ' ')}</p><div className="order-items">{order.order_items.map((item, i) => <span key={`${order.id}-${i}`}>{item.quantity} × {item.product_name_snapshot}{item.variant_name_snapshot ? ` (${item.variant_name_snapshot})` : ''}</span>)}</div><div className="order-actions"><strong>{money(Number(order.total_amount))}</strong><button className="btn secondary" onClick={() => reorder(order)}>Order again</button>{order.status !== 'cancelled' && <button className="text-btn" onClick={() => { setDiscountOrder(order.id); setDiscountNote('') }}>Request discount</button>}</div>{discountOrder === order.id && <form className="discount-form" onSubmit={submitDiscountRequest}><label>Why would you like a discount?<textarea value={discountNote} onChange={(e) => setDiscountNote(e.target.value)} required minLength={5} placeholder="Tell the bakery briefly…"/></label><div><button className="btn primary" disabled={busy}>Send request</button><button type="button" className="text-btn" onClick={() => setDiscountOrder(null)}>Cancel</button></div></form>}</article>)}</div> : <div className="empty"><h2>No linked orders yet.</h2><p>New orders placed while signed in will appear here.</p></div>}</div><div className="account-footer"><button className="btn secondary" onClick={async () => { await supabase.auth.signOut(); setMessage('Signed out.'); }}>Sign out</button><button className="text-btn" onClick={onClose}>Continue shopping</button></div></div></div>
}
