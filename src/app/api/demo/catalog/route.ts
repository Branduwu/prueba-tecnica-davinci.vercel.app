import { readFile } from 'node:fs/promises'
import { isDemoMode } from '@/lib/supabase/config'
import type { Product } from '@/types/database'

export const runtime = 'nodejs'

export async function GET() {
  if (!isDemoMode()) return Response.json({ error: 'No disponible' }, { status: 404 })
  const csv = await readFile(new URL('../../../../../data/productos_supermercado.csv', import.meta.url), 'utf8')
  const [, ...rows] = csv.trim().split(/\r?\n/)
  const products = rows.map((row) => {
    const [sku, name, category, unit, price, stock] = row.split(',')
    return {
      id: `demo-${sku}`,
      sku,
      name,
      category,
      unit: unit as Product['unit'],
      price: Number(price),
      stock: Number(stock),
      low_stock_threshold: 0,
      active: true,
    } satisfies Product
  })
  return Response.json(products)
}
