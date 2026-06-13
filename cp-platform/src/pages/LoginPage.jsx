/**
 * LoginPage.jsx
 *
 * Refactored to use shared AuthLayout + AuthBanner + PasswordInput.
 * Adds: remember-me, toast notifications on success, email format
 * validation, "back to login" link via the layout.
 */

import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { Mail, AlertCircle, Loader2, Zap, LogIn } from 'lucide-react'
import { useAuthStore } from '../store/authStore.js'
import { useRateLimit } from '../hooks/useRateLimit.js'
import { AUTH_ALLOWED_DOMAINS } from '../config/authPolicy.js'
import { AuthLayout } from '../components/AuthLayout.jsx'
import { AuthBanner, parseAuthMessage } from '../components/AuthBanner.jsx'
import { PasswordInput } from '../components/PasswordInput.jsx'
import { useToast } from '../components/Toast.jsx'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, loading, error, clearError } = useAuthStore()
  const resendVerificationEmail = useAuthStore((s) => s.resendVerificationEmail)
  const requestApproval = useAuthStore((s) => s.requestApproval)
  const lockoutUntil = useAuthStore((s) => s.lockoutUntil)
  const toast = useToast()
  const emailRef = useRef(null)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [localError, setLocalError] = useState('')
  const [resendLoading, setResendLoading] = useState(false)
  const [approvalLoading, setApprovalLoading] = useState(false)

  const from = location.state?.from?.pathname || '/project'
  const { isRateLimited, recordAttempt, attemptsRemaining, cooldownRemaining } = useRateLimit({ maxAttempts: 5, windowMs: 15 * 60 * 1000, cooldownMs: 30 * 60 * 1000 })

  useEffect(() => {
    clearError()
    return () => clearError()
  }, [clearError])

  // Autofocus email on mount
  useEffect(() => {
    emailRef.current?.focus()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLocalError('')
    clearError()

    if (!email || !password) {
      setLocalError('Please enter both email and password')
      return
    }

    if (!EMAIL_REGEX.test(email)) {
      setLocalError('Please enter a valid email address')
      return
    }

    if (isRateLimited()) {
      setLocalError(`Too many failed attempts. Please try again in ${cooldownRemaining}s.`)
      return
    }

    try {
      await login(email, password)
      // Persist remember-me preference
      try { localStorage.setItem('raxa.rememberMe', String(remember)) } catch {}
      toast.success('Welcome back', `Signed in as ${email}`)
      navigate(from, { replace: true })
    } catch {
      recordAttempt()
    }
  }

  const handleResendVerification = async () => {
    if (!email || !password) {
      setLocalError('Please enter both email and password to resend verification email.')
      return
    }
    setResendLoading(true)
    setLocalError('')
    clearError()
    try {
      await resendVerificationEmail(email, password)
      toast.success('Verification sent', 'Check your inbox and spam folder')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to resend verification email.'
      setLocalError(msg)
      toast.error('Resend failed', msg)
    } finally {
      setResendLoading(false)
    }
  }

  const handleRequestApproval = async () => {
    if (!email) {
      setLocalError('Please enter your email address to request approval.')
      return
    }
    if (!EMAIL_REGEX.test(email)) {
      setLocalError('Please enter a valid email address to request approval.')
      return
    }
    setApprovalLoading(true)
    setLocalError('')
    clearError()
    try {
      await requestApproval(email)
      toast.info('Approval request sent', 'Your administrator will review shortly')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to request approval.'
      setLocalError(msg)
      toast.error('Request failed', msg)
    } finally {
      setApprovalLoading(false)
    }
  }

  const displayError = localError || error
  const banner = parseAuthMessage(displayError)

  return (
    <AuthLayout
      title="Sign in to RAXA"
      subtitle="Infrastructure Protection Engineering Platform"
      headerIcon={<Zap size={32} className="auth-icon" />}
      brandingVariant="engineer"
    >
      <AuthBanner
        banner={banner}
        onResend={handleResendVerification}
        onRequestApproval={handleRequestApproval}
        resendLoading={resendLoading}
        approvalLoading={approvalLoading}
      />

      <form onSubmit={handleSubmit} className="auth-form" noValidate>
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
          autoComplete="current-password"
        />

        <label className="auth-form__checkbox">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            disabled={loading}
          />
          <span>Keep me signed in on this device</span>
        </label>

        <button
          type="submit"
          className="btn btn-primary auth-submit"
          disabled={loading || cooldownRemaining > 0}
          data-testid="auth-submit"
        >
          {loading ? (
            <><Loader2 size={16} className="spin" /> Signing in...</>
          ) : cooldownRemaining > 0 ? (
            <><AlertCircle size={16} /> Try again in {cooldownRemaining}s</>
          ) : (
            <><LogIn size={16} /> Sign In</>
          )}
        </button>

        {attemptsRemaining > 0 && attemptsRemaining < 5 && !loading && (
          <div className="auth-rate-warning" role="status">
            {attemptsRemaining} attempt{attemptsRemaining !== 1 ? 's' : ''} remaining before lockout
          </div>
        )}
      </form>

      <div className="auth-links">
        <Link to="/forgot-password" className="auth-link">Forgot password?</Link>
        <span className="auth-link-separator">·</span>
        <Link to="/register" className="auth-link">Create Account</Link>
      </div>

      <div className="auth-footer">
        <p>IKK Group accounts only · {AUTH_ALLOWED_DOMAINS.length > 0 ? AUTH_ALLOWED_DOMAINS.join(', ') : 'Contact admin'}</p>
      </div>
    </AuthLayout>
  )
}
