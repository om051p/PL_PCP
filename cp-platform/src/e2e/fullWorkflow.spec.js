import { test, expect } from '@playwright/test'

test.describe('CP Platform — Full Engineering Workflow', () => {
  function field(page, label) {
    return page.locator('.field').filter({ hasText: label }).locator('.field-input, select')
  }

  function resultValue(page, label) {
    return page.locator('.result-row').filter({ hasText: label }).locator('.result-val')
  }

  function getNumber(text) {
    const m = String(text).match(/[-\d.]+/)
    return m ? parseFloat(m[0]) : NaN
  }

  async function navigateTo(page, pageName) {
    const link = page.locator('.sidebar').getByText(pageName)
    if (await link.isVisible()) {
      await link.click()
    } else {
      const toggle = page.locator('.sidebar-toggle')
      if (await toggle.isVisible()) {
        await toggle.click()
        await page.waitForTimeout(200)
      }
      await page.locator('.sidebar').getByText(pageName).click()
    }
    await page.waitForTimeout(400)
  }

  async function runFullCalculation(page) {
    await navigateTo(page, 'Current Requirement')
    const calcBtn = page.getByRole('button', { name: 'Calculate', exact: true })
    if (await calcBtn.isVisible()) {
      await calcBtn.click()
      await page.waitForTimeout(1500)
    }

    await navigateTo(page, 'TR Sizing')
    const analyseBtn = page.getByRole('button', { name: /analyse/i })
    if (await analyseBtn.isVisible()) {
      await analyseBtn.click()
      await page.waitForTimeout(1500)
    }

    await navigateTo(page, 'Groundbed Design')
    const runBtn = page.getByRole('button', { name: /run calculations/i })
    if (await runBtn.isVisible()) {
      await runBtn.click()
      await page.waitForTimeout(1500)
    }
  }

  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.clear()
    })
    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.locator('.app-shell')).toBeVisible({ timeout: 20000 })
  })

  test('1. Project Setup — fill project metadata', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Project Setup' })).toBeVisible()

    await field(page, 'Project Number').fill('PCP-BETA-001')
    await field(page, 'Client Name').fill('Saudi Aramco')
    await field(page, 'End Client').fill('Saudi Aramco')
    await field(page, 'Project Name').fill('Beta Release Test Project')
    await field(page, 'Designer').fill('QA Engineer')

    await expect(field(page, 'Project Number')).toHaveValue('PCP-BETA-001')
    await expect(field(page, 'Client Name')).toHaveValue('Saudi Aramco')
    await expect(field(page, 'Project Name')).toHaveValue('Beta Release Test Project')
  })

  test('2. Add Station — creates new station tab', async ({ page }) => {
    await navigateTo(page, 'Pipeline Parameters')
    await page.waitForTimeout(200)

    const initialCount = await page.locator('.station-tab:not(.station-tab--add)').count()

    await page.locator('.station-tab--add').click()
    await page.waitForTimeout(300)

    const newCount = await page.locator('.station-tab:not(.station-tab--add)').count()
    expect(newCount).toBe(initialCount + 1)
  })

  test('3. Pipeline Parameters — fill and verify surface area', async ({ page }) => {
    await navigateTo(page, 'Pipeline Parameters')
    await page.waitForTimeout(200)

    await field(page, 'Outside Diameter').fill('48')
    await field(page, 'Section Length').fill('292')
    await field(page, 'Operating Temperature').fill('57.22')
    await field(page, 'Base Current Density').fill('0.1')

    const surfaceArea = resultValue(page, 'Surface Area')
    await expect(surfaceArea).toBeVisible()
    const saText = await surfaceArea.textContent()
    expect(getNumber(saText)).toBeGreaterThan(1000)
  })

  test('4. Current Requirement — calculate and verify', async ({ page }) => {
    await navigateTo(page, 'Current Requirement')
    await page.waitForTimeout(200)

    const calcBtn = page.getByRole('button', { name: 'Calculate', exact: true })
    await expect(calcBtn).toBeVisible()
    await calcBtn.click()
    await page.waitForTimeout(1500)

    const requiredRow = resultValue(page, 'Required Current')
    await expect(requiredRow).toBeVisible({ timeout: 5000 })
    const req = getNumber(await requiredRow.textContent())
    expect(req).toBeGreaterThan(0)

    const designRow = resultValue(page, 'Design Current')
    await expect(designRow).toBeVisible()
    const des = getNumber(await designRow.textContent())
    expect(des).toBeGreaterThan(req)
  })

  test('5. Groundbed Design — run and verify resistance', async ({ page }) => {
    await runFullCalculation(page)
    await navigateTo(page, 'Groundbed Design')
    await page.waitForTimeout(200)

    const rgRow = resultValue(page, 'Groundbed Resistance')
    await expect(rgRow).toBeVisible({ timeout: 5000 })
    const rg = getNumber(await rgRow.textContent())
    expect(rg).toBeGreaterThan(0)
    expect(rg).toBeLessThan(10)

    const lifeRow = resultValue(page, 'Design Life').first()
    await expect(lifeRow).toBeVisible()
    const life = getNumber(await lifeRow.textContent())
    expect(life).toBeGreaterThan(0)
    expect(life).toBeLessThan(100)
  })

  test('6. TR Sizing — analyse circuit and verify V_min', async ({ page }) => {
    await runFullCalculation(page)
    await navigateTo(page, 'TR Sizing')
    await page.waitForTimeout(200)

    const vminRow = resultValue(page, 'Minimum TR Voltage')
    await expect(vminRow).toBeVisible({ timeout: 5000 })
    const vmin = getNumber(await vminRow.textContent())
    expect(vmin).toBeGreaterThan(0)
    expect(vmin).toBeLessThan(50)

    const rtRow = resultValue(page, 'Total Circuit Resistance')
    await expect(rtRow).toBeVisible()
  })

  test('7. Validation — all checks PASS', async ({ page }) => {
    await runFullCalculation(page)
    await navigateTo(page, 'Validation')
    await page.waitForTimeout(300)

    const passCount = await page.locator('.check-row--pass').count()
    const failCount = await page.locator('.check-row--fail').count()
    expect(passCount).toBeGreaterThan(0)
    expect(failCount).toBe(0)
  })

  test('8. Design Optimizer — alternatives generated', async ({ page }) => {
    await runFullCalculation(page)
    await navigateTo(page, 'Design Optimizer')
    await page.waitForTimeout(300)

    const altCards = page.locator('.alt-card')
    await expect(altCards.first()).toBeVisible({ timeout: 5000 })
    const altCount = await altCards.count()
    expect(altCount).toBeGreaterThanOrEqual(2)

    const applyBtn = page.getByRole('button', { name: /apply this design/i })
    if (await applyBtn.isVisible()) {
      const secondAlt = altCards.nth(1)
      await secondAlt.click()
      await page.waitForTimeout(200)
      await applyBtn.click()
      await page.waitForTimeout(800)
    }
  })

  test('9. BOM Generation — items displayed after approval', async ({ page }) => {
    await runFullCalculation(page)
    await navigateTo(page, 'Validation')
    await page.waitForTimeout(200)
    const approveBtn = page.getByRole('button', { name: /approve/i })
    if (await approveBtn.isVisible()) {
      await approveBtn.click()
      await page.waitForTimeout(500)
    }

    await navigateTo(page, 'Bill of Materials')
    await page.waitForTimeout(300)

    const bomEntries = page.locator('.bom-table tr, .tag, .bom-row')
    const count = await bomEntries.count()
    expect(count).toBeGreaterThan(0)
  })

  test('10. PDF Export — button enabled after calculation', async ({ page }) => {
    await runFullCalculation(page)
    await navigateTo(page, 'Summary Report')
    await page.waitForTimeout(300)

    const pdfBtn = page.getByRole('button', { name: /download.*pdf/i })
    await expect(pdfBtn).toBeVisible()
    expect(await pdfBtn.isDisabled()).toBe(false)
  })

  test('11. Excel Export — button enabled after calculation', async ({ page }) => {
    await runFullCalculation(page)
    await navigateTo(page, 'Summary Report')
    await page.waitForTimeout(300)

    const excelBtn = page.getByRole('button', { name: /export.*excel/i })
    await expect(excelBtn).toBeVisible()
    expect(await excelBtn.isDisabled()).toBe(false)
  })

  test('12. Excel Import — drop zone visible', async ({ page }) => {
    await navigateTo(page, 'Import Excel')
    await page.waitForTimeout(300)

    const dropZone = page.locator('.drop-zone')
    await expect(dropZone).toBeVisible({ timeout: 5000 })
    await expect(dropZone).toContainText(/Drop.*Excel/i)
  })
})
