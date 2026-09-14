import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './styles.css'
import './admin.css'
import './cart-ui.css'
import './account.css'
import './checkout-account.css'
import './theme.css'
import App from './App'
import CartCountSync from './components/CartCountSync'
import CustomerAccountHost from './components/CustomerAccountHost'
import CheckoutOrderSync from './components/CheckoutOrderSync'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
      <CartCountSync />
      <CustomerAccountHost />
      <CheckoutOrderSync />
    </BrowserRouter>
  </StrictMode>,
)
