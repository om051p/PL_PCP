import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * Renders a validation status badge.
 */
function StatusBadge({ status, label }) {
  let className = 'badge '
  let icon
  if (status === 'pass') {
    className += 'badge-success'
    icon = '✓'
  } else if (status === 'warn') {
    className += 'badge-warning'
    icon = '⚠️'
  } else {
    className += 'badge-danger'
    icon = '✗'
  }

  return (
    <span className={`${className} flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold`} style={{ textTransform: 'uppercase' }}>
      <span>{icon}</span>
      <span>{label || status}</span>
    </span>
  )
}

/**
 * Interactive step row inside the TracePanel.
 * Renders Level 1 (always visible) and Level 2 (expanded) detailed mathematical trace.
 */
function TraceStepRow({ step, recommendations = [] }) {
  const [expanded, setExpanded] = useState(false)
  const { formula, summary, detail } = step
  
  // Find recommendations linked to this step
  const stepRecs = recommendations.filter(r => r.traceStepId === step.stepId)

  return (
    <div className="trace-step-card border border-border rounded-lg mb-4 overflow-hidden bg-surface transition-all hover:border-border-hover">
      {/* Level 1: Always Visible Summary */}
      <div 
        className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h4 className="text-sm font-semibold text-text-primary">{step.label}</h4>
            <span className="text-xs text-text-secondary font-mono bg-surface-hover px-1.5 py-0.5 rounded border border-border">
              {summary.standard} {formula.standardClause || ''}
            </span>
            <StatusBadge status={summary.validation.status} label={summary.validation.criterion} />
          </div>
          
          <div className="flex items-center gap-4 text-xs text-text-secondary flex-wrap mt-2">
            <span className="font-semibold text-text-primary font-mono text-base">
              {summary.output.value} {summary.output.unit}
            </span>
            <span className="text-text-muted">|</span>
            <span className="text-xs text-text-secondary">
              Formula: <span className="font-semibold text-text-primary">{summary.formulaName}</span>
            </span>
            <span className="text-text-muted">|</span>
            <span className="flex items-center gap-2 flex-wrap">
              Inputs:
              {summary.keyInputs.map((inp, idx) => (
                <span key={idx} className="bg-surface-hover px-1.5 py-0.5 rounded font-mono border border-border">
                  {inp.symbol} = {inp.value} {inp.unit}
                </span>
              ))}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end md:self-auto">
          {stepRecs.length > 0 && (
            <span className="badge badge-warning text-xs font-semibold px-2 py-0.5 rounded">
              {stepRecs.length} Advisory {stepRecs.length === 1 ? 'Tip' : 'Tips'}
            </span>
          )}
          <button className="btn btn-sm btn-secondary flex items-center justify-center p-1 rounded-md">
            <span className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>▼</span>
          </button>
        </div>
      </div>

      {/* Level 2: Detailed Mathematical Provenance (Collapsible) */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            <div className="p-4 border-t border-border bg-surface-hover text-xs text-text-secondary">
              {/* Formula & Substitution Math block */}
              <div className="mb-4">
                <h5 className="font-semibold text-text-primary mb-1">Mathematical Substitution</h5>
                <div className="bg-surface p-3 rounded border border-border font-mono whitespace-pre-wrap text-text-primary text-sm overflow-x-auto">
                  <div className="text-xs text-text-muted mb-1">{formula.equation}</div>
                  <div>{detail.substitution}</div>
                </div>
              </div>

              {/* Linked Advisory Tips (if any) */}
              {stepRecs.length > 0 && (
                <div className="mb-4 bg-orange-500 bg-opacity-10 border border-orange-500 border-opacity-20 p-3 rounded-lg">
                  <h5 className="font-semibold text-orange-400 mb-2 flex items-center gap-1">
                    <span>⚠️</span>
                    <span>Engineering Advisory Tips</span>
                  </h5>
                  <div className="flex flex-col gap-2">
                    {stepRecs.map((rec, idx) => (
                      <div key={idx} className="text-xs">
                        <div className="font-bold text-text-primary">{rec.title}</div>
                        <div>{rec.message}</div>
                        <div className="text-text-muted mt-1 italic">Action: {rec.action}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Intermediates Table */}
              {detail.intermediates && detail.intermediates.length > 0 && (
                <div className="mb-4">
                  <h5 className="font-semibold text-text-primary mb-1.5 font-sans">Intermediate Values</h5>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse border border-border bg-surface rounded-lg overflow-hidden">
                      <thead>
                        <tr className="bg-surface-hover border-b border-border text-text-primary">
                          <th className="p-2 font-semibold">Parameter / Step</th>
                          <th className="p-2 font-semibold">Value</th>
                          <th className="p-2 font-semibold">Unit</th>
                          <th className="p-2 font-semibold">Calculation / Method</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.intermediates.map((item, idx) => (
                          <tr key={idx} className="border-b border-border last:border-0 hover:bg-surface-hover">
                            <td className="p-2 font-medium text-text-primary">{item.label}</td>
                            <td className="p-2 font-mono text-text-primary">{item.value}</td>
                            <td className="p-2 font-mono">{item.unit || '-'}</td>
                            <td className="p-2 text-text-muted">{item.description || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Assumptions & Notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <div>
                  <h5 className="font-semibold text-text-primary mb-1">Underlying Assumptions</h5>
                  <ul className="list-disc pl-4 space-y-1">
                    {detail.assumptions.map((ass, idx) => (
                      <li key={idx}>{ass}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h5 className="font-semibold text-text-primary mb-1">Engineering Reference Notes</h5>
                  <p className="leading-relaxed">{detail.engineeringNotes}</p>
                  {formula.reference && (
                    <div className="mt-2 text-text-muted text-[10px] italic">
                      Bibliography: {formula.reference}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * Main TracePanel Component.
 * Surfaces calculation steps and variable substitutions for a calculated station.
 */
export function TracePanel({ station, recommendations = [] }) {
  const trace = station?.lastCalcResult?.trace

  if (!station || !station.lastCalcResult) {
    return (
      <div className="p-6 text-center border border-dashed border-border rounded-lg bg-surface text-text-secondary">
        <span className="text-xl">📊</span>
        <h4 className="mt-2 font-semibold text-text-primary text-sm">No Calculation Trace Available</h4>
        <p className="text-xs mt-1">Please configure inputs and run calculations to audit math provenance.</p>
      </div>
    )
  }

  if (!trace || !trace.steps) {
    return (
      <div className="p-6 text-center border border-dashed border-border rounded-lg bg-surface text-text-secondary">
        <span className="text-xl">⚠️</span>
        <h4 className="mt-2 font-semibold text-text-primary text-sm">Trace Engine Not Activated</h4>
        <p className="text-xs mt-1">Calculations exist but do not contain traceability records. Recalculate to generate details.</p>
      </div>
    )
  }

  return (
    <div className="traceability-panel">
      <div className="flex items-center justify-between mb-4 border-b border-border pb-2">
        <div>
          <h3 className="text-base font-semibold text-text-primary">Engineering Calculation Traceability</h3>
          <p className="text-xs text-text-secondary">Verifiable Dwight, Sunde, NACE, and Aramco math audit trail</p>
        </div>
        <div className="text-xs text-text-secondary bg-surface-hover border border-border px-2 py-1 rounded font-mono">
          Standard: <span className="font-semibold text-text-primary">{trace.standardId === 'nace' ? 'NACE SP0169' : 'SAES-X-400'}</span>
        </div>
      </div>

      <div className="trace-steps-container">
        {trace.steps.map((step, idx) => (
          <TraceStepRow key={idx} step={step} recommendations={recommendations} />
        ))}
      </div>
    </div>
  )
}

export default TracePanel
