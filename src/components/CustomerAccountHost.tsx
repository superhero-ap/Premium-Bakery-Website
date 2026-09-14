import { useEffect, useState } from 'react'
import CustomerPortal from './CustomerPortal'

export default function CustomerAccountHost() {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const openAccount = () => setOpen(true)
    window.addEventListener('open-customer-account', openAccount)
    return () => window.removeEventListener('open-customer-account', openAccount)
  }, [])
  return open ? <CustomerPortal onClose={() => setOpen(false)} /> : null
}
