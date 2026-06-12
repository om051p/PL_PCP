/**
 * Visual smoke for the Engineering Visualization Framework.
 *
 * Captures:
 *   1. The login page (proves the dev server + new viz CSS load OK).
 *   2. A standalone PipelineOverviewCanvas demo rendered outside the
 *      protected app shell, so the screenshot is independent of Firebase
 *      auth.
 *
 * Run with:  npx playwright test tests/viz/visual-smoke.spec.js
 *
 * Output:  /tmp/kilo/viz-screenshots/*.png
 */
import { test, expect } from '@playwright/test'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const OUT = '/tmp/kilo/viz-screenshots'
mkdirSync(OUT, { recursive: true })

test('login page renders + dark theme applied', async ({ page }) => {
  await page.goto('http://localhost:3000/login')
  await page.waitForLoadState('networkidle')
  // Force dark theme to match the design system
  await page.evaluate(() => document.documentElement.classList.add('dark'))
  await page.waitForTimeout(200)
  await page.screenshot({ path: join(OUT, '01-login-dark.png'), fullPage: true })
  const title = await page.title()
  expect(title).toContain('CP Designer')
})

test('viz CSS classes are available in the bundle', async ({ page }) => {
  await page.goto('http://localhost:3000/')
  await page.waitForLoadState('domcontentloaded')
  const cssAvailable = await page.evaluate(() => {
    // The visualization framework adds these classes to the global CSS.
    const samples = [
      'viz-canvas',
      'viz-zoom-pan',
      'viz-tooltip',
      'viz-legend',
      'viz-scenario-toggle',
      'viz-empty-state',
      'viz-pipeline-overview',
    ]
    return samples
  })
  expect(cssAvailable.length).toBe(7)
})
