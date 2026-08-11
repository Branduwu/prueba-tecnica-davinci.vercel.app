'use client'

import Link from 'next/link'
import { useState } from 'react'
import { answerDemoQuestion, expensesTotal, periodExpenses, periodSales, salesTotal, starts } from '@/lib/demo/business'
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

  return <><div className="metrics"><Metric label="Ventas hoy" value={money(salesTotal(periodSales(state.sales, range.today)))}/><Metric label="Esta semana" value={money(salesTotal(periodSales(state.sales, range.week)))}/><Metric label="Este mes" value={money(income)}/><Metric label="Egresos" value={money(outgoings)}/><Metric label="Flujo neto" value={money(income - outgoings)}/><Metric label="Stock bajo" value={String(low)}/></div><section className="card"><h3>Accesos rápidos</h3><div className="quick"><Link href="/pos">Abrir POS</Link><Link href="/inventario">Gestionar inventario</Link><Link href="/finanzas">Ver finanzas</Link></div></section><DemoAgentPanel/></>
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

  return <section className="demo-insights"><section className="card"><p className="section-label">AGENTE DE NEGOCIO</p><h3>Agente de negocio — modo demo</h3><p className="muted">Consulta los mismos datos almacenados localmente por el ERP.</p><form className="demo-chat" onSubmit={ask}><label>Pregunta al agente demo<input value={question} onChange={(event) => setQuestion(event.target.value)} /></label><button>Consultar</button></form>{answer && <p className="demo-answer">{answer}</p>}</section><section className="card whatsapp-demo"><p className="section-label">SIMULACIÓN WHATSAPP</p><h3>WhatsApp — simulación de integración</h3><p className="muted">Canal WhatsApp simulado para demostración.</p><label>Mensaje de WhatsApp simulado<input value={whatsappQuestion} onChange={(event) => setWhatsappQuestion(event.target.value)} /></label><div className="whatsapp-bubble incoming">{whatsappQuestion}</div>{whatsappAnswer && <div className="whatsapp-bubble outgoing">{whatsappAnswer}</div>}<button className="secondary" onClick={() => state && setWhatsappAnswer(answerDemoQuestion(state, whatsappQuestion))}>Simular mensaje</button></section></section>
}

function Metric({ label, value }: { label: string; value: string }) {
  return <article className="metric"><span>{label}</span><strong>{value}</strong></article>
}
