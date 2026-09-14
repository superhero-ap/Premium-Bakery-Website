import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './styles.css'
import './admin.css'
import './cart-ui.css'
import './account.css'
import App from './App'
import CartCountSync from './components/CartCountSync'
import CustomerPortal from './components/CustomerPortal'

function CustomerAccount() {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const openAccount = () => setOpen(true)
    window.addEventListener('open-customer-account', openAccount)
    return () => window.removeEventListener('open-customer-account', openAccount)
  }, [])
  return open ? <CustomerPortal onClose={() => setOpen(false)} /> : null
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
      <CartCountSync />
      <CustomerAccount />
    </BrowserRouter>
  </StrictMode>,
)
