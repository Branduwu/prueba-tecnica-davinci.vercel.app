import { expect, test } from '@playwright/test'
import { checkVisualIntegrity } from './helpers/visual'

const isDemoMode = process.env.E2E_MODE === 'demo'
const viewports = [
  { width: 1920, height: 1080 }, { width: 1440, height: 900 }, { width: 1366, height: 768 },
  { width: 1280, height: 720 }, { width: 1024, height: 768 }, { width: 768, height: 1024 }, { width: 390, height: 844 },
]

test.use({ video: 'off', screenshot: 'only-on-failure' })

test.describe('Auditoría visual responsive del modo demo', () => {
  test.skip(!isDemoMode, 'Esta prueba se ejecuta exclusivamente con E2E_MODE=demo.')

  test('mantiene controles, métricas y tablas dentro de sus contenedores', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: 'Usar administrador demo' }).click()
    await page.getByRole('button', { name: 'Iniciar sesión' }).click()
    await expect(page).toHaveURL(/\/dashboard/)

    for (const viewport of viewports) {
      await page.setViewportSize(viewport)
      await page.goto('/dashboard')
      await expect(page.getByText('Ventas hoy', { exact: true })).toBeVisible()
      await checkVisualIntegrity(page, `Dashboard ${viewport.width}x${viewport.height}`)

      await page.goto('/pos')
      await expect(page.getByPlaceholder('Busca por producto o SKU')).toBeVisible()
      await checkVisualIntegrity(page, `POS ${viewport.width}x${viewport.height}`)

      await page.goto('/inventario')
      await expect(page.locator('input.search')).toBeVisible()
      await checkVisualIntegrity(page, `Inventario ${viewport.width}x${viewport.height}`)

      await page.goto('/finanzas')
      await expect(page.getByText('Ventas de hoy', { exact: true })).toBeVisible()
      await checkVisualIntegrity(page, `Finanzas ${viewport.width}x${viewport.height}`)
    }
  })
})
