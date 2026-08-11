import { expect, type Page } from '@playwright/test'

type VisualIssue = { element: string; issue: string }

export async function checkVisualIntegrity(page: Page, screen: string) {
  const issues = await page.evaluate(() => {
    const found: VisualIssue[] = []
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const bodyWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth)
    if (bodyWidth > viewportWidth + 2) found.push({ element: 'document', issue: `overflow horizontal global: ${bodyWidth}px / ${viewportWidth}px` })

    const describe = (element: Element) => {
      const label = element.getAttribute('aria-label') || element.textContent?.trim().replace(/\s+/g, ' ').slice(0, 60)
      return `${element.tagName.toLowerCase()}${label ? ` (${label})` : ''}`
    }
    const isVisible = (element: HTMLElement, style: CSSStyleDeclaration) => {
      const rect = element.getBoundingClientRect()
      return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) !== 0 && rect.width > 1 && rect.height > 1
    }
    const insideExpectedScroller = (element: Element) => Boolean(element.closest('.table-wrap,.product-grid'))

    for (const element of document.querySelectorAll<HTMLElement>('button,a,input,select,h1,h2,h3,.metric,[role="dialog"]')) {
      const style = getComputedStyle(element)
      if (!isVisible(element, style)) continue
      const rect = element.getBoundingClientRect()
      const name = describe(element)
      if (element.matches('[role="dialog"]') && (rect.left < -1 || rect.top < -1 || rect.right > viewportWidth + 1 || rect.bottom > viewportHeight + 1)) {
        found.push({ element: name, issue: 'modal fuera del viewport' })
      }
      if (rect.bottom < 0 || rect.top > viewportHeight) continue
      if (element.matches('button,a,input,select') && !insideExpectedScroller(element) && (rect.left < -1 || rect.right > viewportWidth + 1)) {
        found.push({ element: name, issue: 'control interactivo fuera del viewport' })
      }
      const clipsX = element.scrollWidth > element.clientWidth + 2 && ['hidden', 'clip'].includes(style.overflowX)
      const clipsY = element.scrollHeight > element.clientHeight + 2 && ['hidden', 'clip'].includes(style.overflowY)
      if (!insideExpectedScroller(element) && (clipsX || clipsY)) found.push({ element: name, issue: 'texto o contenido recortado' })
    }
    return found.slice(0, 20)
  })

  expect(issues, `Integridad visual: ${screen}`).toEqual([])
}
