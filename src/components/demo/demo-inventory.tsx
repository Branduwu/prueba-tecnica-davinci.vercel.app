'use client'

import { useState } from 'react'
import { useDemoData } from '@/components/demo/demo-data-provider'
import type { Product } from '@/types/database'

type Editable = Pick<Product, 'id' | 'name' | 'category' | 'unit' | 'price' | 'low_stock_threshold' | 'active'>
const money = (value: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value)
const units = ['pieza', 'paquete', 'manojo', 'kg'] as const

export default function DemoInventory() {
  const { state, user, updateProduct, adjustInventory } = useDemoData()
  const [query, setQuery] = useState('')
  const [moveDate, setMoveDate] = useState('')
  const [onlyLowStock, setOnlyLowStock] = useState(false)
  const [tab, setTab] = useState<'products' | 'moves'>('products')
  const [message, setMessage] = useState('')
  const [editing, setEditing] = useState<Editable | null>(null)
  const [adjusting, setAdjusting] = useState<Product | null>(null)

  if (!state) return <p className="muted">Cargando datos demo…</p>
  const products = state.products.filter((product) => (product.name + product.sku + product.category).toLowerCase().includes(query.toLowerCase()) && (!onlyLowStock || product.stock <= product.low_stock_threshold))
  const movements = state.inventoryMovements.filter((movement) => `${movement.product_name}${movement.product_sku}${movement.movement_type}`.toLowerCase().includes(query.toLowerCase()) && (!moveDate || movement.created_at.slice(0, 10) === moveDate))

  function saveProduct(event: React.FormEvent) {
    event.preventDefault()
    if (!editing || !state) return
    const current = state.products.find((product) => product.id === editing.id)
    if (!current) return
    const error = updateProduct({ ...current, ...editing })
    setMessage(error ?? 'Producto actualizado.')
    if (!error) setEditing(null)
  }

  function saveAdjustment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!adjusting) return
    const form = new FormData(event.currentTarget)
    const error = adjustInventory({ product: adjusting, quantity: Number(form.get('quantity')), type: String(form.get('type')) as 'entry' | 'exit', reason: String(form.get('reason')) })
    setMessage(error ?? 'Movimiento registrado.')
    if (!error) setAdjusting(null)
  }

  return <><div className="toolbar"><input className="search" placeholder={tab === 'products' ? 'Buscar nombre, SKU o categoría' : 'Filtrar producto o tipo'} value={query} onChange={(event) => setQuery(event.target.value)}/>{tab === 'products' && <label className="check"><input type="checkbox" checked={onlyLowStock} onChange={(event) => setOnlyLowStock(event.target.checked)}/> Sólo stock bajo</label>}{tab === 'moves' && <input className="date-filter" type="date" value={moveDate} onChange={(event) => setMoveDate(event.target.value)}/>} {user.role === 'admin' && tab === 'products' && <span className="demo-catalog-note">Catálogo oficial cargado: 100 productos</span>}</div><div className="tabs"><button className={tab === 'products' ? 'selected' : ''} onClick={() => setTab('products')}>Productos</button><button className={tab === 'moves' ? 'selected' : ''} onClick={() => setTab('moves')}>Movimientos</button></div>{message && <p className="notice">{message}</p>}{tab === 'products' ? <section className="card table-wrap"><table><thead><tr><th>Producto</th><th>SKU</th><th>Categoría</th><th>Precio</th><th>Stock</th><th /></tr></thead><tbody>{products.map((product) => <tr key={product.id} className={product.stock <= product.low_stock_threshold ? 'low' : ''}><td><strong>{product.name}</strong>{!product.active && <small> · Inactivo</small>}</td><td>{product.sku}</td><td>{product.category}</td><td>{money(product.price)}</td><td>{product.stock} {product.unit}{product.stock <= product.low_stock_threshold && <small> · Bajo</small>}</td><td>{user.role === 'admin' && <span className="row-actions"><button className="secondary" onClick={() => setEditing({ ...product })}>Editar producto</button><button className="secondary" onClick={() => setAdjusting(product)}>Ajustar</button></span>}</td></tr>)}</tbody></table>{!products.length && <p className="muted table-empty">No hay productos para este filtro.</p>}</section> : <section className="card table-wrap"><table><thead><tr><th>Fecha</th><th>Producto</th><th>Tipo</th><th>Cantidad</th><th>Anterior</th><th>Nuevo</th><th>Motivo</th><th>Usuario</th></tr></thead><tbody>{movements.map((movement) => <tr key={movement.id}><td>{new Intl.DateTimeFormat('es-MX', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(movement.created_at))}</td><td>{movement.product_sku} · {movement.product_name}</td><td>{movement.movement_type}</td><td>{movement.quantity}</td><td>{movement.previous_stock}</td><td>{movement.new_stock}</td><td>{movement.reason}</td><td>{movement.user_name}</td></tr>)}</tbody></table>{!movements.length && <p className="muted table-empty">No hay movimientos demo todavía.</p>}</section>}{editing && <Modal title="Editar producto" close={() => setEditing(null)}><form className="form" onSubmit={saveProduct}><label>SKU<input value={state.products.find((product) => product.id === editing.id)?.sku ?? ''} disabled/></label><label>Nombre<input required value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })}/></label><label>Categoría<input required value={editing.category} onChange={(event) => setEditing({ ...editing, category: event.target.value })}/></label><label>Unidad<select value={editing.unit} onChange={(event) => setEditing({ ...editing, unit: event.target.value as Product['unit'] })}>{units.map((unit) => <option key={unit}>{unit}</option>)}</select></label><label>Precio<input required type="number" min="0.001" step="0.001" value={editing.price} onChange={(event) => setEditing({ ...editing, price: Number(event.target.value) })}/></label><label>Umbral de stock bajo<input required type="number" min="0" step="0.001" value={editing.low_stock_threshold} onChange={(event) => setEditing({ ...editing, low_stock_threshold: Number(event.target.value) })}/></label><label className="check"><input type="checkbox" checked={editing.active} onChange={(event) => setEditing({ ...editing, active: event.target.checked })}/> Producto activo</label><button>Guardar cambios</button></form></Modal>}{adjusting && <Modal title={`Ajustar inventario · ${adjusting.name}`} close={() => setAdjusting(null)}><form className="form" onSubmit={saveAdjustment}><label>Tipo<select name="type"><option value="entry">Entrada</option><option value="exit">Salida</option></select></label><label>Cantidad<input name="quantity" required type="number" min={adjusting.unit === 'kg' ? '0.001' : '1'} step={adjusting.unit === 'kg' ? '0.001' : '1'}/></label><label>Motivo<select name="reason"><option>Compra proveedor</option><option>Corrección</option><option>Merma</option><option>Conteo físico</option><option>Otro</option></select></label><button>Confirmar ajuste</button></form></Modal>}</>
}

function Modal({ title, close, children }: { title: string; close: () => void; children: React.ReactNode }) {
  return <div className="modal-backdrop" role="presentation"><section className="modal" role="dialog" aria-modal="true"><div className="modal-head"><h3>{title}</h3><button className="icon" onClick={close}>×</button></div>{children}</section></div>
}
