import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const OUT_DIR = '/tmp/kilo/viz-screenshots'
mkdirSync(OUT_DIR, { recursive: true })

const PORT = 4178
const url = `http://127.0.0.1:${PORT}`

const proc = spawn('node', ['scripts/groundbed-demo-serve.mjs'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: String(PORT) },
  stdio: ['ignore', 'pipe', 'pipe'],
})
proc.stdout.on('data', (b) => process.stdout.write(`[srv] ${b}`))
proc.stderr.on('data', (b) => process.stderr.write(`[srv!] ${b}`))

async function captureSection(page, anchor, outPath) {
  const handle = page.locator(anchor).first()
  if ((await handle.count()) === 0) return false
  await handle.scrollIntoViewIfNeeded()
  await sleep(400)
  await page.screenshot({ path: outPath, fullPage: false })
  return true
}

try {
  const start = Date.now()
  while (Date.now() - start < 30000) {
    try {
      const res = await fetch(url)
      if (res.ok) break
    } catch (_) { /* not ready */ }
    await sleep(200)
  }

  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => console.log('PAGEERROR:', e.message))
  page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE_ERR:', m.text()) })
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForSelector('.viz-soil-resistivity, .viz-cable-network, .viz-groundbed', { timeout: 10000 })
  await sleep(800)

  // Scroll to the optimized groundbed panel section
  await captureSection(page, 'text=C4 — RightSideEngineeringPanel: Groundbed Intelligence', join(OUT_DIR, '12-optimized-groundbed.png'))
  console.log('saved 12-optimized-groundbed')

  await captureSection(page, 'text=C4 — RightSideEngineeringPanel: Cable Intelligence (all OK)', join(OUT_DIR, '13-optimized-cable.png'))
  console.log('saved 13-optimized-cable')

  await browser.close()
  console.log('DONE')
} finally {
  proc.kill('SIGTERM')
}
