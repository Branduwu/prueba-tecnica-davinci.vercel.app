import { createHmac } from 'node:crypto'
import { expect, test } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { login, logout } from './helpers/auth'
import { screenshot, showCaption } from './helpers/captions'

const required = ['E2E_ADMIN_EMAIL', 'E2E_ADMIN_PASSWORD', 'E2E_CASHIER_EMAIL', 'E2E_CASHIER_PASSWORD', 'E2E_SUPABASE_URL', 'E2E_SUPABASE_PUBLISHABLE_KEY', 'TWILIO_AUTH_TOKEN'] as const

test.describe('Demostración local real del ERP', () => {
  test('valida Auth, RLS, POS, inventario, finanzas, agente y webhook', async ({ page, request }) => {
    test.setTimeout(180_000)
    for (const name of required) expect(process.env[name], `Falta ${name}; ejecuta npm run e2e:setup`).toBeTruthy()
    const adminEmail = process.env.E2E_ADMIN_EMAIL!
    const adminPassword = process.env.E2E_ADMIN_PASSWORD!
    const cashierEmail = process.env.E2E_CASHIER_EMAIL!
    const cashierPassword = process.env.E2E_CASHIER_PASSWORD!
    const database = createClient(process.env.E2E_SUPABASE_URL!, process.env.E2E_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } })

    await page.goto('/login')
    await showCaption(page, 'ERP SUPERMERCADO · VALIDACIÓN END-TO-END · ENTORNO LOCAL DE PRUEBAS', 2_000)
    await showCaption(page, 'Next.js + Supabase Local + PostgreSQL', 2_000)
    await showCaption(page, '1. Autenticación — administrador')
    await login(page, adminEmail, adminPassword, /\/dashboard/)
    await expect(page.getByText('Administrador', { exact: true })).toBeVisible()
    await showCaption(page, '✓ Autenticación real contra Supabase Local')
    await screenshot(page, '01-login.png')

    await showCaption(page, '2. Dashboard — indicadores del negocio', 2_500)
    await expect(page.getByText('Ventas hoy')).toBeVisible()
    await screenshot(page, '02-dashboard.png')

    await showCaption(page, '3. Inventario — catálogo de 100 productos')
    await page.getByRole('link', { name: 'Inventario', exact: true }).click()
    const importInput = page.getByLabel('Importar productos')
    await importInput.setInputFiles('data/productos_supermercado.csv')
    await expect(page.getByText(/Procesados: 100\. Insertados: 100\. Actualizados: 0\. Errores: 0\./)).toBeVisible()
    await importInput.setInputFiles('data/productos_supermercado.csv')
    await expect(page.getByText(/Procesados: 100\. Insertados: 0\. Actualizados: 100\. Errores: 0\./)).toBeVisible()
    await page.getByPlaceholder('Buscar nombre, SKU o categoría').fill('FRV-001')
    await expect(page.getByRole('cell', { name: 'Tomate saladet' })).toBeVisible()
    await expect(page.getByText('$28.50')).toBeVisible()
    await screenshot(page, '03-inventory.png')

    const { data: sessionData, error: sessionError } = await database.auth.signInWithPassword({ email: adminEmail, password: adminPassword })
    expect(sessionError).toBeNull()
    const adminId = sessionData.user?.id
    expect(adminId).toBeTruthy()
    const { count: productCount, error: countError } = await database.from('products').select('*', { count: 'exact', head: true })
    expect(countError).toBeNull()
    expect(productCount).toBe(100)
    const { data: tomato, error: tomatoError } = await database.from('products').select('id,sku,name,unit,price,stock').eq('sku', 'FRV-001').single()
    expect(tomatoError).toBeNull()
    expect(tomato).toMatchObject({ sku: 'FRV-001', name: 'Tomate saladet', unit: 'kg' })
    expect(Number(tomato?.price)).toBe(28.5)
    const initialStock = Number(tomato?.stock)
    expect(initialStock).toBe(120)

    await showCaption(page, '4. Inventario — ajuste transaccional')
    await page.getByRole('button', { name: 'Ajustar' }).click()
    await page.getByRole('dialog').getByLabel('Cantidad').fill('1')
    await page.getByRole('dialog').getByLabel('Motivo').selectOption({ label: 'Corrección' })
    await page.getByRole('dialog').getByRole('button', { name: 'Confirmar ajuste' }).click()
    await expect(page.getByText('Movimiento registrado.')).toBeVisible()
    await page.getByRole('button', { name: 'Ajustar' }).click()
    await page.getByRole('dialog').getByLabel('Tipo').selectOption('exit')
    await page.getByRole('dialog').getByLabel('Cantidad').fill('1')
    await page.getByRole('dialog').getByLabel('Motivo').selectOption({ label: 'Corrección' })
    await page.getByRole('dialog').getByRole('button', { name: 'Confirmar ajuste' }).click()
    await expect.poll(async () => {
      const { count } = await database.from('inventory_movements').select('*', { count: 'exact', head: true }).eq('product_id', tomato!.id).eq('reason', 'Corrección')
      return count
    }).toBe(2)

    await showCaption(page, '5. Auditoría — historial de inventario')
    await page.getByRole('button', { name: 'Movimientos' }).click()
    await page.getByPlaceholder('Filtrar producto o tipo').fill('Tomate')
    await expect(page.getByText('Corrección').first()).toBeVisible()
    await screenshot(page, '04-adjustment-movements.png')

    await showCaption(page, '6. POS — venta real por peso')
    await page.getByRole('link', { name: 'Punto de venta', exact: true }).click()
    await page.getByPlaceholder('Busca por producto o SKU').fill('FRV-001')
    await page.getByRole('button', { name: /Tomate saladet/ }).click()
    await page.getByLabel('Cantidad Tomate saladet').fill('0')
    await expect(page.getByText('La cantidad debe ser mayor a cero.')).toBeVisible()
    await page.getByLabel('Cantidad Tomate saladet').fill('-1')
    await expect(page.getByText('La cantidad debe ser mayor a cero.')).toBeVisible()
    await page.getByLabel('Cantidad Tomate saladet').fill('500')
    await expect(page.getByText('No hay suficiente stock para Tomate saladet.')).toBeVisible()
    await page.getByLabel('Cantidad Tomate saladet').fill('0.750')
    await page.getByPlaceholder('Busca por producto o SKU').fill('FRV-014')
    await page.getByRole('button', { name: /Lechuga romana/ }).click()
    await page.getByLabel('Cantidad Lechuga romana').fill('1.5')
    await expect(page.getByText('Lechuga romana sólo permite cantidades enteras.')).toBeVisible()
    await page.locator('.cart-line', { hasText: 'Lechuga romana' }).getByRole('button', { name: '×' }).click()
    await expect(page.locator('.totals strong')).toHaveText('$21.38')
    await screenshot(page, '05-pos-weighted-cart.png')

    await showCaption(page, '7. Cobro — efectivo $50.00 y cambio $28.62')
    await page.getByLabel('Efectivo recibido').fill('50')
    await expect(page.getByText('Cambio: $28.62')).toBeVisible()
    await showCaption(page, '8. Venta — transacción PostgreSQL')
    await page.getByRole('button', { name: 'Cobrar venta' }).click()
    await expect(page.getByText('Ticket de venta')).toBeVisible()
    await expect(page.getByText('0.750 kg')).toBeVisible()
    await screenshot(page, '06-ticket.png')

    const { data: sale, error: saleError } = await database.from('sales').select('id,cashier_id,total,change_amount').eq('cashier_id', adminId!).order('created_at', { ascending: false }).limit(1).single()
    expect(saleError).toBeNull()
    expect(sale).toMatchObject({ cashier_id: adminId, total: 21.38, change_amount: 28.62 })
    const { data: saleItems, error: itemsError } = await database.from('sale_items').select('quantity,subtotal,product_id').eq('sale_id', sale!.id)
    expect(itemsError).toBeNull()
    expect(saleItems).toHaveLength(1)
    expect(Number(saleItems?.[0].quantity)).toBe(0.75)
    expect(Number(saleItems?.[0].subtotal)).toBe(21.38)
    const { data: stockAfterSale } = await database.from('products').select('stock').eq('id', tomato!.id).single()
    expect(Number(stockAfterSale?.stock)).toBeCloseTo(initialStock - 0.75, 3)
    const { data: saleMovement } = await database.from('inventory_movements').select('sale_id,new_stock,reason').eq('sale_id', sale!.id).single()
    expect(saleMovement).toMatchObject({ sale_id: sale!.id, reason: 'Venta POS' })
    expect(Number(saleMovement?.new_stock)).toBeCloseTo(initialStock - 0.75, 3)

    await showCaption(page, `10. Inventario — stock ${initialStock} − 0.750 = ${initialStock - 0.75}`)
    await page.getByRole('button', { name: 'Nueva venta' }).click()
    await page.getByRole('link', { name: 'Inventario', exact: true }).click()
    await page.getByPlaceholder('Buscar nombre, SKU o categoría').fill('FRV-001')
    await expect(page.getByText(`${initialStock - 0.75} kg`)).toBeVisible()
    await page.getByRole('button', { name: 'Movimientos' }).click()
    await page.getByPlaceholder('Filtrar producto o tipo').fill('Tomate')
    await expect(page.getByText('Venta POS')).toBeVisible()
    await screenshot(page, '07-stock-and-sale-movement.png')

    await showCaption(page, '12. Finanzas — venta reflejada automáticamente')
    await page.getByRole('link', { name: 'Finanzas', exact: true }).click()
    await expect(page.getByText('Ventas de hoy')).toBeVisible()
    await expect(page.getByText('Productos más vendidos')).toBeVisible()
    await expect(page.getByText('Tomate saladet')).toBeVisible()
    await showCaption(page, '13. Finanzas — registrando gasto de $10.00')
    await page.getByLabel('Categoría').selectOption('otros')
    await page.getByLabel('Descripción').fill('Validación automatizada')
    await page.getByLabel('Monto').fill('10.00')
    await page.getByRole('button', { name: 'Guardar gasto' }).click()
    await expect(page.getByText('Gasto registrado.')).toBeVisible()
    await expect(page.getByText('$11.38')).toBeVisible()
    await screenshot(page, '08-finance.png')
    const { data: expense, error: expenseError } = await database.from('expenses').select('amount,description').eq('description', 'Validación automatizada').single()
    expect(expenseError).toBeNull()
    expect(expense).toMatchObject({ description: 'Validación automatizada', amount: 10 })

    await showCaption(page, '14. Seguridad — cambiando a usuario cajero')
    await logout(page)
    await login(page, cashierEmail, cashierPassword, /\/pos/)
    const cashierDatabase = createClient(process.env.E2E_SUPABASE_URL!, process.env.E2E_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } })
    const { error: cashierSessionError } = await cashierDatabase.auth.signInWithPassword({ email: cashierEmail, password: cashierPassword })
    expect(cashierSessionError).toBeNull()
    const { error: cashierProductWriteError } = await cashierDatabase.from('products').insert({ sku: 'E2E-RLS-DENIED', name: 'Producto no autorizado', category: 'E2E', unit: 'pieza', price: 1, stock: 1 })
    expect(cashierProductWriteError).not.toBeNull()
    const { error: cashierAdjustmentError } = await cashierDatabase.rpc('adjust_inventory', { p_product_id: tomato!.id, p_quantity: 1, p_type: 'entry', p_reason: 'Intento E2E no autorizado' })
    expect(cashierAdjustmentError).not.toBeNull()
    await page.getByRole('link', { name: 'Inventario', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Editar producto' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Ajustar' })).toHaveCount(0)
    await page.goto('/finanzas')
    await expect(page).toHaveURL(/\/pos/)
    await showCaption(page, '✓ Cajero sin acceso a Finanzas')
    await screenshot(page, '09-cashier-permissions.png')

    await showCaption(page, '16. Agente IA — proveedor local E2E, datos reales del ERP')
    await logout(page)
    await login(page, adminEmail, adminPassword, /\/dashboard/)
    const { data: freshSession, error: freshSessionError } = await database.auth.signInWithPassword({ email: adminEmail, password: adminPassword })
    expect(freshSessionError).toBeNull()
    const token = freshSession.session?.access_token
    const answers = [] as string[]
    for (const question of ['¿Cuánto vendimos hoy?', '¿Cuánto stock queda de tomate?', '¿Qué producto se vendió más esta semana?']) {
      const response = await request.post('/api/ai', { headers: { Authorization: `Bearer ${token}` }, data: { question } })
      if (!response.ok()) throw new Error(`/api/ai respondió ${response.status()}: ${await response.text()}`)
      answers.push((await response.json() as { answer: string }).answer)
    }
    expect(answers[0]).toContain('$21.38')
    expect(answers[1]).toContain('Tomate saladet')
    expect(answers[2]).toContain('Tomate saladet')
    await page.evaluate((items) => { const panel = document.createElement('section'); panel.id = 'e2e-agent-result'; panel.textContent = `Agente IA — proveedor local E2E, datos reales del ERP\n${items.join('\n')}`; Object.assign(panel.style, { whiteSpace: 'pre-line', padding: '20px', margin: '20px', background: '#10251a', color: 'white', borderRadius: '10px' }); document.body.append(panel) }, answers)
    await expect(page.getByText(/Agente IA — proveedor local E2E/)).toBeVisible()
    await screenshot(page, '10-agent.png')

    await showCaption(page, '17. WhatsApp — simulación del webhook E2E')
    const question = '¿Cuánto vendimos hoy?'
    const from = 'whatsapp:+15550000000'
    const body = `Body=${encodeURIComponent(question)}&From=${encodeURIComponent(from)}`
    const sign = (url: string) => createHmac('sha1', process.env.TWILIO_AUTH_TOKEN!).update(`${url}Body${question}From${from}`).digest('base64')
    let webhook = await request.post('/api/whatsapp', { headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-twilio-signature': sign(new URL('/api/whatsapp', process.env.E2E_BASE_URL).toString()) }, data: body })
    const signatureUrl = webhook.headers()['x-e2e-signature-url']
    if (webhook.status() === 401 && signatureUrl) {
      webhook = await request.post(signatureUrl, { headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-twilio-signature': sign(signatureUrl) }, data: body })
    }
    if (!webhook.ok()) throw new Error(`/api/whatsapp respondió ${webhook.status()} para ${webhook.headers()['x-e2e-signature-url'] ?? 'URL no disponible'}: ${await webhook.text()}`)
    const twiml = await webhook.text()
    expect(twiml).toContain('$21.38')
    await page.evaluate((answer) => { const panel = document.createElement('section'); panel.id = 'e2e-whatsapp-result'; panel.textContent = `WhatsApp — webhook validado en modo E2E local\nMensaje: ¿Cuánto vendimos hoy?\nWebhook → agente → Supabase → respuesta\n${answer}`; Object.assign(panel.style, { whiteSpace: 'pre-line', padding: '20px', margin: '20px', background: '#143a2b', color: 'white', borderRadius: '10px' }); document.body.append(panel) }, twiml.replace(/<[^>]+>/g, ''))
    await expect(page.getByText(/WhatsApp — webhook validado en modo E2E local/)).toBeVisible()
    await showCaption(page, '✓ Webhook funcional — proveedor externo simulado')
    await screenshot(page, '11-whatsapp-e2e.png')

    await page.evaluate(() => { const panel = document.createElement('section'); panel.textContent = 'VALIDACIÓN E2E COMPLETADA\n\nAuth ✓\nRoles ✓\nRLS ✓\nPOS ✓\nVenta por peso ✓\nTicket ✓\nInventario ✓\nMovimientos ✓\nFinanzas ✓\nAgente / Tools ✓\nWebhook WhatsApp ✓\n\nEntorno local de pruebas\nServicios externos IA/Twilio simulados\nBase de datos, Auth y lógica ERP ejecutadas realmente con Supabase Local'; Object.assign(panel.style, { whiteSpace: 'pre-line', minHeight: '70vh', display: 'grid', placeItems: 'center', textAlign: 'center', font: '700 24px Arial', padding: '32px', background: '#0d2418', color: 'white' }); document.body.replaceChildren(panel) })
    await page.waitForTimeout(4_000)
  })
})
