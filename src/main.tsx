import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './styles.css'
import './admin.css'
import './cart-ui.css'
import './account.css'
import App from './App'
import CartCountSync from './components/CartCountSync'
import CustomerAccountHost from './components/CustomerAccountHost'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
      <CartCountSync />
      <CustomerAccountHost />
    </BrowserRouter>
  </StrictMode>,
)
