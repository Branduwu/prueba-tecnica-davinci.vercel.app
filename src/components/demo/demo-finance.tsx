'use client'

import { useMemo, useState } from 'react'
import { expensesTotal, periodExpenses, periodSales, salesTotal, starts, topProducts } from '@/lib/demo/business'
import { useDemoData } from '@/components/demo/demo-data-provider'

const money = (value: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value || 0)

export default function DemoFinance() {
  const { state, addExpense } = useDemoData()
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('week')
  const [message, setMessage] = useState('')
  const [form, setForm] = useState({ category: 'otros', description: '', amount: '', expense_date: new Date().toISOString().slice(0, 10) })
  const metrics = useMemo(() => {
    if (!state) return null
    const range = starts()
    const monthSales = periodSales(state.sales, range.month)
    const monthExpenses = periodExpenses(state.expenses, range.month)
    return { today: salesTotal(periodSales(state.sales, range.today)), week: salesTotal(periodSales(state.sales, range.week)), month: salesTotal(monthSales), expenses: expensesTotal(monthExpenses), top: topProducts(state, range[period]) }
  }, [period, state])

  if (!state || !metrics) return <p className="muted">Cargando datos demo…</p>

  function save(event: React.FormEvent) {
    event.preventDefault()
    const error = addExpense({ category: form.category, description: form.description, amount: Number(form.amount), expense_date: form.expense_date })
    setMessage(error ?? 'Gasto registrado.')
    if (!error) setForm({ ...form, description: '', amount: '' })
  }

  return <><section><p className="section-label">VENTAS</p><div className="metrics"><Metric label="Ventas de hoy" value={money(metrics.today)}/><Metric label="Ventas esta semana" value={money(metrics.week)}/><Metric label="Ventas este mes" value={money(metrics.month)}/></div></section><section><p className="section-label">FLUJO</p><div className="metrics"><Metric label="Ingresos" value={money(metrics.month)}/><Metric label="Egresos" value={money(metrics.expenses)}/><Metric label="Flujo neto" value={money(metrics.month - metrics.expenses)}/></div></section><div className="finance-grid"><section className="card"><p className="section-label">GASTOS</p><h3>Registrar gasto</h3><form onSubmit={save} className="form"><label>Categoría<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{['renta', 'electricidad', 'proveedores', 'mantenimiento', 'otros'].map((category) => <option key={category}>{category}</option>)}</select></label><label>Descripción<input required value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })}/></label><label>Monto<input required type="number" min="0.01" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })}/></label><label>Fecha<input type="date" value={form.expense_date} onChange={(event) => setForm({ ...form, expense_date: event.target.value })}/></label><button>Guardar gasto</button>{message && <p className="notice">{message}</p>}</form></section><section className="card table-wrap"><p className="section-label">GASTOS</p><h3>Historial reciente</h3><table><thead><tr><th>Fecha</th><th>Categoría</th><th>Descripción</th><th>Monto</th><th>Usuario</th></tr></thead><tbody>{state.expenses.map((expense) => <tr key={expense.id}><td>{expense.expense_date}</td><td>{expense.category}</td><td>{expense.description}</td><td>{money(expense.amount)}</td><td>{expense.user_name}</td></tr>)}</tbody></table>{!state.expenses.length && <p className="muted table-empty">No hay gastos demo todavía.</p>}</section></div><section className="card table-wrap"><div className="table-title"><div><p className="section-label">TOP PRODUCTOS</p><h3>Productos más vendidos</h3></div><select className="period-select" value={period} onChange={(event) => setPeriod(event.target.value as typeof period)}><option value="today">Hoy</option><option value="week">Semana</option><option value="month">Mes</option></select></div><table><thead><tr><th>Producto</th><th>Cantidad vendida</th><th>Ingresos generados</th></tr></thead><tbody>{metrics.top.map((product) => <tr key={product.name}><td>{product.name}</td><td>{product.quantity}</td><td>{money(product.income)}</td></tr>)}</tbody></table>{!metrics.top.length && <p className="muted table-empty">No encontré datos para este periodo.</p>}</section></>
}

function Metric({ label, value }: { label: string; value: string }) {
  return <article className="metric"><span>{label}</span><strong>{value}</strong></article>
}
