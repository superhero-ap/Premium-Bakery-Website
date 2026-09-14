import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'

type Summary = { period: string; orders: number; gross_sales: number; discounts: number; delivery_fees: number; net_sales: number }
type Day = { sale_date: string; orders: number; sales: number }
const money = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN')}`
const label = (p: string) => p === 'day' ? 'Today' : p === 'week' ? 'Last 7 days' : 'This month'

export default function SalesAdmin() {
  const [summary, setSummary] = useState<Summary[]>([])
  const [days, setDays] = useState<Day[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = async () => {
    if (!supabase) { setLoading(false); return }
    setLoading(true); setError('')
    const [s, d] = await Promise.all([supabase.rpc('admin_sales_summary'), supabase.rpc('admin_weekly_sales', { days_back: 7 })])
    if (s.error) setError(s.error.message); else setSummary((s.data ?? []) as Summary[])
    if (d.error) setError(d.error.message); else setDays((d.data ?? []) as Day[])
    setLoading(false)
  }
  useEffect(() => { void load() }, [])
  return <div className="page"><div className="container"><div className="page-title"><Link to="/admin" className="text-btn"><ArrowLeft size={15}/> Admin</Link><div className="eyebrow">ADMIN / SALES</div><h1>Sales & reports</h1><p>Real order totals from Supabase. Cancelled and draft orders are excluded.</p><button className="btn secondary" onClick={() => void load()} disabled={loading}><RefreshCw size={15}/> Refresh</button></div>{error && <div className="info-note" role="alert">{error}</div>}<div className="stats-grid">{['day','week','month'].map(period => { const row = summary.find(x => x.period === period); return <div className="stat-card" key={period}><small>{label(period)}</small><strong>{loading ? '—' : money(Number(row?.net_sales))}</strong><span>{row?.orders ?? 0} orders</span></div> })}</div><section className="admin-panel"><h2>Last 7 days</h2>{days.length ? <div className="admin-list">{days.map(day => <div key={day.sale_date}><div><strong>{new Date(`${day.sale_date}T12:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</strong><span>{day.orders} orders</span></div><strong>{money(Number(day.sales))}</strong></div>)}</div> : <div className="empty-state"><h2>No sales yet</h2><p>Once real orders are stored, the daily report will populate automatically.</p></div>}</section><section className="admin-panel"><h2>Revenue breakdown</h2>{summary.map(row => <div className="order-line" key={row.period}><span>{label(row.period)} · gross {money(Number(row.gross_sales))} · discounts {money(Number(row.discounts))} · delivery {money(Number(row.delivery_fees))}</span><strong>{money(Number(row.net_sales))}</strong></div>)}</section></div></div>
}
