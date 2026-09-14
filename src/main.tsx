import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './styles.css'
import './admin.css'
import './cart-ui.css'
import App from './App'
import CartCountSync from './components/CartCountSync'
import CustomerPortal from './components/CustomerPortal'

function CustomerAccount() {
  const [open, setOpen] = useState(false)
  return <>
    <button className="account-trigger" type="button" onClick={() => setOpen(true)} aria-label="Open customer account">Account</button>
    {open && <CustomerPortal onClose={() => setOpen(false)} />}
  </>
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
