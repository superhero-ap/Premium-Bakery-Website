import { useEffect } from 'react'

export default function CartCountSync() {
  useEffect(() => {
    const sync = () => {
      try {
        const raw = localStorage.getItem('bakery-cart') || '[]'
        const cart = JSON.parse(raw) as Array<{ quantity?: number }>
        const count = cart.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)

        document.querySelectorAll<HTMLAnchorElement>('.cart-link').forEach((link) => {
          link.setAttribute('aria-label', `Cart, ${count} item${count === 1 ? '' : 's'}`)
          let badge = link.querySelector<HTMLElement>('b')
          if (count > 0) {
            if (!badge) {
              badge = document.createElement('b')
              link.appendChild(badge)
            }
            badge.textContent = String(count)
          } else if (badge) {
            badge.remove()
          }
        })

        document.querySelectorAll<HTMLElement>('.mobile-bar a[href$="/cart"], .mobile-bar a[href$="/cart/"]').forEach((link) => {
          const label = link.querySelector('span')
          if (label) label.textContent = count ? `Cart (${count})` : 'Cart'
        })
      } catch {
        // Leave the React-rendered UI untouched if localStorage is unavailable.
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
