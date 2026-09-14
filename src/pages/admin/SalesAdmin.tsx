import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, RefreshCw, Save } from 'lucide-react'
import { supabase } from '../../lib/supabase'

type Summary = { period: string; orders: number; gross_sales: number; discounts: number; delivery_fees: number; net_sales: number }
type Day = { sale_date: string; orders: number; sales: number }
type Product = { id: string; name: string; stock_quantity: number; reorder_level: number; is_active: boolean }
const money = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN')}`
const label = (p: string) => p === 'day' ? 'Today' : p === 'week' ? 'Last 7 days' : 'This month'

export default function SalesAdmin() {
  const [summary, setSummary] = useState<Summary[]>([]); const [days, setDays] = useState<Day[]>([]); const [inventory, setInventory] = useState<Product[]>([])
  const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [saving, setSaving] = useState<string | null>(null)
  const load = async () => {
    if (!supabase) { setLoading(false); return }
    setLoading(true); setError('')
    const [s, d, p] = await Promise.all([supabase.rpc('admin_sales_summary'), supabase.rpc('admin_weekly_sales', { days_back: 7 }), supabase.from('products').select('id,name,stock_quantity,reorder_level,is_active').eq('is_active', true).order('name')])
    if (s.error) setError(s.error.message); else setSummary((s.data ?? []) as Summary[])
    if (d.error) setError(d.error.message); else setDays((d.data ?? []) as Day[])
    if (p.error) setError(p.error.message); else setInventory((p.data ?? []) as Product[])
    setLoading(false)
  }
  useEffect(() => { void load() }, [])
  const saveStock = async (product: Product) => { if (!supabase) return; setSaving(product.id); const { error } = await supabase.from('products').update({ stock_quantity: Math.max(0, Math.floor(Number(product.stock_quantity) || 0)), reorder_level: Math.max(0, Math.floor(Number(product.reorder_level) || 0)) }).eq('id', product.id); setSaving(null); if (error) setError(error.message); else await load() }
  return <div className="page"><div className="container"><div className="page-title"><Link to="/admin" className="text-btn"><ArrowLeft size={15}/> Admin</Link><div className="eyebrow">ADMIN / SALES & INVENTORY</div><h1>Sales & reports</h1><p>Real order totals from Supabase. Cancelled and draft orders are excluded.</p><button className="btn secondary" onClick={() => void load()} disabled={loading}><RefreshCw size={15}/> Refresh</button></div>{error && <div className="info-note" role="alert">{error}</div>}<div className="stats-grid">{['day','week','month'].map(period => { const row = summary.find(x => x.period === period); return <div className="stat-card" key={period}><small>{label(period)}</small><strong>{loading ? '—' : money(Number(row?.net_sales))}</strong><span>{row?.orders ?? 0} orders</span></div> })}</div><section className="admin-panel"><h2>Last 7 days</h2>{days.length ? <div className="admin-list">{days.map(day => <div key={day.sale_date}><div><strong>{new Date(`${day.sale_date}T12:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</strong><span>{day.orders} orders</span></div><strong>{money(Number(day.sales))}</strong></div>)}</div> : <div className="empty-state"><h2>No sales yet</h2><p>Once real orders are stored, the daily report will populate automatically.</p></div>}</section><section className="admin-panel"><h2>Inventory alerts & stock</h2>{inventory.length ? <div className="admin-list">{inventory.map(product => <div key={product.id}><div><strong>{product.name}</strong><span>{product.stock_quantity === 0 ? 'OUT OF STOCK' : product.stock_quantity <= product.reorder_level ? 'LOW STOCK' : 'In stock'}</span></div><label className="inline-field">Stock <input type="number" min="0" value={product.stock_quantity} onChange={e => setInventory(rows => rows.map(x => x.id === product.id ? { ...x, stock_quantity: Number(e.target.value) } : x))}/><span>Alert at</span><input type="number" min="0" value={product.reorder_level} onChange={e => setInventory(rows => rows.map(x => x.id === product.id ? { ...x, reorder_level: Number(e.target.value) } : x))}/><button className="btn secondary" disabled={saving === product.id} onClick={() => void saveStock(product)}><Save size={14}/>{saving === product.id ? 'Saving' : 'Save'}</button></label></div>)}</div> : <div className="empty-state"><h2>No live products</h2><p>Create products first, then manage their stock here.</p></div>}</section><section className="admin-panel"><h2>Revenue breakdown</h2>{summary.map(row => <div className="order-line" key={row.period}><span>{label(row.period)} · gross {money(Number(row.gross_sales))} · discounts {money(Number(row.discounts))} · delivery {money(Number(row.delivery_fees))}</span><strong>{money(Number(row.net_sales))}</strong></div>)}</section></div></div>
}
