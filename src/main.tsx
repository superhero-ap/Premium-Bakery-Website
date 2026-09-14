import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './styles.css'
import './admin.css'
import App from './App'

function CartCountSync() {
  useEffect(() => {
    const sync = () => {
      try {
        const cart = JSON.parse(localStorage.getItem('bakery-cart') || '[]') as Array<{ quantity?: number }>
        const count = cart.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
        document.querySelectorAll('.cart-link b').forEach((badge) => {
          badge.textContent = String(count)
        })
        document.querySelectorAll('.mobile-bar a[href="/cart"] span').forEach((label) => {
          label.textContent = count ? `Cart (${count})` : 'Cart'
        })
      } catch {
        // Keep the rendered React cart state unchanged if localStorage is unavailable.
      }
    }

    sync()
    const timer = window.setInterval(sync, 250)
    window.addEventListener('storage', sync)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('storage', sync)
    }
  }, [])

  return null
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
      <CartCountSync />
    </BrowserRouter>
  </StrictMode>,
)
