import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { Lock, AlertCircle, Eye, EyeOff, Loader2, Zap, UserPlus } from 'lucide-react'
import { useAuthStore } from '../store/authStore.js'
import { useRateLimit } from '../hooks/useRateLimit.js'
import { AUTH_ALLOWED_DOMAINS } from '../config/authPolicy.js'

export function RegisterPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { register, loading, error, clearError } = useAuthStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [localError, setLocalError] = useState('')

  const from = location.state?.from?.pathname || '/project'
  const { isRateLimited, recordAttempt, attemptsRemaining, cooldownRemaining } = useRateLimit({
    maxAttempts: 5,
    windowMs: 5 * 60 * 1000,
    cooldownMs: 60 * 1000,
  })

  useEffect(() => {
    if (error) {
      setLocalError(error)
      clearError()
    }
  }, [error, clearError])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLocalError('')

    if (!email || !password || !confirmPassword) {
      setLocalError('Please fill in all fields')
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

    if (isRateLimited()) {
      setLocalError(`Too many attempts. Please try again in ${cooldownRemaining}s.`)
      return
    }

    try {
      await register(email, password)
      navigate(from, { replace: true })
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
              <UserPlus size={32} className="login-icon" />
            </div>
            <h1 className="login-title">Create Account</h1>
            <p className="login-subtitle">Join the ICCP Engineering Platform</p>
          </div>

          {localError && (
            <div className="login-error" role="alert">
              <AlertCircle size={16} />
              <span>{localError}</span>
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
                  placeholder="Min. 8 characters"
                  autoComplete="new-password"
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

            <div className="form-group">
              <label className="field-label" htmlFor="confirm-password">Confirm Password</label>
              <div className="input-wrapper">
                <Lock size={18} className="input-icon" />
                <input
                  id="confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  className="field-input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary login-submit"
              disabled={loading || cooldownRemaining > 0}
            >
              {loading ? (
                <Loader2 size={18} className="spin" />
              ) : cooldownRemaining > 0 ? (
                `Try again in ${cooldownRemaining}s`
              ) : (
                'Create Account'
              )}
            </button>
            {!loading && attemptsRemaining < 5 && attemptsRemaining > 0 && (
              <div className="rate-limit-warning" style={{ fontSize: '0.75rem', color: 'var(--warn)', marginTop: '0.25rem' }}>
                {attemptsRemaining} attempt{attemptsRemaining !== 1 ? 's' : ''} remaining before lockout
              </div>
            )}
          </form>

          <div className="login-links">
            <span className="login-link-text">Already have an account?</span>{' '}
            <Link to="/login" className="login-forgot-link">
              Sign In
            </Link>
          </div>

          <div className="login-footer">
            <p>{AUTH_ALLOWED_DOMAINS.length > 0 ? `${AUTH_ALLOWED_DOMAINS.join(', ')} accounts` : 'Contact admin for access'}</p>
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
