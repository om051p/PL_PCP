import { chromium } from '@playwright/test'
import { spawn } from 'node:child_process'

async function main() {
  console.log('Starting Vite dev server...')
  const devServer = spawn('npm', ['run', 'dev'], {
    stdio: 'pipe',
    shell: true
  })

  // Wait for server to start
  await new Promise((resolve) => {
    devServer.stdout.on('data', (data) => {
      const output = data.toString()
      console.log('VITE:', output.trim())
      if (output.includes('Local:') || output.includes('localhost:')) {
        resolve()
      }
    })
  })

  console.log('Launching browser...')
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  page.on('console', (msg) => {
    console.log(`[BROWSER CONSOLE] [${msg.type()}] ${msg.text()}`)
  })

  page.on('pageerror', (err) => {
    console.error(`[BROWSER ERROR] ${err.stack}`)
  })

  console.log('Running test setup...')
  try {
    await page.goto('http://localhost:3000/')
    await page.evaluate(() => {
      localStorage.clear()
      localStorage.setItem('e2e-mock-auth', 'true')
    })
    console.log('Reloading page...')
    await page.reload()
    await page.waitForLoadState('networkidle')
    console.log('Waiting 5 seconds...')
    await page.waitForTimeout(5000)

    const content = await page.locator('#root').innerHTML()
    console.log('--- ROOT HTML CONTENT ---')
    console.log(content)
    console.log('-------------------------')
  } catch (err) {
    console.error('Test execution failed:', err.message)
  }

  console.log('Closing browser and server...')
  await browser.close()
  devServer.kill()
  process.exit(0)
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
