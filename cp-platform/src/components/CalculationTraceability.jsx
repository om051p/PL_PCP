/**
 * CalculationTraceability.jsx
 *
 * Standardized engineering traceability panel used on every
 * calculation page. Shows inputs used, formula reference,
 * standard reference, and validation status.
 */

import { ListChecks, BookOpen, Shield, ClipboardCheck, Sigma } from 'lucide-react'

const FORMULA_REFS = {
  current: { formula: 'I = A_s × i_cd × S', standard: 'NACE SP0169 §4.2', desc: 'Current requirement per unit surface area' },
  groundbed: { formula: 'R_G = ρ/(2πL) × (ln(8L/d) − 1 + L/4h)', standard: 'Dwight Formula / IEEE 80', desc: 'Deep-well groundbed resistance' },
  cable: { formula: 'R_c = R_ac + R_pc + R_nc', standard: 'IEC 60228 / 17-SAMSS-020', desc: 'Total cable circuit resistance' },
  tr: { formula: 'V_min = R_T × I + V_emf', standard: '17-SAMSS-003 §5.2', desc: 'TR minimum voltage requirement' },
  attenuation: { formula: 'E(x) = E_0 × cosh(α(L-x)) / cosh(αL)', standard: 'NACE SP0169 Annex B / ISO 15589-1', desc: 'Transmission-line attenuation model' },
  validation: { formula: 'N/A — rule-based checks', standard: 'NACE SP0169 §5 / ISO 15589-1 §6', desc: 'Engineering validation rules BR-001 through BR-006' },
  optimizer: { formula: 'N/A — comparative', standard: 'NACE SP0169 / ISO 15589-1', desc: 'Design alternatives comparison' },
}
export function CalculationTraceability({
  items = [],
  module = '',
  calculatedAt,
  validationStatus,
  validationCounts,
}) {
  const ref = FORMULA_REFS[module] || {}
  const hasValidation = validationStatus != null
  const allPassed = validationStatus === true

  return (
    <div className="section-card" style={{ marginBottom: 0 }}>
      <div className="section-card-header">
        <span className="section-card-title">
          <ListChecks size={14} /> Calculation Traceability
        </span>
        {calculatedAt && (
          <span style={{ fontSize: 11, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
            Last: {new Date(calculatedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>
      <div className="section-card-body">
        {/* Inputs Used */}
        {items.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <h4 style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-tertiary)", fontWeight: 600, marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
              <Sigma size={11} /> Inputs Used
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "2px 12px" }}>
              {items.map((it, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 0", borderBottom: "1px dashed var(--border)", fontSize: 11.5 }}>
                  <span style={{ color: "var(--text-secondary)" }}>{it.label}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)", fontWeight: 500 }}>
                      {it.value}
                      {it.unit && <span style={{ color: "var(--text-tertiary)", fontWeight: 400, marginLeft: 2, fontSize: 10 }}>{it.unit}</span>}
                    </span>
                    {it.source && (
                      <span style={{ fontSize: 9, color: "var(--text-tertiary)", background: "var(--surface)", padding: "1px 4px", borderRadius: 2, maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={it.source}>
                        {it.source}
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Formula Reference */}
        {ref.formula && (
          <div style={{ marginBottom: 12, padding: "8px 10px", background: "var(--surface)", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <BookOpen size={12} style={{ color: "var(--brand-mid)" }} />
              <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-tertiary)", fontWeight: 600 }}>Formula Reference</span>
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-primary)", fontWeight: 500, marginBottom: 2 }}>{ref.formula}</div>
            <div style={{ fontSize: 10.5, color: "var(--text-tertiary)" }}>{ref.desc}</div>
          </div>
        )}

        {/* Standard Reference */}
        {ref.standard && (
          <div style={{ marginBottom: 12, padding: "8px 10px", background: "var(--surface)", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Shield size={12} style={{ color: "var(--brand-mid)" }} />
              <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-tertiary)", fontWeight: 600, marginRight: 8 }}>Standard</span>
              <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text-primary)", fontWeight: 500 }}>{ref.standard}</span>
            </div>
          </div>
        )}

        {/* Validation Status */}
        {hasValidation && (
          <div style={{ padding: "8px 10px", borderRadius: "var(--radius)", background: allPassed ? "var(--pass-bg)" : "var(--fail-bg)", border: "1px solid " + (allPassed ? "var(--pass)" : "var(--fail)") }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <ClipboardCheck size={12} style={{ color: allPassed ? "var(--pass)" : "var(--fail)" }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: allPassed ? "var(--pass)" : "var(--fail)" }}>
                {allPassed ? "All validation checks passed" : "Validation checks have failures"}
              </span>
              {validationCounts && (
                <span style={{ fontSize: 10, color: "var(--text-tertiary)", marginLeft: "auto" }}>
                  {validationCounts.passed || 0} pass / {validationCounts.warned || 0} warn / {validationCounts.failed || 0} fail
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
