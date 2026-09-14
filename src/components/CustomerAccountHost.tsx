import { useEffect, useState } from 'react'
import CustomerPortal from './CustomerPortal'

export default function CustomerAccountHost() {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const openAccount = () => setOpen(true)
    window.addEventListener('open-customer-account', openAccount)
    return () => window.removeEventListener('open-customer-account', openAccount)
  }, [])
  return <>
    <button className="account-trigger" type="button" onClick={() => setOpen(true)} aria-label="Open customer account">Account</button>
    {open ? <CustomerPortal onClose={() => setOpen(false)} /> : null}
  </>
}
