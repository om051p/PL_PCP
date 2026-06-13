/**
 * RegisterPage.jsx
 *
 * Refactored to use shared AuthLayout + AuthBanner + PasswordInput.
 * Adds: password strength meter, password match indicator, terms checkbox,
 * email format validation, toast notifications, back link.
 */

import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { Mail, AlertCircle, Loader2, UserPlus, CheckCircle, ShieldCheck } from 'lucide-react'
import { useAuthStore } from '../store/authStore.js'
import { useRateLimit } from '../hooks/useRateLimit.js'
import { AUTH_ALLOWED_DOMAINS } from '../config/authPolicy.js'
import { AuthLayout } from '../components/AuthLayout.jsx'
import { AuthBanner, parseAuthMessage } from '../components/AuthBanner.jsx'
import { PasswordInput } from '../components/PasswordInput.jsx'
import { useToast } from '../components/Toast.jsx'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function RegisterPage() {
  const navigate = useNavigate()
  const location = useLocation()
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

  return (
    <AuthLayout
      title="Create Account"
      subtitle="RAXA · Join your engineering team"
      headerIcon={<UserPlus size={32} className="auth-icon" />}
      brandingVariant="register"
      showBackLink
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

          <div className="form-group">
            <label className="field-label" htmlFor="email">Email</label>
            <div className="input-wrapper">
              <Mail size={18} className="input-icon" aria-hidden="true" />
              <input
                ref={emailRef}
                id="email"
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

          <PasswordInput
            id="password"
            label="Password"
            value={password}
            onChange={setPassword}
            disabled={loading}
            autoComplete="new-password"
            showStrength
            testId="register-password"
          />

          <PasswordInput
            id="confirm-password"
            label="Confirm Password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            disabled={loading}
            autoComplete="new-password"
            showMatchHint
            matchValue={password}
            testId="register-confirm"
          />

          <label className="auth-form__checkbox">
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              disabled={loading}
              data-testid="accept-terms"
            />
            <ShieldCheck size={14} style={{ color: 'var(--brand-mid)' }} aria-hidden="true" />
            <span>
              I accept the <a href="#terms" target="_blank" rel="noopener noreferrer">Terms of Service</a> and <a href="#privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
            </span>
          </label>

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
    </AuthLayout>
  )
}
