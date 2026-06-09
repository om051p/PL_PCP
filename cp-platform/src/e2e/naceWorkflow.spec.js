import { test, expect } from '@playwright/test'

test.describe('NACE SP0169 — Full Engineering Workflow', () => {
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

  async function selectDesignStandard(page, standardLabel) {
    const standardSelect = page.locator('.field').filter({ hasText: 'Design Standard' }).locator('select')
    await standardSelect.selectOption({ label: standardLabel })
    await page.waitForTimeout(300)
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

  test('1. Project Setup — switch to NACE and verify badge', async ({ page }) => {
    await expect(page.getByText('Project Setup').first()).toBeVisible()

    // Fill project metadata
    await field(page, 'Project Number').fill('NACE-E2E-001')
    await field(page, 'Client Name').fill('Test Client')
    await field(page, 'Project Name').fill('NACE End-to-End Test')

    // Switch to NACE SP0169
    await selectDesignStandard(page, 'NACE SP0169')
    await page.waitForTimeout(300)

    // Verify the StandardBadge in the TopBar shows NACE
    const badge = page.locator('.standard-badge').first()
    await expect(badge).toBeVisible()
    await expect(badge).toContainText('NACE SP0169')

    // Verify badge shows the version
    await expect(badge).toContainText('NACE SP0169-2013')

    // Verify persisted
    await expect(field(page, 'Project Number')).toHaveValue('NACE-E2E-001')
    await expect(field(page, 'Client Name')).toHaveValue('Test Client')
  })

  test('2. Pipeline Parameters — fill NACE-relevant values', async ({ page }) => {
    await navigateTo(page, 'Pipeline Parameters')
    await page.waitForTimeout(200)

    // Fill pipeline parameters — use values where NACE and Aramco differ
    await field(page, 'Outside Diameter').fill('8')
    await field(page, 'Section Length').fill('5000')
    await field(page, 'Operating Temperature').fill('50')
    await field(page, 'Base Current Density').fill('0.05')

    // Set soil conditions
    await field(page, 'Soil Resistivity').fill('3000')
    await field(page, 'Actual Groundbed Distance').fill('50')

    // Verify surface area is computed
    const surfaceArea = resultValue(page, 'Surface Area')
    await expect(surfaceArea).toBeVisible()
    const saText = await surfaceArea.textContent()
    expect(getNumber(saText)).toBeGreaterThan(3000)
  })

  test('3. Current Requirement — NACE formula and badge visible', async ({ page }) => {
    // First switch to NACE and set pipeline params
    await selectDesignStandard(page, 'NACE SP0169')
    await page.waitForTimeout(200)

    await navigateTo(page, 'Pipeline Parameters')
    await page.waitForTimeout(200)
    await field(page, 'Outside Diameter').fill('8')
    await field(page, 'Section Length').fill('5000')
    await field(page, 'Operating Temperature').fill('50')
    await field(page, 'Base Current Density').fill('0.05')
    await field(page, 'Soil Resistivity').fill('3000')
    await field(page, 'Actual Groundbed Distance').fill('50')

    await navigateTo(page, 'Current Requirement')
    await page.waitForTimeout(200)

    // Verify StandardBadge shows NACE
    const badge = page.locator('.standard-badge').first()
    await expect(badge).toBeVisible()
    await expect(badge).toContainText('NACE SP0169')

    // Verify the DesignStandardInfoBox shows NACE formula
    const infoBox = page.locator('.info-box--info')
    await expect(infoBox).toBeVisible()
    // NACE uses LINEAR temp correction
    await expect(infoBox).toContainText('Linear')
    // NACE formula
    await expect(infoBox).toContainText('i_T = i_base × [1 + (T − 25) × 0.025]')
    // NACE spare factor (25%)
    await expect(infoBox).toContainText('+25%')

    // Calculate
    const calcBtn = page.getByRole('button', { name: 'Calculate', exact: true })
    await expect(calcBtn).toBeVisible()
    await calcBtn.click()
    await page.waitForTimeout(1500)

    // Verify results appeared
    const requiredRow = resultValue(page, 'Required Current')
    await expect(requiredRow).toBeVisible({ timeout: 5000 })
    const req = getNumber(await requiredRow.textContent())
    expect(req).toBeGreaterThan(0)

    const designRow = resultValue(page, 'Design Current')
    await expect(designRow).toBeVisible()
  })

  test('4. Groundbed Design — NACE results and badge', async ({ page }) => {
    await selectDesignStandard(page, 'NACE SP0169')
    await page.waitForTimeout(200)

    // Fill pipeline data and calculate
    await navigateTo(page, 'Pipeline Parameters')
    await page.waitForTimeout(200)
    await field(page, 'Outside Diameter').fill('8')
    await field(page, 'Section Length').fill('5000')
    await field(page, 'Operating Temperature').fill('50')
    await field(page, 'Base Current Density').fill('0.05')
    await field(page, 'Soil Resistivity').fill('3000')
    await field(page, 'Actual Groundbed Distance').fill('50')

    await runFullCalculation(page)

    await navigateTo(page, 'Groundbed Design')
    await page.waitForTimeout(200)

    // Verify StandardBadge shows NACE
    const badge = page.locator('.standard-badge').first()
    await expect(badge).toContainText('NACE SP0169')

    // Verify groundbed results
    const rgRow = resultValue(page, 'Groundbed Resistance')
    await expect(rgRow).toBeVisible({ timeout: 5000 })
    const rg = getNumber(await rgRow.textContent())
    expect(rg).toBeGreaterThan(0)
    expect(rg).toBeLessThan(10)

    const lifeRow = resultValue(page, 'Design Life').first()
    await expect(lifeRow).toBeVisible()
    const life = getNumber(await lifeRow.textContent())
    expect(life).toBeGreaterThan(0)
  })

  test('5. TR Sizing — NACE circuit analysis and badge', async ({ page }) => {
    await selectDesignStandard(page, 'NACE SP0169')
    await page.waitForTimeout(200)

    await navigateTo(page, 'Pipeline Parameters')
    await page.waitForTimeout(200)
    await field(page, 'Outside Diameter').fill('8')
    await field(page, 'Section Length').fill('5000')
    await field(page, 'Operating Temperature').fill('50')
    await field(page, 'Base Current Density').fill('0.05')
    await field(page, 'Soil Resistivity').fill('3000')
    await field(page, 'Actual Groundbed Distance').fill('50')

    // Set TR ratings
    await navigateTo(page, 'TR Sizing')
    await page.waitForTimeout(200)
    await field(page, 'Rated DC Voltage').fill('48')
    await field(page, 'Rated DC Current').fill('24')

    // Now run full calculation pipeline
    await navigateTo(page, 'Current Requirement')
    const calcBtn = page.getByRole('button', { name: 'Calculate', exact: true })
    await calcBtn.click()
    await page.waitForTimeout(1500)

    await navigateTo(page, 'TR Sizing')
    await page.waitForTimeout(200)

    // Verify badge
    const badge = page.locator('.standard-badge').first()
    await expect(badge).toContainText('NACE SP0169')

    // Analyse circuit
    const analyseBtn = page.getByRole('button', { name: /analyse/i })
    if (await analyseBtn.isVisible()) {
      await analyseBtn.click()
      await page.waitForTimeout(1500)
    }

    const vminRow = resultValue(page, 'Minimum TR Voltage')
    await expect(vminRow).toBeVisible({ timeout: 5000 })
    const vmin = getNumber(await vminRow.textContent())
    expect(vmin).toBeGreaterThan(0)

    const rtRow = resultValue(page, 'Total Circuit Resistance')
    await expect(rtRow).toBeVisible()
  })

  test('6. Validation — NACE checks pass', async ({ page }) => {
    await selectDesignStandard(page, 'NACE SP0169')
    await page.waitForTimeout(200)

    await navigateTo(page, 'Pipeline Parameters')
    await page.waitForTimeout(200)
    await field(page, 'Outside Diameter').fill('8')
    await field(page, 'Section Length').fill('5000')
    await field(page, 'Operating Temperature').fill('50')
    await field(page, 'Base Current Density').fill('0.05')
    await field(page, 'Soil Resistivity').fill('3000')
    await field(page, 'Actual Groundbed Distance').fill('50')

    await navigateTo(page, 'TR Sizing')
    await page.waitForTimeout(200)
    await field(page, 'Rated DC Voltage').fill('48')
    await field(page, 'Rated DC Current').fill('24')

    await runFullCalculation(page)

    await navigateTo(page, 'Validation')
    await page.waitForTimeout(300)

    // Verify badge
    const badge = page.locator('.standard-badge').first()
    await expect(badge).toContainText('NACE SP0169')

    // Checks should be visible
    const passCount = await page.locator('.check-row--pass').count()
    const failCount = await page.locator('.check-row--fail').count()
    expect(passCount).toBeGreaterThan(0)
    expect(failCount).toBe(0)
  })

  test('7. Summary Report — NACE badge and export buttons', async ({ page }) => {
    await selectDesignStandard(page, 'NACE SP0169')
    await page.waitForTimeout(200)

    await navigateTo(page, 'Pipeline Parameters')
    await page.waitForTimeout(200)
    await field(page, 'Outside Diameter').fill('8')
    await field(page, 'Section Length').fill('5000')
    await field(page, 'Operating Temperature').fill('50')
    await field(page, 'Base Current Density').fill('0.05')
    await field(page, 'Soil Resistivity').fill('3000')
    await field(page, 'Actual Groundbed Distance').fill('50')

    await navigateTo(page, 'TR Sizing')
    await page.waitForTimeout(200)
    await field(page, 'Rated DC Voltage').fill('48')
    await field(page, 'Rated DC Current').fill('24')

    await runFullCalculation(page)

    await navigateTo(page, 'Summary Report')
    await page.waitForTimeout(300)

    // Verify badge on report page
    const badge = page.locator('.standard-badge').first()
    await expect(badge).toContainText('NACE SP0169')

    // Verify PDF export button is enabled
    const pdfBtn = page.getByRole('button', { name: /download.*pdf/i })
    await expect(pdfBtn).toBeVisible()
    expect(await pdfBtn.isDisabled()).toBe(false)

    // Verify Excel export button is visible
    const excelBtn = page.getByRole('button', { name: /export.*excel/i })
    await expect(excelBtn).toBeVisible()
  })

  test('8. BOM Generation — NACE references in BOM after approval', async ({ page }) => {
    await selectDesignStandard(page, 'NACE SP0169')
    await page.waitForTimeout(200)

    await navigateTo(page, 'Pipeline Parameters')
    await page.waitForTimeout(200)
    await field(page, 'Outside Diameter').fill('8')
    await field(page, 'Section Length').fill('5000')
    await field(page, 'Operating Temperature').fill('50')
    await field(page, 'Base Current Density').fill('0.05')
    await field(page, 'Soil Resistivity').fill('3000')
    await field(page, 'Actual Groundbed Distance').fill('50')

    await navigateTo(page, 'TR Sizing')
    await page.waitForTimeout(200)
    await field(page, 'Rated DC Voltage').fill('48')
    await field(page, 'Rated DC Current').fill('24')

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

    // Verify BOM is rendered
    const bomEntries = page.locator('.bom-table .bom-row')
    const count = await bomEntries.count()
    expect(count).toBeGreaterThan(0)
  })

  test('9. StandardBadge visible on all engineering pages', async ({ page }) => {
    await selectDesignStandard(page, 'NACE SP0169')
    await page.waitForTimeout(200)

    const checkBadgeOnPage = async (pageName) => {
      await navigateTo(page, pageName)
      await page.waitForTimeout(200)
      const badge = page.locator('.standard-badge').first()
      await expect(badge).toBeVisible()
      await expect(badge).toContainText('NACE SP0169')
    }

    // Check badge on all engineering pages
    await checkBadgeOnPage('Current Requirement')
    await checkBadgeOnPage('Groundbed Design')
    await checkBadgeOnPage('Cable Resistance')
    await checkBadgeOnPage('TR Sizing')
    await checkBadgeOnPage('Validation')
    await checkBadgeOnPage('Design Optimizer')
    await checkBadgeOnPage('Bill of Materials')
    await checkBadgeOnPage('Summary Report')
  })
})
