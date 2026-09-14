import { FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Pencil, Plus, Save, Trash2 } from 'lucide-react'
import { products as demoProducts, type Product } from '../../data/demo'
import { supabase } from '../../lib/supabase'

type Row = {
  id: string
  category_id: string | null
  name: string
  slug: string
  short_description: string | null
  description: string | null
  base_price: number
  compare_at_price: number | null
  is_featured: boolean
  is_best_seller: boolean
  is_available: boolean
  is_active: boolean
  sort_order: number
}

type FormState = Omit<Row, 'id'>
const blank: FormState = { category_id: null, name: '', slug: '', short_description: '', description: '', base_price: 0, compare_at_price: null, is_featured: false, is_best_seller: false, is_available: true, is_active: true, sort_order: 0 }
const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const demoToRow = (p: Product): Row => ({ id: `demo-${p.slug}`, category_id: null, name: p.name, slug: p.slug, short_description: p.description, description: p.description, base_price: p.price, compare_at_price: null, is_featured: false, is_best_seller: p.badge === 'BESTSELLER', is_available: true, is_active: true, sort_order: 0 })

function ProductForm({ id }: { id?: string }) {
  const navigate = useNavigate()
  const [form, setForm] = useState<FormState>(blank)
  const [cats, setCats] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(Boolean(id))
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let alive = true
    const load = async () => {
      if (!supabase) { setLoading(false); return }
      const { data: categoryRows } = await supabase.from('categories').select('id,name').order('sort_order').order('name')
      let productData: Row | null = null
      if (id && !id.startsWith('demo-')) {
        const result = await supabase.from('products').select('category_id,name,slug,short_description,description,base_price,compare_at_price,is_featured,is_best_seller,is_available,is_active,sort_order').eq('id', id).maybeSingle()
        productData = result.data as Row | null
      }
      if (!alive) return
      setCats(categoryRows ?? [])
      if (productData) setForm({ ...blank, ...productData })
      else if (id?.startsWith('demo-')) {
        const demo = demoProducts.find(p => `demo-${p.slug}` === id)
        if (demo) setForm({ ...blank, ...demoToRow(demo) })
      }
      setLoading(false)
    }
    void load()
    return () => { alive = false }
  }, [id])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!supabase) { setMessage('Supabase is not configured. Demo mode is read-only.'); return }
    if (id?.startsWith('demo-')) { setMessage('Demo catalogue items are read-only. Create a live product after connecting Supabase.'); return }
    if (form.name.trim().length < 2 || form.base_price < 0) { setMessage('Enter a product name and a valid price.'); return }
    setSaving(true); setMessage('')
    const payload = { ...form, name: form.name.trim(), slug: form.slug.trim() || slugify(form.name), base_price: Number(form.base_price), compare_at_price: form.compare_at_price === null ? null : Number(form.compare_at_price), short_description: form.short_description?.trim() || null, description: form.description?.trim() || null }
    const result = id ? await supabase.from('products').update(payload).eq('id', id) : await supabase.from('products').insert(payload)
    setSaving(false)
    if (result.error) { setMessage(result.error.message); return }
    navigate('/admin/products')
  }

  if (loading) return <div className="page"><div className="container narrow simple"><h1>Loading product…</h1></div></div>
  return <div className="page"><div className="container narrow"><div className="page-title"><Link to="/admin/products" className="text-btn"><ArrowLeft size={16}/> Products</Link><div className="eyebrow">ADMIN / PRODUCTS</div><h1>{id ? 'Edit product' : 'New product'}</h1><p>Changes are saved to Supabase for authenticated owner/admin accounts.</p></div><form className="checkout" onSubmit={submit}><div className="form-grid"><label>Name *<input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value, slug: form.slug || slugify(e.target.value) })}/></label><label>Slug *<input required value={form.slug} onChange={e => setForm({ ...form, slug: slugify(e.target.value) })}/></label><label>Base price (INR) *<input required min="0" type="number" value={form.base_price} onChange={e => setForm({ ...form, base_price: Number(e.target.value) })}/></label><label>Compare-at price<input min="0" type="number" value={form.compare_at_price ?? ''} onChange={e => setForm({ ...form, compare_at_price: e.target.value ? Number(e.target.value) : null })}/></label><label>Category<select value={form.category_id ?? ''} onChange={e => setForm({ ...form, category_id: e.target.value || null })}><option value="">Uncategorised</option>{cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Sort order<input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: Number(e.target.value) })}/></label></div><label>Short description<textarea value={form.short_description ?? ''} onChange={e => setForm({ ...form, short_description: e.target.value })}/></label><label>Description<textarea value={form.description ?? ''} onChange={e => setForm({ ...form, description: e.target.value })}/></label><div className="form-grid checks"><label><input type="checkbox" checked={form.is_featured} onChange={e => setForm({ ...form, is_featured: e.target.checked })}/> Featured</label><label><input type="checkbox" checked={form.is_best_seller} onChange={e => setForm({ ...form, is_best_seller: e.target.checked })}/> Best seller</label><label><input type="checkbox" checked={form.is_available} onChange={e => setForm({ ...form, is_available: e.target.checked })}/> Available</label><label><input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })}/> Active</label></div>{message && <div className="info-note" role="alert">{message}</div>}<button className="btn primary" disabled={saving}>{saving ? 'Saving…' : <><Save size={17}/> Save product</>}</button></form></div></div>
}

export function ProductList() {
  const [rows, setRows] = useState<Row[]>(demoProducts.map(demoToRow))
  const [live, setLive] = useState(false)
  const [message, setMessage] = useState('')
  const load = async () => {
    if (!supabase) return
    const { data, error } = await supabase.from('products').select('id,category_id,name,slug,short_description,description,base_price,compare_at_price,is_featured,is_best_seller,is_available,is_active,sort_order').order('sort_order').order('name')
    if (error) { setMessage(error.message); return }
    setRows(data ?? []); setLive(true)
  }
  useEffect(() => { void load() }, [])
  const remove = async (id: string) => {
    if (!supabase || id.startsWith('demo-')) { setMessage('Demo catalogue items are read-only until Supabase is configured.'); return }
    if (!window.confirm('Deactivate this product?')) return
    const { error } = await supabase.from('products').update({ is_active: false }).eq('id', id)
    if (error) setMessage(error.message); else await load()
  }
  return <div className="page"><div className="container"><div className="page-title"><div className="eyebrow">ADMIN / PRODUCTS</div><h1>Products</h1><p>{live ? 'Live Supabase catalogue.' : 'Demo catalogue fallback. Connect Supabase for persistence.'}</p><div className="actions"><Link className="btn primary" to="/admin/products/new"><Plus size={17}/> New product</Link></div></div>{message && <div className="info-note" role="alert">{message}</div>}<div className="admin-list">{rows.map(p => <div key={p.id}><div><strong>{p.name}</strong><span>{p.slug} · ₹{Number(p.base_price).toLocaleString('en-IN')} · {p.is_active ? (p.is_available ? 'Active' : 'Unavailable') : 'Inactive'}</span></div><div className="actions"><Link className="text-btn" to={`/admin/products/${p.id}/edit`}><Pencil size={15}/> Edit</Link><button className="text-btn" onClick={() => void remove(p.id)}><Trash2 size={15}/> Deactivate</button></div></div>)}</div></div></div>
}

export default ProductForm
