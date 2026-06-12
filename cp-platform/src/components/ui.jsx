/**
 * SHARED UI COMPONENTS
 * Reusable, domain-agnostic engineering UI primitives.
 */

import { useState, useEffect, useRef, useId } from 'react'
import {
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  AlertCircle,
  Trash2,
  Bookmark,
  Moon,
  Sun,
} from 'lucide-react'
import { getActiveStandard } from '../constants/index.js'
import { useProjectStore } from '../store/projectStore.js'
import { useAuthStore } from '../store/authStore.js'

// ─── FieldInput ───────────────────────────────────────────────────────────────

export function FieldInput({
  label,
  value,
  onChange,
  unit,
  unitTitle,
  type = 'number',
  step,
  min,
  max,
  readOnly,
  hint,
  className = '',
  ariaLabel,
}) {
  const user = useAuthStore((s) => s.user)
  const project = useProjectStore((s) => s.getProject())
  const activeStationId = useProjectStore((s) => s.activeStationId)
  const activeStation = project?.stations?.find((st) => st.id === activeStationId)
  const isLocked = project?.status === 'approved' || project?.status === 'issued_for_construction' || 
                   activeStation?.status === 'approved' || activeStation?.status === 'issued_for_construction'
  const isReadOnly = readOnly || user?.role === 'reviewer' || user?.role === 'viewer' || isLocked
  const generatedId = useId().replace(/[^a-z0-9]/g, '')
  const inputId = ((ariaLabel || label || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')) || `field-input-${generatedId}`
  
  return (
    <div className={`field ${className}`}>
      {label && <label className="field-label" htmlFor={inputId}>{label}</label>}
      <div className="field-input-wrap">
        <input
          id={inputId}
          type={type}
          value={value ?? ''}
          onChange={(e) => {
            if (!onChange) return
            let v = e.target.value
            if (type === 'number') {
              v = parseFloat(v) || 0
              if (min !== undefined) v = Math.max(min, v)
              if (max !== undefined) v = Math.min(max, v)
            }
            onChange(v)
          }}
          step={step}
          min={min}
          max={max}
          readOnly={isReadOnly}
          disabled={isReadOnly && type === 'checkbox'}
          aria-label={ariaLabel || label || ''}
          className={`field-input ${isReadOnly ? 'field-input--readonly' : ''}`}
        />
        {unit && (
          <span className="field-unit" title={unitTitle}>
            {unit}
          </span>
        )}
      </div>
      {hint && <div className="field-hint">{hint}</div>}
    </div>
  )
}

// ─── SelectField ──────────────────────────────────────────────────────────────

export function SelectField({ label, value, onChange, options, hint }) {
  const user = useAuthStore((s) => s.user)
  const project = useProjectStore((s) => s.getProject())
  const activeStationId = useProjectStore((s) => s.activeStationId)
  const activeStation = project?.stations?.find((st) => st.id === activeStationId)
  const isLocked = project?.status === 'approved' || project?.status === 'issued_for_construction' || 
                   activeStation?.status === 'approved' || activeStation?.status === 'issued_for_construction'
  const isReadOnly = user?.role === 'reviewer' || user?.role === 'viewer' || isLocked
  const selectId = ((label || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')) || 'select-field'
  
  return (
    <div className="field">
      <label className="field-label" htmlFor={selectId}>{label}</label>
      <select
        id={selectId}
        value={value}
        onChange={(e) => onChange && onChange(e.target.value)}
        className="field-input"
        aria-label={label}
        disabled={isReadOnly}
      >
        {options.map((opt) => (
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
          onClick={() => setShowFormula((v) => !v)}
          title="Show formula"
        >
          {showFormula ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      )}
      {showFormula && formula && <div className="formula-box">{formula}</div>}
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
        {check.recommendation && <div className="check-recommendation">{check.recommendation}</div>}
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
      <div className="insight-header" onClick={() => setExpanded((v) => !v)}>
        <span className="insight-icon">{icons[insight.severity]}</span>
        <span className="insight-title">{insight.title}</span>
        <span className="insight-toggle">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
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
  const [pulse, setPulse] = useState(false)
  const prevValue = useRef(value)

  useEffect(() => {
    if (value === undefined || value === null || value === '—' || value === '0') return
    if (prevValue.current === value) return
    prevValue.current = value
    setPulse(true)
    const timer = setTimeout(() => setPulse(false), 1000)
    return () => clearTimeout(timer)
  }, [value])

  return (
    <div
      className={`stat-card ${pulse ? 'result-val--pulse' : ''}`}
      style={color ? { borderTopColor: color } : {}}
    >
      <div className="stat-label">{label}</div>
      <div className="stat-val">{value}</div>
      {unit && <div className="stat-unit">{unit}</div>}
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
}

// ─── ResultKPICard ─────────────────────────────────────────────────────────────

export function ResultKPICard({
  title,
  value,
  unit,
  status, // 'pass', 'fail', 'stale'
  limitText,
  safetyMargin,
  stale,
}) {
  const icons = {
    pass: <CheckCircle2 size={13} style={{ verticalAlign: 'middle', marginRight: 2 }} />,
    fail: <XCircle size={13} style={{ verticalAlign: 'middle', marginRight: 2 }} />,
    stale: <AlertTriangle size={13} style={{ verticalAlign: 'middle', marginRight: 2 }} />,
  }

  const borderClass = stale
    ? 'result-kpi-card--stale'
    : status === 'fail'
    ? 'result-kpi-card--fail'
    : 'result-kpi-card--pass'

  return (
    <div className={`result-kpi-card ${borderClass}`}>
      <div className="result-kpi-title">{title}</div>
      <div className="result-kpi-value-wrap">
        <span className="result-kpi-value">{value}</span>
        {unit && <span className="result-kpi-unit">{unit}</span>}
      </div>
      {(limitText || safetyMargin || stale) && (
        <div className="result-kpi-footer">
          <div className="result-kpi-limit">{limitText || ''}</div>
          <div>
            {stale ? (
              <span className="result-kpi-badge result-kpi-badge--stale">
                {icons.stale} Recalc
              </span>
            ) : safetyMargin ? (
              <span className={`result-kpi-margin result-kpi-margin--${status === 'fail' ? 'fail' : 'pass'}`}>
                {safetyMargin}
              </span>
            ) : status === 'fail' ? (
              <span className="result-kpi-badge result-kpi-badge--fail">
                {icons.fail} Fail
              </span>
            ) : (
              <span className="result-kpi-badge result-kpi-badge--pass">
                {icons.pass} Pass
              </span>
            )}
          </div>
        </div>
      )}
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
  const currentIdx = STEPS.findIndex((s) => s.id === currentStatus)

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

// ─── ConfirmDialog ────────────────────────────────────────────────────────────

export function ConfirmDialog({ open, title, message, confirmLabel = 'Delete', cancelLabel = 'Cancel', onConfirm, onCancel, variant = 'danger' }) {
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (e.key === 'Escape') onCancel?.()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div className="dialog" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h3 className="dialog-title">
          <span className="dialog-title-icon">
            <AlertCircle size={18} color="var(--fail)" />
          </span>
          {title}
        </h3>
        <p className="dialog-message">{message}</p>
        <div className="dialog-actions">
          <button className="btn" onClick={onCancel} autoFocus>
            {cancelLabel}
          </button>
          <button className={`btn btn-${variant}`} onClick={onConfirm}>
            <Trash2 size={14} />
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── ValidationErrors ─────────────────────────────────────────────────────────

export function ValidationErrors({ errors }) {
  if (!errors || errors.length === 0) return null
  return (
    <div className="validation-errors-banner">
      <div className="validation-errors-title">
        <XCircle size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
        Cannot calculate — fix these input errors
      </div>
      {errors.map((err, i) => (
        <div key={i} className="validation-error-item">
          <strong>{err.path}</strong>: {err.message}
        </div>
      ))}
    </div>
  )
}

// ─── Divider ──────────────────────────────────────────────────────────────────

export function Divider({ label, action }) {
  if (label)
    return (
      <div className="divider-labeled">
        <span className="divider-label">{label}</span>
        {action && <div className="divider-action">{action}</div>}
      </div>
    )
  return <hr className="divider" />
}

// ─── StandardBadge ────────────────────────────────────────────────────────────

export function StandardBadge({ project }) {
  const std = getActiveStandard(project)
  if (!std) return null
  return (
    <span className="standard-badge">
      <Bookmark size={12} className="standard-badge-icon" />
      <span className="standard-badge-label">{std.label}</span>
      <span className="standard-badge-version">{std.version}</span>
    </span>
  )
}

// ─── ThemeToggle ────────────────────────────────────────────────────────────────

export function ThemeToggle() {
  const theme = useProjectStore((s) => s.ui.theme)
  const setTheme = useProjectStore((s) => s.setTheme)
  return (
    <button
      className="btn btn-icon theme-toggle"
      onClick={() => {
        const next = theme === 'dark' ? 'light' : 'dark'
        setTheme(next)
      }}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  )
}

// ─── Dropdown ──────────────────────────────────────────────────────────────────

export function Dropdown({ trigger, children }) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef(null)
  const contentRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (triggerRef.current && !triggerRef.current.contains(e.target)) {
        if (contentRef.current && !contentRef.current.contains(e.target)) {
          setOpen(false)
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="dropdown" ref={triggerRef}>
      <div className="dropdown-trigger" onClick={() => setOpen(!open)}>{trigger}</div>
      {open && (
        <div className="dropdown-content" ref={contentRef}>{children}</div>
      )}
    </div>
  )
}

export function DropdownItem({ children, onClick, icon, className = '' }) {
  return (
    <button
      className={`dropdown-item ${className}`}
      onClick={() => {
        onClick?.()
      }}
    >
      {icon && <span className="dropdown-item-icon">{icon}</span>}
      <span>{children}</span>
    </button>
  )
}

// ─── Grid ─────────────────────────────────────────────────────────────────────

export function Grid2({ children }) {
  return <div className="grid-2">{children}</div>
}

export function Grid3({ children }) {
  return <div className="grid-3">{children}</div>
}
