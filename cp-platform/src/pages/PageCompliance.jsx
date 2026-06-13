/**
 * PageCompliance.jsx
 *
 * Compliance Center — SAES-X-300 through SAES-X-700 compliance tracking.
 * Shows compliance percentage, requirements met, warnings, and critical issues
 * for each SAES standard applicable to CP engineering.
 */

import { Shield, CheckCircle, AlertTriangle, XCircle, BarChart3, FileText } from 'lucide-react'

const SAES_STANDARDS = [
  {
    id: 'SAES-X-300',
    title: 'Cathodic Protection Design',
    description: 'General CP design requirements for onshore pipelines and facilities',
    compliancePct: 92,
    requirementsTotal: 48,
    requirementsMet: 44,
    warnings: 3,
    critical: 1,
    status: 'compliant',
    keyChecks: [
      { name: 'Design life ≥ 25 years', pass: true },
      { name: 'Current density per NACE SP0169', pass: true },
      { name: 'Spare capacity factor ≥ 1.30', pass: true },
      { name: 'Coating breakdown factor applied', pass: true },
      { name: 'Temperature correction per §4.2', pass: false, detail: 'Missing for segment 3' },
    ]
  },
  {
    id: 'SAES-X-400',
    title: 'Groundbed & Anode Requirements',
    description: 'Deep-well and distributed anode groundbed design specifications',
    compliancePct: 85,
    requirementsTotal: 36,
    requirementsMet: 31,
    warnings: 4,
    critical: 1,
    status: 'warning',
    keyChecks: [
      { name: 'Remoteness distance ≥ 100m', pass: true },
      { name: 'Anode spacing per 17-SAMSS-016', pass: true },
      { name: 'Coke backfill per 17-855-011', pass: true },
      { name: 'Groundbed resistance ≤ target', pass: false, detail: 'Station CP-2: R_G = 2.8Ω vs target 2.0Ω' },
      { name: 'Borehole depth per geotechnical', pass: true },
    ]
  },
  {
    id: 'SAES-X-500',
    title: 'TRU & Power Supply',
    description: 'Transformer-rectifier unit sizing, rating, and installation',
    compliancePct: 95,
    requirementsTotal: 28,
    requirementsMet: 27,
    warnings: 1,
    critical: 0,
    status: 'compliant',
    keyChecks: [
      { name: 'TR rating per 17-SAMSS-003', pass: true },
      { name: 'Voltage margin ≥ 15%', pass: true },
      { name: 'AC input sizing adequate', pass: true },
      { name: 'Back-EMF considered', pass: true },
      { name: 'Cooling class adequate', pass: false, detail: 'Verify for ambient >50°C' },
    ]
  },
  {
    id: 'SAES-X-600',
    title: 'Cabling & Interconnections',
    description: 'Cable sizing, routing, and junction box specifications',
    compliancePct: 78,
    requirementsTotal: 32,
    requirementsMet: 25,
    warnings: 5,
    critical: 2,
    status: 'critical',
    keyChecks: [
      { name: 'Cable size per 17-SAMSS-020', pass: true },
      { name: 'Voltage drop ≤ 10% rated', pass: false, detail: 'Positive main: 12.3% drop' },
      { name: 'Anode tail length uniform', pass: true },
      { name: 'Junction box per 17-SAMSS-008', pass: true },
      { name: 'Negative secondary bonded', pass: false, detail: 'Not specified' },
    ]
  },
  {
    id: 'SAES-X-700',
    title: 'Testing & Commissioning',
    description: 'Pre-commissioning checks, energization, and performance validation',
    compliancePct: 65,
    requirementsTotal: 40,
    requirementsMet: 26,
    warnings: 8,
    critical: 6,
    status: 'critical',
    keyChecks: [
      { name: 'Pre-energization checklist', pass: false, detail: 'Not yet completed' },
      { name: 'Soil resistivity verified', pass: true },
      { name: 'Groundbed resistance measured', pass: false, detail: 'Pending field test' },
      { name: 'Potential survey baseline', pass: false, detail: 'Not scheduled' },
      { name: 'TR commissioning report', pass: false, detail: 'Pending' },
    ]
  },
]

function StatusIcon({ status }) {
  if (status === 'compliant') return <CheckCircle size={18} style={{ color: 'var(--pass)' }} />
  if (status === 'warning') return <AlertTriangle size={18} style={{ color: 'var(--warn)' }} />
  return <XCircle size={18} style={{ color: 'var(--fail)' }} />
}

export function PageCompliance() {
  const overallPct = Math.round(SAES_STANDARDS.reduce((s, std) => s + std.compliancePct, 0) / SAES_STANDARDS.length)
  const totalCrit = SAES_STANDARDS.reduce((s, std) => s + std.critical, 0)
  const totalWarn = SAES_STANDARDS.reduce((s, std) => s + std.warnings, 0)

  return (
    <div className="page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 500, margin: 0 }}>Compliance Center</h1>
          <p style={{ fontSize: 12, color: "var(--text-tertiary)", margin: "2px 0 0" }}>
            SAES-X series compliance tracking for CP engineering
          </p>
        </div>
        <Shield size={28} style={{ color: "var(--brand-mid)" }} />
      </div>

      {/* KPI Row */}
      <div className="kpi-row" style={{ marginBottom: 10 }}>
        <div className={"kpi-card " + (overallPct >= 90 ? "kpi-card--pass" : overallPct >= 75 ? "kpi-card--warn" : "kpi-card--fail")}>
          <span className="kpi-card__label">Overall Compliance</span>
          <span className="kpi-card__value">{overallPct}%</span>
          <span className="kpi-card__sub">{SAES_STANDARDS.length} standards</span>
        </div>
        <div className="kpi-card kpi-card--pass">
          <span className="kpi-card__label">Standards Compliant</span>
          <span className="kpi-card__value">{SAES_STANDARDS.filter(s => s.status === "compliant").length}</span>
          <span className="kpi-card__sub">No critical issues</span>
        </div>
        <div className={"kpi-card " + (totalCrit > 0 ? "kpi-card--fail" : "kpi-card--pass")}>
          <span className="kpi-card__label">Critical Issues</span>
          <span className="kpi-card__value">{totalCrit}</span>
          <span className="kpi-card__sub">Requires immediate action</span>
        </div>
        <div className={"kpi-card " + (totalWarn > 0 ? "kpi-card--warn" : "")}>
          <span className="kpi-card__label">Warnings</span>
          <span className="kpi-card__value">{totalWarn}</span>
          <span className="kpi-card__sub">Review recommended</span>
        </div>
      </div>

      {/* Standards Grid */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {SAES_STANDARDS.map((std) => (
          <div key={std.id} className="section-card" style={{ marginBottom: 0 }}>
            <div className="section-card-header">
              <span className="section-card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <StatusIcon status={std.status} />
                <span>
                  <strong style={{ color: "var(--text-primary)" }}>{std.id}</strong>
                  <span style={{ marginLeft: 8, fontSize: 12, color: "var(--text-secondary)" }}>{std.title}</span>
                </span>
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{std.requirementsMet}/{std.requirementsTotal} reqs met</span>
                <div style={{ width: 100, height: 6, background: "var(--surface-hover)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ width: std.compliancePct + "%", height: "100%", background: std.compliancePct >= 90 ? "var(--pass)" : std.compliancePct >= 75 ? "var(--warn)" : "var(--fail)", borderRadius: 3 }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--font-mono)", color: std.compliancePct >= 90 ? "var(--pass)" : std.compliancePct >= 75 ? "var(--warn)" : "var(--fail)" }}>{std.compliancePct}%</span>
              </div>
            </div>
            <div className="section-card-body">
              <p style={{ fontSize: 11.5, color: "var(--text-secondary)", margin: "0 0 8px" }}>{std.description}</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 4 }}>
                {std.keyChecks.map((check, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 6px", borderRadius: 4, background: check.pass ? "var(--pass-bg)" : "var(--fail-bg)", fontSize: 11.5 }}>
                    {check.pass
                      ? <CheckCircle size={12} style={{ color: "var(--pass)", flexShrink: 0 }} />
                      : <XCircle size={12} style={{ color: "var(--fail)", flexShrink: 0 }} />
                    }
                    <span style={{ color: check.pass ? "var(--text-secondary)" : "var(--fail)" }}>{check.name}</span>
                    {check.detail && (
                      <span style={{ fontSize: 10, color: "var(--text-tertiary)", marginLeft: "auto" }}>{check.detail}</span>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 8, fontSize: 11 }}>
                {std.critical > 0 && <span style={{ color: "var(--fail)" }}>⬤ {std.critical} critical</span>}
                {std.warnings > 0 && <span style={{ color: "var(--warn)" }}>⚠ {std.warnings} warnings</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
