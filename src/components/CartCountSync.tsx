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

    const animateAdd = (event: Event) => {
      const target = event.target
      if (!(target instanceof Element)) return
      const button = target.closest<HTMLButtonElement>('.add-btn')
      if (!button) return
      const card = button.closest<HTMLElement>('.product-card')
      const mobileCart = document.querySelector<HTMLElement>('.mobile-bar a[href$="/cart"], .mobile-bar a[href$="/cart/"]')
      button.classList.remove('is-added')
      card?.classList.remove('is-added')
      mobileCart?.classList.remove('cart-pulse')
      void button.offsetWidth
      button.classList.add('is-added')
      card?.classList.add('is-added')
      mobileCart?.classList.add('cart-pulse')
      window.setTimeout(() => {
        button.classList.remove('is-added')
        card?.classList.remove('is-added')
        mobileCart?.classList.remove('cart-pulse')
      }, 950)
    }

    sync()
    const timer = window.setInterval(sync, 250)
    window.addEventListener('storage', sync)
    document.addEventListener('click', animateAdd)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('storage', sync)
      document.removeEventListener('click', animateAdd)
    }
  }, [])

  return null
}
