import Link from 'next/link'
import DemoDashboard from '@/components/demo/demo-dashboard'
import { requireAdmin } from '@/lib/auth'
import { isDemoMode } from '@/lib/supabase/config'

const money = (value: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value || 0)

export default async function Dashboard() {
  if (isDemoMode()) return <DemoDashboard/>
  const db = await requireAdmin()
  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  const startWeek = new Date(now.getTime() - 6 * 864e5).toISOString()
  const month = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const [todaySales, weekSales, monthSales, expenses, low] = await Promise.all([
    db.from('sales').select('total').gte('created_at', today), db.from('sales').select('total').gte('created_at', startWeek), db.from('sales').select('total').gte('created_at', month), db.from('expenses').select('amount').gte('expense_date', month.slice(0, 10)), db.from('products').select('id', { count: 'exact', head: true }).filter('stock', 'lte', 'low_stock_threshold'),
  ])
  const sum = (rows: ({ total?: number; amount?: number }[] | null), key: 'total' | 'amount') => (rows ?? []).reduce((total, row) => total + Number(row[key] ?? 0), 0)
  const sales = sum(monthSales.data, 'total')
  const outgoings = sum(expenses.data, 'amount')
  return <><div className="metrics"><Metric label="Ventas hoy" value={money(sum(todaySales.data, 'total'))}/><Metric label="Esta semana" value={money(sum(weekSales.data, 'total'))}/><Metric label="Este mes" value={money(sales)}/><Metric label="Egresos" value={money(outgoings)}/><Metric label="Flujo neto" value={money(sales - outgoings)}/><Metric label="Stock bajo" value={String(low.count ?? 0)}/></div><section className="card"><h3>Accesos rápidos</h3><div className="quick"><Link href="/pos">Abrir POS</Link><Link href="/inventario">Gestionar inventario</Link><Link href="/finanzas">Ver finanzas</Link></div></section></>
}

function Metric({ label, value }: { label: string; value: string }) {
  return <article className="metric"><span>{label}</span><strong>{value}</strong></article>
}
