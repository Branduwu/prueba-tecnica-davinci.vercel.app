import { createAdminClient } from '@/lib/supabase/admin'

const money = (value: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value || 0)
const noData = 'No encontré datos para esa consulta.'

function start(period: 'today' | 'week' | 'month') {
  if (period === 'today') return new Date().toISOString().slice(0, 10)
  if (period === 'week') return new Date(Date.now() - 6 * 864e5).toISOString()
  return new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
}

function productTerms(question: string) {
  return question
    .replace(/[¿?¡!]/gu, ' ')
    .replace(/\b(cu[aá]nto|stock|inventario|queda|de|el|la|hay)\b/giu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function answerBusinessQuestion(question: string) {
  const normalized = question.toLocaleLowerCase('es-MX')
  const db = createAdminClient()
  if (/poco|bajo/u.test(normalized)) {
    const { data, error } = await db.from('products').select('name,stock,unit').filter('stock', 'lte', 'low_stock_threshold')
    if (error) return noData
    return data?.length ? `Inventario bajo: ${data.map((product) => `${product.name} (${product.stock} ${product.unit})`).join(', ')}.` : 'No hay productos con stock bajo.'
  }
  if (/stock|inventario/u.test(normalized)) {
    const terms = productTerms(normalized)
    if (!terms) return noData
    const { data, error } = await db.from('products').select('name,stock,unit').ilike('name', `%${terms}%`)
    const normalizedTerms = terms.toLocaleLowerCase('es-MX')
    const product = data?.find((item) => item.name.toLocaleLowerCase('es-MX') === normalizedTerms)
      ?? data?.find((item) => item.name.toLocaleLowerCase('es-MX').startsWith(normalizedTerms))
      ?? data?.[0]
    return !error && product ? `${product.name}: ${product.stock} ${product.unit} disponibles.` : noData
  }
  const period = /hoy/u.test(normalized) ? 'today' : /semana/u.test(normalized) ? 'week' : 'month'
  if (/gast/u.test(normalized)) {
    const { data, error } = await db.from('expenses').select('amount').gte('expense_date', start(period))
    if (error || !data?.length) return noData
    return `Gastos del periodo: ${money(data.reduce((total, expense) => total + Number(expense.amount), 0))}.`
  }
  const { data: sales, error: salesError } = await db.from('sales').select('id,total').gte('created_at', start(period))
  if (salesError) return noData
  const income = (sales ?? []).reduce((total, sale) => total + Number(sale.total), 0)
  if (/m[aá]s vendido|producto.*vend/iu.test(normalized)) {
    const ids = (sales ?? []).map((sale) => sale.id)
    if (!ids.length) return noData
    const { data: items, error } = await db.from('sale_items').select('quantity,subtotal,product:products(name)').in('sale_id', ids)
    if (error || !items?.length) return noData
    const grouped = new Map<string, { quantity: number; income: number }>()
    for (const item of items) {
      const name = (item.product as unknown as { name: string } | null)?.name
      if (!name) continue
      const row = grouped.get(name) ?? { quantity: 0, income: 0 }
      row.quantity += Number(item.quantity)
      row.income += Number(item.subtotal)
      grouped.set(name, row)
    }
    const top = [...grouped.entries()].sort((a, b) => b[1].quantity - a[1].quantity)[0]
    return top ? `El producto más vendido es ${top[0]}: ${top[1].quantity} unidades y ${money(top[1].income)}.` : noData
  }
  if (/flujo/u.test(normalized)) {
    const { data, error } = await db.from('expenses').select('amount').gte('expense_date', start(period))
    if (error) return noData
    if (!sales?.length && !data?.length) return noData
    return `Flujo de caja del periodo: ${money(income - (data ?? []).reduce((total, expense) => total + Number(expense.amount), 0))}.`
  }
  if (/vend|venta|ingreso/u.test(normalized)) return sales?.length ? `Ventas del periodo: ${money(income)}.` : noData
  return 'Puedo consultar ventas, stock, inventario bajo, productos más vendidos, gastos y flujo de caja. Indica el periodo o producto.'
}
