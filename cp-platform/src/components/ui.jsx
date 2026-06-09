/**
 * SHARED UI COMPONENTS
 * Reusable, domain-agnostic engineering UI primitives.
 */

import { useState } from 'react'
import { ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, XCircle, Info, AlertCircle } from 'lucide-react'

// ─── FieldInput ───────────────────────────────────────────────────────────────

export function FieldInput({ label, value, onChange, unit, type = 'number', step, min, max, readOnly, hint, className = '' }) {
  return (
    <div className={`field ${className}`}>
      <label className="field-label">{label}</label>
      <div className="field-input-wrap">
        <input
          type={type}
          value={value ?? ''}
          onChange={e => onChange && onChange(type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
          step={step}
          min={min}
          max={max}
          readOnly={readOnly}
          className={`field-input ${readOnly ? 'field-input--readonly' : ''}`}
        />
        {unit && <span className="field-unit">{unit}</span>}
      </div>
      {hint && <div className="field-hint">{hint}</div>}
    </div>
  )
}

// ─── SelectField ──────────────────────────────────────────────────────────────

export function SelectField({ label, value, onChange, options, hint }) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      <select
        value={value}
        onChange={e => onChange && onChange(e.target.value)}
        className="field-input"
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
      {hint && <div className="field-hint">{hint}</div>}
    </div>
  )
}

// ─── ResultRow ────────────────────────────────────────────────────────────────

export function ResultRow({ label, symbol, value, unit, highlight, formula }) {
  const [showFormula, setShowFormula] = useState(false)
  return (
    <div className={`result-row ${highlight ? 'result-row--highlight' : ''}`}>
      <span className="result-label">{label}</span>
      {symbol && <span className="result-sym">{symbol}</span>}
      <span className="result-val">{value}</span>
      {unit && <span className="result-unit">{unit}</span>}
      {formula && (
        <button
          className="formula-toggle"
          onClick={() => setShowFormula(v => !v)}
          title="Show formula"
        >
          {showFormula ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      )}
      {showFormula && formula && (
        <div className="formula-box">{formula}</div>
      )}
    </div>
  )
}

// ─── CheckRow ─────────────────────────────────────────────────────────────────

export function CheckRow({ check }) {
  const icons = {
    pass: <CheckCircle2 size={16} />,
    fail: <XCircle size={16} />,
    warning: <AlertTriangle size={16} />,
    info: <Info size={16} />,
  }
  return (
    <div className={`check-row check-row--${check.status}`}>
      <span className="check-icon">{icons[check.status]}</span>
      <div className="check-body">
        <span className="check-label">{check.label}</span>
        <span className="check-val">{check.computed}</span>
        {check.recommendation && (
          <div className="check-recommendation">{check.recommendation}</div>
        )}
      </div>
    </div>
  )
}

// ─── InsightCard ──────────────────────────────────────────────────────────────

export function InsightCard({ insight }) {
  const [expanded, setExpanded] = useState(false)
  const icons = {
    error: <XCircle size={16} />,
    warning: <AlertTriangle size={16} />,
    info: <Info size={16} />,
    success: <CheckCircle2 size={16} />,
  }
  return (
    <div className={`insight-card insight-card--${insight.severity}`}>
      <div className="insight-header" onClick={() => setExpanded(v => !v)}>
        <span className="insight-icon">{icons[insight.severity]}</span>
        <span className="insight-title">{insight.title}</span>
        <span className="insight-toggle">{expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
      </div>
      {expanded && (
        <div className="insight-body">
          <p className="insight-message">{insight.message}</p>
          {insight.recommendations?.length > 0 && (
            <ul className="insight-recs">
              {insight.recommendations.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

export function StatCard({ label, value, unit, sub, color }) {
  return (
    <div className="stat-card" style={color ? { borderTopColor: color } : {}}>
      <div className="stat-label">{label}</div>
      <div className="stat-val">{value}</div>
      {unit && <div className="stat-unit">{unit}</div>}
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
}

// ─── SectionCard ─────────────────────────────────────────────────────────────

export function SectionCard({ title, icon: Icon, children, action, className = '' }) {
  return (
    <div className={`section-card ${className}`}>
      <div className="section-card-header">
        <div className="section-card-title">
          {Icon && <Icon size={15} />}
          <span>{title}</span>
        </div>
        {action && <div className="section-card-action">{action}</div>}
      </div>
      <div className="section-card-body">{children}</div>
    </div>
  )
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────

export function StatusBadge({ status, label }) {
  return (
    <span className={`status-badge status-badge--${status.replace(/_/g, '-')}`}>
      {label || status.replace(/_/g, ' ')}
    </span>
  )
}

// ─── WorkflowStepper ─────────────────────────────────────────────────────────

export function WorkflowStepper({ currentStatus }) {
  const STEPS = [
    { id: 'draft', label: 'Draft' },
    { id: 'input_complete', label: 'Input Complete' },
    { id: 'calculated', label: 'Calculated' },
    { id: 'engineering_review', label: 'Review' },
    { id: 'optimized', label: 'Optimized' },
    { id: 'approved', label: 'Approved' },
    { id: 'issued_for_construction', label: 'Issued' },
  ]
  const currentIdx = STEPS.findIndex(s => s.id === currentStatus)

  return (
    <div className="workflow-stepper">
      {STEPS.map((step, i) => (
        <div
          key={step.id}
          className={`workflow-step ${i < currentIdx ? 'workflow-step--done' : ''} ${i === currentIdx ? 'workflow-step--active' : ''} ${i > currentIdx ? 'workflow-step--future' : ''}`}
        >
          <div className="workflow-step-dot">
            {i < currentIdx ? <CheckCircle2 size={14} /> : <span>{i + 1}</span>}
          </div>
          <span className="workflow-step-label">{step.label}</span>
          {i < STEPS.length - 1 && <div className="workflow-step-line" />}
        </div>
      ))}
    </div>
  )
}

// ─── InfoBox ──────────────────────────────────────────────────────────────────

export function InfoBox({ type = 'info', children }) {
  const icons = { info: Info, warning: AlertTriangle, error: AlertCircle }
  const Icon = icons[type] || Info
  return (
    <div className={`info-box info-box--${type}`}>
      <Icon size={14} className="info-box-icon" />
      <span>{children}</span>
    </div>
  )
}

// ─── Divider ──────────────────────────────────────────────────────────────────

export function Divider({ label }) {
  if (label) return (
    <div className="divider-labeled">
      <span className="divider-label">{label}</span>
    </div>
  )
  return <hr className="divider" />
}

// ─── Grid ─────────────────────────────────────────────────────────────────────

export function Grid2({ children }) {
  return <div className="grid-2">{children}</div>
}

export function Grid3({ children }) {
  return <div className="grid-3">{children}</div>
}
