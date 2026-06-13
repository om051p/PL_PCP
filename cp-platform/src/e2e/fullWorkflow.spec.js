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
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()))
    page.on('pageerror', err => console.log('BROWSER EXCEPTION:', err.message))
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.clear()
      localStorage.setItem('e2e-mock-auth', 'true')
      
      const mockProject = {
        id: 'mock-e2e-project',
        projectNumber: 'PCP-BETA-001',
        clientName: 'Saudi Aramco',
        endClient: 'Saudi Aramco',
        projectName: 'Beta Release Test Project',
        designer: 'QA Engineer',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'draft',
        stations: [
          {
            id: 'mock-e2e-station',
            name: 'ICCP Station-1',
            location: 'KM 00+000',
            designMode: 'deepwell',
            pipelineSegments: [
              {
                id: 'mock-e2e-segment',
                name: '48" Gas Sales Pipeline',
                od: 48,
                wallThk: 0.875,
                lengthM: 292,
                opTempC: 57.22,
                currentDensityBase: 0.1,
                coatingType: 'fusion_bonded_epoxy',
                coatingEfficiency: 0.98,
              }
            ],
            groundbed: {
              type: 'deepwell',
              startDepthM: 15,
              anodeLengthM: 2.13,
              inactiveLenM: 1.5,
              anodeSpacingM: 1.5,
              boreholeDiaM: 0.25,
              numHoles: 1,
              cokeCoverM: 2.5,
              cementPlugM: 0.5,
            },
            anodeSpec: {
              id: 'HSCI_TA4',
              type: 'HSCI',
              label: 'High-Silicon Cast Iron Tubular TA-4',
              standard: '17-SAMSS-016',
              weightKg: 38.6,
              outputAmps: 3.56,
              consumptionRate: 0.45,
              lengthM: 2.13,
              diameterM: 0.064,
              maxCurrentDensity: 7.0,
              material: 'High-Silicon Cast Iron (14.5% Si)',
            },
            proposedAnodes: 9,
            cables: {
              anodeTailLengths: [25, 30, 35, 40, 45, 50, 55, 60, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
              anodeCableSizeMm2: 16,
              posMainLengthM: 180,
              posMainSizeMm2: 35,
              negMainLengthM: 100,
              negMainSizeMm2: 35,
              negSecLengthM: 60,
              negSecSizeMm2: 25,
            },
            tr: {
              ratedVoltage: 30,
              ratedCurrent: 25,
              backEMF: 2,
              structureResistance: 0.055,
            },
            soilResistivityOhmCm: 361,
            actualRemotenesM: 56,
            requiredRemotenesM: 20,
            designLifeYears: 25,
            status: 'draft',
            lastCalcResult: null,
            insights: [],
            alternatives: [],
          }
        ],
        revisions: [],
        currentRevision: null,
        archived: false,
        hasCalculationsMismatch: false,
        designBasis: {
          designStandard: 'saudiAramco',
          systemDesignLifeYears: 25,
          backEmfV: 2.0,
          structureResistanceOhm: 0.055,
          acInputVoltageV: 480,
          acInputPhase: 3,
          trEfficiencyPct: 80,
          trPowerFactor: 0.8,
          cokeContingencyPct: 10,
          minRemotenessDistanceM: 20,
          actualRemotenessDistanceM: 56,
          soilResistivityOhmCm: 361,
        },
        tank: {
          diameter: 30,
          currentDensity: 15,
          anodeSpacing: 1.5,
          layoutType: 'concentric',
          anodeRating: 17,
          status: 'draft',
          lastCalcResult: null,
        },
        vessel: {
          length: 8.0,
          diameter: 2.4,
          currentDensity: 30,
          anodeType: 'al_zn_in',
          anodeQty: 6,
          electrolyteResistivity: 80,
          drivingVoltageMode: 'polarized',
          status: 'draft',
          lastCalcResult: null,
        }
      }

      localStorage.setItem('cp-platform-project', JSON.stringify({
        state: {
          activeWorkspace: 'pipeline',
          projects: [mockProject],
          activeProjectId: 'mock-e2e-project',
          activeStationId: 'mock-e2e-station'
        },
        version: 6
      }))
    })
    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.locator('.app-shell')).toBeVisible({ timeout: 20000 })
  })

  test('1. Project Setup — fill project metadata', async ({ page }) => {
    await navigateTo(page, 'Design Basis')
    await expect(page.locator('.page').getByText('Client Information')).toBeVisible()

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
    await navigateTo(page, 'Engineering Report')
    await page.waitForTimeout(300)

    const pdfBtn = page.getByRole('button', { name: /download.*pdf/i })
    await expect(pdfBtn).toBeVisible()
    expect(await pdfBtn.isDisabled()).toBe(false)
  })

  test('11. Excel Export — button enabled after calculation', async ({ page }) => {
    await runFullCalculation(page)
    await navigateTo(page, 'Engineering Report')
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
