import type { Page } from '@playwright/test'

export async function showCaption(page: Page, message: string, duration = 1_800) {
  await page.evaluate((text) => {
    document.getElementById('e2e-caption')?.remove()
    const caption = document.createElement('aside')
    caption.id = 'e2e-caption'
    caption.setAttribute('aria-live', 'polite')
    caption.textContent = `VALIDACIÓN E2E · ${text}`
    Object.assign(caption.style, {
      position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
      zIndex: '99999', maxWidth: 'min(760px, calc(100vw - 48px))', padding: '14px 20px',
      borderRadius: '10px', background: 'rgba(12, 25, 19, .88)', color: '#fff',
      fontFamily: 'Arial, sans-serif', fontSize: '18px', fontWeight: '700', textAlign: 'center',
      boxShadow: '0 8px 28px rgba(0,0,0,.25)',
    })
    document.body.append(caption)
  }, message)
  await page.waitForTimeout(duration)
  await page.locator('#e2e-caption').evaluate((element) => element.remove())
}

export async function screenshot(page: Page, filename: string) {
  await page.screenshot({ path: `docs/evidence/screenshots/${filename}`, fullPage: true })
}

export async function finalScreenshot(page: Page, filename: string) {
  await page.screenshot({ path: `docs/evidence/screenshots/final/${filename}` })
}
