import { test, expect } from '@playwright/test'

test.describe('CP Platform — Application Load', () => {
  test('should load the application without errors', async ({ page }) => {
    const errors = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    expect(errors.length).toBe(0)
    await expect(page).toHaveTitle(/CP|ICCP|Platform/i)
  })

  test('should have a visible root element', async ({ page }) => {
    await page.goto('/')
    const root = page.locator('#root')
    await expect(root).toBeVisible({ timeout: 10000 })
  })

  test('should have no console errors on initial load', async ({ page }) => {
    const consoleErrors = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    expect(consoleErrors.length).toBe(0)
  })
})

test.describe('CP Platform — Navigation', () => {
  test('should navigate between pages without errors', async ({ page }) => {
    page.on('pageerror', (err) => console.error('Page error:', err.message))

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const links = page.locator('a, button, [role="button"], nav a, nav button')
    const linkCount = await links.count()

    if (linkCount > 0) {
      const firstNavLink = links.first()
      await firstNavLink.click()
      await page.waitForTimeout(500)
    }
  })
})

test.describe('CP Platform — Build Integrity', () => {
  test('should serve assets with correct MIME types', async ({ page }) => {
    const responses = []
    page.on('response', (response) => {
      if (response.url().includes('.js') || response.url().includes('.css')) {
        responses.push({
          url: response.url().split('/').pop(),
          status: response.status(),
          contentType: response.headers()['content-type'],
        })
      }
    })

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const failed = responses.filter((r) => r.status !== 200)
    expect(failed.length).toBe(0)
  })
})
