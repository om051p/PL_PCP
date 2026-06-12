import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { Lock, AlertCircle, Eye, EyeOff, Loader2, Zap } from 'lucide-react'
import { useAuthStore } from '../store/authStore.js'
import { useRateLimit } from '../hooks/useRateLimit.js'
import { AUTH_ALLOWED_DOMAINS } from '../config/authPolicy.js'


export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, loading, error, clearError } = useAuthStore()
  const resendVerificationEmail = useAuthStore((s) => s.resendVerificationEmail)
  const requestApproval = useAuthStore((s) => s.requestApproval)
  const lockoutUntil = useAuthStore((s) => s.lockoutUntil)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [localError, setLocalError] = useState('')
  const [resendLoading, setResendLoading] = useState(false)
  const [approvalLoading, setApprovalLoading] = useState(false)

  const from = location.state?.from?.pathname || '/project'
  const { isRateLimited, recordAttempt, attemptsRemaining, cooldownRemaining } = useRateLimit({ maxAttempts: 5, windowMs: 15 * 60 * 1000, cooldownMs: 30 * 60 * 1000 })

  useEffect(() => {
    clearError()
    return () => clearError()
  }, [clearError])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLocalError('')
    clearError()

    if (!email || !password) {
      setLocalError('Please enter both email and password')
      return
    }

    if (isRateLimited()) {
      setLocalError(`Too many failed attempts. Please try again in ${cooldownRemaining}s.`)
      return
    }

    try {
      await login(email, password)
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
    setResendLoading(false)
    setLocalError('')
    clearError()
    setResendLoading(true)
    try {
      await resendVerificationEmail(email, password)
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to resend verification email.')
    } finally {
      setResendLoading(false)
    }
  }

  const handleRequestApproval = async () => {
    if (!email) {
      setLocalError('Please enter your email address to request approval.')
      return
    }
    setApprovalLoading(true)
    setLocalError('')
    clearError()
    try {
      await requestApproval(email)
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to request approval.')
    } finally {
      setApprovalLoading(false)
    }
  }

  const displayError = localError || error

  const parseAuthMessage = (msg) => {
    if (!msg) return null

    if (msg === 'SUCCESS_VERIFICATION_SENT') {
      return {
        type: 'success',
        title: 'Verification Email Sent',
        body: 'A new verification email has been sent. Please check your inbox and spam folder.'
      }
    }

    if (msg.startsWith('SUCCESS_APPROVAL_REQUESTED:')) {
      const refId = msg.split(':')[1] || ''
      return {
        type: 'success',
        title: 'Approval Request Sent',
        body: `Your request has been submitted to the RAXA administrator. Reference ID: ${refId}`
      }
    }

    if (msg.includes('Access Pending Approval')) {
      return {
        type: 'warning',
        title: 'Access Pending Approval',
        body: 'Your account has been created successfully but has not yet been approved by an administrator. Please contact your RAXA administrator for access.',
        statusLabel: 'Pending Approval',
        showRequestApprovalButton: true
      }
    }

    if (msg.includes('Account Suspended')) {
      return {
        type: 'error',
        title: 'Account Suspended',
        body: 'Your account has been temporarily disabled. Please contact your RAXA administrator.',
        statusLabel: 'Suspended'
      }
    }

    if (msg.includes('Email Verification Required')) {
      return {
        type: 'warning',
        title: 'Email Verification Required',
        body: 'Please verify your email address before accessing RAXA. Check your inbox and spam folder.',
        showResendButton: true
      }
    }

    if (msg.includes('Organization Access Restricted')) {
      return {
        type: 'error',
        title: 'Organization Access Restricted',
        body: 'Only authorized organization email addresses may access RAXA. If you believe this is an error, contact your administrator.'
      }
    }

    if (msg.includes('Invalid Email or Password')) {
      return {
        type: 'error',
        title: 'Invalid Email or Password',
        body: 'The email address or password entered is incorrect. Please verify your credentials and try again.'
      }
    }

    if (msg.includes('Account Temporarily Locked')) {
      return {
        type: 'error',
        title: 'Account Temporarily Locked',
        body: 'Too many unsuccessful login attempts were detected. Please wait and try again later or reset your password.'
      }
    }

    if (msg.includes('Connection Error')) {
      return {
        type: 'error',
        title: 'Connection Error',
        body: 'Unable to contact the authentication service. Check your internet connection and try again.'
      }
    }

    if (msg.includes('Session Expired')) {
      return {
        type: 'warning',
        title: 'Session Expired',
        body: 'Your session has expired for security reasons. Please sign in again.'
      }
    }

    // Default error representation
    return {
      type: 'error',
      title: 'Error',
      body: msg
    }
  }

  const banner = parseAuthMessage(displayError)


  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <div className="login-logo">
              <Zap size={32} className="login-icon" />
            </div>
            <h1 className="login-title">RAXA</h1>
            <p className="login-subtitle">Infrastructure Protection Engineering Platform</p>
          </div>

          {banner && (
            <div className={`auth-banner auth-banner--${banner.type}`} role="alert" style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              padding: '12px 14px',
              borderRadius: 'var(--radius)',
              fontSize: '12.5px',
              lineHeight: '1.5',
              marginBottom: '16px',
              border: '1px solid',
              background: `var(--${banner.type === 'error' ? 'fail' : banner.type === 'warning' ? 'warn' : banner.type === 'success' ? 'pass' : 'info'}-bg)`,
              color: `var(--${banner.type === 'error' ? 'fail' : banner.type === 'warning' ? 'warn' : banner.type === 'success' ? 'pass' : 'info'})`,
              borderColor: banner.type === 'error' ? '#fca5a5' : banner.type === 'warning' ? '#fef08a' : banner.type === 'success' ? '#bbf7d0' : '#bfdbfe'
            }}>
              <div className="auth-banner-title" style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertCircle size={16} />
                <span>{banner.title}</span>
                {banner.statusLabel && (
                  <span className="auth-status-badge" style={{
                    marginLeft: 'auto',
                    fontSize: '10px',
                    fontWeight: '700',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: banner.type === 'error' ? 'var(--fail)' : 'var(--warn)',
                    color: '#ffffff'
                  }}>
                    {banner.statusLabel}
                  </span>
                )}
              </div>
              <div className="auth-banner-body" style={{ marginTop: '2px' }}>
                {banner.body}
              </div>
              {banner.showResendButton && (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={handleResendVerification}
                  disabled={resendLoading}
                  style={{
                    marginTop: '8px',
                    alignSelf: 'flex-start',
                    fontSize: '11px',
                    padding: '4px 8px',
                    borderColor: 'currentColor',
                    color: 'inherit',
                    background: 'transparent',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  {resendLoading ? 'Sending...' : 'Resend Verification Email'}
                </button>
              )}
              {banner.showRequestApprovalButton && (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={handleRequestApproval}
                  disabled={approvalLoading}
                  style={{
                    marginTop: '8px',
                    alignSelf: 'flex-start',
                    fontSize: '11px',
                    padding: '4px 8px',
                    borderColor: 'currentColor',
                    color: 'inherit',
                    background: 'transparent',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  {approvalLoading ? 'Sending...' : 'Request Approval'}
                </button>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label className="field-label" htmlFor="email">Email</label>
              <div className="input-wrapper">
                <Lock size={18} className="input-icon" />
                <input
                  id="email"
                  type="email"
                  className="field-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="engineer@company.com"
                  autoComplete="email"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="field-label" htmlFor="password">Password</label>
              <div className="input-wrapper">
                <Lock size={18} className="input-icon" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="field-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary login-submit" disabled={loading || cooldownRemaining > 0}>
              {loading ? <Loader2 size={18} className="spin" /> : cooldownRemaining > 0 ? `Try again in ${cooldownRemaining}s` : 'Sign In'}
            </button>
            {/* eslint-disable-next-line react-hooks/purity */}
            {!loading && !(lockoutUntil && Date.now() < lockoutUntil) && attemptsRemaining < 5 && attemptsRemaining > 0 && (
              <div className="rate-limit-warning" style={{ fontSize: '0.75rem', color: 'var(--warn)', marginTop: '0.25rem' }}>
                {attemptsRemaining} attempt{attemptsRemaining !== 1 ? 's' : ''} remaining before lockout
              </div>
            )}
          </form>

          <div className="login-links">
            <Link to="/forgot-password" className="login-forgot-link">
              Forgot password?
            </Link>
            <span className="login-link-separator"> · </span>
            <Link to="/register" className="login-forgot-link">
              Create Account
            </Link>
          </div>

          <div className="login-footer">
            <p>IKK Group accounts only · {AUTH_ALLOWED_DOMAINS.length > 0 ? AUTH_ALLOWED_DOMAINS.join(', ') : 'Contact admin'}</p>
          </div>
        </div>

        <div className="login-branding">
          <div className="brand-content">
            <h2>Professional Infrastructure Protection</h2>
            <p>
              Integrated engineering workspace platform with NACE SP0169
              & Saudi Aramco standards compliance.
            </p>
            <ul className="feature-list">
              <li>Pipeline, Tank, Vessel, Plant engineering workspaces</li>
              <li>Automated validation & design optimization</li>
              <li>BOM generation & PDF/Excel reports</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

