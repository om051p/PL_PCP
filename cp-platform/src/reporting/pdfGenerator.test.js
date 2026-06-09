import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('jspdf', () => {
  const createMockDoc = () => {
    const mockDoc = {
      setFontSize: vi.fn(function () {
        return this
      }),
      setFont: vi.fn(function () {
        return this
      }),
      setTextColor: vi.fn(function () {
        return this
      }),
      setDrawColor: vi.fn(function () {
        return this
      }),
      setLineWidth: vi.fn(function () {
        return this
      }),
      setFillColor: vi.fn(function () {
        return this
      }),
      text: vi.fn(function () {
        return this
      }),
      line: vi.fn(function () {
        return this
      }),
      rect: vi.fn(function () {
        return this
      }),
      addPage: vi.fn(function () {
        return this
      }),
      save: vi.fn(),
    }
    return mockDoc
  }

  return {
    jsPDF: vi.fn(function () {
      return createMockDoc()
    }),
  }
})

const baseStation = {
  name: 'DS-01',
  groundbed: {
    type: 'deepwell',
    anodeLengthM: 1.016,
    anodeSpacingM: 0.1,
    startDepthM: 30,
    boreholeDiaM: 0.3,
    cokeCoverM: 5,
    cementPlugM: 2,
  },
  anodeSpec: { label: 'HSCI Tubular TA-4' },
  proposedAnodes: 8,
  soilResistivityOhmCm: 2500,
  actualRemotenesM: 800,
  requiredRemotenesM: 600,
  pipelineSegments: [
    {
      od: 48,
      wallThk: 0.5,
      lengthM: 292,
      opTempC: 57.22,
      currentDensityBase: 0.1,
    },
  ],
  cables: {
    anodeCableSizeMm2: 25,
    posMainLengthM: 400,
    posMainSizeMm2: 50,
    negMainLengthM: 400,
    negMainSizeMm2: 50,
    negSecLengthM: 50,
    negSecSizeMm2: 25,
  },
  tr: {
    ratedVoltage: 50,
    ratedCurrent: 100,
    backEMF: 2,
    structureResistance: 0.001,
  },
  lastCalcResult: {
    designCurrentA: 62.31,
    totalSurfaceAreaM2: 1118.43,
    tempCorrectedCurrentDensity: 0.1806,
    requiredCurrentA: 47.93,
    allChecksPassed: true,
    activeLengthM: 8.928,
    totalDrillDepthM: 40.744,
    groundbedResistanceOhm: 0.8118,
    maxAllowableGroundbedRes: 1.5,
    designLifeYears: 26.25,
    anodeTailParallelResOhm: 0.0394,
    posMainCableResOhm: 0.1464,
    negMainCableResOhm: 0.0146,
    totalCableResOhm: 0.2004,
    backEMFResistanceOhm: 0.0642,
    totalCircuitResistanceOhm: 1.0774,
    minTRVoltage: 69.13,
    maxCircuitRes70pct: 1.142,
    dcPowerW: 2624,
    acInputKVA: 3.29,
    acInputCurrentA: 3.96,
    checks: [
      { status: 'pass', label: 'Groundbed resistance check', computed: '0.8118 Ω ≤ 1.5000 Ω' },
      {
        status: 'pass',
        label: 'TR voltage capacity check',
        computed: '69.13 V ≤ 50.00 V × 70% = 35.00 V',
      },
      { status: 'warn', label: 'TR voltage derating check', computed: '69.13 V > 35.00 V' },
    ],
    bom: [
      {
        tag: 'AN-001',
        description: 'HSCI Tubular Anode TA-4 1.016m × 0.076m',
        unit: 'ea.',
        quantity: 8,
      },
      { tag: 'CB-001', description: 'Coke Breeze 50 lb bag', unit: 'bag', quantity: 40 },
      {
        tag: 'TR-001',
        description: 'Transformer Rectifier 50V / 100A DC',
        unit: 'ea.',
        quantity: 1,
      },
    ],
  },
}

const mockProject = {
  projectNumber: 'CP-2024-001',
  projectName: 'Gas Plant Expansion',
  clientName: 'Saudi Aramco',
  endClient: 'Aramco Chemicals',
  designer: 'J. Smith',
  currentRevision: 'REV-1',
  status: 'under_review',
  systemDesignLifeYears: 25,
  stations: [baseStation],
}

let mockDate

describe('pdfGenerator', () => {
  beforeEach(() => {
    mockDate = new Date('2026-06-09T12:00:00.000Z')
    vi.useFakeTimers()
    vi.setSystemTime(mockDate)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('generateEngineeringReport', () => {
    it('returns a jsPDF document object', async () => {
      const { generateEngineeringReport } = await import('./pdfGenerator.js')
      const doc = generateEngineeringReport(mockProject)
      expect(doc).toBeTruthy()
      expect(typeof doc).toBe('object')
    })

    it('creates a new jsPDF instance with portrait A4', async () => {
      const { jsPDF } = await import('jspdf')
      const { generateEngineeringReport } = await import('./pdfGenerator.js')
      generateEngineeringReport(mockProject)
      expect(jsPDF).toHaveBeenCalledWith({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      })
    })

    it('draws header and footer on each page', async () => {
      const { generateEngineeringReport } = await import('./pdfGenerator.js')
      const doc = generateEngineeringReport(mockProject)
      expect(doc.addPage.mock.calls.length).toBeGreaterThanOrEqual(mockProject.stations.length)
    })

    it('renders project information on the cover', async () => {
      const { generateEngineeringReport } = await import('./pdfGenerator.js')
      const doc = generateEngineeringReport(mockProject)
      const calls = doc.text.mock.calls
      const projectNumberCalls = calls.filter((c) => String(c[0]).includes('CP-2024-001'))
      expect(projectNumberCalls.length).toBeGreaterThan(0)
      const projectNameCalls = calls.filter((c) => String(c[0]).includes('Gas Plant Expansion'))
      expect(projectNameCalls.length).toBeGreaterThan(0)
    })

    it('renders the revision number on cover', async () => {
      const { generateEngineeringReport } = await import('./pdfGenerator.js')
      const doc = generateEngineeringReport(mockProject)
      const calls = doc.text.mock.calls
      const revCall = calls.find((c) => String(c[0]).includes('REV-1'))
      expect(revCall).toBeTruthy()
    })

    it('renders page numbers as "Page X of Y"', async () => {
      const { generateEngineeringReport } = await import('./pdfGenerator.js')
      const doc = generateEngineeringReport(mockProject)
      const calls = doc.text.mock.calls
      const pageNumCall = calls.find((c) => /Page \d+ of \d+/.test(String(c[0])))
      expect(pageNumCall).toBeTruthy()
    })

    it('renders the date on cover', async () => {
      const { generateEngineeringReport } = await import('./pdfGenerator.js')
      const doc = generateEngineeringReport(mockProject)
      const calls = doc.text.mock.calls
      const dateCall = calls.find((c) => String(c[0]).includes('09/06/2026'))
      expect(dateCall).toBeTruthy()
    })

    it('renders status with underscores replaced by spaces and uppercased', async () => {
      const { generateEngineeringReport } = await import('./pdfGenerator.js')
      const doc = generateEngineeringReport(mockProject)
      const calls = doc.text.mock.calls
      const statusCall = calls.find((c) => String(c[0]).includes('UNDER REVIEW'))
      expect(statusCall).toBeTruthy()
    })

    it('renders client and end client in footer', async () => {
      const { generateEngineeringReport } = await import('./pdfGenerator.js')
      const doc = generateEngineeringReport(mockProject)
      const calls = doc.text.mock.calls
      const footerClient = calls.find((c) => String(c[0]).includes('Saudi Aramco'))
      expect(footerClient).toBeTruthy()
      const footerEndClient = calls.find((c) => String(c[0]).includes('Aramco Chemicals'))
      expect(footerEndClient).toBeTruthy()
    })

    it('renders station name on station page', async () => {
      const { generateEngineeringReport } = await import('./pdfGenerator.js')
      const doc = generateEngineeringReport(mockProject)
      const calls = doc.text.mock.calls
      const stationCall = calls.find((c) => String(c[0]).includes('DS-01'))
      expect(stationCall).toBeTruthy()
    })

    it('renders calculation values for stations with lastCalcResult', async () => {
      const { generateEngineeringReport } = await import('./pdfGenerator.js')
      const doc = generateEngineeringReport(mockProject)
      const calls = doc.text.mock.calls
      const currentCall = calls.find((c) => String(c[0]).includes('62.31'))
      expect(currentCall).toBeTruthy()
    })

    it('renders validation checks for stations with checks', async () => {
      const { generateEngineeringReport } = await import('./pdfGenerator.js')
      const doc = generateEngineeringReport(mockProject)
      const calls = doc.text.mock.calls
      const passCall = calls.find((c) => String(c[0]).includes('PASS'))
      expect(passCall).toBeTruthy()
      const warnCall = calls.find((c) => String(c[0]).includes('WARN'))
      expect(warnCall).toBeTruthy()
    })

    it('renders BOM items for stations with bom', async () => {
      const { generateEngineeringReport } = await import('./pdfGenerator.js')
      const doc = generateEngineeringReport(mockProject)
      const calls = doc.text.mock.calls
      const bomCall = calls.find((c) => String(c[0]).includes('AN-001'))
      expect(bomCall).toBeTruthy()
      const bomDesc = calls.find((c) => String(c[0]).includes('HSCI Tubular Anode'))
      expect(bomDesc).toBeTruthy()
    })

    it('generates BOM page with BILL OF MATERIALS heading', async () => {
      const { generateEngineeringReport } = await import('./pdfGenerator.js')
      const doc = generateEngineeringReport(mockProject)
      const calls = doc.text.mock.calls
      const bomHeading = calls.find((c) => String(c[0]).includes('BILL OF MATERIALS'))
      expect(bomHeading).toBeTruthy()
    })

    it('renders applicable standards section', async () => {
      const { generateEngineeringReport } = await import('./pdfGenerator.js')
      const doc = generateEngineeringReport(mockProject)
      const calls = doc.text.mock.calls
      const stdCall = calls.find((c) => String(c[0]).includes('Saudi Aramco'))
      expect(stdCall).toBeTruthy()
    })

    it('renders station summary section', async () => {
      const { generateEngineeringReport } = await import('./pdfGenerator.js')
      const doc = generateEngineeringReport(mockProject)
      const calls = doc.text.mock.calls
      const summaryHeader = calls.find((c) => String(c[0]).includes('STATION SUMMARY'))
      expect(summaryHeader).toBeTruthy()
    })

    it('renders NACE references when project has designStandard="nace"', async () => {
      const naceProject = {
        ...mockProject,
        designStandard: 'nace',
      }
      const { generateEngineeringReport } = await import('./pdfGenerator.js')
      const doc = generateEngineeringReport(naceProject)
      const calls = doc.text.mock.calls
      // Should show NACE standard name (version line)
      const naceLabel = calls.find((c) => String(c[0]).includes('NACE SP0169'))
      expect(naceLabel).toBeTruthy()
      // Should show NACE standard references, not Aramco codes
      const aramcoRef = calls.find((c) => String(c[0]).includes('17-SAMSS'))
      expect(aramcoRef).toBeFalsy()
      const naceRef = calls.find((c) => String(c[0]).includes('NACE TM0108'))
      expect(naceRef).toBeTruthy()
    })

    it('renders Saudi Aramco references when project has designStandard="saudiAramco"', async () => {
      const aramcoProject = {
        ...mockProject,
        designStandard: 'saudiAramco',
      }
      const { generateEngineeringReport } = await import('./pdfGenerator.js')
      const doc = generateEngineeringReport(aramcoProject)
      const calls = doc.text.mock.calls
      const aramcoLabel = calls.find((c) => String(c[0]).includes('Saudi Aramco'))
      expect(aramcoLabel).toBeTruthy()
    })
  })

  describe('generateEngineeringReport — 0 stations', () => {
    it('handles project with zero stations', async () => {
      const project = { ...mockProject, stations: [] }
      const { generateEngineeringReport } = await import('./pdfGenerator.js')
      const doc = generateEngineeringReport(project)
      expect(doc).toBeTruthy()
      const calls = doc.text.mock.calls
      const zeroStationCall = calls.find((c) => String(c[0]).includes('0'))
      expect(zeroStationCall).toBeTruthy()
    })

    it('does not call addPage for station pages when no stations exist', async () => {
      const project = { ...mockProject, stations: [] }
      const { generateEngineeringReport } = await import('./pdfGenerator.js')
      const doc = generateEngineeringReport(project)
      expect(doc.addPage).toHaveBeenCalledTimes(0)
    })
  })

  describe('generateEngineeringReport — station with no calc result', () => {
    const noCalcStation = {
      ...baseStation,
      lastCalcResult: null,
    }

    it('renders fallback text when station has no calculation result', async () => {
      const project = { ...mockProject, stations: [noCalcStation] }
      const { generateEngineeringReport } = await import('./pdfGenerator.js')
      const doc = generateEngineeringReport(project)
      const calls = doc.text.mock.calls
      const notCalculated = calls.find((c) => String(c[0]).includes('Not Calculated'))
      expect(notCalculated).toBeTruthy()
    })

    it('renders station not calculated text on station page', async () => {
      const project = { ...mockProject, stations: [noCalcStation] }
      const { generateEngineeringReport } = await import('./pdfGenerator.js')
      const doc = generateEngineeringReport(project)
      const calls = doc.text.mock.calls
      const noCalcMsg = calls.find((c) => String(c[0]).includes('Station not calculated'))
      expect(noCalcMsg).toBeTruthy()
    })

    it('does not render validation check section when no calc result', async () => {
      const project = { ...mockProject, stations: [noCalcStation] }
      const { generateEngineeringReport } = await import('./pdfGenerator.js')
      const doc = generateEngineeringReport(project)
      const calls = doc.text.mock.calls
      const validationHeading = calls.find((c) => String(c[0]).includes('ENGINEERING VALIDATION'))
      expect(validationHeading).toBeTruthy()
      const validationMsg = calls.find((c) => String(c[0]).includes('no validation results'))
      expect(validationMsg).toBeTruthy()
    })
  })

  describe('generateEngineeringReport — BOM pages skipped when empty', () => {
    const stationEmptyBom = {
      ...baseStation,
      lastCalcResult: {
        ...baseStation.lastCalcResult,
        bom: [],
      },
    }

    it('does not create BOM pages when bom array is empty', async () => {
      const project = { ...mockProject, stations: [stationEmptyBom] }
      const { generateEngineeringReport } = await import('./pdfGenerator.js')
      const doc = generateEngineeringReport(project)
      const calls = doc.text.mock.calls
      const bomHeading = calls.find((c) => String(c[0]).includes('BILL OF MATERIALS'))
      expect(bomHeading).toBeFalsy()
    })

    it('does not create BOM pages when bom is undefined', async () => {
      const stationNoBom = {
        ...baseStation,
        lastCalcResult: {
          ...baseStation.lastCalcResult,
          bom: undefined,
        },
      }
      const project = { ...mockProject, stations: [stationNoBom] }
      const { generateEngineeringReport } = await import('./pdfGenerator.js')
      const doc = generateEngineeringReport(project)
      const calls = doc.text.mock.calls
      const bomHeading = calls.find((c) => String(c[0]).includes('BILL OF MATERIALS'))
      expect(bomHeading).toBeFalsy()
    })
  })

  describe('downloadEngineeringReport', () => {
    it('calls doc.save with a filename ending in .pdf', async () => {
      const { jsPDF } = await import('jspdf')
      const { downloadEngineeringReport } = await import('./pdfGenerator.js')
      downloadEngineeringReport(mockProject)
      expect(jsPDF.mock.results.length).toBeGreaterThan(0)
      const mockDoc = jsPDF.mock.results[0].value
      expect(mockDoc.save).toHaveBeenCalledTimes(1)
      const saveArg = mockDoc.save.mock.calls[0][0]
      expect(saveArg).toMatch(/\.pdf$/)
    })

    it('includes project number in the filename', async () => {
      const { jsPDF } = await import('jspdf')
      const { downloadEngineeringReport } = await import('./pdfGenerator.js')
      downloadEngineeringReport(mockProject)
      const mockDoc = jsPDF.mock.results[0].value
      const saveArg = mockDoc.save.mock.calls[0][0]
      expect(saveArg).toContain('CP-2024-001')
    })

    it('includes today date in the filename', async () => {
      const { jsPDF } = await import('jspdf')
      const { downloadEngineeringReport } = await import('./pdfGenerator.js')
      downloadEngineeringReport(mockProject)
      const mockDoc = jsPDF.mock.results[0].value
      const saveArg = mockDoc.save.mock.calls[0][0]
      expect(saveArg).toContain('2026-06-09')
    })

    it('generates report before saving', async () => {
      const { jsPDF } = await import('jspdf')
      const { downloadEngineeringReport } = await import('./pdfGenerator.js')
      downloadEngineeringReport(mockProject)
      const mockDoc = jsPDF.mock.results[0].value
      expect(mockDoc.save).toHaveBeenCalled()
    })
  })

  describe('generateEngineeringReport — multiple stations', () => {
    const station2 = {
      ...baseStation,
      name: 'DS-02',
      groundbed: { ...baseStation.groundbed, type: 'shallow' },
      lastCalcResult: {
        ...baseStation.lastCalcResult,
        designCurrentA: 30.12,
        checks: [
          { status: 'fail', label: 'Groundbed resistance check', computed: '2.5000 Ω ≤ 1.5000 Ω' },
        ],
        bom: [{ tag: 'AN-002', description: 'HSCI Tubular Anode', unit: 'ea.', quantity: 4 }],
      },
    }

    it('renders both station names when multiple stations exist', async () => {
      const project = { ...mockProject, stations: [baseStation, station2] }
      const { generateEngineeringReport } = await import('./pdfGenerator.js')
      const doc = generateEngineeringReport(project)
      const calls = doc.text.mock.calls
      const ds01 = calls.find((c) => String(c[0]).includes('DS-01'))
      const ds02 = calls.find((c) => String(c[0]).includes('DS-02'))
      expect(ds01).toBeTruthy()
      expect(ds02).toBeTruthy()
    })

    it('renders FAIL status for failing station in summary', async () => {
      const project = { ...mockProject, stations: [baseStation, station2] }
      const { generateEngineeringReport } = await import('./pdfGenerator.js')
      const doc = generateEngineeringReport(project)
      const calls = doc.text.mock.calls
      const failCall = calls.find((c) => String(c[0]).includes('FAIL'))
      expect(failCall).toBeTruthy()
    })

    it('renders PASS status for passing station in summary', async () => {
      const project = { ...mockProject, stations: [baseStation, station2] }
      const { generateEngineeringReport } = await import('./pdfGenerator.js')
      const doc = generateEngineeringReport(project)
      const calls = doc.text.mock.calls
      const passCall = calls.find((c) => String(c[0]).includes('PASS'))
      expect(passCall).toBeTruthy()
    })

    it('calls addPage for each station page', async () => {
      const project = { ...mockProject, stations: [baseStation, station2] }
      const { generateEngineeringReport } = await import('./pdfGenerator.js')
      const doc = generateEngineeringReport(project)
      expect(doc.addPage.mock.calls.length).toBeGreaterThanOrEqual(project.stations.length)
    })
  })

  describe('generateEngineeringReport — edge cases', () => {
    it('handles missing project fields gracefully', async () => {
      const minimalProject = {
        projectNumber: '',
        projectName: '',
        clientName: '',
        endClient: '',
        currentRevision: '',
        status: '',
        systemDesignLifeYears: 25,
        stations: [],
      }
      const { generateEngineeringReport } = await import('./pdfGenerator.js')
      const doc = generateEngineeringReport(minimalProject)
      expect(doc).toBeTruthy()
    })

    it('handles missing cable and tr fields', async () => {
      const stationNoCables = {
        ...baseStation,
        cables: {
          anodeCableSizeMm2: 25,
          posMainLengthM: 0,
          posMainSizeMm2: 0,
          negMainLengthM: 0,
          negMainSizeMm2: 0,
          negSecLengthM: 0,
          negSecSizeMm2: 0,
        },
        tr: { ratedVoltage: 0, ratedCurrent: 0, backEMF: 0, structureResistance: 0 },
      }
      const project = { ...mockProject, stations: [stationNoCables] }
      const { generateEngineeringReport } = await import('./pdfGenerator.js')
      const doc = generateEngineeringReport(project)
      expect(doc).toBeTruthy()
    })

    it('handles long BOM descriptions that should be truncated', async () => {
      const longDescStation = {
        ...baseStation,
        lastCalcResult: {
          ...baseStation.lastCalcResult,
          bom: [
            {
              tag: 'AN-LONG',
              description: 'A'.repeat(100),
              unit: 'ea.',
              quantity: 1,
            },
          ],
        },
      }
      const project = { ...mockProject, stations: [longDescStation] }
      const { generateEngineeringReport } = await import('./pdfGenerator.js')
      const doc = generateEngineeringReport(project)
      const calls = doc.text.mock.calls
      const truncatedCall = calls.find((c) => String(c[0]).endsWith('...'))
      expect(truncatedCall).toBeTruthy()
    })

    it('handles null/undefined calc values gracefully', async () => {
      const stationNullValues = {
        ...baseStation,
        lastCalcResult: {
          ...baseStation.lastCalcResult,
          designCurrentA: null,
          totalSurfaceAreaM2: null,
          checks: [],
          bom: [],
        },
      }
      const project = { ...mockProject, stations: [stationNullValues] }
      const { generateEngineeringReport } = await import('./pdfGenerator.js')
      const doc = generateEngineeringReport(project)
      const calls = doc.text.mock.calls
      const emDash = calls.find((c) => String(c[0]).includes('—'))
      expect(emDash).toBeTruthy()
    })

    it('renders deepwell vs shallow groundbed type text', async () => {
      const { generateEngineeringReport } = await import('./pdfGenerator.js')
      const doc = generateEngineeringReport(mockProject)
      const calls = doc.text.mock.calls
      const deepwellText = calls.find((c) => String(c[0]).includes('Deepwell'))
      expect(deepwellText).toBeTruthy()
    })

    it('renders "Shallow Vertical" for shallow groundbed type in summary', async () => {
      const shallowStation = {
        ...baseStation,
        name: 'SS-01',
        groundbed: { ...baseStation.groundbed, type: 'shallow' },
      }
      const project = { ...mockProject, stations: [shallowStation] }
      const { generateEngineeringReport } = await import('./pdfGenerator.js')
      const doc = generateEngineeringReport(project)
      const calls = doc.text.mock.calls
      const shallowText = calls.find((c) => String(c[0]).includes('Shallow Vertical'))
      expect(shallowText).toBeTruthy()
    })
  })

  describe('generateEngineeringReport — drawing operations', () => {
    it('calls setFillColor for brand background fills', async () => {
      const { generateEngineeringReport } = await import('./pdfGenerator.js')
      const doc = generateEngineeringReport(mockProject)
      expect(doc.setFillColor).toHaveBeenCalled()
    })

    it('calls rect to draw filled rectangles', async () => {
      const { generateEngineeringReport } = await import('./pdfGenerator.js')
      const doc = generateEngineeringReport(mockProject)
      expect(doc.rect).toHaveBeenCalled()
    })

    it('calls line to draw horizontal rules', async () => {
      const { generateEngineeringReport } = await import('./pdfGenerator.js')
      const doc = generateEngineeringReport(mockProject)
      expect(doc.line).toHaveBeenCalled()
    })

    it('calls setFontSize for text sizing', async () => {
      const { generateEngineeringReport } = await import('./pdfGenerator.js')
      const doc = generateEngineeringReport(mockProject)
      expect(doc.setFontSize).toHaveBeenCalled()
    })

    it('calls setFont for helvetica font', async () => {
      const { generateEngineeringReport } = await import('./pdfGenerator.js')
      const doc = generateEngineeringReport(mockProject)
      expect(doc.setFont).toHaveBeenCalledWith('helvetica', expect.any(String))
    })
  })
})
