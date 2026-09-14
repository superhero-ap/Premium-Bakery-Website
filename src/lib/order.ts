import { supabase } from './supabase'

export type OrderItemInput = { productId: string; variantId?: string; quantity: number }
export type OrderInput = { customerName: string; customerPhone: string; customerEmail?: string; orderType: 'pickup' | 'delivery'; deliveryAddress?: string; landmark?: string; city?: string; postalCode?: string; scheduledDate?: string; scheduledTime?: string; customerNote?: string; items: OrderItemInput[] }

export async function createOrder(input: OrderInput) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase.rpc('create_order_request', { payload: input })
  if (error) throw error
  return data as { order_id: string; order_number: string; subtotal: number; discount_amount: number; delivery_fee: number; total_amount: number }
}

export function buildWhatsAppOrderMessage(businessName: string, lines: Array<{ name: string; variant?: string; quantity: number }>, customer: Pick<OrderInput, 'customerName' | 'customerPhone' | 'orderType' | 'scheduledDate' | 'scheduledTime' | 'deliveryAddress' | 'landmark' | 'customerNote'>) {
  return [`Hello ${businessName},`, '', 'I would like to place an order.', '', ...lines.map(x => `${x.quantity} × ${x.name}${x.variant ? ` (${x.variant})` : ''}`), '', `Order Type: ${customer.orderType}`, `Preferred Date: ${customer.scheduledDate || 'To confirm'}`, `Preferred Time: ${customer.scheduledTime || 'To confirm'}`, `Name: ${customer.customerName}`, `Phone: ${customer.customerPhone}`, customer.deliveryAddress ? `Address: ${customer.deliveryAddress}` : '', customer.landmark ? `Landmark: ${customer.landmark}` : '', customer.customerNote ? `Notes: ${customer.customerNote}` : '', '', 'Please confirm availability and final pricing.'].filter(Boolean).join('\n')
}
