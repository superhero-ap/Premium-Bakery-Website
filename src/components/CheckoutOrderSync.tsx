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
const cleanPhone = (value: string) => { const digits = value.replace(/\D/g, ''); return digits.startsWith('91') && digits.length === 12 ? digits.slice(2) : digits }

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
        <p class="form-hint">For the first checkout, mobile is the quick option and does not use OTP. Email signup can use email verification.</p>
        <div class="checkout-account-tabs"><button type="button" data-mode="signin">Sign in</button><button type="button" data-mode="signup" class="active">Create account</button></div>
        <div class="checkout-account-methods"><button type="button" data-method="phone" class="active">Mobile + password</button><button type="button" data-method="email">Email + password</button></div>
        <form class="checkout-account-fields" data-account-form>
          <label data-name-field>Full name *<input data-account="name" autocomplete="name" placeholder="Your name"></label>
          <label data-phone-field>Mobile number *<input data-account="phone" inputmode="tel" autocomplete="tel" placeholder="10-digit mobile number"></label>
          <label data-email-field>Email (optional)<input data-account="email" type="email" autocomplete="email" placeholder="you@example.com"></label>
          <label data-password-field>Password *<span class="checkout-password-field"><input data-account="password" type="password" autocomplete="new-password" placeholder="At least 8 characters" minlength="8"><button type="button" class="checkout-password-eye" data-eye="password" aria-label="Show password" title="Show password">◉</button></span></label>
          <label data-confirm-field>Confirm password *<span class="checkout-password-field"><input data-account="confirm" type="password" autocomplete="new-password" placeholder="Repeat password" minlength="8"><button type="button" class="checkout-password-eye" data-eye="confirm" aria-label="Show password" title="Show password">◉</button></span></label>
          <div class="checkout-account-error" role="alert" aria-live="polite"></div>
          <button type="submit" class="btn primary full" data-account-submit>Create account &amp; continue</button>
          <button type="button" class="text-btn" data-account-cancel>Continue later</button>
        </form>
      </div>`
    document.body.appendChild(modal)
    const form = modal.querySelector('[data-account-form]') as HTMLFormElement
    const error = modal.querySelector('.checkout-account-error') as HTMLElement
    const submit = modal.querySelector('[data-account-submit]') as HTMLButtonElement
    const nameField = modal.querySelector('[data-name-field]') as HTMLElement
    const phoneField = modal.querySelector('[data-phone-field]') as HTMLElement
    const emailField = modal.querySelector('[data-email-field]') as HTMLElement
    const confirmField = modal.querySelector('[data-confirm-field]') as HTMLElement
    const nameInput = modal.querySelector<HTMLInputElement>('[data-account="name"]')!
    const phoneInput = modal.querySelector<HTMLInputElement>('[data-account="phone"]')!
    const emailInput = modal.querySelector<HTMLInputElement>('[data-account="email"]')!
    const passwordInput = modal.querySelector<HTMLInputElement>('[data-account="password"]')!
    const confirmInput = modal.querySelector<HTMLInputElement>('[data-account="confirm"]')!
    let mode: 'signin' | 'signup' = 'signup'
    let method: 'email' | 'phone' = 'phone'

    const setMode = (next: 'signin' | 'signup') => {
      mode = next
      modal.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((button) => button.classList.toggle('active', button.dataset.mode === mode))
      nameField.style.display = mode === 'signup' ? '' : 'none'
      confirmField.style.display = mode === 'signup' ? '' : 'none'
      nameInput.toggleAttribute('required', mode === 'signup')
      confirmInput.toggleAttribute('required', mode === 'signup')
      passwordInput.autocomplete = mode === 'signup' ? 'new-password' : 'current-password'
      submit.textContent = mode === 'signup' ? 'Create account & continue' : 'Sign in & continue'
      error.textContent = ''
    }

    const setMethod = (next: 'email' | 'phone') => {
      method = next
      modal.querySelectorAll<HTMLButtonElement>('[data-method]').forEach((button) => button.classList.toggle('active', button.dataset.method === method))
      if (method === 'phone') {
        phoneField.style.display = ''
        emailField.style.display = ''
        phoneInput.required = true
        emailInput.required = false
        emailField.querySelector('label')
        emailField.firstChild && (emailField.childNodes[0].textContent = 'Email (optional)')
      } else {
        phoneField.style.display = mode === 'signup' ? '' : 'none'
        emailField.style.display = ''
        phoneInput.required = false
        emailInput.required = true
        if (emailField.firstChild) emailField.childNodes[0].textContent = 'Email *'
      }
      error.textContent = ''
    }

    const finish = (ok: boolean) => { closeAccountModal(); resolve(ok) }
    modal.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((button) => button.addEventListener('click', () => setMode(button.dataset.mode as 'signin' | 'signup')))
    modal.querySelectorAll<HTMLButtonElement>('[data-method]').forEach((button) => button.addEventListener('click', () => setMethod(button.dataset.method as 'email' | 'phone')))
    modal.querySelectorAll<HTMLButtonElement>('[data-eye]').forEach((button) => button.addEventListener('click', () => {
      const target = button.dataset.eye === 'confirm' ? confirmInput : passwordInput
      const visible = target.type === 'text'
      target.type = visible ? 'password' : 'text'
      button.textContent = visible ? '◉' : '◌'
      button.setAttribute('aria-label', visible ? 'Show password' : 'Hide password')
      button.setAttribute('title', visible ? 'Show password' : 'Hide password')
    }))
    modal.querySelector('.checkout-account-close')?.addEventListener('click', () => finish(false))
    modal.querySelector('.checkout-account-backdrop')?.addEventListener('click', () => finish(false))
    modal.querySelector('[data-account-cancel]')?.addEventListener('click', () => finish(false))

    form.addEventListener('submit', async (event) => {
      event.preventDefault()
      error.textContent = ''
      if (!form.reportValidity()) return
      const email = emailInput.value.trim().toLowerCase()
      const password = passwordInput.value
      const phone = cleanPhone(phoneInput.value)
      if (password.length < 8) { error.textContent = 'Password must be at least 8 characters.'; return }
      if (mode === 'signup' && nameInput.value.trim().length < 2) { error.textContent = 'Enter your full name.'; return }
      if (method === 'phone' && !/^[6-9]\d{9}$/.test(phone)) { error.textContent = 'Enter a valid 10-digit Indian mobile number.'; return }
      if (method === 'email' && !email) { error.textContent = 'Enter your email address.'; return }
      if (mode === 'signup' && password !== confirmInput.value) { error.textContent = 'Passwords do not match.'; return }
      submit.disabled = true
      submit.textContent = mode === 'signup' ? 'Creating account…' : 'Signing in…'
      try {
        if (mode === 'signin') {
          const result = method === 'phone'
            ? await supabase.auth.signInWithPassword({ phone: `+91${phone}`, password })
            : await supabase.auth.signInWithPassword({ email, password })
          if (result.error) throw result.error
        } else if (method === 'phone') {
          const result = await supabase.auth.signUp({ phone: `+91${phone}`, password, options: { data: { full_name: nameInput.value.trim(), phone: `+91${phone}`, email: email || null, login_method: 'phone' } } })
          if (result.error) throw result.error
          if (!result.data.session) throw new Error('Phone account was created, but phone confirmation is enabled. Turn off phone confirmation in Supabase Auth settings to keep this flow without OTP.')
          const profileResult = await supabase.from('customer_profiles').upsert({ id: result.data.user.id, full_name: nameInput.value.trim(), phone: `+91${phone}` }, { onConflict: 'id' })
          if (profileResult.error) throw profileResult.error
        } else {
          const result = await supabase.auth.signUp({ email, password, options: { data: { full_name: nameInput.value.trim(), phone: phone ? `+91${phone}` : null, login_method: 'email' } } })
          if (result.error) {
            if (/rate limit|too many requests|email.*limit/i.test(result.error.message)) throw new Error('Email verification is temporarily rate-limited by Supabase. Custom SMTP is required to remove the built-in email limit.')
            throw result.error
          }
          const profileResult = result.data.user ? await supabase.from('customer_profiles').upsert({ id: result.data.user.id, full_name: nameInput.value.trim(), phone: phone ? `+91${phone}` : null }, { onConflict: 'id' }) : null
          if (profileResult?.error) throw profileResult.error
          if (!result.data.session) {
            error.textContent = 'Account created. Check your email to verify it, then use Sign in. Phone is optional.'
            submit.disabled = false
            setMode('signup')
            return
          }
        }
        const { data: sessionData } = await supabase.auth.getSession()
        if (!sessionData.session?.user) throw new Error('Account was created, but no active session was returned. Please sign in again.')
        finish(true)
      } catch (err) {
        error.textContent = err instanceof Error ? err.message : 'Unable to complete account access.'
        submit.disabled = false
        setMode(mode)
        setMethod(method)
      }
    })
    setMode('signup')
    setMethod('phone')
    phoneInput.focus()
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
    button.addEventListener('click', () => { setField(checkout, 'name', address.recipient_name); setField(checkout, 'phone', address.phone); setField(checkout, 'address', address.address); setField(checkout, 'landmark', address.landmark || ''); setField(checkout, 'city', address.city); setField(checkout, 'pin', address.postal_code); checkout.querySelector('.toggle button:nth-child(2)')?.click() })
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
