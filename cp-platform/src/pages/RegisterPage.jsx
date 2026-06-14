/**
 * RegisterPage.jsx — M13 Redesign
 *
 * Migrated from AuthLayout → AuthPageShell (glassmorphism + animated mesh).
 * Adds premium dark-mode form with segmented password strength bar.
 */

import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { Mail, AlertCircle, Loader2, UserPlus, CheckCircle, ShieldCheck } from 'lucide-react'
import { useAuthStore } from '../store/authStore.js'
import { useRateLimit } from '../hooks/useRateLimit.js'
import { AUTH_ALLOWED_DOMAINS } from '../config/authPolicy.js'
import { AuthPageShell } from '../components/AuthPageShell.jsx'
import { AuthBanner, parseAuthMessage } from '../components/AuthBanner.jsx'
import { PasswordInput, computePasswordStrength } from '../components/PasswordInput.jsx'
import { useToast } from '../components/Toast.jsx'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const STRENGTH_META = [
  { label: 'Weak',   cls: 'weak'   },
  { label: 'Fair',   cls: 'fair'   },
  { label: 'Good',   cls: 'good'   },
  { label: 'Strong', cls: 'strong' },
]

export function RegisterPage() {
  const navigate = useNavigate()
  const { register, loading, error, clearError } = useAuthStore()
  const toast = useToast()
  const emailRef = useRef(null)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [localError, setLocalError] = useState('')
  const [success, setSuccess] = useState(false)

  const { isRateLimited, recordAttempt, cooldownRemaining } = useRateLimit({
    maxAttempts: 5,
    windowMs: 5 * 60 * 1000,
    cooldownMs: 60 * 1000,
  })

  useEffect(() => {
    clearError()
    return () => clearError()
  }, [clearError])

  useEffect(() => {
    if (!success) emailRef.current?.focus()
  }, [success])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLocalError('')
    clearError()

    if (!email || !password || !confirmPassword) {
      setLocalError('Please fill in all fields')
      return
    }
    if (!EMAIL_REGEX.test(email)) {
      setLocalError('Please enter a valid email address')
      return
    }
    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters')
      return
    }
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match')
      return
    }
    if (!acceptTerms) {
      setLocalError('Please accept the terms of service and privacy policy to continue')
      return
    }
    if (isRateLimited()) {
      setLocalError(`Too many attempts. Please try again in ${cooldownRemaining}s.`)
      return
    }

    try {
      await register(email, password)
      setSuccess(true)
      toast.success('Account created', 'Check your email to verify your address')
    } catch (err) {
      recordAttempt()
      const msg = err instanceof Error ? err.message : 'Failed to create account'
      toast.error('Registration failed', msg)
    }
  }

  const displayError = localError || error
  const banner = parseAuthMessage(displayError)
  const strength = computePasswordStrength(password)

  // Map score 0-4 → 0-3 (4 segments: Weak/Fair/Good/Strong)
  const strengthIdx = strength.score === 0 ? -1 : Math.min(strength.score - 1, 3)

  return (
    <AuthPageShell
      title="Create Account"
      subtitle="Join your engineering team on RAXA"
      heroTitle={"Join the\nplatform."}
      heroBody="Register for access to the RAXA CP Engineering Platform. New accounts are subject to administrator approval."
      testId="auth-register"
      backTo="/login"
      backLabel="Back to Sign In"
    >
      <AuthBanner banner={banner} />

      {success ? (
        <div className="auth-form" data-testid="register-success">
          <div className="auth-form__success" role="status">
            <CheckCircle size={20} />
            <div>
              <div style={{ fontWeight: 600, marginBottom: 2 }}>Account created</div>
              <div style={{ fontSize: 11.5, opacity: 0.85 }}>
                A verification email has been sent to <strong>{email}</strong>. Verify your address to enable sign-in.
              </div>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-primary auth-submit"
            onClick={() => navigate('/login')}
          >
            Go to Sign In
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <p className="auth-form-description">
            New accounts are subject to administrator approval. You'll receive an email once your access is granted.
          </p>

          {/* Email */}
          <div className="form-group">
            <label className="field-label" htmlFor="reg-email">Email</label>
            <div className="input-wrapper">
              <Mail size={18} className="input-icon" aria-hidden="true" />
              <input
                ref={emailRef}
                id="reg-email"
                type="email"
                className="field-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="engineer@ikkgroup.com"
                autoComplete="email"
                disabled={loading}
                required
                aria-invalid={localError && !EMAIL_REGEX.test(email) ? 'true' : undefined}
              />
            </div>
          </div>

          {/* Password + strength bar */}
          <PasswordInput
            id="reg-password"
            label="Password"
            value={password}
            onChange={setPassword}
            disabled={loading}
            autoComplete="new-password"
            showStrength
            testId="register-password"
          />

          {/* Premium segmented strength bar */}
          {password.length > 0 && (
            <div style={{ marginTop: -8 }}>
              <div className="password-strength-bar" role="presentation" aria-hidden="true">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`password-strength-bar__segment ${
                      i <= strengthIdx
                        ? `password-strength-bar__segment--active-${
                            strengthIdx === 0 ? 'weak'
                            : strengthIdx === 1 ? 'fair'
                            : strengthIdx === 2 ? 'good'
                            : 'strong'
                          }`
                        : ''
                    }`}
                  />
                ))}
              </div>
              {strengthIdx >= 0 && (
                <div className={`password-strength-label password-strength-label--${STRENGTH_META[strengthIdx]?.cls}`}>
                  {STRENGTH_META[strengthIdx]?.label}
                </div>
              )}
            </div>
          )}

          {/* Confirm password */}
          <PasswordInput
            id="reg-confirm"
            label="Confirm Password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            disabled={loading}
            autoComplete="new-password"
            showMatchHint
            matchValue={password}
            testId="register-confirm"
          />

          {/* Terms */}
          <label className="auth-form__checkbox">
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              disabled={loading}
              data-testid="accept-terms"
            />
            <ShieldCheck size={14} style={{ color: 'rgba(45,106,159,0.8)', flexShrink: 0 }} aria-hidden="true" />
            <span>
              I accept the <a href="#terms" target="_blank" rel="noopener noreferrer">Terms of Service</a> and <a href="#privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
            </span>
          </label>

          {/* Submit */}
          <button
            type="submit"
            className="btn btn-primary auth-submit"
            disabled={loading || cooldownRemaining > 0}
            data-testid="register-submit"
          >
            {loading ? (
              <><Loader2 size={16} className="spin" /> Creating account...</>
            ) : cooldownRemaining > 0 ? (
              <><AlertCircle size={16} /> Try again in {cooldownRemaining}s</>
            ) : (
              <><UserPlus size={16} /> Create Account</>
            )}
          </button>
        </form>
      )}

      <div className="auth-footer">
        <p>IKK Group accounts only · {AUTH_ALLOWED_DOMAINS.length > 0 ? AUTH_ALLOWED_DOMAINS.join(', ') : 'Contact admin'}</p>
      </div>
    </AuthPageShell>
  )
}
