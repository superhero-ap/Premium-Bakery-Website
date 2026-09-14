import { useEffect } from 'react'
import { createOrder } from '../lib/order'
import { supabase } from '../lib/supabase'

type CartLine = { product: { slug: string; name: string }; variant?: string; quantity: number }
const fieldValue = (root: ParentNode, keyword: string) => { const label = Array.from(root.querySelectorAll('label')).find((node) => node.textContent?.toLowerCase().includes(keyword)); return (label?.querySelector('input, textarea') as HTMLInputElement | HTMLTextAreaElement | null)?.value.trim() || '' }

export default function CheckoutOrderSync() {
  useEffect(() => {
    const onClick = async (event: MouseEvent) => {
      if (!window.location.pathname.endsWith('/checkout') || !supabase) return
      if (sessionStorage.getItem('checkout-order-sync-bypass') === '1') { sessionStorage.removeItem('checkout-order-sync-bypass'); return }
      const target = event.target instanceof Element ? event.target.closest('button.btn.primary.full') : null
      if (!(target instanceof HTMLButtonElement) || !/(order|request|confirm|place)/i.test(target.textContent || '')) return
      const checkout = target.closest('.checkout'); if (!checkout) return
      event.preventDefault(); event.stopPropagation(); target.disabled = true; target.dataset.originalText = target.textContent || ''; target.textContent = 'Saving order…'
      try {
        const cart = JSON.parse(localStorage.getItem('bakery-cart') || '[]') as CartLine[]
        if (!cart.length) throw new Error('Your cart is empty.')
        const slugs = [...new Set(cart.map((line) => line.product.slug))]
        const { data: dbProducts, error: productError } = await supabase.from('products').select('id,slug').in('slug', slugs).eq('is_active', true)
        if (productError) throw productError
        const productMap = new Map((dbProducts || []).map((row) => [row.slug, row.id as string]))
        const ids = [...productMap.values()]
        const { data: variants, error: variantError } = ids.length ? await supabase.from('product_variants').select('id,product_id,name').in('product_id', ids).eq('available', true) : { data: [], error: null }
        if (variantError) throw variantError
        const variantMap = new Map((variants || []).map((row) => [`${row.product_id}:${row.name}`, row.id as string]))
        const items = cart.map((line) => { const productId = productMap.get(line.product.slug); if (!productId) throw new Error(`Product unavailable: ${line.product.name}`); return { productId, variantId: line.variant ? variantMap.get(`${productId}:${line.variant}`) : undefined, quantity: Math.max(1, Math.floor(line.quantity)) } })
        const type = checkout.querySelector('.toggle button.active')?.textContent?.toLowerCase().includes('delivery') ? 'delivery' : 'pickup'
        const result = await createOrder({ customerName: fieldValue(checkout, 'name'), customerPhone: fieldValue(checkout, 'phone').replace(/\D/g, ''), customerEmail: fieldValue(checkout, 'email') || undefined, orderType: type, deliveryAddress: fieldValue(checkout, 'address') || undefined, landmark: fieldValue(checkout, 'landmark') || undefined, city: fieldValue(checkout, 'city') || undefined, postalCode: fieldValue(checkout, 'pin') || undefined, scheduledDate: fieldValue(checkout, 'date') || undefined, scheduledTime: fieldValue(checkout, 'time') || undefined, customerNote: fieldValue(checkout, 'note') || undefined, items })
        sessionStorage.setItem('last-order-request', JSON.stringify(result)); sessionStorage.setItem('checkout-order-sync-bypass', '1'); target.click()
      } catch (error) { target.disabled = false; target.textContent = target.dataset.originalText || 'Place order request'; window.alert(error instanceof Error ? error.message : 'Unable to save the order request. Please try again.') }
    }
    document.addEventListener('click', onClick, true); return () => document.removeEventListener('click', onClick, true)
  }, [])
  return null
}
