import { chromium } from 'playwright'

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } })
const page = await ctx.newPage()
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message))
await page.goto('http://127.0.0.1:3000/login', { waitUntil: 'networkidle', timeout: 20000 })
await page.evaluate(() => document.documentElement.classList.add('dark'))
await page.waitForTimeout(300)
await page.screenshot({ path: '/tmp/kilo/viz-screenshots/14-live-app-login.png', fullPage: true })
console.log('saved 14-live-app-login')
await browser.close()
