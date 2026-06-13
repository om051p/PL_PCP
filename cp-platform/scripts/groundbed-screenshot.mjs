/**
 * Capture Phase C visualization screenshots.
 *
 * Starts the demo server, then drives Playwright through:
 *   - login page
 *   - C2 groundbed variants (3)
 *   - C3 cable network variants (3)
 * Saves per-section viewport PNGs.
 *
 * Run with:  node scripts/groundbed-screenshot.mjs
 * Output:    /tmp/kilo/viz-screenshots/
 */
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const OUT_DIR = '/tmp/kilo/viz-screenshots'
mkdirSync(OUT_DIR, { recursive: true })

const PORT = 4178
const url = `http://127.0.0.1:${PORT}`

function startServer() {
  const proc = spawn('node', ['scripts/groundbed-demo-serve.mjs'], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  proc.stdout.on('data', (b) => process.stdout.write(`[srv] ${b}`))
  proc.stderr.on('data', (b) => process.stderr.write(`[srv!] ${b}`))
  return proc
}

async function waitForServer(timeoutMs = 30000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url)
      if (res.ok) return
    } catch (_) { /* not ready */ }
    await sleep(200)
  }
  throw new Error('server did not become ready in time')
}

async function captureSection(page, anchor, outPath) {
  const handle = page.locator(anchor).first()
  if ((await handle.count()) === 0) return false
  await handle.scrollIntoViewIfNeeded()
  await sleep(300)
  await page.screenshot({ path: outPath, fullPage: false })
  return true
}

async function captureLogin() {
  // Spin a separate process to grab the dev server's login page
  const proc = spawn('npm', ['run', 'dev'], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: '3000' },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  try {
    // wait for dev server
    const start = Date.now()
    while (Date.now() - start < 60000) {
      try {
        const res = await fetch('http://127.0.0.1:3000/login')
        if (res.ok) break
      } catch (_) { /* not ready */ }
      await sleep(300)
    }
    const browser = await chromium.launch()
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } })
    const page = await ctx.newPage()
    await page.goto('http://127.0.0.1:3000/login', { waitUntil: 'networkidle', timeout: 20000 })
    await page.evaluate(() => document.documentElement.classList.add('dark'))
    await sleep(200)
    await page.screenshot({ path: join(OUT_DIR, '01-login-dark.png'), fullPage: true })
    await browser.close()
  } finally {
    proc.kill('SIGTERM')
  }
}

const server = startServer()
try {
  await waitForServer()
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => console.log('PAGEERROR:', e.message))
  page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE_ERR:', m.text()) })
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForSelector('.viz-groundbed, .viz-cable-network', { timeout: 10000 })
  await sleep(500)

  // Top of page = first groundbed
  await page.screenshot({ path: join(OUT_DIR, '02-groundbed-horizontal.png'), fullPage: false })
  console.log('saved 02-groundbed-horizontal')

  await captureSection(page, 'text=C2 — GroundbedVisualizer: vertical deep well', join(OUT_DIR, '03-groundbed-vertical-deep.png'))
  console.log('saved 03-groundbed-vertical-deep')

  await captureSection(page, 'text=C2 — GroundbedVisualizer: shallow vertical', join(OUT_DIR, '04-groundbed-vertical-warn.png'))
  console.log('saved 04-groundbed-vertical-warn')

  await captureSection(page, 'text=C3 — CableNetworkVisualizer: all cables within limits', join(OUT_DIR, '05-cable-network-ok.png'))
  console.log('saved 05-cable-network-ok')

  await captureSection(page, 'text=C3 — CableNetworkVisualizer: one cable in warn', join(OUT_DIR, '06-cable-network-warn.png'))
  console.log('saved 06-cable-network-warn')

  await captureSection(page, 'text=C3 — CableNetworkVisualizer: multiple cables exceed', join(OUT_DIR, '07-cable-network-fail.png'))
  console.log('saved 07-cable-network-fail')

  await captureSection(page, 'text=C4 — RightSideEngineeringPanel: Groundbed Intelligence', join(OUT_DIR, '08-side-panel-groundbed.png'))
  console.log('saved 08-side-panel-groundbed')

  await captureSection(page, 'text=C4 — RightSideEngineeringPanel: Cable Intelligence (all OK)', join(OUT_DIR, '09-side-panel-cable-ok.png'))
  console.log('saved 09-side-panel-cable-ok')

  await captureSection(page, 'text=C4 — RightSideEngineeringPanel: Cable Intelligence (one cable in warn)', join(OUT_DIR, '10-side-panel-cable-warn.png'))
  console.log('saved 10-side-panel-cable-warn')

  await captureSection(page, 'text=C4 — RightSideEngineeringPanel: Project Intelligence', join(OUT_DIR, '11-side-panel-pipeline.png'))
  console.log('saved 11-side-panel-pipeline')

  await captureSection(page, 'text=C4 — RightSideEngineeringPanel: Groundbed Intelligence', join(OUT_DIR, '12-optimized-groundbed.png'))
  console.log('saved 12-optimized-groundbed')

  await captureSection(page, 'text=C4 — RightSideEngineeringPanel: Cable Intelligence (all OK)', join(OUT_DIR, '13-optimized-cable.png'))
  console.log('saved 13-optimized-cable')

  await browser.close()
  console.log('DONE demo')
} finally {
  server.kill('SIGTERM')
}

await captureLogin().catch((e) => console.log('login capture skipped:', e.message))
console.log('DONE all')

process.exit(0)
