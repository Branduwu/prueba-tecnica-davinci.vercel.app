'use client'

import { useState } from 'react'
import { roundMoney } from '@/lib/demo/business'
import { useDemoData } from '@/components/demo/demo-data-provider'
import type { CartItem, Product } from '@/types/database'
import type { DemoTicket } from '@/lib/demo/types'

const money = (value: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value || 0)

export default function DemoPos() {
  const { state, completeSale } = useDemoData()
  const [query, setQuery] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [cash, setCash] = useState('')
  const [notice, setNotice] = useState('')
  const [ticket, setTicket] = useState<DemoTicket | null>(null)

  if (!state) return <p className="muted">Cargando datos demo…</p>
  const products = state.products.filter((product) => product.active)
  const results = products.filter((product) => (product.name + product.sku).toLowerCase().includes(query.toLowerCase())).slice(0, 20)
  const total = roundMoney(cart.reduce((sum, product) => sum + roundMoney(product.price * product.quantity), 0))
  const received = Number(cash) || 0

  function add(product: Product) {
    setNotice('')
    setCart((current) => {
      const found = current.find((item) => item.id === product.id)
      if (found && found.quantity + 1 > product.stock) {
        setNotice(`Stock insuficiente para ${product.name}.`)
        return current
      }
      return found ? current.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item) : [...current, { ...product, quantity: 1 }]
    })
  }

  function quantity(id: string, value: string) {
    const amount = Number(value)
    const product = cart.find((item) => item.id === id)
    if (!product || !Number.isFinite(amount) || amount <= 0) return setNotice('La cantidad debe ser mayor a cero.')
    if (product.unit !== 'kg' && !Number.isInteger(amount)) return setNotice(`${product.name} sólo permite cantidades enteras.`)
    if (amount > product.stock) return setNotice(`No hay suficiente stock para ${product.name}.`)
    setNotice('')
    setCart((current) => current.map((item) => item.id === id ? { ...item, quantity: amount } : item))
  }

  function charge() {
    const result = completeSale(cart, received)
    if (result.error) return setNotice(result.error)
    setTicket(result.ticket ?? null)
    setCart([])
    setCash('')
    setNotice('')
  }

  if (ticket) return <TicketView ticket={ticket} onNew={() => setTicket(null)}/>
  return <div className="pos"><section className="card"><input className="search" autoFocus placeholder="Busca por producto o SKU" value={query} onChange={(event) => setQuery(event.target.value)}/><div className="product-grid">{results.map((product) => <button className="product" key={product.id} onClick={() => add(product)}><strong>{product.name}</strong><small>{product.sku} · {product.stock} {product.unit}</small><b>{money(product.price)} / {product.unit}</b></button>)}</div></section><section className="card cart"><h3>Venta actual</h3>{cart.length === 0 ? <p className="muted">Agrega productos para comenzar.</p> : cart.map((item) => <div className="cart-line" key={item.id}><div><strong>{item.name}</strong><small>{money(item.price)} / {item.unit}</small></div><input aria-label={`Cantidad ${item.name}`} type="number" min={item.unit === 'kg' ? '0.001' : '1'} step={item.unit === 'kg' ? '0.001' : '1'} max={item.stock} value={item.quantity} onChange={(event) => quantity(item.id, event.target.value)}/><b>{money(roundMoney(item.price * item.quantity))}</b><button className="icon" onClick={() => setCart((current) => current.filter((product) => product.id !== item.id))}>×</button></div>)}<div className="totals"><span>Total</span><strong>{money(total)}</strong></div><label>Efectivo recibido<input type="number" min={total} step="0.01" value={cash} onChange={(event) => setCash(event.target.value)} /></label><p className="change">Cambio: {money(Math.max(0, received - total))}</p>{notice && <p className="notice">{notice}</p>}<button onClick={charge} disabled={!cart.length}>Cobrar venta</button>{cart.length > 0 && <button className="secondary" onClick={() => setCart([])}>Vaciar carrito</button>}</section></div>
}

function TicketView({ ticket, onNew }: { ticket: DemoTicket; onNew: () => void }) {
  return <section className="ticket card"><div className="ticket-print"><p className="eyebrow">MERCADO CENTRAL · MODO DEMO</p><h2>Ticket de venta</h2><p>Folio: <strong>{ticket.folio}</strong><br/>{new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(ticket.date)}<br/>Cajero: {ticket.cashier}</p><table><thead><tr><th>Producto</th><th>Cantidad</th><th>P. unit.</th><th>Subtotal</th></tr></thead><tbody>{ticket.items.map((item) => <tr key={item.id}><td>{item.name}</td><td>{item.quantity.toFixed(item.unit === 'kg' ? 3 : 0)} {item.unit}</td><td>{money(item.price)}</td><td>{money(roundMoney(item.price * item.quantity))}</td></tr>)}</tbody></table><div className="ticket-totals"><p>Total <strong>{money(ticket.total)}</strong></p><p>Efectivo {money(ticket.received)}</p><p>Cambio <strong>{money(ticket.change)}</strong></p></div></div><div className="ticket-actions"><button onClick={onNew}>Nueva venta</button><button className="secondary" onClick={() => window.print()}>Imprimir</button></div></section>
}
