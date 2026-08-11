import type { DemoExpense, DemoSale, DemoState } from '@/lib/demo/types'

const money = (value: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value || 0)
const noData = 'No encontré datos para esa consulta.'

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function starts() {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return {
    today: today.toISOString(),
    week: new Date(today.getTime() - 6 * 864e5).toISOString(),
    month: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
  }
}

export function periodSales(sales: DemoSale[], start: string) {
  return sales.filter((sale) => sale.created_at >= start)
}

export function periodExpenses(expenses: DemoExpense[], start: string) {
  return expenses.filter((expense) => expense.expense_date >= start.slice(0, 10))
}

export function salesTotal(sales: DemoSale[]) {
  return roundMoney(sales.reduce((total, sale) => total + sale.total, 0))
}

export function expensesTotal(expenses: DemoExpense[]) {
  return roundMoney(expenses.reduce((total, expense) => total + expense.amount, 0))
}

export function topProducts(state: DemoState, start: string) {
  const grouped = new Map<string, { name: string; quantity: number; income: number }>()
  for (const sale of periodSales(state.sales, start)) {
    for (const item of sale.items) {
      const row = grouped.get(item.product_id) ?? { name: item.name, quantity: 0, income: 0 }
      row.quantity += item.quantity
      row.income += item.subtotal
      grouped.set(item.product_id, row)
    }
  }
  return [...grouped.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 5)
}

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

export function answerDemoQuestion(state: DemoState, question: string) {
  const normalized = normalize(question)
  const range = normalized.includes('hoy') ? 'today' : normalized.includes('semana') ? 'week' : 'month'
  const start = starts()[range]
  const sales = periodSales(state.sales, start)
  const expenses = periodExpenses(state.expenses, start)

  if (normalized.includes('bajo') || normalized.includes('poco')) {
    const products = state.products.filter((product) => product.stock <= product.low_stock_threshold)
    return products.length ? `Inventario bajo: ${products.map((product) => `${product.name} (${product.stock} ${product.unit})`).join(', ')}.` : 'No hay productos con stock bajo.'
  }

  if (normalized.includes('stock') || normalized.includes('inventario')) {
    const terms = normalized.replace(/cuanto|stock|inventario|queda|de|el|la|hay|producto|\?|!/g, ' ').replace(/\s+/g, ' ').trim()
    if (!terms) return noData
    const product = state.products.find((item) => normalize(item.name) === terms)
      ?? state.products.find((item) => normalize(item.name).startsWith(terms))
      ?? state.products.find((item) => normalize(item.name).includes(terms))
    return product ? `${product.name}: ${product.stock} ${product.unit} disponibles.` : noData
  }

  if (normalized.includes('mas vendido') || normalized.includes('producto vendido')) {
    const top = topProducts(state, start)[0]
    return top ? `El producto más vendido es ${top.name}: ${top.quantity} unidades y ${money(top.income)}.` : noData
  }

  if (normalized.includes('gast')) return expenses.length ? `Gastos del periodo: ${money(expensesTotal(expenses))}.` : noData
  if (normalized.includes('flujo')) {
    if (!sales.length && !expenses.length) return noData
    return `Flujo de caja del periodo: ${money(salesTotal(sales) - expensesTotal(expenses))}.`
  }
  if (normalized.includes('vend') || normalized.includes('venta') || normalized.includes('ingreso')) return sales.length ? `Ventas del periodo: ${money(salesTotal(sales))}.` : noData
  return 'Puedo consultar ventas, stock, productos más vendidos, gastos y flujo de caja del modo demo.'
}
