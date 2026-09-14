import { useEffect, useState } from 'react'

type SavedOrderItem = { name: string; variant?: string; price: number; quantity: number }
type SavedOrder = { id: string; createdAt: string; items: SavedOrderItem[]; subtotal: number; status: string; editableUntil: string; instructions: string; requestedTime: string }
const readOrders = (): SavedOrder[] => { try { return JSON.parse(localStorage.getItem('bakery-orders') || '[]') as SavedOrder[] } catch { return [] } }
const openAccount = () => window.dispatchEvent(new Event('open-customer-account'))

export default function CartCountSync() {
  const [ordersOpen, setOrdersOpen] = useState(false)
  const [orders, setOrders] = useState<SavedOrder[]>(readOrders)
  useEffect(() => {
    const openOrders = () => { setOrders(readOrders()); setOrdersOpen(true) }
    const sync = () => {
      try {
        const cart = JSON.parse(localStorage.getItem('bakery-cart') || '[]') as Array<{ quantity?: number }>
        const count = cart.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
        document.querySelectorAll<HTMLAnchorElement>('.cart-link').forEach((link) => {
          link.setAttribute('aria-label', `Cart, ${count} item${count === 1 ? '' : 's'}`)
          let badge = link.querySelector<HTMLElement>('b')
          if (count > 0) { if (!badge) { badge = document.createElement('b'); link.appendChild(badge) }; badge.textContent = String(count) } else if (badge) badge.remove()
        })
        document.querySelectorAll<HTMLElement>('.mobile-bar a[href$="/cart"], .mobile-bar a[href$="/cart/"]').forEach((link) => { const label = link.querySelector('span'); if (label) label.textContent = count ? `Cart (${count})` : 'Cart' })
      } catch { /* localStorage unavailable */ }
    }
    const finalizeOrderIfNeeded = () => {
      if (!document.querySelector('.success h1')) return
      try {
        const cart = JSON.parse(localStorage.getItem('bakery-cart') || '[]') as Array<{ product?: { name?: string }; variant?: string; price?: number; quantity?: number }>
        if (!cart.length) return
        const items = cart.map((item) => ({ name: item.product?.name || 'Bakery item', variant: item.variant, price: Number(item.price) || 0, quantity: Number(item.quantity) || 0 }))
        const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
        const now = new Date()
        const order: SavedOrder = { id: `BF-${now.getTime().toString().slice(-8)}`, createdAt: now.toISOString(), items, subtotal, status: 'Request submitted · Awaiting bakery confirmation', editableUntil: new Date(now.getTime() + 15 * 60 * 1000).toISOString(), instructions: '', requestedTime: '' }
        const next = [order, ...readOrders()].slice(0, 20)
        localStorage.setItem('bakery-orders', JSON.stringify(next)); localStorage.removeItem('bakery-cart'); setOrders(next); sync()
      } catch { /* keep success screen usable */ }
    }
    const animateAdd = (event: Event) => {
      const target = event.target
      if (!(target instanceof Element)) return
      const button = target.closest<HTMLButtonElement>('.add-btn')
      if (!button) return
      const card = button.closest<HTMLElement>('.product-card')
      const mobileCart = document.querySelector<HTMLElement>('.mobile-bar a[href$="/cart"], .mobile-bar a[href$="/cart/"]')
      button.classList.remove('is-added'); card?.classList.remove('is-added'); mobileCart?.classList.remove('cart-pulse'); void button.offsetWidth
      button.classList.add('is-added'); card?.classList.add('is-added'); mobileCart?.classList.add('cart-pulse')
      window.setTimeout(() => { button.classList.remove('is-added'); card?.classList.remove('is-added'); mobileCart?.classList.remove('cart-pulse') }, 950)
    }
    const addControls = () => {
      const host = document.querySelector('.nav-actions')
      if (host && !host.querySelector('.orders-ui-btn')) {
        const ordersButton = document.createElement('button'); ordersButton.className = 'orders-ui-btn'; ordersButton.type = 'button'; ordersButton.textContent = 'Orders'; ordersButton.setAttribute('aria-label', 'View my order requests'); ordersButton.addEventListener('click', openOrders); host.insertBefore(ordersButton, host.firstChild)
      }
      if (host && !host.querySelector('.account-ui-btn')) {
        const accountButton = document.createElement('button'); accountButton.className = 'orders-ui-btn account-ui-btn'; accountButton.type = 'button'; accountButton.textContent = 'Account'; accountButton.setAttribute('aria-label', 'Open customer account'); accountButton.addEventListener('click', openAccount); host.insertBefore(accountButton, host.firstChild)
      }
      const mobileMenu = document.querySelector('.mobile-menu')
      if (mobileMenu && !mobileMenu.querySelector('.orders-mobile-btn')) {
        const ordersButton = document.createElement('button'); ordersButton.className = 'orders-ui-btn orders-mobile-btn'; ordersButton.type = 'button'; ordersButton.textContent = 'My Orders'; ordersButton.addEventListener('click', openOrders); mobileMenu.insertBefore(ordersButton, mobileMenu.firstChild)
      }
      if (mobileMenu && !mobileMenu.querySelector('.account-mobile-btn')) {
        const accountButton = document.createElement('button'); accountButton.className = 'orders-ui-btn account-mobile-btn'; accountButton.type = 'button'; accountButton.textContent = 'My Account'; accountButton.addEventListener('click', openAccount); mobileMenu.insertBefore(accountButton, mobileMenu.firstChild)
      }
    }
    sync(); finalizeOrderIfNeeded(); addControls()
    const timer = window.setInterval(() => { sync(); finalizeOrderIfNeeded(); addControls() }, 400)
    const observer = new MutationObserver(() => { finalizeOrderIfNeeded(); addControls() })
    observer.observe(document.body, { childList: true, subtree: true })
    window.addEventListener('storage', sync); document.addEventListener('click', animateAdd)
    return () => { window.clearInterval(timer); observer.disconnect(); window.removeEventListener('storage', sync); document.removeEventListener('click', animateAdd) }
  }, [])
  const saveEdit = (order: SavedOrder, requestedTime: string, instructions: string) => { const next = orders.map((item) => item.id === order.id ? { ...item, requestedTime, instructions } : item); localStorage.setItem('bakery-orders', JSON.stringify(next)); setOrders(next) }
  return ordersOpen ? <div className="orders-overlay" role="dialog" aria-modal="true" aria-label="My orders"><div className="orders-panel"><div className="orders-head"><div><div className="eyebrow">ORDER HISTORY</div><h2>My order requests</h2></div><button className="orders-close" onClick={() => setOrdersOpen(false)} aria-label="Close orders">×</button></div>{!orders.length ? <div className="empty"><h2>No orders yet.</h2><p>Your submitted requests will appear here.</p></div> : <div className="orders-list">{orders.map((order) => { const editable = Date.now() < new Date(order.editableUntil).getTime(); return <article className="order-card" key={order.id}><div className="order-card-head"><strong>{order.id}</strong><span>{new Date(order.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span></div><p className="order-status">{order.status}</p><div className="order-items">{order.items.map((item, index) => <span key={`${order.id}-${index}`}>{item.quantity} × {item.name}{item.variant ? ` (${item.variant})` : ''}</span>)}</div><strong>Estimated subtotal: ₹{Math.round(order.subtotal).toLocaleString('en-IN')}</strong>{editable ? <div className="order-edit"><label>Preferred time<input defaultValue={order.requestedTime} onChange={(event) => saveEdit(order, event.target.value, order.instructions)} placeholder="e.g. 6:30 PM" /></label><label>Instructions<textarea defaultValue={order.instructions} onChange={(event) => saveEdit(order, order.requestedTime, event.target.value)} placeholder="Any update for the bakery?" /></label><small>Changes are available for 15 minutes after the request.</small></div> : <small className="order-locked">Edit window closed. Contact the bakery for changes.</small>}</article> })}</div>}<button className="btn primary full" onClick={() => setOrdersOpen(false)}>Back to shopping</button></div></div> : null
}
