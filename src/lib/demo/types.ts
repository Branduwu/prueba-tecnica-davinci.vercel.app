import type { CartItem, Product, Role } from '@/types/database'

export type DemoUser = { id: string; email: string; full_name: string; role: Role }

export type DemoSaleItem = {
  id: string
  product_id: string
  name: string
  unit: Product['unit']
  quantity: number
  unit_price: number
  subtotal: number
}

export type DemoSale = {
  id: string
  cashier_id: string
  cashier_name: string
  subtotal: number
  total: number
  amount_received: number
  change_amount: number
  created_at: string
  items: DemoSaleItem[]
}

export type DemoMovement = {
  id: string
  product_id: string
  product_name: string
  product_sku: string
  movement_type: 'entry' | 'exit' | 'sale'
  quantity: number
  previous_stock: number
  new_stock: number
  reason: string
  user_id: string
  user_name: string
  sale_id?: string
  created_at: string
}

export type DemoExpense = {
  id: string
  category: string
  description: string
  amount: number
  expense_date: string
  created_by: string
  user_name: string
  created_at: string
}

export type DemoState = {
  version: 1
  products: Product[]
  sales: DemoSale[]
  inventoryMovements: DemoMovement[]
  expenses: DemoExpense[]
}

export type DemoTicket = {
  folio: string
  date: Date
  cashier: string
  items: CartItem[]
  total: number
  received: number
  change: number
}
