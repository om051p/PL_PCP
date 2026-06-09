/**
 * EXCEL IMPORT / EXPORT ENGINE
 * Import:  Reads PCP.xlsx-style workbooks and maps to project state
 * Export:  Writes full calculation results + BOM to multi-sheet XLSX
 */

import * as XLSX from 'xlsx'
import { v4 as uuid } from 'uuid'
import { ANODE_SPECS } from '../constants/index.js'

// ─── EXPORT ──────────────────────────────────────────────────────────────────

/**
 * Export full project data to Excel workbook.
 * Sheets: Summary | Station-N Inputs | Station-N Results | BOM
 */
export function exportToExcel(project) {
  const wb = XLSX.utils.book_new()

  // ── Sheet 1: Project Summary ───────────────────────────────────────────────
  const summaryData = [
    ['CP DESIGNER — ENGINEERING CALCULATION EXPORT'],
    [],
    ['Project Number',   project.projectNumber],
    ['Project Name',     project.projectName],
    ['Client',           project.clientName],
    ['End Client',       project.endClient],
    ['Designer',         project.designer || ''],
    ['Date',             new Date().toLocaleDateString('en-GB')],
    ['Revision',         project.currentRevision || 'REV-0'],
    ['Status',           (project.status || '').replace(/_/g, ' ')],
    ['Design Life',      `${project.systemDesignLifeYears} years`],
    ['No. of Stations',  project.stations.length],
    [],
    ['STATION', 'TYPE', 'DESIGN CURRENT (A)', 'ANODES', 'R_G (Ω)', 'DESIGN LIFE (y)', 'V_MIN (V)', 'STATUS'],
    ...project.stations.map(st => {
      const r = st.lastCalcResult
      return [
        st.name,
        st.groundbed.type === 'deepwell' ? 'Deepwell' : 'Shallow Vertical',
        r ? +r.designCurrentA.toFixed(3) : '',
        st.proposedAnodes,
        r ? +r.groundbedResistanceOhm.toFixed(4) : '',
        r ? +r.designLifeYears.toFixed(1) : '',
        r ? +r.minTRVoltage.toFixed(2) : '',
        r ? (r.allChecksPassed ? 'PASS' : 'FAIL') : 'NOT CALCULATED',
      ]
    }),
  ]
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData)
  wsSummary['!cols'] = [{ wch: 30 }, { wch: 25 }, { wch: 20 }, { wch: 10 }, { wch: 12 }, { wch: 16 }, { wch: 12 }, { wch: 18 }]
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary')

  // ── Sheet per station: Inputs + Results ────────────────────────────────────
  for (const st of project.stations) {
    const r = st.lastCalcResult
    const seg = st.pipelineSegments[0]
    const sheetName = st.name.replace(/[:\\/?*[\]]/g, '').substring(0, 28)

    const rows = [
      [`STATION: ${st.name}`],
      [],

      // --- Inputs ---
      ['INPUTS', '', ''],
      ['Parameter', 'Value', 'Unit'],
      ['Outside Diameter', seg.od, 'inches'],
      ['Wall Thickness', seg.wallThk, 'inches'],
      ['Pipeline Length', seg.lengthM, 'm'],
      ['Operating Temperature', seg.opTempC, '°C'],
      ['Base Current Density', seg.currentDensityBase, 'mA/m²'],
      ['Soil Resistivity', st.soilResistivityOhmCm, 'Ω·cm'],
      ['Groundbed Type', st.groundbed.type],
      ['Depth to Active Zone', st.groundbed.startDepthM, 'm'],
      ['Anode Length', st.groundbed.anodeLengthM, 'm'],
      ['Anode Spacing', st.groundbed.anodeSpacingM, 'm'],
      ['Borehole Diameter', st.groundbed.boreholeDiaM, 'm'],
      ...(st.groundbed.type === 'deepwell'
        ? [['Coke Cover', st.groundbed.cokeCoverM, 'm'], ['Cement Plug', st.groundbed.cementPlugM, 'm']]
        : []),
      ['Number of Anodes', st.proposedAnodes, 'ea.'],
      ['Anode Type', st.anodeSpec.label || 'HSCI TA-4'],
      ['Anode Weight', st.anodeSpec.weightKg, 'kg'],
      ['Consumption Rate', st.anodeSpec.consumptionRate, 'kg/A·yr'],
      ['TR Rated Voltage', st.tr.ratedVoltage, 'V'],
      ['TR Rated Current', st.tr.ratedCurrent, 'A'],
      ['Back EMF', st.tr.backEMF, 'V'],
      ['Structure Resistance', st.tr.structureResistance, 'Ω'],
      [],

      // --- Results ---
      ['CALCULATED RESULTS', '', ''],
      ['Parameter', 'Value', 'Unit'],
    ]

    if (r) {
      rows.push(
        ['Surface Area', +r.totalSurfaceAreaM2.toFixed(4), 'm²'],
        ['Temp-Corrected Current Density', +r.tempCorrectedCurrentDensity.toFixed(5), 'mA/m²'],
        ['Required Current', +r.requiredCurrentA.toFixed(5), 'A'],
        ['Design Current (+30% spare)', +r.designCurrentA.toFixed(4), 'A'],
        [],
        ['Active Column Length', +r.activeLengthM.toFixed(3), 'm'],
        ['Total Drilling Depth', +r.totalDrillDepthM.toFixed(2), 'm'],
        ['Groundbed Resistance R_G', +r.groundbedResistanceOhm.toFixed(6), 'Ω'],
        ['Max Allowable R_G', +r.maxAllowableGroundbedRes.toFixed(6), 'Ω'],
        [],
        ['Anode Tail Parallel Resistance', +r.anodeTailParallelResOhm.toFixed(6), 'Ω'],
        ['Positive Main Cable Resistance', +r.posMainCableResOhm.toFixed(6), 'Ω'],
        ['Negative Circuit Resistance', +r.negMainCableResOhm.toFixed(6), 'Ω'],
        ['Total Cable Resistance R_c', +r.totalCableResOhm.toFixed(6), 'Ω'],
        [],
        ['Back EMF Resistance R_emf', +r.backEMFResistanceOhm.toFixed(6), 'Ω'],
        ['Total Circuit Resistance R_T', +r.totalCircuitResistanceOhm.toFixed(6), 'Ω'],
        ['Minimum TR Voltage V_min', +r.minTRVoltage.toFixed(4), 'V'],
        ['70% Operating Limit', +r.maxCircuitRes70pct.toFixed(6), 'Ω'],
        ['90% Warning Limit', +r.maxCircuitRes90pct.toFixed(6), 'Ω'],
        [],
        ['Design Life', +r.designLifeYears.toFixed(2), 'years'],
        ['Target Design Life', r.targetDesignLifeYears, 'years'],
        [],
        ['DC Power', r.dcPowerW, 'W'],
        ['AC Input Power', +r.acInputKVA.toFixed(3), 'kVA'],
        ['AC Input Current', +r.acInputCurrentA.toFixed(3), 'A'],
        [],

        // Validation
        ['VALIDATION CHECKS', '', ''],
        ['Check', 'Status', 'Computed Value'],
        ...r.checks.map(c => [c.label, c.status.toUpperCase(), c.computed]),
      )
    } else {
      rows.push(['Station not calculated yet.'])
    }

    const ws = XLSX.utils.aoa_to_sheet(rows)
    ws['!cols'] = [{ wch: 38 }, { wch: 18 }, { wch: 12 }]
    XLSX.utils.book_append_sheet(wb, ws, sheetName)
  }

  // ── BOM Sheet ──────────────────────────────────────────────────────────────
  const bomRows = [
    ['BILL OF MATERIALS — ALL STATIONS'],
    [],
    ['Station', 'Tag', 'Description', 'Standard', 'Unit', 'Quantity'],
  ]
  for (const st of project.stations) {
    const bom = st.lastCalcResult?.bom || []
    if (!bom.length) continue
    bom.forEach(item => {
      bomRows.push([st.name, item.tag, item.description, item.standard || '', item.unit, item.quantity])
    })
    bomRows.push([])
  }
  const wsBOM = XLSX.utils.aoa_to_sheet(bomRows)
  wsBOM['!cols'] = [{ wch: 28 }, { wch: 14 }, { wch: 58 }, { wch: 16 }, { wch: 10 }, { wch: 10 }]
  XLSX.utils.book_append_sheet(wb, wsBOM, 'BOM')

  // ── Revision History ───────────────────────────────────────────────────────
  if (project.revisions.length > 0) {
    const revRows = [
      ['REVISION HISTORY'],
      [],
      ['Rev No.', 'Description', 'Date', 'By', 'Status'],
      ...project.revisions.map(r => [r.revNumber, r.description, r.createdAt.split('T')[0], r.createdBy, r.status]),
    ]
    const wsRev = XLSX.utils.aoa_to_sheet(revRows)
    wsRev['!cols'] = [{ wch: 10 }, { wch: 40 }, { wch: 14 }, { wch: 16 }, { wch: 22 }]
    XLSX.utils.book_append_sheet(wb, wsRev, 'Revisions')
  }

  const filename = `${project.projectNumber || 'CP'}_Calculation_${new Date().toISOString().split('T')[0]}.xlsx`
  XLSX.writeFile(wb, filename)
}

// ─── IMPORT ───────────────────────────────────────────────────────────────────

/**
 * Parse an uploaded XLSX file and attempt to map it to project + station structure.
 * Supports:
 *   1. CP Designer export format (our own export above)
 *   2. Generic PCP.xlsx style (flat key-value layout)
 *
 * @param {File} file — browser File object
 * @returns {Promise<{project: object, stations: object[], errors: string[]}>}
 */
export async function importFromExcel(file) {
  const errors = []

  const buffer = await file.arrayBuffer()
  const wb = XLSX.read(buffer, { type: 'array' })

  const sheetNames = wb.SheetNames

  // ── Strategy 1: Detect our own export format ──────────────────────────────
  if (sheetNames.includes('Summary')) {
    return parseOwnFormat(wb, errors)
  }

  // ── Strategy 2: Generic flat workbook (PCP.xlsx style) ───────────────────
  return parseGenericFormat(wb, errors)
}

function parseOwnFormat(wb, errors) {
  const summarySheet = wb.Sheets['Summary']
  const summaryData = XLSX.utils.sheet_to_json(summarySheet, { header: 1, defval: '' })

  const project = {
    id: uuid(),
    projectNumber:       getCellValue(summaryData, 'Project Number') || '',
    projectName:         getCellValue(summaryData, 'Project Name') || '',
    clientName:          getCellValue(summaryData, 'Client') || '',
    endClient:           getCellValue(summaryData, 'End Client') || '',
    designer:            getCellValue(summaryData, 'Designer') || '',
    systemDesignLifeYears: parseInt(getCellValue(summaryData, 'Design Life')) || 25,
    status:              'draft',
    createdAt:           new Date().toISOString(),
    updatedAt:           new Date().toISOString(),
    stations:            [],
    revisions:           [],
    currentRevision:     null,
  }

  // Parse station sheets (all non-Summary, non-BOM, non-Revisions sheets)
  const stationSheets = wb.SheetNames.filter(n => !['Summary', 'BOM', 'Revisions'].includes(n))

  for (const sheetName of stationSheets) {
    const sheet = wb.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
    try {
      const st = parseStationSheet(data, sheetName)
      project.stations.push(st)
    } catch (e) {
      errors.push(`Sheet "${sheetName}": ${e.message}`)
    }
  }

  if (project.stations.length === 0) {
    project.stations.push(makeDefaultImportStation())
    errors.push('No station data found — default station created.')
  }

  return { project, errors }
}

function parseStationSheet(data, sheetName) {
  const get = (key) => getCellValue(data, key)

  return {
    id: uuid(),
    name:     sheetName,
    location: '',
    designMode: detectGroundbedType(get('Groundbed Type')),
    status:   'input_complete',
    pipelineSegments: [{
      id: uuid(),
      name: '48" Pipeline',
      od:               parseFloat(get('Outside Diameter')) || 48,
      wallThk:          parseFloat(get('Wall Thickness')) || 0.875,
      lengthM:          parseFloat(get('Pipeline Length')) || 1000,
      opTempC:          parseFloat(get('Operating Temperature')) || 25,
      currentDensityBase: parseFloat(get('Base Current Density')) || 0.1,
      coatingType:      'fusion_bonded_epoxy',
      coatingEfficiency: 0.98,
    }],
    groundbed: {
      type:          detectGroundbedType(get('Groundbed Type')),
      startDepthM:   parseFloat(get('Depth to Active Zone')) || 15,
      anodeLengthM:  parseFloat(get('Anode Length')) || 2.13,
      inactiveLenM:  0,
      anodeSpacingM: parseFloat(get('Anode Spacing')) || 1.5,
      boreholeDiaM:  parseFloat(get('Borehole Diameter')) || 0.25,
      numHoles:      1,
      cokeCoverM:    parseFloat(get('Coke Cover')) || 2.5,
      cementPlugM:   parseFloat(get('Cement Plug')) || 0.5,
    },
    anodeSpec: { ...ANODE_SPECS.HSCI_TA4,
      weightKg:        parseFloat(get('Anode Weight')) || ANODE_SPECS.HSCI_TA4.weightKg,
      consumptionRate: parseFloat(get('Consumption Rate')) || ANODE_SPECS.HSCI_TA4.consumptionRate,
    },
    proposedAnodes: parseInt(get('Number of Anodes')) || 9,
    cables: {
      anodeTailLengths:  Array(20).fill(30),
      anodeCableSizeMm2: 16,
      posMainLengthM:    180,
      posMainSizeMm2:    35,
      negMainLengthM:    100,
      negMainSizeMm2:    35,
      negSecLengthM:     60,
      negSecSizeMm2:     25,
    },
    tr: {
      ratedVoltage:       parseFloat(get('TR Rated Voltage')) || 30,
      ratedCurrent:       parseFloat(get('TR Rated Current')) || 25,
      backEMF:            parseFloat(get('Back EMF')) || 2,
      structureResistance: parseFloat(get('Structure Resistance')) || 0.055,
    },
    soilResistivityOhmCm: parseFloat(get('Soil Resistivity')) || 500,
    actualRemotenesM:     56,
    requiredRemotenesM:   20,
    designLifeYears:      25,
    lastCalcResult:       null,
    insights:             [],
    alternatives:         [],
  }
}

function parseGenericFormat(wb, errors) {
  // Attempt to read any flat sheet with key-value pairs
  errors.push('Generic workbook detected — mapping best-effort. Please verify all imported values.')

  const project = {
    id: uuid(),
    projectNumber: 'IMPORTED',
    projectName:   `Imported from ${wb.SheetNames[0]}`,
    clientName:    '',
    endClient:     '',
    designer:      '',
    systemDesignLifeYears: 25,
    status:        'draft',
    createdAt:     new Date().toISOString(),
    updatedAt:     new Date().toISOString(),
    stations:      [],
    revisions:     [],
    currentRevision: null,
  }

  // Create one station per sheet, try to extract whatever we can
  for (const sheetName of wb.SheetNames.slice(0, 4)) {
    const sheet = wb.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

    try {
      const st = parseStationSheet(data, sheetName)
      project.stations.push(st)
    } catch (e) {
      errors.push(`Could not parse sheet "${sheetName}": ${e.message}`)
    }
  }

  if (project.stations.length === 0) {
    project.stations.push(makeDefaultImportStation())
  }

  return { project, errors }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCellValue(data, key) {
  for (const row of data) {
    if (String(row[0]).trim().toLowerCase() === key.toLowerCase()) {
      return row[1] !== undefined ? String(row[1]).trim() : ''
    }
  }
  return ''
}

function detectGroundbedType(str) {
  if (!str) return 'deepwell'
  const s = str.toLowerCase()
  if (s.includes('shallow') || s.includes('vertical')) return 'shallow_vertical'
  if (s.includes('distributed')) return 'distributed'
  return 'deepwell'
}

function makeDefaultImportStation() {
  return {
    id: uuid(),
    name: 'Imported Station',
    location: '',
    designMode: 'deepwell',
    status: 'draft',
    pipelineSegments: [{
      id: uuid(), name: 'Pipeline', od: 48, wallThk: 0.875, lengthM: 1000,
      opTempC: 25, currentDensityBase: 0.1, coatingType: 'fusion_bonded_epoxy', coatingEfficiency: 0.98,
    }],
    groundbed: {
      type: 'deepwell', startDepthM: 15, anodeLengthM: 2.13, inactiveLenM: 0,
      anodeSpacingM: 1.5, boreholeDiaM: 0.25, numHoles: 1, cokeCoverM: 2.5, cementPlugM: 0.5,
    },
    anodeSpec: { ...ANODE_SPECS.HSCI_TA4 },
    proposedAnodes: 9,
    cables: {
      anodeTailLengths: Array(20).fill(30), anodeCableSizeMm2: 16,
      posMainLengthM: 180, posMainSizeMm2: 35,
      negMainLengthM: 100, negMainSizeMm2: 35,
      negSecLengthM: 60,  negSecSizeMm2: 25,
    },
    tr: { ratedVoltage: 30, ratedCurrent: 25, backEMF: 2, structureResistance: 0.055 },
    soilResistivityOhmCm: 500, actualRemotenesM: 56, requiredRemotenesM: 20,
    designLifeYears: 25, lastCalcResult: null, insights: [], alternatives: [],
  }
}
