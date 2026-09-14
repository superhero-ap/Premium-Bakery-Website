import { useEffect } from 'react'
import { createOrder } from '../lib/order'
import { supabase } from '../lib/supabase'

type CartLine = { product: { slug: string; name: string }; variant?: string; quantity: number }
type SavedAddress = { id: string; label: string; recipient_name: string; phone: string; address: string; landmark?: string | null; city: string; postal_code: string }

const fieldValue = (root: ParentNode, keyword: string) => {
  const label = Array.from(root.querySelectorAll('label')).find((node) => node.textContent?.toLowerCase().includes(keyword))
  return (label?.querySelector('input, textarea') as HTMLInputElement | HTMLTextAreaElement | null)?.value.trim() || ''
}
const fieldInput = (root: ParentNode, keyword: string) => {
  const label = Array.from(root.querySelectorAll('label')).find((node) => node.textContent?.toLowerCase().includes(keyword))
  return label?.querySelector('input, textarea') as HTMLInputElement | HTMLTextAreaElement | null
}
const setField = (root: ParentNode, keyword: string, value: string) => {
  const input = fieldInput(root, keyword)
  if (!input) return
  const setter = Object.getOwnPropertyDescriptor(input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, 'value')?.set
  setter?.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.dispatchEvent(new Event('change', { bubbles: true }))
}

function closeAccountModal() { document.getElementById('checkout-account-modal')?.remove() }

async function showAccountModal(): Promise<boolean> {
  if (!supabase || document.getElementById('checkout-account-modal')) return false
  return new Promise((resolve) => {
    const modal = document.createElement('div')
    modal.id = 'checkout-account-modal'
    modal.setAttribute('role', 'dialog')
    modal.setAttribute('aria-modal', 'true')
    modal.innerHTML = `
      <div class="checkout-account-backdrop"></div>
      <div class="checkout-account-card">
        <button type="button" class="checkout-account-close" aria-label="Close">×</button>
        <div class="eyebrow">YOUR ACCOUNT</div>
        <h2>Save your details for easier ordering.</h2>
        <p class="form-hint">Sign in with your email and password, or create an account. No OTP is requested by this checkout.</p>
        <div class="checkout-account-tabs"><button type="button" data-mode="signin" class="active">Sign in</button><button type="button" data-mode="signup">Create account</button></div>
        <form class="checkout-account-fields" data-account-form>
          <label>Email *<input data-account="email" type="email" autocomplete="email" placeholder="you@example.com" required></label>
          <label data-signup-only>Full name *<input data-account="name" autocomplete="name" placeholder="Your name" minlength="2" required></label>
          <label data-signup-only>Phone *<input data-account="phone" inputmode="tel" autocomplete="tel" placeholder="10-digit mobile number" required></label>
          <label>Password *<input data-account="password" type="password" autocomplete="current-password" placeholder="At least 8 characters" minlength="8" required></label>
          <label data-signup-only>Confirm password *<input data-account="confirm" type="password" autocomplete="new-password" placeholder="Repeat password" minlength="8" required></label>
          <div class="checkout-account-error" role="alert" aria-live="polite"></div>
          <button type="submit" class="btn primary full" data-account-submit>Sign in &amp; continue</button>
          <button type="button" class="text-btn" data-account-cancel>Continue later</button>
        </form>
      </div>`
    document.body.appendChild(modal)
    const form = modal.querySelector('[data-account-form]') as HTMLFormElement
    const error = modal.querySelector('.checkout-account-error') as HTMLElement
    const submit = modal.querySelector('[data-account-submit]') as HTMLButtonElement
    const signupFields = Array.from(modal.querySelectorAll('[data-signup-only]')) as HTMLElement[]
    let mode: 'signin' | 'signup' = 'signin'

    const setMode = (next: 'signin' | 'signup') => {
      mode = next
      modal.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((button) => button.classList.toggle('active', button.dataset.mode === mode))
      signupFields.forEach((node) => { node.style.display = mode === 'signup' ? '' : 'none' })
      signupFields.forEach((node) => node.querySelector('input')?.toggleAttribute('required', mode === 'signup'))
      const password = modal.querySelector<HTMLInputElement>('[data-account="password"]')
      if (password) password.autocomplete = mode === 'signup' ? 'new-password' : 'current-password'
      submit.textContent = mode === 'signup' ? 'Create account & continue' : 'Sign in & continue'
      error.textContent = ''
    }
    const finish = (ok: boolean) => { closeAccountModal(); resolve(ok) }
    modal.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((button) => button.addEventListener('click', () => setMode(button.dataset.mode as 'signin' | 'signup')))
    modal.querySelector('.checkout-account-close')?.addEventListener('click', () => finish(false))
    modal.querySelector('.checkout-account-backdrop')?.addEventListener('click', () => finish(false))
    modal.querySelector('[data-account-cancel]')?.addEventListener('click', () => finish(false))

    form.addEventListener('submit', async (event) => {
      event.preventDefault()
      error.textContent = ''
      if (!form.reportValidity()) return
      const email = modal.querySelector<HTMLInputElement>('[data-account="email"]')!.value.trim().toLowerCase()
      const password = modal.querySelector<HTMLInputElement>('[data-account="password"]')!.value
      if (password.length < 8) { error.textContent = 'Password must be at least 8 characters.'; return }
      submit.disabled = true
      submit.textContent = mode === 'signup' ? 'Creating account…' : 'Signing in…'
      try {
        if (mode === 'signin') {
          const result = await supabase.auth.signInWithPassword({ email, password })
          if (result.error) throw result.error
        } else {
          const name = modal.querySelector<HTMLInputElement>('[data-account="name"]')!.value.trim()
          const phone = modal.querySelector<HTMLInputElement>('[data-account="phone"]')!.value.replace(/\D/g, '')
          const confirm = modal.querySelector<HTMLInputElement>('[data-account="confirm"]')!.value
          if (name.length < 2) throw new Error('Enter your full name.')
          if (!/^[6-9]\d{9}$/.test(phone)) throw new Error('Enter a valid 10-digit Indian mobile number.')
          if (password !== confirm) throw new Error('Passwords do not match.')
          const result = await supabase.auth.signUp({ email, password, options: { data: { full_name: name, phone } } })
          if (result.error) throw result.error
          if (!result.data.session) throw new Error('Account created, but Supabase email confirmation is enabled. Turn off email confirmation in Authentication settings to keep this checkout password-only.')
          await supabase.from('customer_profiles').upsert({ id: result.data.user?.id, full_name: name, phone }, { onConflict: 'id' })
        }
        const { data: sessionData } = await supabase.auth.getSession()
        if (!sessionData.session?.user) throw new Error('Account was created, but no active session was returned. Please sign in again.')
        finish(true)
      } catch (err) {
        error.textContent = err instanceof Error ? err.message : 'Unable to complete account sign in.'
        submit.disabled = false
        setMode(mode)
      }
    })
    setMode('signin')
    modal.querySelector<HTMLInputElement>('[data-account="email"]')?.focus()
  })
}

async function restoreCustomerDetails(checkout: Element) {
  if (!supabase) return
  const { data } = await supabase.auth.getSession()
  const user = data.session?.user
  if (!user) return
  const { data: profile } = await supabase.from('customer_profiles').select('full_name,phone').eq('id', user.id).maybeSingle()
  if (profile?.full_name) setField(checkout, 'name', profile.full_name)
  if (profile?.phone) setField(checkout, 'phone', profile.phone)
  if (user.email) setField(checkout, 'email', user.email)
  const { data: addresses } = await supabase.from('customer_addresses').select('id,label,recipient_name,phone,address,landmark,city,postal_code').eq('customer_id', user.id).order('is_default', { ascending: false }).order('created_at', { ascending: false })
  if (!addresses?.length || document.getElementById('saved-addresses')) return
  const wrap = document.createElement('div'); wrap.id = 'saved-addresses'; wrap.className = 'saved-addresses'; wrap.innerHTML = `<strong>Saved delivery addresses</strong><div class="saved-address-list"></div>`
  const list = wrap.querySelector('.saved-address-list') as HTMLElement
  ;(addresses as SavedAddress[]).forEach((address) => {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'saved-address'; button.textContent = `${address.label}: ${address.address}, ${address.city} ${address.postal_code}`
    button.addEventListener('click', () => { setField(checkout, 'name', address.recipient_name); setField(checkout, 'phone', address.phone); setField(checkout, 'address', address.address); setField(checkout, 'landmark', address.landmark || ''); setField(checkout, 'city', address.city); setField(checkout, 'pin', address.postal_code); checkout.querySelector<HTMLElement>('.toggle button:nth-child(2)')?.click() })
    list.appendChild(button)
  })
  checkout.querySelector('.form-grid')?.prepend(wrap)
}

export default function CheckoutOrderSync() {
  useEffect(() => {
    const onClick = async (event: MouseEvent) => {
      if (!window.location.pathname.endsWith('/checkout') || !supabase) return
      if (sessionStorage.getItem('checkout-order-sync-bypass') === '1') { sessionStorage.removeItem('checkout-order-sync-bypass'); return }
      const target = event.target instanceof Element ? event.target.closest('button.btn.primary.full') : null
      if (!(target instanceof HTMLButtonElement) || !/(order|request|confirm|place)/i.test(target.textContent || '')) return
      const checkout = target.closest('.checkout'); if (!checkout) return
      event.preventDefault(); event.stopPropagation(); target.disabled = true; target.dataset.originalText = target.textContent || ''; target.textContent = 'Checking account…'
      try {
        const session = await supabase.auth.getSession()
        if (!session.data.session) {
          const ok = await showAccountModal()
          if (!ok) { target.disabled = false; target.textContent = target.dataset.originalText || 'Create Order Request'; return }
        }
        await restoreCustomerDetails(checkout)
        const cart = JSON.parse(localStorage.getItem('bakery-cart') || '[]') as CartLine[]
        if (!cart.length) throw new Error('Your cart is empty.')
        const items = cart.map((line) => ({ productSlug: line.product.slug, variantName: line.variant || undefined, quantity: Math.max(1, Math.floor(line.quantity)) }))
        const type = checkout.querySelector('.toggle button.active')?.textContent?.toLowerCase().includes('delivery') ? 'delivery' : 'pickup'
        const result = await createOrder({ customerName: fieldValue(checkout, 'name'), customerPhone: fieldValue(checkout, 'phone').replace(/\D/g, ''), customerEmail: fieldValue(checkout, 'email') || undefined, orderType: type, deliveryAddress: fieldValue(checkout, 'address') || undefined, landmark: fieldValue(checkout, 'landmark') || undefined, city: fieldValue(checkout, 'city') || undefined, postalCode: fieldValue(checkout, 'pin') || undefined, scheduledDate: fieldValue(checkout, 'date'), scheduledTime: fieldValue(checkout, 'time'), customerNote: fieldValue(checkout, 'note') || undefined, items })
        sessionStorage.setItem('last-order-request', JSON.stringify(result)); sessionStorage.setItem('checkout-order-sync-bypass', '1'); target.click()
      } catch (error) {
        target.disabled = false; target.textContent = target.dataset.originalText || 'Create Order Request'
        window.alert(error instanceof Error ? error.message : 'Unable to save the order request. Please try again.')
      }
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [])
  return null
}
