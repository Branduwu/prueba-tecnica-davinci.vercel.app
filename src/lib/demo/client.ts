import type { Product } from '@/types/database'
import type { DemoState, DemoUser } from '@/lib/demo/types'

const stateKey = 'mercado-erp-demo-state-v1'
const sessionKey = 'mercado-erp-demo-session-v1'

export const demoUsers: Array<DemoUser & { password: string }> = [
  { id: 'demo-admin', email: 'admin@supermercado.demo', password: 'AdminDemo2026!', full_name: 'Administrador Demo', role: 'admin' },
  { id: 'demo-cashier', email: 'cajero@supermercado.demo', password: 'CajeroDemo2026!', full_name: 'Cajero Demo', role: 'cashier' },
]

function storage() {
  if (typeof window === 'undefined') throw new Error('El almacenamiento demo sólo está disponible en el navegador.')
  return window.localStorage
}

function validState(value: unknown): value is DemoState {
  const candidate = value as Partial<DemoState> | null
  return Boolean(candidate && candidate.version === 1 && Array.isArray(candidate.products) && Array.isArray(candidate.sales) && Array.isArray(candidate.inventoryMovements) && Array.isArray(candidate.expenses))
}

function emptyState(products: Product[]): DemoState {
  return { version: 1, products, sales: [], inventoryMovements: [], expenses: [] }
}

export function readDemoSession() {
  try {
    const value = JSON.parse(storage().getItem(sessionKey) ?? 'null') as DemoUser | null
    const user = value && demoUsers.find((candidate) => candidate.id === value.id && candidate.role === value.role)
    return user ? { id: user.id, email: user.email, full_name: user.full_name, role: user.role } : null
  } catch {
    return null
  }
}

export function saveDemoSession(user: DemoUser) {
  storage().setItem(sessionKey, JSON.stringify(user))
}

export function clearDemoSession() {
  storage().removeItem(sessionKey)
}

export function authenticateDemo(email: string, password: string) {
  const user = demoUsers.find((candidate) => candidate.email === email.trim().toLowerCase() && candidate.password === password)
  if (!user) return null
  return { id: user.id, email: user.email, full_name: user.full_name, role: user.role }
}

export async function loadDemoState() {
  try {
    const stored = JSON.parse(storage().getItem(stateKey) ?? 'null')
    if (validState(stored)) return stored
  } catch {}
  return resetDemoState()
}

export async function resetDemoState() {
  const response = await fetch('/api/demo/catalog')
  if (!response.ok) throw new Error('No fue posible cargar el catálogo oficial de demostración.')
  const products = await response.json() as Product[]
  const state = emptyState(products)
  persistDemoState(state)
  return state
}

export function persistDemoState(state: DemoState) {
  storage().setItem(stateKey, JSON.stringify(state))
}
