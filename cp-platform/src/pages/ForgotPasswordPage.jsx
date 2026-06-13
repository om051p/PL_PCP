/**
 * ForgotPasswordPage.jsx
 *
 * Refactored to use shared AuthLayout + AuthBanner + parseAuthMessage.
 * Adds: email format validation, toast notifications, back link via layout.
 */

import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Mail, AlertCircle, Loader2, KeyRound, Send, CheckCircle } from 'lucide-react'
import { useAuthStore } from '../store/authStore.js'
import { useRateLimit } from '../hooks/useRateLimit.js'
import { AuthLayout } from '../components/AuthLayout.jsx'
import { AuthBanner, parseAuthMessage } from '../components/AuthBanner.jsx'
import { useToast } from '../components/Toast.jsx'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function ForgotPasswordPage() {
  const navigate = useNavigate()
  const { resetPassword, loading, error, clearError } = useAuthStore()
  const toast = useToast()
  const emailRef = useRef(null)

  const [email, setEmail] = useState('')
  const [localError, setLocalError] = useState('')
  const [success, setSuccess] = useState(false)

  const { isRateLimited, recordAttempt, cooldownRemaining } = useRateLimit({ maxAttempts: 3, windowMs: 10 * 60 * 1000, cooldownMs: 120 * 1000 })

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
    setSuccess(false)

    if (!email) {
      setLocalError('Please enter your email address')
      return
    }
    if (!EMAIL_REGEX.test(email)) {
      setLocalError('Please enter a valid email address')
      return
    }
    if (isRateLimited()) {
      setLocalError(`Too many requests. Please try again in ${cooldownRemaining}s.`)
      return
    }

    try {
      await resetPassword(email)
      setSuccess(true)
      toast.success('Reset link sent', `Check ${email} for instructions`)
    } catch (err) {
      recordAttempt()
      const msg = err instanceof Error ? err.message : 'Failed to send reset email'
      toast.error('Reset failed', msg)
    }
  }

  const displayError = localError || error
  const banner = parseAuthMessage(displayError)

  return (
    <AuthLayout
      title="Reset Password"
      subtitle="RAXA · Secure Account Recovery"
      headerIcon={<KeyRound size={32} className="auth-icon" />}
      brandingVariant="reset"
      showBackLink
      backTo="/login"
      backLabel="Back to Sign In"
    >
      <AuthBanner banner={banner} />

      {success ? (
        <div className="auth-form" data-testid="forgot-success">
          <div className="auth-form__success" role="status">
            <CheckCircle size={20} />
            <div>
              <div style={{ fontWeight: 600, marginBottom: 2 }}>Password reset email sent</div>
              <div style={{ fontSize: 11.5, opacity: 0.85 }}>
                If an account exists for <strong>{email}</strong>, a reset link has been sent. Check your inbox and spam folder.
              </div>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-primary auth-submit"
            onClick={() => navigate('/login')}
          >
            Return to Sign In
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <p className="auth-form-description">
            Enter your email address and we'll send you a secure link to reset your password.
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

          <button
            type="submit"
            className="btn btn-primary auth-submit"
            disabled={loading || cooldownRemaining > 0}
            data-testid="forgot-submit"
          >
            {loading ? (
              <><Loader2 size={16} className="spin" /> Sending...</>
            ) : cooldownRemaining > 0 ? (
              <><AlertCircle size={16} /> Try again in {cooldownRemaining}s</>
            ) : (
              <><Send size={16} /> Send Reset Link</>
            )}
          </button>
        </form>
      )}
    </AuthLayout>
  )
}
