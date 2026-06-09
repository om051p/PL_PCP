import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('xlsx', () => {
  const mockBooks = []
  let currentMockBook = null

  return {
    utils: {
      book_new: vi.fn(() => {
        const book = { SheetNames: [], Sheets: {}, _aoaData: {} }
        mockBooks.push(book)
        return book
      }),
      aoa_to_sheet: vi.fn((data) => ({ _data: data, '!cols': undefined })),
      book_append_sheet: vi.fn((wb, ws, name) => {
        wb.SheetNames.push(name)
        wb.Sheets[name] = ws
        wb._aoaData[name] = ws._data
      }),
      sheet_to_json: vi.fn((sheet, _opts) => sheet._data || []),
    },
    read: vi.fn(() => currentMockBook),
    writeFile: vi.fn(),
    __setMockBook: (book) => {
      currentMockBook = book
    },
    __getMockBooks: () => mockBooks,
    __reset: () => {
      mockBooks.length = 0
      currentMockBook = null
    },
  }
})

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'mock-uuid'),
}))

import * as XLSX from 'xlsx'
import { ANODE_SPECS } from '../constants/index.js'
const { exportToExcel, importFromExcel } = await import('./excelEngine.js')

function makeProject(opts = {}) {
  const { withResult = true, withRevisions = true, stationCount = 1 } = opts
  const stations = Array.from({ length: stationCount }, (_, i) => ({
    id: `station-${i + 1}`,
    name: `Station-${i + 1}`,
    location: '',
    designMode: 'deepwell',
    status: 'calculated',
    pipelineSegments: [
      {
        id: `seg-${i + 1}`,
        name: '48" Pipeline',
        od: 48,
        wallThk: 0.875,
        lengthM: 1000,
        opTempC: 25,
        currentDensityBase: 0.1,
        coatingType: 'fusion_bonded_epoxy',
        coatingEfficiency: 0.98,
      },
    ],
    groundbed: {
      type: 'deepwell',
      startDepthM: 15,
      inactiveLenM: 0,
      anodeLengthM: 2.13,
      anodeSpacingM: 1.5,
      boreholeDiaM: 0.25,
      numHoles: 1,
      cokeCoverM: 2.5,
      cementPlugM: 0.5,
    },
    anodeSpec: { ...ANODE_SPECS.HSCI_TA4 },
    proposedAnodes: 9,
    cables: {
      anodeTailLengths: Array(20).fill(30),
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
    soilResistivityOhmCm: 500,
    actualRemotenesM: 56,
    requiredRemotenesM: 20,
    designLifeYears: 25,
    lastCalcResult: withResult
      ? {
          totalSurfaceAreaM2: 1118.43,
          tempCorrectedCurrentDensity: 0.18055,
          requiredCurrentA: 0.1979,
          designCurrentA: 0.2573,
          activeLengthM: 31.17,
          totalDrillDepthM: 49.17,
          groundbedResistanceOhm: 0.1135,
          maxAllowableGroundbedRes: 0.5,
          anodeTailParallelResOhm: 0.007627,
          posMainCableResOhm: 0.1186,
          negMainCableResOhm: 0.08,
          totalCableResOhm: 0.2553,
          backEMFResistanceOhm: 0.05,
          totalCircuitResistanceOhm: 0.5839,
          minTRVoltage: 16.6,
          maxCircuitRes70pct: 0.4,
          maxCircuitRes90pct: 0.5,
          designLifeYears: 26.25,
          targetDesignLifeYears: 25,
          dcPowerW: 200,
          acInputKVA: 0.25,
          acInputCurrentA: 0.7,
          allChecksPassed: true,
          checks: [
            { label: 'Resistance Check', status: 'pass', computed: 0.5839 },
            { label: 'Voltage Check', status: 'pass', computed: 16.6 },
          ],
          bom: [
            { tag: 'TRU', description: 'TR Unit', standard: 'STD-001', unit: 'ea', quantity: 1 },
            { tag: 'ANODE', description: 'Anode TA-4', standard: '', unit: 'ea', quantity: 9 },
          ],
        }
      : null,
    insights: [],
    alternatives: [],
  }))

  return {
    id: 'mock-uuid',
    projectNumber: 'PRJ-001',
    projectName: 'Test Project',
    clientName: 'Test Client',
    endClient: 'End Client',
    designer: 'Engineer',
    currentRevision: 'REV-0',
    status: 'approved',
    systemDesignLifeYears: 25,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    revisions: withRevisions
      ? [
          {
            revNumber: 'REV-0',
            description: 'Initial design',
            createdAt: '2025-06-09T10:00:00.000Z',
            createdBy: 'Engineer',
            status: 'approved',
          },
        ]
      : [],
    stations,
  }
}

function makeMockWorkbook(sheets) {
  const wb = { SheetNames: [], Sheets: {} }
  for (const [name, data] of Object.entries(sheets)) {
    wb.SheetNames.push(name)
    wb.Sheets[name] = { _data: data }
  }
  return wb
}

describe('exportToExcel', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-06-09T12:00:00.000Z'))
    XLSX.__reset()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('creates workbook with Summary, station, BOM, and Revisions sheets', () => {
    const project = makeProject()
    exportToExcel(project)
    const wb = XLSX.__getMockBooks()[0]

    expect(XLSX.utils.book_new).toHaveBeenCalledOnce()
    expect(XLSX.writeFile).toHaveBeenCalledOnce()
    expect(wb.SheetNames).toEqual(['Summary', 'Station-1', 'BOM', 'Revisions'])
    expect(XLSX.utils.book_append_sheet).toHaveBeenCalledTimes(4)
  })

  it('calls writeFile with correct filename', () => {
    const project = makeProject()
    exportToExcel(project)
    expect(XLSX.writeFile).toHaveBeenCalledWith(
      expect.any(Object),
      'PRJ-001_Calculation_2025-06-09.xlsx',
    )
  })

  it('uses CP_ prefix when projectNumber is empty', () => {
    const project = makeProject()
    project.projectNumber = ''
    exportToExcel(project)
    expect(XLSX.writeFile).toHaveBeenCalledWith(
      expect.any(Object),
      'CP_Calculation_2025-06-09.xlsx',
    )
  })

  it('handles empty stations array', () => {
    const project = makeProject({ stationCount: 0, withRevisions: false })
    exportToExcel(project)
    const wb = XLSX.__getMockBooks()[0]

    expect(wb.SheetNames).toContain('Summary')
    expect(wb.SheetNames).toContain('BOM')
    expect(wb.SheetNames).not.toContain('Revisions')
    expect(wb.SheetNames).toHaveLength(2)

    const summaryAoa = wb._aoaData.Summary
    const row = summaryAoa.find((r) => r[0] === 'No. of Stations')
    expect(row[1]).toBe(0)
  })

  it('handles stations without calc results', () => {
    const project = makeProject({ withResult: false })
    exportToExcel(project)
    const wb = XLSX.__getMockBooks()[0]
    const stationAoa = wb._aoaData['Station-1']

    expect(stationAoa.some((r) => r[0] === 'Station not calculated yet.')).toBe(true)

    const summaryAoa = wb._aoaData.Summary
    const stationRow = summaryAoa.find((r) => r[0] === 'Station-1')
    expect(stationRow[2]).toBe('')
    expect(stationRow[4]).toBe('')
    expect(stationRow[7]).toBe('NOT CALCULATED')
  })

  it('skips Revisions sheet when project has no revisions', () => {
    const project = makeProject({ withRevisions: false })
    exportToExcel(project)
    const wb = XLSX.__getMockBooks()[0]

    expect(wb.SheetNames).not.toContain('Revisions')
    expect(wb.SheetNames).toEqual(['Summary', 'Station-1', 'BOM'])
  })

  it('includes deepwell-specific rows in station sheet', () => {
    const project = makeProject()
    exportToExcel(project)
    const wb = XLSX.__getMockBooks()[0]
    const stationAoa = wb._aoaData['Station-1']

    expect(stationAoa.some((r) => r[0] === 'Coke Cover')).toBe(true)
    expect(stationAoa.some((r) => r[0] === 'Cement Plug')).toBe(true)
  })

  it('omits coke/cement rows for shallow_vertical groundbed', () => {
    const project = makeProject()
    project.stations[0].groundbed.type = 'shallow_vertical'
    exportToExcel(project)
    const wb = XLSX.__getMockBooks()[0]
    const stationAoa = wb._aoaData['Station-1']

    expect(stationAoa.some((r) => r[0] === 'Coke Cover')).toBe(false)
    expect(stationAoa.some((r) => r[0] === 'Cement Plug')).toBe(false)
  })

  it('includes BOM items when calc result has BOM', () => {
    const project = makeProject()
    exportToExcel(project)
    const wb = XLSX.__getMockBooks()[0]
    const bomAoa = wb._aoaData.BOM

    expect(bomAoa.some((r) => r[0] === 'Station-1' && r[1] === 'TRU')).toBe(true)
    expect(bomAoa.some((r) => r[0] === 'Station-1' && r[1] === 'ANODE')).toBe(true)
  })

  it('includes validation checks in station sheet', () => {
    const project = makeProject()
    exportToExcel(project)
    const wb = XLSX.__getMockBooks()[0]
    const stationAoa = wb._aoaData['Station-1']

    expect(stationAoa.some((r) => r[0] === 'VALIDATION CHECKS')).toBe(true)
    expect(stationAoa.some((r) => r[0] === 'Resistance Check')).toBe(true)
    expect(stationAoa.some((r) => r[0] === 'Voltage Check')).toBe(true)
  })

  it('sanitizes station names for sheet names', () => {
    const project = makeProject()
    project.stations[0].name = 'Station [1] : Test/?*'
    exportToExcel(project)
    const wb = XLSX.__getMockBooks()[0]

    expect(wb.SheetNames).toContain('Station 1  Test')
    expect(wb.SheetNames).not.toContain('Station [1] : Test/?*')
  })

  it('truncates station sheet names to 28 characters', () => {
    const project = makeProject()
    project.stations[0].name = 'A'.repeat(50)
    exportToExcel(project)
    const wb = XLSX.__getMockBooks()[0]

    const sheetName = wb.SheetNames.find((n) => n.startsWith('AAA'))
    expect(sheetName).toHaveLength(28)
  })

  it('writes revision history data correctly', () => {
    const project = makeProject()
    exportToExcel(project)
    const wb = XLSX.__getMockBooks()[0]
    const revAoa = wb._aoaData.Revisions

    expect(revAoa[0]).toEqual(['REVISION HISTORY'])
    expect(revAoa[2]).toEqual(['Rev No.', 'Description', 'Date', 'By', 'Status'])
    expect(revAoa[3]).toEqual(['REV-0', 'Initial design', '2025-06-09', 'Engineer', 'approved'])
  })

  it('writes summary with correct station data', () => {
    const project = makeProject()
    exportToExcel(project)
    const wb = XLSX.__getMockBooks()[0]
    const summaryAoa = wb._aoaData.Summary

    expect(summaryAoa[2]).toEqual(['Project Number', 'PRJ-001'])
    expect(summaryAoa[3]).toEqual(['Project Name', 'Test Project'])
    expect(summaryAoa[4]).toEqual(['Client', 'Test Client'])
    expect(summaryAoa[9]).toEqual(['Revision', 'REV-0'])
    expect(summaryAoa[10]).toEqual(['Status', 'approved'])
    expect(summaryAoa[11]).toEqual(['Design Life', '25 years'])
    expect(summaryAoa[12]).toEqual(['No. of Stations', 1])
    expect(summaryAoa[15]).toEqual(['Station-1', 'Deepwell', 0.257, 9, 0.1135, 26.3, 16.6, 'PASS'])
  })

  it('formats status by replacing underscores with spaces', () => {
    const project = makeProject()
    project.status = 'issued_for_construction'
    exportToExcel(project)
    const wb = XLSX.__getMockBooks()[0]
    const summaryAoa = wb._aoaData.Summary

    expect(summaryAoa[10]).toEqual(['Status', 'issued for construction'])
  })

  it('shows "NACE SP0169" in Design Standard row when nace standard selected', () => {
    const project = makeProject()
    project.designStandard = 'nace'
    exportToExcel(project)
    const wb = XLSX.__getMockBooks()[0]
    const summaryAoa = wb._aoaData.Summary
    const stdRow = summaryAoa.find((r) => String(r[0]).includes('Design Standard'))
    expect(stdRow).toBeTruthy()
    expect(String(stdRow[1])).toContain('NACE SP0169')
  })

  it('shows "Saudi Aramco" in Design Standard row when saudiAramco standard selected', () => {
    const project = makeProject()
    project.designStandard = 'saudiAramco'
    exportToExcel(project)
    const wb = XLSX.__getMockBooks()[0]
    const summaryAoa = wb._aoaData.Summary
    const stdRow = summaryAoa.find((r) => String(r[0]).includes('Design Standard'))
    expect(stdRow).toBeTruthy()
    expect(String(stdRow[1])).toContain('Saudi Aramco')
  })

  it('defaults to "Saudi Aramco" in Design Standard row when no standard set', () => {
    const project = makeProject()
    exportToExcel(project)
    const wb = XLSX.__getMockBooks()[0]
    const summaryAoa = wb._aoaData.Summary
    const stdRow = summaryAoa.find((r) => String(r[0]).includes('Design Standard'))
    expect(stdRow).toBeTruthy()
    expect(String(stdRow[1])).toContain('Saudi Aramco')
  })
})

describe('importFromExcel', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-06-09T12:00:00.000Z'))
    XLSX.__reset()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('detects own format via Summary sheet and parses project fields', async () => {
    const mockSummary = [
      ['CP DESIGNER — ENGINEERING CALCULATION EXPORT'],
      [],
      ['Project Number', 'PRJ-001'],
      ['Project Name', 'Test Project'],
      ['Client', 'Test Client'],
      ['End Client', 'End Client'],
      ['Designer', 'Engineer'],
      ['Date', '09/06/2025'],
      ['Revision', 'REV-0'],
      ['Status', 'approved'],
      ['Design Life', '25 years'],
      ['No. of Stations', '1'],
    ]
    const mockStation = [
      ['STATION: Station-1'],
      [],
      ['INPUTS', '', ''],
      ['Outside Diameter', '48'],
      ['Wall Thickness', '0.875'],
      ['Pipeline Length', '1000'],
      ['Operating Temperature', '25'],
      ['Base Current Density', '0.1'],
      ['Soil Resistivity', '500'],
      ['Groundbed Type', 'deepwell'],
      ['Depth to Active Zone', '15'],
      ['Anode Length', '2.13'],
      ['Anode Spacing', '1.5'],
      ['Borehole Diameter', '0.25'],
      ['Coke Cover', '2.5'],
      ['Cement Plug', '0.5'],
      ['Number of Anodes', '9'],
      ['Anode Type', 'HSCI TA-4'],
      ['Anode Weight', '38.6'],
      ['Consumption Rate', '0.45'],
      ['TR Rated Voltage', '30'],
      ['TR Rated Current', '25'],
      ['Back EMF', '2'],
      ['Structure Resistance', '0.055'],
    ]

    XLSX.__setMockBook(
      makeMockWorkbook({
        Summary: mockSummary,
        'Station-1': mockStation,
        BOM: [],
        Revisions: [],
      }),
    )

    const file = { arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)) }
    const result = await importFromExcel(file)

    expect(result.project.projectNumber).toBe('PRJ-001')
    expect(result.project.projectName).toBe('Test Project')
    expect(result.project.clientName).toBe('Test Client')
    expect(result.project.endClient).toBe('End Client')
    expect(result.project.designer).toBe('Engineer')
    expect(result.project.systemDesignLifeYears).toBe(25)
    expect(result.project.status).toBe('draft')
    expect(result.project.id).toBe('mock-uuid')
    expect(result.project.stations).toHaveLength(1)
    expect(result.errors).toHaveLength(0)
  })

  it('parses station fields from own-format workbook', async () => {
    XLSX.__setMockBook(
      makeMockWorkbook({
        Summary: [['Project Number', 'PRJ-002']],
        'Station-A': [
          ['Outside Diameter', '36'],
          ['Wall Thickness', '0.5'],
          ['Pipeline Length', '2000'],
          ['Operating Temperature', '30'],
          ['Base Current Density', '0.2'],
          ['Soil Resistivity', '1000'],
          ['Groundbed Type', 'Shallow Vertical'],
          ['Depth to Active Zone', '10'],
          ['Anode Length', '1.52'],
          ['Anode Spacing', '3.0'],
          ['Borehole Diameter', '0.3'],
          ['Coke Cover', '2.0'],
          ['Cement Plug', '0.3'],
          ['Number of Anodes', '12'],
          ['Anode Weight', '8.5'],
          ['Consumption Rate', '0.001'],
          ['TR Rated Voltage', '50'],
          ['TR Rated Current', '40'],
          ['Back EMF', '2.5'],
          ['Structure Resistance', '0.05'],
        ],
      }),
    )

    const file = { arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)) }
    const result = await importFromExcel(file)
    const st = result.project.stations[0]

    expect(st.name).toBe('Station-A')
    expect(st.pipelineSegments[0].od).toBe(36)
    expect(st.pipelineSegments[0].wallThk).toBe(0.5)
    expect(st.pipelineSegments[0].lengthM).toBe(2000)
    expect(st.pipelineSegments[0].opTempC).toBe(30)
    expect(st.pipelineSegments[0].currentDensityBase).toBe(0.2)
    expect(st.designMode).toBe('shallow_vertical')
    expect(st.groundbed.type).toBe('shallow_vertical')
    expect(st.groundbed.startDepthM).toBe(10)
    expect(st.groundbed.anodeLengthM).toBe(1.52)
    expect(st.groundbed.anodeSpacingM).toBe(3.0)
    expect(st.groundbed.boreholeDiaM).toBe(0.3)
    expect(st.groundbed.cokeCoverM).toBe(2.0)
    expect(st.groundbed.cementPlugM).toBe(0.3)
    expect(st.proposedAnodes).toBe(12)
    expect(st.anodeSpec.weightKg).toBe(8.5)
    expect(st.anodeSpec.consumptionRate).toBe(0.001)
    expect(st.tr.ratedVoltage).toBe(50)
    expect(st.tr.ratedCurrent).toBe(40)
    expect(st.tr.backEMF).toBe(2.5)
    expect(st.tr.structureResistance).toBe(0.05)
    expect(st.soilResistivityOhmCm).toBe(1000)
    expect(result.errors).toHaveLength(0)
  })

  it('detects generic format when no Summary sheet', async () => {
    XLSX.__setMockBook(
      makeMockWorkbook({
        Sheet1: [
          ['Outside Diameter', '48'],
          ['Soil Resistivity', '500'],
        ],
      }),
    )

    const file = { arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)) }
    const result = await importFromExcel(file)

    expect(result.project.projectNumber).toBe('IMPORTED')
    expect(result.project.projectName).toBe('Imported from Sheet1')
    expect(result.project.stations).toHaveLength(1)
    expect(result.errors).toContain(
      'Generic workbook detected — mapping best-effort. Please verify all imported values.',
    )
  })

  it('creates default station when own-format has no station sheets', async () => {
    XLSX.__setMockBook(
      makeMockWorkbook({
        Summary: [['Project Number', 'PRJ-003']],
        BOM: [],
        Revisions: [],
      }),
    )

    const file = { arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)) }
    const result = await importFromExcel(file)

    expect(result.project.stations).toHaveLength(1)
    expect(result.project.stations[0].name).toBe('Imported Station')
    expect(result.errors).toContain('No station data found — default station created.')
  })

  it('uses defaults for systemDesignLifeYears when Design Life is not numeric', async () => {
    XLSX.__setMockBook(
      makeMockWorkbook({
        Summary: [['Design Life', 'not-a-number']],
      }),
    )

    const file = { arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)) }
    const result = await importFromExcel(file)

    expect(result.project.systemDesignLifeYears).toBe(25)
  })

  it('handles empty workbook by creating default station via generic path', async () => {
    XLSX.__setMockBook(makeMockWorkbook({}))

    const file = { arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)) }
    const result = await importFromExcel(file)

    expect(result.project.projectNumber).toBe('IMPORTED')
    expect(result.project.stations).toHaveLength(1)
    expect(result.project.stations[0].name).toBe('Imported Station')
  })

  it('defaults project fields when Summary values are missing', async () => {
    XLSX.__setMockBook(
      makeMockWorkbook({
        Summary: [['Some Other Key', 'value']],
      }),
    )

    const file = { arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)) }
    const result = await importFromExcel(file)

    expect(result.project.projectNumber).toBe('')
    expect(result.project.projectName).toBe('')
    expect(result.project.clientName).toBe('')
    expect(result.project.endClient).toBe('')
    expect(result.project.designer).toBe('')
  })

  it('parses groundbed type shallow_vertical via detectGroundbedType', async () => {
    XLSX.__setMockBook(
      makeMockWorkbook({
        Summary: [['Project Number', 'T']],
        St1: [
          ['Groundbed Type', 'Shallow Vertical'],
          ['Outside Diameter', '48'],
        ],
        St2: [
          ['Groundbed Type', 'shallow'],
          ['Outside Diameter', '48'],
        ],
        St3: [
          ['Groundbed Type', 'vertical'],
          ['Outside Diameter', '48'],
        ],
      }),
    )

    const file = { arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)) }
    const result = await importFromExcel(file)

    expect(result.project.stations[0].designMode).toBe('shallow_vertical')
    expect(result.project.stations[1].designMode).toBe('shallow_vertical')
    expect(result.project.stations[2].designMode).toBe('shallow_vertical')
  })

  it('parses groundbed type distributed via detectGroundbedType', async () => {
    XLSX.__setMockBook(
      makeMockWorkbook({
        Summary: [['Project Number', 'T']],
        St1: [
          ['Groundbed Type', 'Distributed'],
          ['Outside Diameter', '48'],
        ],
      }),
    )

    const file = { arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)) }
    const result = await importFromExcel(file)

    expect(result.project.stations[0].designMode).toBe('distributed')
  })

  it('defaults groundbed type to deepwell for null/empty/unknown', async () => {
    XLSX.__setMockBook(
      makeMockWorkbook({
        Summary: [['Project Number', 'T']],
        St1: [['Outside Diameter', '48']],
        St2: [
          ['Groundbed Type', ''],
          ['Outside Diameter', '48'],
        ],
        St3: [
          ['Groundbed Type', 'Unknown Type'],
          ['Outside Diameter', '48'],
        ],
      }),
    )

    const file = { arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)) }
    const result = await importFromExcel(file)

    expect(result.project.stations[0].designMode).toBe('deepwell')
    expect(result.project.stations[1].designMode).toBe('deepwell')
    expect(result.project.stations[2].designMode).toBe('deepwell')
  })

  it('uses defaults for all station values when sheet has no key-value rows', async () => {
    XLSX.__setMockBook(
      makeMockWorkbook({
        Summary: [['Project Number', 'T']],
        'Station-X': [],
      }),
    )

    const file = { arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)) }
    const result = await importFromExcel(file)
    const st = result.project.stations[0]

    expect(st.pipelineSegments[0].od).toBe(48)
    expect(st.pipelineSegments[0].wallThk).toBe(0.875)
    expect(st.pipelineSegments[0].lengthM).toBe(1000)
    expect(st.pipelineSegments[0].opTempC).toBe(25)
    expect(st.pipelineSegments[0].currentDensityBase).toBe(0.1)
    expect(st.groundbed.startDepthM).toBe(15)
    expect(st.groundbed.anodeLengthM).toBe(2.13)
    expect(st.groundbed.anodeSpacingM).toBe(1.5)
    expect(st.groundbed.boreholeDiaM).toBe(0.25)
    expect(st.groundbed.cokeCoverM).toBe(2.5)
    expect(st.groundbed.cementPlugM).toBe(0.5)
    expect(st.proposedAnodes).toBe(9)
    expect(st.tr.ratedVoltage).toBe(30)
    expect(st.tr.ratedCurrent).toBe(25)
    expect(st.tr.backEMF).toBe(2)
    expect(st.tr.structureResistance).toBe(0.055)
    expect(st.soilResistivityOhmCm).toBe(500)
    expect(st.id).toBe('mock-uuid')
    expect(st.pipelineSegments[0].id).toBe('mock-uuid')
  })

  it('uses reads first 4 sheets max in generic format', async () => {
    XLSX.__setMockBook(
      makeMockWorkbook({
        Sheet1: [['Outside Diameter', '48']],
        Sheet2: [['Outside Diameter', '36']],
        Sheet3: [['Outside Diameter', '24']],
        Sheet4: [['Outside Diameter', '18']],
        Sheet5: [['Outside Diameter', '12']],
      }),
    )

    const file = { arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)) }
    const result = await importFromExcel(file)

    expect(result.project.stations).toHaveLength(4)
  })

  it('calls uuid for each station and project on import', async () => {
    const { v4 } = await import('uuid')

    XLSX.__setMockBook(
      makeMockWorkbook({
        Summary: [['Project Number', 'T']],
        St1: [['Outside Diameter', '48']],
        St2: [['Outside Diameter', '36']],
      }),
    )

    const file = { arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)) }
    await importFromExcel(file)

    expect(v4).toHaveBeenCalled()
  })
})
