import { useEffect, useState } from 'react'
import { Link, Navigate, Route, Routes } from 'react-router-dom'
import { categories, products } from '../../data/demo'
import { supabase } from '../../lib/supabase'
import ProductAdmin, { ProductList } from './ProductAdmin'
import { OrderDetail, OrdersList } from './OrdersAdmin'
import CustomersAdmin from './CustomersAdmin'
import SalesAdmin from './SalesAdmin'
import { CategoriesAdmin, CustomCakesAdmin, GalleryAdmin, OffersAdmin, ReviewsAdmin, SettingsAdmin } from './AdminManagement'

function Gate() {
  const [state, setState] = useState<'loading' | 'signed-out' | 'allowed'>('loading')
  useEffect(() => {
    let alive = true
    const check = async () => {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) { if (alive) setState('signed-out'); return }
      const { data: access, error: accessError } = await supabase.rpc('get_my_staff_access')
      const profile = Array.isArray(access) ? access[0] : access
      const allowed = !accessError && Boolean(profile?.is_active && ['owner', 'admin', 'manager', 'staff'].includes(profile.role))
      if (alive) setState(allowed ? 'allowed' : 'signed-out')
    }
    void check()
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') setState('signed-out')
      else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') void check()
    })
    return () => { alive = false; data.subscription.unsubscribe() }
  }, [])
  if (state === 'loading') return <div className="page"><div className="container narrow simple"><div className="eyebrow">ADMIN</div><h1>Checking access…</h1><p>Verifying your authenticated staff session.</p></div></div>
  if (state !== 'allowed') return <Navigate to="/admin/login" replace />
  return <AdminRoutes />
}

function Dashboard() {
  const [stats, setStats] = useState({ today: 0, pending: 0, custom: 0, completed: 0, lowStock: 0, outOfStock: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    const load = async () => {
      const start = new Date(); start.setHours(0, 0, 0, 0)
      const [today, pending, completed, custom, low, out] = await Promise.all([
        supabase.from('orders').select('id', { count: 'exact', head: true }).gte('created_at', start.toISOString()).neq('status', 'cancelled'),
        supabase.from('orders').select('id', { count: 'exact', head: true }).in('status', ['submitted', 'awaiting_confirmation', 'confirmed', 'preparing', 'ready', 'out_for_delivery']),
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
        supabase.from('custom_cake_requests').select('id', { count: 'exact', head: true }).in('status', ['new', 'reviewing', 'quoted', 'confirmed', 'in_progress']),
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true).gt('stock_quantity', 0).filter('stock_quantity', 'lte', 'reorder_level'),
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true).eq('stock_quantity', 0),
      ])
      const firstError = [today, pending, completed, custom, low, out].find(x => x.error)?.error
      if (firstError) setError(firstError.message)
      setStats({ today: today.count ?? 0, pending: pending.count ?? 0, completed: completed.count ?? 0, custom: custom.count ?? 0, lowStock: low.count ?? 0, outOfStock: out.count ?? 0 })
      setLoading(false)
    }
    void load()
  }, [])
  const hour = Number(new Intl.DateTimeFormat('en-IN', { hour: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' }).format(new Date()))
  const open = hour >= 10 && hour < 22
  return <div className="page"><div className="container"><div className="page-title"><div className="eyebrow">ADMIN / DASHBOARD</div><h1>Bakery control room.</h1><p>Live operational view. No demo sales are presented as real sales.</p></div>{error && <div className="info-note" role="alert">{error}</div>}<div className="stats-grid">{[['Today’s Orders',stats.today],['Pending',stats.pending],['Custom Requests',stats.custom],['Completed',stats.completed],['Low Stock',stats.lowStock],['Out of Stock',stats.outOfStock]].map(([label,value])=><div className="stat-card" key={String(label)}><small>{label}</small><strong>{loading?'—':value}</strong></div>)}</div><div className="admin-panel"><h2>Store status</h2><p><strong>{open ? 'Open Now' : 'Closed'}</strong> · configured business hours 10:00 AM–10:00 PM Asia/Kolkata</p></div><div className="admin-grid"><AdminCard to="/admin/products" title="Products" text={`${products.length} demo catalogue items · live CRUD`}/><AdminCard to="/admin/categories" title="Categories" text={`${categories.length} demo categories · live CRUD`}/><AdminCard to="/admin/orders" title="Orders" text="Private live orders with status management"/><AdminCard to="/admin/customers" title="Customers & Rewards" text="Accounts, cashback and discount requests"/><AdminCard to="/admin/custom-cakes" title="Custom Cakes" text="Review and update cake briefs"/><AdminCard to="/admin/offers" title="Offers" text="Create and enable promotions"/><AdminCard to="/admin/gallery" title="Gallery" text="Publish, hide and manage gallery"/><AdminCard to="/admin/reviews" title="Reviews" text="Moderate reviews"/><AdminCard to="/admin/settings" title="Settings" text="Business, ordering and SEO settings"/><AdminCard to="/admin/team" title="Team" text="Roles and staff access"/><AdminCard to="/admin/sales" title="Sales & Reports" text="Daily, weekly and monthly real sales"/></div></div></div>
}

function AdminCard({ to, title, text }: { to: string; title: string; text: string }) { return <Link className="admin-card" to={to}><h2>{title}</h2><p>{text}</p><span>Open →</span></Link> }
function Team() { return <div className="page"><div className="container"><div className="page-title"><div className="eyebrow">ADMIN / TEAM</div><h1>Team</h1><p>Team membership and roles are controlled by authenticated staff profiles. Passwords are never stored here.</p></div><div className="info-note">Create staff accounts through the authentication provider, then add their profile row with role owner, admin, manager or staff and an active flag.</div></div></div> }
function AdminRoutes() { return <Routes><Route index element={<Dashboard/>}/><Route path="products" element={<ProductList/>}/><Route path="products/new" element={<ProductAdmin/>}/><Route path="products/:id/edit" element={<ProductEditor/>}/><Route path="categories" element={<CategoriesAdmin/>}/><Route path="orders" element={<OrdersList/>}/><Route path="orders/:id" element={<OrderRoute/>}/><Route path="customers" element={<CustomersAdmin/>}/><Route path="custom-cakes" element={<CustomCakesAdmin/>}/><Route path="offers" element={<OffersAdmin/>}/><Route path="gallery" element={<GalleryAdmin/>}/><Route path="reviews" element={<ReviewsAdmin/>}/><Route path="settings" element={<SettingsAdmin/>}/><Route path="team" element={<Team/>}/><Route path="sales" element={<SalesAdmin/>}/><Route path="*" element={<Navigate to="/admin" replace/>}/></Routes> }
function ProductEditor() { return <ProductAdmin id={window.location.pathname.split('/').filter(Boolean).pop()} /> }
function OrderRoute() { return <OrderDetail id={window.location.pathname.split('/').filter(Boolean).pop() ?? ''} /> }
export default function Admin() { return <Gate/> }