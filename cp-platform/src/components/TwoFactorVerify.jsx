/**
 * TwoFactorVerify.jsx
 *
 * 2-step verification screen shown AFTER successful email/password login.
 * The user enters a 6-digit code from their authenticator app.
 *
 * Supports:
 *   - Numeric-only input (auto-advance to next digit on entry)
 *   - Paste support (paste a 6-digit code and it fills all boxes)
 *   - Backspace navigation
 *   - Auto-submit when all 6 digits entered
 *   - Resend code button (with 30s cooldown)
 *   - "Use a different account" escape
 *
 * Usage:
 *   <TwoFactorVerify
 *     onVerify={async (code) => { /* call 2fa API *\/ }}
 *     onResend={async () => { /* resend *\/ }}
 *     onBack={async () => { /* sign out and go to login *\/ }}
 *     email="user@example.com"
 *     method="authenticator"  // or 'email' or 'sms'
 *   />
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { ShieldCheck, ArrowLeft, Loader2, RotateCw, AlertCircle, Mail, Smartphone } from 'lucide-react'

const CODE_LENGTH = 6

export function TwoFactorVerify({
  onVerify,
  onResend,
  onBack,
  email,
  method = 'authenticator',
  loading = false,
  error = null,
  testId = 'two-factor-verify',
}) {
  const [digits, setDigits] = useState(Array(CODE_LENGTH).fill(''))
  const [cooldown, setCooldown] = useState(30)
  const inputRefs = useRef([])

  // Cooldown timer for the resend button
  useEffect(() => {
    if (cooldown <= 0) return undefined
    const t = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [cooldown])

  const focusInput = useCallback((idx) => {
    const input = inputRefs.current[idx]
    if (input) input.focus()
  }, [])

  const handleChange = useCallback((idx, raw) => {
    const value = raw.replace(/[^0-9]/g, '').slice(0, 1)
    setDigits((prev) => {
      const next = [...prev]
      next[idx] = value
      return next
    })
    if (value && idx < CODE_LENGTH - 1) focusInput(idx + 1)
    if (value && idx === CODE_LENGTH - 1) {
      // Auto-submit when last digit entered
      const code = [...digits.slice(0, CODE_LENGTH - 1), value].join('')
      if (code.length === CODE_LENGTH) onVerify?.(code)
    }
  }, [digits, focusInput, onVerify])

  const handleKeyDown = useCallback((idx, e) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      focusInput(idx - 1)
      setDigits((prev) => {
        const next = [...prev]
        next[idx - 1] = ''
        return next
      })
    } else if (e.key === 'ArrowLeft' && idx > 0) {
      focusInput(idx - 1)
    } else if (e.key === 'ArrowRight' && idx < CODE_LENGTH - 1) {
      focusInput(idx + 1)
    }
  }, [digits, focusInput])

  const handlePaste = useCallback((e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, CODE_LENGTH)
    if (!pasted) return
    setDigits((prev) => {
      const next = [...prev]
      for (let i = 0; i < CODE_LENGTH; i++) next[i] = pasted[i] || ''
      return next
    })
    if (pasted.length === CODE_LENGTH) {
      focusInput(CODE_LENGTH - 1)
      onVerify?.(pasted)
    } else {
      focusInput(pasted.length)
    }
  }, [focusInput, onVerify])

  const handleResend = useCallback(async () => {
    if (cooldown > 0) return
    await onResend?.()
    setCooldown(30)
  }, [cooldown, onResend])

  const methodIcon = method === 'email' ? Mail : method === 'sms' ? Smartphone : ShieldCheck
  const MethodIcon = methodIcon

  return (
    <div className="twofa" data-testid={testId}>
      <div className="twofa__header">
        <MethodIcon size={32} className="twofa__icon" aria-hidden="true" />
        <h2 className="twofa__title">Two-factor verification</h2>
        <p className="twofa__subtitle">
          {method === 'authenticator' && 'Enter the 6-digit code from your authenticator app.'}
          {method === 'email' && `Enter the 6-digit code we sent to ${email || 'your email'}.`}
          {method === 'sms' && `Enter the 6-digit code we sent to your phone.`}
        </p>
      </div>

      {error && (
        <div className="twofa__error" role="alert" data-testid="twofa-error">
          <AlertCircle size={14} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <div className="twofa__code-row" role="group" aria-label="Verification code">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el }}
            type="text"
            inputMode="numeric"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            maxLength={1}
            value={d}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={i === 0 ? handlePaste : undefined}
            disabled={loading}
            className="twofa__digit"
            aria-label={`Digit ${i + 1} of ${CODE_LENGTH}`}
            data-testid={`twofa-digit-${i}`}
          />
        ))}
      </div>

      <button
        type="button"
        className="btn btn-primary twofa__submit"
        onClick={() => onVerify?.(digits.join(''))}
        disabled={loading || digits.join('').length !== CODE_LENGTH}
        data-testid="twofa-submit"
      >
        {loading ? <><Loader2 size={16} className="spin" /> Verifying...</> : <><ShieldCheck size={16} /> Verify</>}
      </button>

      <div className="twofa__actions">
        <button
          type="button"
          className="twofa__link"
          onClick={handleResend}
          disabled={cooldown > 0}
          data-testid="twofa-resend"
        >
          <RotateCw size={12} aria-hidden="true" />
          {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
        </button>
        <span className="twofa__sep">·</span>
        <button
          type="button"
          className="twofa__link"
          onClick={onBack}
          data-testid="twofa-back"
        >
          <ArrowLeft size={12} aria-hidden="true" />
          Use a different account
        </button>
      </div>
    </div>
  )
}
