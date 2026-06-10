import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Mail, AlertCircle, CheckCircle, Loader2, Zap, ArrowLeft } from 'lucide-react'
import { useAuthStore } from '../store/authStore.js'
import { useRateLimit } from '../hooks/useRateLimit.js'

export function ForgotPasswordPage() {
  const navigate = useNavigate()
  const { resetPassword, loading, error, clearError } = useAuthStore()

  const [email, setEmail] = useState('')
  const [localError, setLocalError] = useState('')
  const [success, setSuccess] = useState(false)

  const { isRateLimited, recordAttempt, cooldownRemaining } = useRateLimit({ maxAttempts: 3, windowMs: 10 * 60 * 1000, cooldownMs: 120 * 1000 })

  useEffect(() => {
    if (error) {
      setLocalError(error)
      clearError()
    }
  }, [error, clearError])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLocalError('')
    setSuccess(false)

    if (!email) {
      setLocalError('Please enter your email address')
      return
    }

    if (isRateLimited()) {
      setLocalError(`Too many requests. Please try again in ${cooldownRemaining}s.`)
      return
    }

    try {
      await resetPassword(email)
      setSuccess(true)
    } catch {
      recordAttempt()
    }
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <div className="login-logo">
              <Zap size={32} className="login-icon" />
            </div>
            <h1 className="login-title">Reset Password</h1>
            <p className="login-subtitle">ICCP Engineering Platform</p>
          </div>

          {localError && (
            <div className="login-error" role="alert">
              <AlertCircle size={16} />
              <span>{localError}</span>
            </div>
          )}

          {success ? (
            <div className="login-success">
              <CheckCircle size={32} color="var(--pass)" />
              <h3>Check Your Email</h3>
              <p>
                We've sent a password reset link to <strong>{email}</strong>.
                Check your inbox and follow the instructions.
              </p>
              <p className="login-success-note">
                Didn't receive the email? Check your spam folder or try again.
              </p>
              <Link to="/login" className="btn btn-primary" style={{ marginTop: '1rem', display: 'inline-flex', textDecoration: 'none' }}>
                <ArrowLeft size={16} />
                Back to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="login-form">
              <p className="login-form-description">
                Enter your email address and we'll send you a link to reset your password.
              </p>

              <div className="form-group">
                <label className="field-label" htmlFor="email">Email</label>
                <div className="input-wrapper">
                  <Mail size={18} className="input-icon" />
                  <input
                    id="email"
                    type="email"
                    className="field-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="engineer@ikkgroup.com"
                    autoComplete="email"
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary login-submit" disabled={loading || cooldownRemaining > 0}>
                {loading ? <Loader2 size={18} className="spin" /> : cooldownRemaining > 0 ? `Try again in ${cooldownRemaining}s` : 'Send Reset Link'}
              </button>
            </form>
          )}

          <div className="login-footer">
            <Link to="/login" className="login-back-link">
              <ArrowLeft size={14} />
              Back to Sign In
            </Link>
          </div>
        </div>

        <div className="login-branding">
          <div className="brand-content">
            <h2>Professional ICCP Design</h2>
            <p>
              Impressed Current Cathodic Protection engineering platform
              with NACE SP0169 & Saudi Aramco standards compliance.
            </p>
            <ul className="feature-list">
              <li>Deepwell / Shallow Vertical / Distributed Anode modes</li>
              <li>Automated validation & design optimization</li>
              <li>BOM generation & PDF/Excel reports</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
