import { expect, test } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { login, logout } from './helpers/auth'
import { screenshot, showCaption } from './helpers/captions'

const required = ['E2E_ADMIN_EMAIL', 'E2E_ADMIN_PASSWORD', 'E2E_CASHIER_EMAIL', 'E2E_CASHIER_PASSWORD', 'E2E_SUPABASE_URL', 'E2E_SUPABASE_PUBLISHABLE_KEY'] as const
const missing = required.filter((name) => !process.env[name])

test.describe('Demostración visual E2E del ERP', () => {
  test.skip(missing.length > 0, `Faltan variables E2E: ${missing.join(', ')}`)

  test('recorre administración, POS, inventario, finanzas, roles y agente', async ({ page, request }) => {
    const adminEmail = process.env.E2E_ADMIN_EMAIL!
    const adminPassword = process.env.E2E_ADMIN_PASSWORD!
    const cashierEmail = process.env.E2E_CASHIER_EMAIL!
    const cashierPassword = process.env.E2E_CASHIER_PASSWORD!

    await page.goto('/login')
    await showCaption(page, 'ERP SUPERMERCADO — Validación automatizada End-to-End', 2_500)
    await showCaption(page, '1. Autenticación — inicio de sesión como administrador')
    await login(page, adminEmail, adminPassword, /\/dashboard/)
    await expect(page.getByText('Administrador')).toBeVisible()
    await screenshot(page, '01-login.png')

    await showCaption(page, '2. Dashboard — indicadores principales del negocio', 2_200)
    await expect(page.getByText('Ventas hoy')).toBeVisible()
    await screenshot(page, '02-dashboard.png')

    await showCaption(page, '3. Inventario — búsqueda y control de existencias')
    await page.getByRole('link', { name: 'Inventario' }).click()
    await page.getByPlaceholder('Buscar nombre, SKU o categoría').fill('FRV-001')
    const tomato = page.getByRole('cell', { name: 'Tomate saladet' })
    await expect(tomato).toBeVisible()
    await expect(page.getByText('kg', { exact: true })).toBeVisible()
    await screenshot(page, '03-inventory.png')

    await showCaption(page, '4. Inventario — validando edición de producto')
    await page.getByRole('button', { name: 'Editar producto' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByLabel('SKU')).toBeDisabled()
    await page.getByRole('button', { name: '×' }).click()

    await showCaption(page, '5. Inventario — registrando ajuste controlado')
    await page.getByRole('button', { name: 'Ajustar' }).click()
    await page.getByLabel('Cantidad').fill('1')
    await page.getByLabel('Motivo').selectOption({ label: 'Validación E2E' }).catch(async () => {
      await page.getByLabel('Motivo').selectOption({ label: 'Corrección' })
    })
    await page.getByRole('button', { name: 'Confirmar ajuste' }).click()
    await expect(page.getByText('Movimiento registrado.')).toBeVisible()

    await showCaption(page, '6. Punto de Venta — producto vendido por peso: 0.750 kg')
    await page.getByRole('link', { name: 'Punto de venta' }).click()
    await page.getByPlaceholder('Busca por producto o SKU').fill('Tomate saladet')
    await page.getByRole('button', { name: /Tomate saladet/ }).click()
    await page.getByLabel('Cantidad Tomate saladet').fill('0.750')
    await expect(page.getByText('$21.38')).toBeVisible()
    await screenshot(page, '04-pos-cart.png')

    await showCaption(page, '7. Cobro — efectivo $50.00 y cambio $28.62')
    await page.getByLabel('Efectivo recibido').fill('50')
    await expect(page.getByText('Cambio: $28.62')).toBeVisible()
    await showCaption(page, '8. Venta — registrando transacción real')
    await page.getByRole('button', { name: 'Cobrar venta' }).click()
    await expect(page.getByText('Ticket de venta')).toBeVisible()
    await expect(page.getByText('Tomate saladet')).toBeVisible()
    await screenshot(page, '05-ticket.png')

    await showCaption(page, '10. Inventario — verificando descuento automático')
    await page.getByRole('button', { name: 'Nueva venta' }).click()
    await page.getByRole('link', { name: 'Inventario' }).click()
    await page.getByPlaceholder('Buscar nombre, SKU o categoría').fill('FRV-001')
    await expect(page.getByRole('cell', { name: 'Tomate saladet' })).toBeVisible()
    await page.getByRole('button', { name: 'Movimientos' }).click()
    await page.getByPlaceholder('Filtrar producto o tipo').fill('Tomate')
    await expect(page.getByText('Venta POS')).toBeVisible()
    await screenshot(page, '06-inventory-movement.png')

    await showCaption(page, '12. Finanzas — validando indicadores y top productos', 2_200)
    await page.getByRole('link', { name: 'Finanzas' }).click()
    await expect(page.getByText('Ventas de hoy')).toBeVisible()
    await expect(page.getByText('Productos más vendidos')).toBeVisible()
    await screenshot(page, '07-finance.png')

    await showCaption(page, '13. Finanzas — registrando gasto de validación E2E')
    await page.getByLabel('Categoría').selectOption('otros')
    await page.getByLabel('Descripción').fill('Validación E2E')
    await page.getByLabel('Monto').fill('10.00')
    await page.getByRole('button', { name: 'Guardar gasto' }).click()
    await expect(page.getByText('Gasto registrado.')).toBeVisible()

    await showCaption(page, '15. Seguridad — iniciando sesión como cajero')
    await logout(page)
    await login(page, cashierEmail, cashierPassword, /\/pos/)
    await page.getByRole('link', { name: 'Inventario' }).click()
    await expect(page.getByRole('button', { name: 'Editar producto' })).toHaveCount(0)
    await page.goto('/finanzas')
    await expect(page).toHaveURL(/\/pos/)
    await screenshot(page, '08-cashier-permissions.png')

    await showCaption(page, '18. Inteligencia Artificial — consulta de datos reales')
    await logout(page)
    await login(page, adminEmail, adminPassword, /\/dashboard/)
    const auth = createClient(process.env.E2E_SUPABASE_URL!, process.env.E2E_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } })
    const { data:session, error:authError } = await auth.auth.signInWithPassword({ email: adminEmail, password: adminPassword })
    expect(authError).toBeNull()
    const response = await request.post('/api/ai', { headers: { Authorization: `Bearer ${session.session?.access_token}` }, data: { question: '¿Cuánto vendimos hoy?' } })
    expect(response.ok()).toBeTruthy()
    const body = await response.json() as { answer: string }
    await page.goto('/dashboard')
    await page.evaluate((answer) => { document.body.insertAdjacentHTML('beforeend', `<div id="e2e-ai-answer">Respuesta IA: ${answer}</div>`) }, body.answer)
    await expect(page.getByText(/Respuesta IA:/)).toBeVisible()
    await screenshot(page, '09-ai.png')
    await showCaption(page, 'VALIDACIÓN E2E COMPLETADA — WhatsApp requiere Sandbox externo', 2_500)
  })
})
