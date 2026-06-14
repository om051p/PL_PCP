import { useState, useMemo } from 'react'
import { useProjectStore } from '../store/projectStore.js'
import { runStandardsValidation } from '../engine/modules/standardsValidationEngine.js'
import {
  Shield,
  CheckCircle,
  AlertTriangle,
  XCircle,
  FileText,
  Download,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { jsPDF } from 'jspdf'

// ─── Saudi Aramco Engineering Standards Requirement Registry ──────────────────
const ALL_REQUIREMENTS = [
  // SAES-X-300: Marine Structures
  {
    id: '300-D1',
    standard: 'SAES-X-300',
    clause: 'Section 6.1.1',
    description: 'CP designs must be prepared by NACE CP Level 4 qualified engineers with 10+ years experience.',
    severity: 'HIGH',
    autoValidatable: false,
  },
  {
    id: '300-D2',
    standard: 'SAES-X-300',
    clause: 'Section 6.1.2',
    description: 'Field measurements must be collected by NACE CP Level 2+ technicians with 5+ years experience.',
    severity: 'MEDIUM',
    autoValidatable: false,
  },
  {
    id: 'SAES-300-6.2.2-OVERPROTECT',
    standard: 'SAES-X-300',
    clause: 'Section 6.2.2',
    description: 'Over-protection ceiling: potential shall not exceed maximum negative limit (-1050 mV CSE for FBE/3LPE to prevent HISC).',
    severity: 'CRITICAL',
    autoValidatable: true,
  },

  // SAES-X-400: Buried Pipelines
  {
    id: '400-D1',
    standard: 'SAES-X-400',
    clause: 'Section 5.2',
    description: '90% detailed design package containing all required calculations, drawings, and BOM deliverables.',
    severity: 'MEDIUM',
    autoValidatable: false,
  },
  {
    id: 'SAES-400-Table10',
    standard: 'SAES-X-400',
    clause: 'Table 10',
    description: 'Minimum groundbed remoteness distance based on discharge current and soil resistivity.',
    severity: 'HIGH',
    autoValidatable: true,
  },
  {
    id: 'SAES-400-7.5.5',
    standard: 'SAES-X-400',
    clause: 'Section 7.5.5',
    description: 'Operating circuit resistance (R_op) shall be ≤ 70% of rated circuit resistance (R_rated).',
    severity: 'HIGH',
    autoValidatable: true,
  },
  {
    id: 'SAES-400-7.5.6',
    standard: 'SAES-X-400',
    clause: 'Section 7.5.6',
    description: 'Commissioning circuit resistance (R_op) shall be ≤ 90% of rated circuit resistance.',
    severity: 'MEDIUM',
    autoValidatable: true,
  },
  {
    id: 'SAES-400-7.5.8',
    standard: 'SAES-X-400',
    clause: 'Section 7.5.8',
    description: 'If average soil resistivity > 4,000 Ω·cm, record each anode resistance during installation.',
    severity: 'MEDIUM',
    autoValidatable: true,
  },
  {
    id: 'SAES-400-6.10.1.4-BOND',
    standard: 'SAES-X-400',
    clause: 'Section 6.10.1.4',
    description: 'Minimum bond/cable conductor size shall be 16 mm² (#6 AWG).',
    severity: 'HIGH',
    autoValidatable: true,
  },
  {
    id: 'SAES-400-Table5-CD',
    standard: 'SAES-X-400',
    clause: 'Table 5',
    description: 'MMO anode max current density: 7.0 A/m² (fresh water), 35.0 A/m² (salt water).',
    severity: 'CRITICAL',
    autoValidatable: true,
  },

  // SAES-X-500: Internal Surfaces of Vessels & Tanks
  {
    id: '500-D2',
    standard: 'SAES-X-500',
    clause: 'Section 6.2.1',
    description: 'CP required based on operating temperature, water content, H2S, and CO2 analysis.',
    severity: 'MEDIUM',
    autoValidatable: false,
  },
  {
    id: '500-D5',
    standard: 'SAES-X-500',
    clause: 'Section 6.2.8',
    description: 'AMS (Anode Monitoring System) is mandatory for all vessel internal CP designs.',
    severity: 'MEDIUM',
    autoValidatable: false,
  },
  {
    id: 'SAES-500-6.8.4',
    standard: 'SAES-X-500',
    clause: 'Section 6.8.4',
    description: 'DC power supplies shall have maximum rated output voltage ≤ 100 volts.',
    severity: 'CRITICAL',
    autoValidatable: true,
  },
  {
    id: 'SAES-500-6.6.4-ZN',
    standard: 'SAES-X-500',
    clause: 'Section 6.6.4',
    description: 'Zinc anodes shall not be used where temperature exceeds 50°C (except HTZ).',
    severity: 'CRITICAL',
    autoValidatable: true,
  },
  {
    id: 'SAES-500-6.6.3-MG',
    standard: 'SAES-X-500',
    clause: 'Section 6.6.3',
    description: 'Magnesium anodes shall not be used if electrolyte resistivity < 2,000 Ω·cm.',
    severity: 'CRITICAL',
    autoValidatable: true,
  },

  // SAES-X-600: External Surfaces of Plant Facilities
  {
    id: '600-D3',
    standard: 'SAES-X-600',
    clause: 'Section 5.1.2.4',
    description: 'New CP systems must have Remote Monitoring Units (RMU); at least one per plant area.',
    severity: 'HIGH',
    autoValidatable: false,
  },
  {
    id: 'SAES-600-5.2.4-MIN',
    standard: 'SAES-X-600',
    clause: 'Section 5.2.4',
    description: 'Minimum design life for impressed current systems shall be 25 years.',
    severity: 'HIGH',
    autoValidatable: true,
  },
  {
    id: 'SAES-600-5.2.5-COMM-VOLT',
    standard: 'SAES-X-600',
    clause: 'Section 5.2.5',
    description: 'Commissioning target current achieved at 30%-70% of TR rated voltage.',
    severity: 'HIGH',
    autoValidatable: true,
  },
  {
    id: 'SAES-600-5.2.5-OP-MARGIN',
    standard: 'SAES-X-600',
    clause: 'Section 5.2.5',
    description: 'TR normal operating voltage shall have >10% voltage adjustment remaining.',
    severity: 'HIGH',
    autoValidatable: true,
  },
  {
    id: 'SAES-600-5.1.2.4-RMU',
    standard: 'SAES-X-600',
    clause: 'Section 5.1.2.4',
    description: 'Remote Monitoring Unit (RMU) is mandatory for new plant CP systems.',
    severity: 'HIGH',
    autoValidatable: true,
  },
  {
    id: 'SAES-600-5.2.7-HAZ',
    standard: 'SAES-X-600',
    clause: 'Section 5.2.7',
    description: 'TR type must comply with hazardous area cooling requirements (oil-immersed in hazardous area).',
    severity: 'HIGH',
    autoValidatable: true,
  },

  // SAES-X-700: Well Casings
  {
    id: 'SAES-700-6.1.1-SHARED',
    standard: 'SAES-X-700',
    clause: 'Section 6.1.1',
    description: 'Shared well casings are prohibited except for solar power source with multiple wells.',
    severity: 'CRITICAL',
    autoValidatable: true,
  },
  {
    id: 'SAES-700-6.5.4-DIST',
    standard: 'SAES-X-700',
    clause: 'Section 6.5.4/5',
    description: 'Anode bed separation distance must be ≥150m for ≥25A or ≥75m for <25A discharge current.',
    severity: 'HIGH',
    autoValidatable: true,
  },
  {
    id: '700-D3',
    standard: 'SAES-X-700',
    clause: 'Section 6.1.3',
    description: 'Existing CP power sources shall not be reused for new well casing installations.',
    severity: 'MEDIUM',
    autoValidatable: false,
  },
]

const STANDARD_GROUPS = [
  { id: 'SAES-X-300', title: 'Cathodic Protection of Marine Structures' },
  { id: 'SAES-X-400', title: 'Cathodic Protection of Buried Pipelines' },
  { id: 'SAES-X-500', title: 'Cathodic Protection of Internal Surfaces of Vessels & Tanks' },
  { id: 'SAES-X-600', title: 'Cathodic Protection of External Surfaces of Plant Facilities' },
  { id: 'SAES-X-700', title: 'Cathodic Protection of Well Casings' },
]

export function PageCompliance() {
  const project = useProjectStore((s) => s.getProject())
  const updateProject = useProjectStore((s) => s.updateProject)

  const stations = project?.stations || []
  const [selectedStationId, setSelectedStationId] = useState(stations[0]?.id || '')

  // Track expanded accordion sections
  const [expandedSections, setExpandedSections] = useState({
    'SAES-X-300': true,
    'SAES-X-400': true,
    'SAES-X-500': true,
    'SAES-X-600': true,
    'SAES-X-700': true,
  })

  // Selected station object
  const currentStation = useMemo(() => {
    return stations.find((s) => s.id === selectedStationId) || stations[0]
  }, [stations, selectedStationId])

  // Run validation on the selected station
  const validationReport = useMemo(() => {
    if (!currentStation) return null
    return runStandardsValidation(currentStation, project)
  }, [currentStation, project])

  const toggleSection = (id) => {
    setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  // Get notes/statuses from the project store (persisted state)
  const complianceNotes = project?.complianceNotes?.[selectedStationId] || {}
  const complianceStatus = project?.complianceStatus?.[selectedStationId] || {}

  const handleNoteChange = (ruleId, noteValue) => {
    const notes = project?.complianceNotes || {}
    const stationNotes = notes[selectedStationId] || {}
    updateProject({
      complianceNotes: {
        ...notes,
        [selectedStationId]: {
          ...stationNotes,
          [ruleId]: noteValue,
        },
      },
    })
  }

  const handleStatusChange = (ruleId, statusValue) => {
    const status = project?.complianceStatus || {}
    const stationStatus = status[selectedStationId] || {}
    updateProject({
      complianceStatus: {
        ...status,
        [selectedStationId]: {
          ...stationStatus,
          [ruleId]: statusValue,
        },
      },
    })
  }

  // Calculate scores dynamically
  const complianceMetrics = useMemo(() => {
    if (!currentStation) return { score: 0, critical: 0, warnings: 0, met: 0, total: 0 }

    let totalMet = 0
    let totalApplicable = 0
    let criticalCount = 0
    let warningCount = 0

    ALL_REQUIREMENTS.forEach((req) => {
      let isMet = false
      let isN_A = false

      if (req.autoValidatable) {
        const autoResult = validationReport?.results?.find((r) => r.ruleId === req.id)
        if (autoResult) {
          if (autoResult.pass) {
            isMet = true
          } else {
            if (autoResult.severity === 'CRITICAL') criticalCount++
            else if (autoResult.severity === 'HIGH' || autoResult.severity === 'MEDIUM') warningCount++
          }
        } else {
          isN_A = true
        }
      } else {
        const manualStatus = complianceStatus[req.id] || 'pending'
        if (manualStatus === 'pass') {
          isMet = true
        } else if (manualStatus === 'fail') {
          if (req.severity === 'CRITICAL') criticalCount++
          else warningCount++
        } else if (manualStatus === 'n_a') {
          isN_A = true
        } else {
          // pending counts as not met, but not a hard failure unless set to fail
        }
      }

      if (!isN_A) {
        totalApplicable++
        if (isMet) totalMet++
      }
    })

    const score = totalApplicable > 0 ? Math.round((totalMet / totalApplicable) * 100) : 100

    return {
      score,
      critical: criticalCount,
      warnings: warningCount,
      met: totalMet,
      total: totalApplicable,
    }
  }, [currentStation, validationReport, complianceStatus])

  // Generate and download PDF
  const handleExportPDF = () => {
    if (!project || !currentStation) return

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const PW = 210
    const PH = 297
    const ML = 14
    const MR = 14
    const CW = PW - ML - MR

    const C_brand = [26, 58, 92]
    const C_brandMid = [45, 106, 159]
    const C_brandLight = [232, 240, 247]
    const C_black = [17, 24, 39]
    const C_gray = [75, 85, 99]
    const C_border = [229, 231, 235]
    const C_white = [255, 255, 255]

    const setFont = (size, style = 'normal', color = C_black) => {
      doc.setFontSize(size)
      doc.setFont('helvetica', style)
      doc.setTextColor(...color)
    }

    const hline = (y) => {
      doc.setDrawColor(...C_border)
      doc.setLineWidth(0.2)
      doc.line(ML, y, PW - MR, y)
    }

    const filledRect = (x, y, w, h, color) => {
      doc.setFillColor(...color)
      doc.rect(x, y, w, h, 'F')
    }

    // Draw Header
    filledRect(0, 0, PW, 14, C_brand)
    setFont(9, 'bold', C_white)
    doc.text('CP DESIGNER — COMPLIANCE CENTER', ML, 9)
    setFont(7.5, 'normal', [180, 200, 220])
    doc.text(`Saudi Aramco Engineering Standards Compliance Audit`, ML + 70, 9)

    // Project Info Band
    filledRect(0, 14, PW, 10, C_brandLight)
    setFont(8, 'bold', C_brand)
    doc.text(`Project No: ${project.projectNumber || '—'}`, ML, 20.5)
    doc.text(`Station: ${currentStation.name}`, ML + 50, 20.5)
    doc.text(`Audit Date: ${new Date().toLocaleDateString('en-GB')}`, PW - MR, 20.5, { align: 'right' })

    // Summary Card
    let y = 30
    filledRect(ML, y, CW, 24, [248, 250, 252])
    doc.setDrawColor(...C_brandMid)
    doc.setLineWidth(0.5)
    doc.rect(ML, y, CW, 24)

    setFont(16, 'bold', C_brand)
    doc.text(`${complianceMetrics.score}%`, ML + 6, y + 15)
    setFont(7.5, 'bold', C_brandMid)
    doc.text('OVERALL COMPLIANCE SCORE', ML + 6, y + 20)

    setFont(8.5, 'bold', C_black)
    doc.text(`Requirements Met: ${complianceMetrics.met} / ${complianceMetrics.total}`, ML + 65, y + 10)
    setFont(8, 'normal', C_gray)
    doc.text(`Critical Violations: ${complianceMetrics.critical}`, ML + 65, y + 16)
    doc.text(`Warnings / Non-Critical: ${complianceMetrics.warnings}`, ML + 65, y + 21)

    y += 32

    // Standards Groups Table
    STANDARD_GROUPS.forEach((group) => {
      if (y > PH - 40) {
        doc.addPage()
        y = 20
      }

      filledRect(ML, y, CW, 7, C_brandMid)
      setFont(8, 'bold', C_white)
      doc.text(group.id + ' — ' + group.title, ML + 3, y + 5)
      y += 8

      const groupReqs = ALL_REQUIREMENTS.filter((r) => r.standard === group.id)
      groupReqs.forEach((req) => {
        if (y > PH - 30) {
          doc.addPage()
          y = 20
        }

        let statusText
        let evidenceText = complianceNotes[req.id] || 'No manual evidence recorded.'

        if (req.autoValidatable) {
          const autoResult = validationReport?.results?.find((r) => r.ruleId === req.id)
          if (autoResult) {
            statusText = autoResult.pass ? 'PASS' : autoResult.severity === 'CRITICAL' ? 'FAIL (CRIT)' : 'WARN'
            evidenceText = autoResult.message
          } else {
            statusText = 'N/A'
            evidenceText = 'Not applicable to this station configuration.'
          }
        } else {
          const manualStatus = complianceStatus[req.id] || 'pending'
          statusText = manualStatus.toUpperCase()
        }

        setFont(7.5, 'bold', C_black)
        doc.text(`Clause ${req.clause}:`, ML + 2, y + 4)
        setFont(7, 'normal', C_gray)
        const wrappedDesc = doc.splitTextToSize(req.description, CW - 32)
        doc.text(wrappedDesc, ML + 30, y + 4)
        
        setFont(7.5, 'bold', statusText.includes('FAIL') ? [155, 28, 28] : statusText.includes('PASS') ? [22, 96, 58] : C_gray)
        doc.text(statusText, PW - MR - 2, y + 4, { align: 'right' })

        y += wrappedDesc.length * 3.5 + 2

        setFont(6.5, 'italic', [100, 110, 120])
        const wrappedEvidence = doc.splitTextToSize(`Evidence: ${evidenceText}`, CW - 10)
        doc.text(wrappedEvidence, ML + 5, y)

        y += wrappedEvidence.length * 3 + 3
        hline(y)
        y += 4
      })

      y += 4
    })

    // Footer
    const pageCount = doc.internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setDrawColor(...C_brand)
      doc.setLineWidth(0.5)
      doc.line(0, PH - 10, PW, PH - 10)
      doc.setFillColor(...C_brand)
      doc.rect(0, PH - 10, PW, 10, 'F')
      setFont(6.5, 'normal', [180, 200, 220])
      doc.text('SAUDI ARAMCO permanent CP DESIGN COMPLIANCE AUDIT', ML, PH - 4)
      doc.text(`Page ${i} of ${pageCount}`, PW - MR, PH - 4, { align: 'right' })
    }

    doc.save(`${project.projectNumber || 'CP'}_Compliance_Audit_Report.pdf`)
  }

  return (
    <div className="page" style={{ paddingBottom: '40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 500, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={22} style={{ color: 'var(--brand-mid)' }} />
            Compliance Center
          </h1>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '4px 0 0' }}>
            Saudi Aramco Engineering Standards (SAES-X) compliance auditing and verification dashboard.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select
            className="field-input"
            style={{ padding: '6px 10px', fontSize: '12.5px', borderRadius: 'var(--radius)', border: '1px solid var(--border-strong)', background: 'var(--surface)' }}
            value={selectedStationId}
            onChange={(e) => setSelectedStationId(e.target.value)}
          >
            {stations.map((st) => (
              <option key={st.id} value={st.id}>
                {st.name}
              </option>
            ))}
          </select>
          <button className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', padding: '6px 12px' }} onClick={handleExportPDF}>
            <Download size={14} /> Export Audit PDF
          </button>
        </div>
      </div>

      {/* Warning if calculations not run */}
      {!currentStation?.lastCalcResult && (
        <div style={{ display: 'flex', gap: '10px', padding: '12px 16px', borderRadius: 'var(--radius-lg)', background: 'var(--warn-bg)', border: '1px solid var(--warn-border)', color: 'var(--warn-text)', marginBottom: '16px', fontSize: '13px', alignItems: 'center' }}>
          <Info size={18} style={{ flexShrink: 0 }} />
          <span>
            <strong>Calculations Pending:</strong> Engineering calculations have not been completed for this station. Auto-validated requirements will appear as <strong>N/A</strong> until recalculation.
          </span>
        </div>
      )}

      {/* Overall Score Banner */}
      <div className="kpi-row" style={{ marginBottom: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        <div className={`kpi-card ${complianceMetrics.score >= 90 ? 'kpi-card--pass' : complianceMetrics.score >= 70 ? 'kpi-card--warn' : 'kpi-card--fail'}`} style={{ padding: '16px' }}>
          <span className="kpi-card__label" style={{ fontSize: '11px', textTransform: 'uppercase', tracking: '0.05em' }}>Overall Compliance Score</span>
          <span className="kpi-card__value" style={{ fontSize: '28px', fontWeight: '700' }}>{complianceMetrics.score}%</span>
          <span className="kpi-card__sub" style={{ fontSize: '11px' }}>Weighted requirements audit</span>
        </div>
        <div className="kpi-card kpi-card--pass" style={{ padding: '16px', background: 'var(--card)', border: '1px solid var(--border)' }}>
          <span className="kpi-card__label" style={{ fontSize: '11px', textTransform: 'uppercase' }}>Requirements Verified</span>
          <span className="kpi-card__value" style={{ fontSize: '28px', fontWeight: '700', color: 'var(--pass)' }}>{complianceMetrics.met}</span>
          <span className="kpi-card__sub" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Out of {complianceMetrics.total} applicable</span>
        </div>
        <div className={`kpi-card ${complianceMetrics.critical > 0 ? 'kpi-card--fail' : 'kpi-card--pass'}`} style={{ padding: '16px' }}>
          <span className="kpi-card__label" style={{ fontSize: '11px', textTransform: 'uppercase' }}>Critical Violations</span>
          <span className="kpi-card__value" style={{ fontSize: '28px', fontWeight: '700' }}>{complianceMetrics.critical}</span>
          <span className="kpi-card__sub" style={{ fontSize: '11px' }}>Requires immediate redesign</span>
        </div>
        <div className={`kpi-card ${complianceMetrics.warnings > 0 ? 'kpi-card--warn' : 'kpi-card--pass'}`} style={{ padding: '16px' }}>
          <span className="kpi-card__label" style={{ fontSize: '11px', textTransform: 'uppercase' }}>Warnings / Non-Critical</span>
          <span className="kpi-card__value" style={{ fontSize: '28px', fontWeight: '700' }}>{complianceMetrics.warnings}</span>
          <span className="kpi-card__sub" style={{ fontSize: '11px' }}>Requires review or justification</span>
        </div>
      </div>

      {/* Accordion Standard Sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {STANDARD_GROUPS.map((group) => {
          const groupReqs = ALL_REQUIREMENTS.filter((r) => r.standard === group.id)
          const isExpanded = expandedSections[group.id]

          return (
            <div key={group.id} className="section-card" style={{ marginBottom: 0, padding: 0, overflow: 'hidden' }}>
              <div
                onClick={() => toggleSection(group.id)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '14px 18px',
                  background: 'var(--surface-hover)',
                  cursor: 'pointer',
                  borderBottom: isExpanded ? '1px solid var(--border)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '13.5px', fontWeight: '700', color: 'var(--brand-mid)', fontFamily: 'var(--font-mono)' }}>{group.id}</span>
                  <span style={{ fontSize: '13.5px', fontWeight: '600', color: 'var(--text-primary)' }}>{group.title}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', background: 'var(--bg-card)', padding: '2px 8px', borderRadius: '10px', border: '1px solid var(--border-strong)' }}>
                    {groupReqs.length} Checks
                  </span>
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>

              {isExpanded && (
                <div style={{ padding: '12px 18px' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--border-strong)', color: 'var(--text-secondary)' }}>
                          <th style={{ padding: '10px 8px', width: '80px' }}>Clause</th>
                          <th style={{ padding: '10px 8px', width: '280px' }}>Requirement Description</th>
                          <th style={{ padding: '10px 8px', width: '90px' }}>Method</th>
                          <th style={{ padding: '10px 8px', width: '130px' }}>Status</th>
                          <th style={{ padding: '10px 8px' }}>Auditor Evidence & Calculation Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groupReqs.map((req) => {
                          const isAuto = req.autoValidatable
                          let statusNode
                          let evidenceNode

                          if (isAuto) {
                            const autoResult = validationReport?.results?.find((r) => r.ruleId === req.id)
                            if (autoResult) {
                              const badgeClass =
                                autoResult.pass
                                  ? 'badge-pass'
                                  : autoResult.severity === 'CRITICAL'
                                  ? 'badge-fail'
                                  : 'badge-warn'
                              
                              const labelText =
                                autoResult.pass
                                  ? 'PASS'
                                  : autoResult.severity === 'CRITICAL'
                                  ? 'FAIL (CRIT)'
                                  : 'WARNING'

                              statusNode = (
                                <span className={`badge ${badgeClass}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
                                  {labelText}
                                </span>
                              )
                              evidenceNode = (
                                <div style={{ color: autoResult.pass ? 'var(--text-secondary)' : 'var(--fail)', fontSize: '11.5px', lineHeight: '1.4' }}>
                                  {autoResult.message}
                                </div>
                              )
                            } else {
                              statusNode = <span className="badge badge-pending">N/A</span>
                              evidenceNode = <span style={{ color: 'var(--text-tertiary)', fontSize: '11px', italic: 'true' }}>Not evaluated for this configuration.</span>
                            }
                          } else {
                            const manualStatus = complianceStatus[req.id] || 'pending'
                            const note = complianceNotes[req.id] || ''

                            statusNode = (
                              <select
                                className="field-input"
                                style={{
                                  padding: '4px 6px',
                                  fontSize: '11.5px',
                                  borderRadius: 'var(--radius)',
                                  background: 'var(--surface)',
                                  border: '1px solid var(--border-strong)',
                                  color:
                                    manualStatus === 'pass'
                                      ? 'var(--pass)'
                                      : manualStatus === 'fail'
                                      ? 'var(--fail)'
                                      : 'var(--text-primary)',
                                  fontWeight: manualStatus !== 'pending' ? '600' : 'normal',
                                }}
                                value={manualStatus}
                                onChange={(e) => handleStatusChange(req.id, e.target.value)}
                              >
                                <option value="pending">Pending</option>
                                <option value="pass">Pass</option>
                                <option value="fail">Fail</option>
                                <option value="n_a">N/A</option>
                              </select>
                            )

                            evidenceNode = (
                              <textarea
                                className="field-input"
                                style={{
                                  width: '100%',
                                  height: '38px',
                                  padding: '6px 8px',
                                  fontSize: '11.5px',
                                  lineHeight: '1.3',
                                  resize: 'vertical',
                                  fontFamily: 'inherit',
                                  borderRadius: 'var(--radius)',
                                  border: '1px solid var(--border-strong)',
                                  background: 'var(--surface)',
                                }}
                                placeholder="Enter verification notes / references..."
                                value={note}
                                onChange={(e) => handleNoteChange(req.id, e.target.value)}
                              />
                            )
                          }

                          return (
                            <tr
                              key={req.id}
                              style={{
                                borderBottom: '1px solid var(--border)',
                                verticalAlign: 'top',
                              }}
                              className="table-row-hover"
                            >
                              <td style={{ padding: '10px 8px', fontWeight: '600', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                                {req.clause}
                              </td>
                              <td style={{ padding: '10px 8px', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <span>{req.description}</span>
                                  {req.severity === 'CRITICAL' && (
                                    <span style={{ fontSize: '9px', color: 'var(--fail)', fontWeight: '700', textTransform: 'uppercase' }}>
                                      [CRITICAL SAFETY CHECK]
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td style={{ padding: '10px 8px' }}>
                                <span style={{ fontSize: '10px', fontWeight: '600', color: isAuto ? 'var(--brand-mid)' : 'var(--text-tertiary)', background: isAuto ? 'var(--brand-light)' : 'var(--surface-hover)', padding: '2px 6px', borderRadius: '4px' }}>
                                  {isAuto ? 'AUTO' : 'MANUAL'}
                                </span>
                              </td>
                              <td style={{ padding: '8px' }}>{statusNode}</td>
                              <td style={{ padding: '8px' }}>{evidenceNode}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default PageCompliance
