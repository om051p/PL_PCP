import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const OUT = '/tmp/kilo/viz-screenshots'
mkdirSync(OUT, { recursive: true })

const PORT = 4179
const url = `http://127.0.0.1:${PORT}`

const proc = spawn('node', ['scripts/arch-demo-serve.mjs'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: String(PORT) },
  stdio: ['ignore', 'pipe', 'pipe'],
})
proc.stdout.on('data', (b) => process.stdout.write(`[srv] ${b}`))
proc.stderr.on('data', (b) => process.stderr.write(`[srv!] ${b}`))

try {
  // wait for server + bundle
  const start = Date.now()
  let serverReady = false
  let bundleReady = false
  while (Date.now() - start < 60000) {
    try {
      const res = await fetch(url)
      if (res.ok) serverReady = true
    } catch (_) { /* not ready */ }
    try {
      const res = await fetch(`${url}/demo-entry.js`)
      if (res.ok && (await res.text()).includes('createRoot')) bundleReady = true
    } catch (_) { /* not ready */ }
    if (serverReady && bundleReady) break
    await sleep(500)
  }
  console.log(`serverReady=${serverReady} bundleReady=${bundleReady}`)
  if (!bundleReady) {
    console.log('ERROR: bundle not ready, exiting')
    process.exit(1)
  }

  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => console.log('PAGEERROR:', e.message))
  page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE_ERR:', m.text()) })
  await page.goto(url, { waitUntil: 'load', timeout: 30000 })
  await sleep(2000)

  // Top of page
  await page.screenshot({ path: join(OUT, '16-arch-resistivity.png'), fullPage: false })
  console.log('saved 16-arch-resistivity')

  // Click Dashboard tab
  const dashBtn = page.locator('text=Dashboard v2').first()
  if (await dashBtn.count()) {
    await dashBtn.click()
    await sleep(800)
    await page.screenshot({ path: join(OUT, '17-arch-dashboard.png'), fullPage: false })
    console.log('saved 17-arch-dashboard')
  }

  // Click Cable tab
  const cableBtn = page.locator('text=Cable v2').first()
  if (await cableBtn.count()) {
    await cableBtn.click()
    await sleep(800)
    await page.screenshot({ path: join(OUT, '18-arch-cable.png'), fullPage: false })
    console.log('saved 18-arch-cable')
  }

  await browser.close()
  console.log('DONE')
} finally {
  proc.kill('SIGTERM')
}
