/**
 * PDF ENGINEERING REPORT GENERATOR
 * Produces a professional engineering calculation sheet.
 * Format: A4, portrait, stamped header/footer, calculation tables,
 * validation checks, BOM — matching real CP engineering document style.
 */

import { jsPDF } from 'jspdf'
import { getActiveStandard } from '../constants/index.js'

// ─── Colour palette ───────────────────────────────────────────────────────────
const C = {
  brand: [26, 58, 92], // #1a3a5c
  brandMid: [45, 106, 159], // #2d6a9f
  brandLight: [232, 240, 247], // #e8f0f7
  accent: [200, 134, 10], // #c8860a
  pass: [22, 96, 58], // #16603a
  passBg: [234, 245, 238], // #eaf5ee
  fail: [155, 28, 28], // #9b1c1c
  failBg: [254, 242, 242], // #fef2f2
  warn: [122, 79, 0], // #7a4f00
  warnBg: [254, 252, 232], // #fefce8
  black: [17, 24, 39],
  gray: [75, 85, 99],
  lightGray: [156, 163, 175],
  border: [229, 231, 235],
  white: [255, 255, 255],
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const f2 = (v) => (v == null ? '—' : Number(v).toFixed(2))
const f4 = (v) => (v == null ? '—' : Number(v).toFixed(4))
const f1 = (v) => (v == null ? '—' : Number(v).toFixed(1))

function setFont(doc, size, style = 'normal', color = C.black) {
  doc.setFontSize(size)
  doc.setFont('helvetica', style)
  doc.setTextColor(...color)
}

function hline(doc, y, x1, x2, color = C.border, lw = 0.2) {
  doc.setDrawColor(...color)
  doc.setLineWidth(lw)
  doc.line(x1, y, x2, y)
}

function filledRect(doc, x, y, w, h, fillColor) {
  doc.setFillColor(...fillColor)
  doc.rect(x, y, w, h, 'F')
}

// ─── Page dimensions ─────────────────────────────────────────────────────────
const PW = 210 // A4 width mm
const PH = 297 // A4 height mm
const ML = 14 // margin left
const MR = 14 // margin right
const CW = PW - ML - MR // content width

// ─── Header ───────────────────────────────────────────────────────────────────
function drawHeader(doc, project, pageNum, totalPages) {
  // Top brand bar
  filledRect(doc, 0, 0, PW, 14, C.brand)
  setFont(doc, 9, 'bold', C.white)
  doc.text('CP DESIGNER', ML, 9)
  setFont(doc, 7, 'normal', [180, 200, 220])
  doc.text('ICCP Engineering Platform — Permanent Cathodic Protection', ML + 26, 9)
  setFont(doc, 7, 'normal', C.white)
  doc.text(`Page ${pageNum} of ${totalPages}`, PW - MR, 9, { align: 'right' })

  // Project info band
  filledRect(doc, 0, 14, PW, 10, C.brandLight)
  setFont(doc, 7.5, 'bold', C.brand)
  doc.text(project.projectNumber || '', ML, 20.5)
  setFont(doc, 7.5, 'normal', C.brand)
  doc.text(project.projectName || '', ML + 30, 20.5)
  doc.text(`Prepared: ${new Date().toLocaleDateString('en-GB')}`, PW - MR, 20.5, { align: 'right' })
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function drawFooter(doc, project) {
  const y = PH - 10
  hline(doc, y, 0, PW, C.brand, 0.5)
  filledRect(doc, 0, y, PW, 10, C.brand)
  setFont(doc, 6.5, 'normal', [180, 200, 220])
  doc.text('CONFIDENTIAL — FOR ENGINEERING USE ONLY', ML, PH - 4.5)
  doc.text(`Client: ${project.clientName || ''}  |  ${project.endClient || ''}`, PW / 2, PH - 4.5, {
    align: 'center',
  })
  doc.text(`Rev: ${project.currentRevision || 'REV-0'}`, PW - MR, PH - 4.5, { align: 'right' })
}

// ─── Section heading ──────────────────────────────────────────────────────────
function sectionHeading(doc, y, title) {
  filledRect(doc, ML, y, CW, 7, C.brandMid)
  setFont(doc, 8, 'bold', C.white)
  doc.text(title.toUpperCase(), ML + 3, y + 5)
  return y + 9
}

// ─── Two-column key/value table ───────────────────────────────────────────────
function kvTable(doc, y, rows, colW = [80, CW - 80]) {
  let rowH = 6
  rows.forEach((row, i) => {
    const bg = i % 2 === 0 ? C.white : [248, 250, 252]
    filledRect(doc, ML, y, CW, rowH, bg)
    hline(doc, y, ML, ML + CW, C.border, 0.1)

    setFont(doc, 7.5, 'normal', C.gray)
    doc.text(String(row[0]), ML + 2, y + 4.2)

    setFont(doc, 7.5, 'bold', C.black)
    doc.text(String(row[1] ?? '—'), ML + colW[0], y + 4.2)

    if (row[2] != null) {
      setFont(doc, 7, 'normal', C.lightGray)
      doc.text(String(row[2]), ML + colW[0] + colW[1] * 0.55, y + 4.2)
    }
    y += rowH
  })
  hline(doc, y, ML, ML + CW, C.border, 0.2)
  return y + 2
}

// ─── Check rows (PASS/FAIL) ───────────────────────────────────────────────────
function checkTable(doc, y, checks) {
  checks.forEach((c) => {
    const bg = c.status === 'pass' ? C.passBg : c.status === 'fail' ? C.failBg : C.warnBg
    const tc = c.status === 'pass' ? C.pass : c.status === 'fail' ? C.fail : C.warn
    filledRect(doc, ML, y, CW, 6.5, bg)
    const mark = c.status === 'pass' ? '✓ PASS' : c.status === 'fail' ? '✗ FAIL' : '⚠ WARN'
    setFont(doc, 7, 'bold', tc)
    doc.text(mark, ML + 2, y + 4.2)
    setFont(doc, 7, 'normal', C.black)
    doc.text(c.label, ML + 16, y + 4.2)
    setFont(doc, 7, 'normal', C.gray)
    doc.text(c.computed || '', ML + CW - 2, y + 4.2, { align: 'right' })
    hline(doc, y + 6.5, ML, ML + CW, C.white, 0.3)
    y += 6.5
  })
  return y + 2
}

// ─── BOM table ────────────────────────────────────────────────────────────────
function bomTable(doc, y, bom) {
  // Header row
  const cols = [20, 90, 22, 20] // tag, desc, unit, qty
  filledRect(doc, ML, y, CW, 6, C.brand)
  setFont(doc, 7, 'bold', C.white)
  doc.text('TAG', ML + 2, y + 4)
  doc.text('DESCRIPTION', ML + cols[0] + 2, y + 4)
  doc.text('UNIT', ML + cols[0] + cols[1] + 2, y + 4)
  doc.text('QTY', ML + CW - 2, y + 4, { align: 'right' })
  y += 6

  bom.forEach((item, i) => {
    const bg = i % 2 === 0 ? C.white : [248, 250, 252]
    filledRect(doc, ML, y, CW, 5.5, bg)
    hline(doc, y, ML, ML + CW, C.border, 0.1)

    setFont(doc, 6.5, 'bold', C.brandMid)
    doc.text(item.tag, ML + 2, y + 3.8)

    setFont(doc, 6.5, 'normal', C.black)
    const desc =
      item.description.length > 68 ? item.description.substring(0, 65) + '...' : item.description
    doc.text(desc, ML + cols[0] + 2, y + 3.8)

    setFont(doc, 6.5, 'normal', C.gray)
    doc.text(item.unit, ML + cols[0] + cols[1] + 2, y + 3.8)

    setFont(doc, 6.5, 'bold', C.black)
    doc.text(String(item.quantity), ML + CW - 2, y + 3.8, { align: 'right' })

    y += 5.5
  })
  hline(doc, y, ML, ML + CW, C.border, 0.3)
  return y + 3
}

// ─── Page break helper ────────────────────────────────────────────────────────
function checkPageBreak(doc, y, needed, project, pageRef) {
  if (y + needed > PH - 18) {
    drawFooter(doc, project)
    doc.addPage()
    pageRef.num++
    drawHeader(doc, project, pageRef.num, pageRef.total)
    return 28
  }
  return y
}

// ─── MAIN EXPORT ─────────────────────────────────────────────────────────────
/**
 * Generate full engineering PDF report.
 * @param {import('../types').Project} project
 * @returns {jsPDF} doc — call doc.save('filename.pdf') or doc.output('blob')
 */
export function generateEngineeringReport(project) {
  // Count pages roughly (1 cover + 1-2 per station + 1 BOM)
  const totalPages = 2 + project.stations.length * 2
  const pageRef = { num: 1, total: totalPages }

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  // ── Page 1: Cover / Project Summary ────────────────────────────────────────
  drawHeader(doc, project, pageRef.num, pageRef.total)
  drawFooter(doc, project)

  let y = 32

  // Title block
  filledRect(doc, ML, y, CW, 28, C.brand)
  setFont(doc, 18, 'bold', C.white)
  doc.text('ENGINEERING CALCULATION', ML + 5, y + 11)
  setFont(doc, 11, 'normal', [180, 200, 220])
  doc.text('Permanent Cathodic Protection — ICCP Design', ML + 5, y + 19)
  setFont(doc, 8, 'normal', C.accent)
  doc.text('Impressed Current Cathodic Protection System', ML + 5, y + 25)
  y += 33

  // Project details
  y = sectionHeading(doc, y, 'Project Information')
  y = kvTable(doc, y, [
    ['Project Number', project.projectNumber],
    ['Project Name', project.projectName],
    ['Client', project.clientName],
    ['End Client', project.endClient],
    ['Designer', project.designer || '—'],
    ['Date Prepared', new Date().toLocaleDateString('en-GB')],
    ['Revision', project.currentRevision || 'REV-0'],
    ['Status', (project.status || '').replace(/_/g, ' ').toUpperCase()],
    ['System Design Life', `${project.systemDesignLifeYears} years`],
    ['No. of ICCP Stations', `${project.stations.length}`],
  ])

  y += 4
  y = sectionHeading(doc, y, 'Station Summary')
  const stationSummaryRows = project.stations.map((st) => {
    const r = st.lastCalcResult
    return [
      st.name,
      st.groundbed.type === 'deepwell' ? 'Deepwell' : 'Shallow Vertical',
      r ? `${f2(r.designCurrentA)} A` : '—',
      r ? `${st.proposedAnodes} ea.` : '—',
      r ? (r.allChecksPassed ? 'PASS' : 'FAIL') : 'Not Calculated',
    ]
  })

  // Simple summary table
  const smCols = [65, 30, 28, 22, 26]
  const headers = ['Station Name', 'Type', 'Design Current', 'Anodes', 'Validation']
  filledRect(doc, ML, y, CW, 6, C.brandMid)
  setFont(doc, 7, 'bold', C.white)
  let cx = ML + 2
  headers.forEach((h, i) => {
    doc.text(h, cx, y + 4)
    cx += smCols[i]
  })
  y += 6
  stationSummaryRows.forEach((row, ri) => {
    filledRect(doc, ML, y, CW, 5.5, ri % 2 === 0 ? C.white : [248, 250, 252])
    hline(doc, y, ML, ML + CW, C.border, 0.1)
    let cx2 = ML + 2
    row.forEach((cell, ci) => {
      const isStatus = ci === 4
      const isPass = cell === 'PASS'
      setFont(doc, 7, isStatus ? 'bold' : 'normal', isStatus ? (isPass ? C.pass : C.fail) : C.black)
      doc.text(String(cell), cx2, y + 3.8)
      cx2 += smCols[ci]
    })
    y += 5.5
  })
  hline(doc, y, ML, ML + CW, C.border, 0.3)
  y += 4

  // Standards reference
  y = sectionHeading(doc, y, 'Applicable Standards & References')
  const activeStd = getActiveStandard(project)
  const sr = activeStd.standardsReferences || {}
  const stdRows = [
    [activeStd.label + ' — ' + activeStd.version, activeStd.description],
    [sr.tru || '17-SAMSS-003', 'Transformer-Rectifier Units for Cathodic Protection'],
    [sr.anode || '17-SAMSS-016', 'Cast Iron Anodes for Impressed Current Systems'],
    [sr.junctionBox || '17-SAMSS-008', 'Junction Boxes for Cathodic Protection Systems'],
    ['Dwight (1936)', 'Resistance to Earth of Groundbed Electrode — Deepwell Formula'],
    ['Sunde (1968)', 'Earth Conduction Effects — Shallow Vertical Parallel Formula'],
  ]
  y = kvTable(doc, y, stdRows)

  // ── Stations: one page per station ─────────────────────────────────────────
  for (const station of project.stations) {
    doc.addPage()
    pageRef.num++
    drawHeader(doc, project, pageRef.num, pageRef.total)
    drawFooter(doc, project)
    y = 28

    const r = station.lastCalcResult
    const seg = station.pipelineSegments[0]

    // Station title
    filledRect(doc, ML, y, CW, 9, C.brandLight)
    setFont(doc, 10, 'bold', C.brand)
    doc.text(station.name, ML + 3, y + 6.2)
    setFont(doc, 7.5, 'normal', C.brandMid)
    doc.text(
      `Design Mode: ${station.groundbed.type === 'deepwell' ? 'Deepwell ICCP' : 'Shallow Vertical ICCP'}`,
      ML + CW - 3,
      y + 6.2,
      { align: 'right' },
    )
    y += 13

    // ── 1. Pipeline Parameters ──────────────────────────────────────────────
    y = sectionHeading(doc, y, '1. Pipeline Parameters')
    y = kvTable(doc, y, [
      ['Outside Diameter', `${seg.od} inches`, `= ${(seg.od * 0.0254).toFixed(4)} m`],
      ['Wall Thickness', `${seg.wallThk} inches`],
      ['Pipeline Length', `${seg.lengthM} m`],
      ['Operating Temperature', `${seg.opTempC} °C`],
      ['Base Current Density', `${seg.currentDensityBase} mA/m²`, 'at 25°C'],
      ['Soil Resistivity', `${station.soilResistivityOhmCm} Ω·cm`],
      [
        'Groundbed Remoteness',
        `${station.actualRemotenesM} m`,
        `(Required: ≥${station.requiredRemotenesM} m)`,
      ],
    ])

    // ── 2. Current Requirement ──────────────────────────────────────────────
    y = checkPageBreak(doc, y, 45, project, pageRef)
    y = sectionHeading(doc, y, '2. Current Requirement Calculation')
    if (r) {
      y = kvTable(doc, y, [
        ['External Surface Area', `${f2(r.totalSurfaceAreaM2)} m²`, 'A = π × D × L'],
        [
          'Temp-Corrected Current Density',
          `${f4(r.tempCorrectedCurrentDensity)} mA/m²`,
          'i_T = i_base × [1+(T-25)×0.025]',
        ],
        ['Required Current (bare)', `${f4(r.requiredCurrentA)} A`],
        ['Design Current (+30% spare)', `${f2(r.designCurrentA)} A`, 'I_design = I_req × 1.30'],
      ])
    } else {
      setFont(doc, 8, 'italic', C.lightGray)
      doc.text('Station not calculated.', ML + 3, y + 5)
      y += 10
    }

    // ── 3. Groundbed Design ─────────────────────────────────────────────────
    y = checkPageBreak(doc, y, 55, project, pageRef)
    y = sectionHeading(doc, y, '3. Groundbed Design')
    const gb = station.groundbed
    const isDeep = gb.type === 'deepwell'
    const gbRows = [
      [
        'Groundbed Type',
        isDeep ? 'Deepwell (Single Borehole)' : 'Shallow Vertical (Multiple Holes)',
      ],
      ['Anode Type', station.anodeSpec.label || 'HSCI Tubular TA-4'],
      ['Number of Anodes', `${station.proposedAnodes} ea.`],
      ['Anode Length', `${gb.anodeLengthM} m`],
      ['Anode Spacing', `${gb.anodeSpacingM} m (end-to-end)`],
      ['Depth to Active Zone', `${gb.startDepthM} m`],
      ['Borehole Diameter', `${gb.boreholeDiaM} m`],
    ]
    if (isDeep) {
      gbRows.push(['Coke Cover Above Anodes', `${gb.cokeCoverM} m`])
      gbRows.push(['Cement Plug', `${gb.cementPlugM} m`])
    }
    if (r) {
      gbRows.push([
        'Active Column Length',
        `${f2(r.activeLengthM)} m`,
        isDeep ? 'L = N×L_a + (N-1)×S' : '',
      ])
      if (isDeep) gbRows.push(['Total Drilling Depth', `${f2(r.totalDrillDepthM)} m`])
      gbRows.push([
        'Groundbed Resistance R_G',
        `${f4(r.groundbedResistanceOhm)} Ω`,
        isDeep ? 'Dwight formula' : 'Sunde formula',
      ])
      gbRows.push(['Max Allowable R_G', `${f4(r.maxAllowableGroundbedRes)} Ω`])
      gbRows.push(['Design Life', `${f1(r.designLifeYears)} years`, 'Y = (N×W)/(C×I)'])
    }
    y = kvTable(doc, y, gbRows)

    // ── 4. Cable Resistance ─────────────────────────────────────────────────
    y = checkPageBreak(doc, y, 45, project, pageRef)
    y = sectionHeading(doc, y, '4. Cable Resistance Calculation')
    if (r) {
      y = kvTable(doc, y, [
        ['Anode Tail Cable Size', `${station.cables.anodeCableSizeMm2} mm²`],
        [
          'Parallel Anode Tail Resistance',
          `${f4(r.anodeTailParallelResOhm)} Ω`,
          'R_ac = 1/Σ(1/L_i×r)',
        ],
        [
          'Positive Main Cable',
          `${station.cables.posMainLengthM} m × ${station.cables.posMainSizeMm2}mm²`,
        ],
        ['Positive Main Resistance', `${f4(r.posMainCableResOhm)} Ω`],
        [
          'Negative Main Cable',
          `${station.cables.negMainLengthM} m × ${station.cables.negMainSizeMm2}mm²`,
        ],
        [
          'Negative Secondary Cable',
          `${station.cables.negSecLengthM} m × ${station.cables.negSecSizeMm2}mm²`,
        ],
        ['Total Negative Resistance', `${f4(r.negMainCableResOhm)} Ω`],
        ['Total Cable Resistance R_c', `${f4(r.totalCableResOhm)} Ω`, 'R_c = R_ac + R_pc + R_nc'],
      ])
    }

    // ── 5. TR Circuit Analysis ──────────────────────────────────────────────
    y = checkPageBreak(doc, y, 55, project, pageRef)
    y = sectionHeading(doc, y, '5. Transformer-Rectifier Circuit Analysis')
    if (r) {
      y = kvTable(doc, y, [
        ['TR Rated Voltage', `${station.tr.ratedVoltage} V DC`],
        ['TR Rated Current', `${station.tr.ratedCurrent} A DC`],
        ['Back EMF', `${station.tr.backEMF} V`],
        ['Back EMF Resistance R_emf', `${f4(r.backEMFResistanceOhm)} Ω`, 'R_emf = 2×V_emf/I'],
        ['Structure Resistance R_s', `${station.tr.structureResistance} Ω`],
        ['Groundbed Resistance R_G', `${f4(r.groundbedResistanceOhm)} Ω`],
        ['Total Cable Resistance R_c', `${f4(r.totalCableResOhm)} Ω`],
        [
          'Total Circuit Resistance',
          `${f4(r.totalCircuitResistanceOhm)} Ω`,
          'R_T = R_G + R_c + R_emf + R_s',
        ],
        ['Minimum TR Voltage V_min', `${f2(r.minTRVoltage)} V`, 'V_min = R_T×I + V_emf'],
        ['70% Operating Limit', `${f4(r.maxCircuitRes70pct)} Ω`],
        ['DC Power', `${r.dcPowerW} W`],
        ['AC Input Power', `${f2(r.acInputKVA)} kVA`],
        ['AC Input Current (480V/3Φ)', `${f2(r.acInputCurrentA)} A`],
      ])
    }

    // ── 6. Validation ───────────────────────────────────────────────────────
    y = checkPageBreak(doc, y, 60, project, pageRef)
    y = sectionHeading(doc, y, '6. Engineering Validation Checks')
    if (r?.checks?.length) {
      y = checkTable(doc, y, r.checks)
    } else {
      setFont(doc, 8, 'italic', C.lightGray)
      doc.text('Station not calculated — no validation results.', ML + 3, y + 5)
      y += 10
    }
  }

  // ── BOM Pages ───────────────────────────────────────────────────────────────
  for (const station of project.stations) {
    const bom = station.lastCalcResult?.bom
    if (!bom?.length) continue

    doc.addPage()
    pageRef.num++
    drawHeader(doc, project, pageRef.num, pageRef.total)
    drawFooter(doc, project)
    y = 28

    filledRect(doc, ML, y, CW, 9, C.brandLight)
    setFont(doc, 9, 'bold', C.brand)
    doc.text(`BILL OF MATERIALS — ${station.name}`, ML + 3, y + 6)
    y += 13

    y = bomTable(doc, y, bom)
  }

  return doc
}

/**
 * Download the PDF directly in the browser.
 */
export function downloadEngineeringReport(project) {
  const doc = generateEngineeringReport(project)
  const filename = `${project.projectNumber || 'CP'}_Engineering_Report_${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(filename)
}
