/**
 * PasswordInput.jsx
 *
 * Shared password input with:
 *   - Show/hide toggle button
 *   - Optional strength meter (for register)
 *   - Optional match indicator (for confirm password)
 *   - a11y: proper labels, aria-describedby for strength/match hints
 *
 * Usage:
 *   <PasswordInput
 *     id="password"
 *     label="Password"
 *     value={password}
 *     onChange={setPassword}
 *     showStrength
 *     matchValue={confirmPassword}
 *   />
 */

import { useState, useId } from 'react'
import { Lock, Eye, EyeOff, Check, X } from 'lucide-react'

const STRENGTH_RULES = [
  { test: (p) => p.length >= 8, label: 'At least 8 characters' },
  { test: (p) => /[a-z]/.test(p) && /[A-Z]/.test(p), label: 'Mixed case' },
  { test: (p) => /\d/.test(p), label: 'At least one number' },
  { test: (p) => /[^A-Za-z0-9]/.test(p), label: 'At least one special character' },
]

export function computePasswordStrength(password = '') {
  if (!password) return { score: 0, max: STRENGTH_RULES.length, rules: STRENGTH_RULES.map((r) => ({ label: r.label, ok: false })) }
  const rules = STRENGTH_RULES.map((r) => ({ label: r.label, ok: r.test(password) }))
  const score = rules.filter((r) => r.ok).length
  return { score, max: STRENGTH_RULES.length, rules }
}

const STRENGTH_LEVELS = [
  { label: 'Too weak', color: 'var(--fail)' },
  { label: 'Weak', color: 'var(--fail)' },
  { label: 'Fair', color: 'var(--warn)' },
  { label: 'Good', color: 'var(--brand-mid)' },
  { label: 'Strong', color: 'var(--pass)' },
]

export function PasswordInput({
  id,
  label,
  value,
  onChange,
  placeholder = '••••••••',
  required = false,
  disabled = false,
  autoComplete = 'current-password',
  showStrength = false,
  matchValue, // for confirm password
  showMatchHint = false,
  icon: Icon = Lock,
  className = '',
  testId,
}) {
  const reactId = useId()
  const inputId = id || `pw-${reactId}`
  const strengthId = `${inputId}-strength`
  const matchId = `${inputId}-match`
  const [show, setShow] = useState(false)

  const strength = showStrength ? computePasswordStrength(value) : null
  const matches = showMatchHint && value && matchValue !== undefined
    ? value === matchValue
    : null
  const isTooWeak = showStrength && value && strength.score < 2

  const describedBy = [
    showStrength && strength ? strengthId : null,
    showMatchHint && matches !== null ? matchId : null,
  ].filter(Boolean).join(' ') || undefined

  return (
    <div className={`password-field ${className}`} data-testid={testId}>
      {label && (
        <label className="field-label" htmlFor={inputId}>{label}</label>
      )}
      <div className="input-wrapper">
        <Icon size={18} className="input-icon" aria-hidden="true" />
        <input
          id={inputId}
          type={show ? 'text' : 'password'}
          className={`field-input ${isTooWeak ? 'field-input--weak' : ''}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          required={required}
          aria-describedby={describedBy}
          aria-invalid={isTooWeak || matches === false ? 'true' : undefined}
        />
        <button
          type="button"
          className="password-toggle"
          onClick={() => setShow(!show)}
          aria-label={show ? `Hide ${label?.toLowerCase() || 'password'}` : `Show ${label?.toLowerCase() || 'password'}`}
          tabIndex={-1}
        >
          {show ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </button>
      </div>

      {showStrength && strength && (
        <div className="password-strength" id={strengthId} aria-live="polite">
          <div className="password-strength__bar">
            <div
              className="password-strength__fill"
              style={{
                width: `${(strength.score / strength.max) * 100}%`,
                background: STRENGTH_LEVELS[strength.score]?.color || 'var(--text-tertiary)',
              }}
            />
          </div>
          <div className="password-strength__label" style={{ color: STRENGTH_LEVELS[strength.score]?.color }}>
            {strength.score === 0 ? 'Enter a password' : STRENGTH_LEVELS[strength.score].label}
          </div>
          <ul className="password-strength__rules">
            {strength.rules.map((r) => (
              <li key={r.label} className={r.ok ? 'rule-ok' : 'rule-pending'}>
                {r.ok ? <Check size={11} aria-hidden="true" /> : <X size={11} aria-hidden="true" />}
                <span>{r.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showMatchHint && matches !== null && (
        <div
          className={`password-match ${matches ? 'match-ok' : 'match-fail'}`}
          id={matchId}
          aria-live="polite"
        >
          {matches ? (
            <><Check size={12} aria-hidden="true" /> Passwords match</>
          ) : (
            <><X size={12} aria-hidden="true" /> Passwords do not match</>
          )}
        </div>
      )}
    </div>
  )
}
