'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { loadDemoState, persistDemoState, resetDemoState } from '@/lib/demo/client'
import { roundMoney } from '@/lib/demo/business'
import type { CartItem, Product } from '@/types/database'
import type { DemoExpense, DemoMovement, DemoSale, DemoState, DemoTicket, DemoUser } from '@/lib/demo/types'

type Adjustment = { product: Product; quantity: number; type: 'entry' | 'exit'; reason: string }
type DemoContextValue = {
  state: DemoState | null
  user: DemoUser
  reset: () => Promise<void>
  updateProduct: (product: Product) => string | undefined
  adjustInventory: (adjustment: Adjustment) => string | undefined
  completeSale: (items: CartItem[], received: number) => { ticket?: DemoTicket; error?: string }
  addExpense: (expense: Omit<DemoExpense, 'id' | 'created_at' | 'created_by' | 'user_name'>) => string | undefined
}

const DemoDataContext = createContext<DemoContextValue | null>(null)
const makeId = (prefix: string) => `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`}`

export function DemoDataProvider({ user, children }: { user: DemoUser; children: React.ReactNode }) {
  const [state, setState] = useState<DemoState | null>(null)

  useEffect(() => {
    void loadDemoState().then(setState)
  }, [])

  function commit(update: (current: DemoState) => DemoState) {
    let result: DemoState | null = null
    setState((current) => {
      if (!current) return current
      result = update(current)
      persistDemoState(result)
      return result
    })
    return result
  }

  async function reset() {
    setState(await resetDemoState())
  }

  function updateProduct(product: Product) {
    if (user.role !== 'admin') return 'No autorizado.'
    if (!product.name.trim() || product.price <= 0 || product.low_stock_threshold < 0) return 'Revisa nombre, precio y umbral.'
    commit((current) => ({ ...current, products: current.products.map((item) => item.id === product.id ? product : item) }))
  }

  function adjustInventory({ product, quantity, type, reason }: Adjustment) {
    if (user.role !== 'admin') return 'No autorizado.'
    if (!Number.isFinite(quantity) || quantity <= 0 || !reason.trim()) return 'Captura una cantidad y motivo válidos.'
    if (product.unit !== 'kg' && !Number.isInteger(quantity)) return `La cantidad debe ser entera para ${product.name}.`
    const stock = type === 'entry' ? product.stock + quantity : product.stock - quantity
    if (stock < 0) return 'El ajuste deja el stock negativo.'
    const now = new Date().toISOString()
    commit((current) => ({
      ...current,
      products: current.products.map((item) => item.id === product.id ? { ...item, stock: Number(stock.toFixed(3)) } : item),
      inventoryMovements: [{ id: makeId('movement'), product_id: product.id, product_name: product.name, product_sku: product.sku, movement_type: type, quantity: type === 'exit' ? -quantity : quantity, previous_stock: product.stock, new_stock: Number(stock.toFixed(3)), reason, user_id: user.id, user_name: user.full_name, created_at: now }, ...current.inventoryMovements],
    }))
  }

  function completeSale(items: CartItem[], received: number) {
    if (!state) return { error: 'Cargando datos demo.' }
    if (!items.length) return { error: 'El carrito está vacío.' }
    const requested = new Map<string, number>()
    for (const item of items) {
      const product = state.products.find((candidate) => candidate.id === item.id)
      const quantity = Number(item.quantity)
      if (!product || !product.active) return { error: 'Producto no disponible.' }
      if (!Number.isFinite(quantity) || quantity <= 0) return { error: 'La cantidad debe ser mayor a cero.' }
      if (product.unit !== 'kg' && !Number.isInteger(quantity)) return { error: `${product.name} sólo permite cantidades enteras.` }
      const total = (requested.get(product.id) ?? 0) + quantity
      if (total > product.stock) return { error: `No hay suficiente stock para ${product.name}.` }
      requested.set(product.id, total)
    }
    const total = roundMoney(items.reduce((sum, item) => sum + roundMoney(item.price * item.quantity), 0))
    if (!Number.isFinite(received) || received < total) return { error: 'El efectivo recibido debe cubrir el total.' }
    const now = new Date().toISOString()
    const saleId = makeId('sale')
    const saleItems = items.map((item) => ({ id: makeId('item'), product_id: item.id, name: item.name, unit: item.unit, quantity: item.quantity, unit_price: item.price, subtotal: roundMoney(item.price * item.quantity) }))
    const sale: DemoSale = { id: saleId, cashier_id: user.id, cashier_name: user.full_name, subtotal: total, total, amount_received: received, change_amount: roundMoney(received - total), created_at: now, items: saleItems }
    commit((current) => ({
      ...current,
      products: current.products.map((product) => requested.has(product.id) ? { ...product, stock: Number((product.stock - (requested.get(product.id) ?? 0)).toFixed(3)) } : product),
      sales: [sale, ...current.sales],
      inventoryMovements: [
        ...saleItems.map((item): DemoMovement => {
          const product = current.products.find((candidate) => candidate.id === item.product_id)!
          return { id: makeId('movement'), product_id: product.id, product_name: product.name, product_sku: product.sku, movement_type: 'sale', quantity: -item.quantity, previous_stock: product.stock, new_stock: Number((product.stock - item.quantity).toFixed(3)), reason: 'Venta POS', sale_id: saleId, user_id: user.id, user_name: user.full_name, created_at: now }
        }),
        ...current.inventoryMovements,
      ],
    }))
    return { ticket: { folio: saleId.slice(-8).toUpperCase(), date: new Date(now), cashier: user.full_name, items, total, received, change: sale.change_amount } }
  }

  function addExpense(expense: Omit<DemoExpense, 'id' | 'created_at' | 'created_by' | 'user_name'>) {
    if (user.role !== 'admin') return 'No autorizado.'
    if (!expense.description.trim() || !Number.isFinite(expense.amount) || expense.amount <= 0) return 'Captura una descripción y monto válidos.'
    const row: DemoExpense = { ...expense, id: makeId('expense'), created_by: user.id, user_name: user.full_name, created_at: new Date().toISOString() }
    commit((current) => ({ ...current, expenses: [row, ...current.expenses] }))
  }

  const value = { state, user, reset, updateProduct, adjustInventory, completeSale, addExpense }
  return <DemoDataContext.Provider value={value}>{children}</DemoDataContext.Provider>
}

export function useDemoData() {
  const value = useContext(DemoDataContext)
  if (!value) throw new Error('DemoDataProvider no está disponible.')
  return value
}
