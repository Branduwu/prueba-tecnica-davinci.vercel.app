import { expect, type Page } from '@playwright/test'

export async function login(page: Page, email: string, password: string, destination: RegExp) {
  await page.goto('/login')
  await page.getByLabel('Correo').fill(email)
  await page.getByLabel('Contraseña').fill(password)
  await page.getByRole('button', { name: 'Entrar al sistema' }).click()
  await expect(page).toHaveURL(destination)
}

export async function logout(page: Page) {
  await page.getByRole('button', { name: 'Cerrar sesión' }).click()
  await expect(page).toHaveURL(/\/login/)
}
