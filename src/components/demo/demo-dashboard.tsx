'use client'

import Link from 'next/link'
import { useState } from 'react'
import { answerDemoQuestion, expensesTotal, periodExpenses, periodSales, salesTotal, starts, topProducts } from '@/lib/demo/business'
import { useDemoData } from '@/components/demo/demo-data-provider'

const money = (value: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value || 0)

export default function DemoDashboard() {
  const { state } = useDemoData()
  if (!state) return <p className="muted">Cargando datos demo…</p>
  const range = starts()
  const monthSales = periodSales(state.sales, range.month)
  const monthExpenses = periodExpenses(state.expenses, range.month)
  const income = salesTotal(monthSales)
  const outgoings = expensesTotal(monthExpenses)
  const low = state.products.filter((product) => product.stock <= product.low_stock_threshold).length
  const top = topProducts(state, range.month)[0]

  return <><div className="metrics"><Metric label="Ventas hoy" value={money(salesTotal(periodSales(state.sales, range.today)))}/><Metric label="Ventas semana" value={money(salesTotal(periodSales(state.sales, range.week)))}/><Metric label="Ventas mes" value={money(income)}/><Metric label="Ingresos" value={money(income)}/><Metric label="Egresos" value={money(outgoings)}/><Metric label="Flujo neto" value={money(income - outgoings)} featured/><Metric label="Stock bajo" value={String(low)}/><Metric label="Producto más vendido" value={top?.name ?? 'Sin ventas'}/></div><section className="card"><h3>Accesos rápidos</h3><div className="quick"><Link href="/pos">Abrir POS</Link><Link href="/inventario">Gestionar inventario</Link><Link href="/finanzas">Ver finanzas</Link></div></section><DemoAgentPanel/></>
}

function DemoAgentPanel() {
  const { state } = useDemoData()
  const [question, setQuestion] = useState('¿Cuánto vendimos hoy?')
  const [answer, setAnswer] = useState('')
  const [whatsappQuestion, setWhatsappQuestion] = useState('¿Cuánto vendimos hoy?')
  const [whatsappAnswer, setWhatsappAnswer] = useState('')

  function ask(event: React.FormEvent) {
    event.preventDefault()
    if (state) setAnswer(answerDemoQuestion(state, question))
  }

  return <section className="demo-insights"><section className="card"><p className="section-label">MODO DEMOSTRACIÓN</p><h3>Asistente del negocio</h3><p className="muted">Consulta información de ventas, inventario y finanzas.</p><form className="demo-chat" onSubmit={ask}><label>Pregunta al asistente<input value={question} onChange={(event) => setQuestion(event.target.value)} /></label><button>Consultar</button></form>{answer && <p className="demo-answer">{answer}</p>}</section><section className="card whatsapp-demo"><p className="section-label">MODO DEMOSTRACIÓN</p><h3>Consulta por WhatsApp</h3><p className="muted">Demostración del flujo de consultas del negocio.</p><label>Mensaje de WhatsApp<input value={whatsappQuestion} onChange={(event) => setWhatsappQuestion(event.target.value)} /></label><div className="whatsapp-bubble incoming">{whatsappQuestion}</div>{whatsappAnswer && <div className="whatsapp-bubble outgoing">{whatsappAnswer}</div>}<button className="secondary" onClick={() => state && setWhatsappAnswer(answerDemoQuestion(state, whatsappQuestion))}>Simular mensaje</button><p className="muted">Simulación del canal para evaluación.</p></section></section>
}

function Metric({ label, value, featured }: { label: string; value: string; featured?: boolean }) {
  return <article className={`metric${featured ? ' metric-highlight' : ''}`}><span>{label}</span><strong>{value}</strong></article>
}
