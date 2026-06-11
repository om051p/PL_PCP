import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { Lock, AlertCircle, Eye, EyeOff, Loader2, Zap } from 'lucide-react'
import { useAuthStore } from '../store/authStore.js'
import { useRateLimit } from '../hooks/useRateLimit.js'
import { AUTH_ALLOWED_DOMAINS } from '../config/authPolicy.js'


export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, simulationLogin, loading, error, clearError } = useAuthStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [localError, setLocalError] = useState('')

  const from = location.state?.from?.pathname || '/project'
  const { isRateLimited, recordAttempt, attemptsRemaining, cooldownRemaining } = useRateLimit({ maxAttempts: 5, windowMs: 5 * 60 * 1000, cooldownMs: 60 * 1000 })

  useEffect(() => {
    if (error) {
      setLocalError(error)
      clearError()
    }
  }, [error, clearError])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLocalError('')

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

  const handleSimulationLogin = async (simEmail) => {
    setLocalError('')
    try {
      await simulationLogin(simEmail)
      navigate(from, { replace: true })
    } catch (err) {
      setLocalError(err.message || 'Simulation login failed')
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
            <h1 className="login-title">RAXA</h1>
            <p className="login-subtitle">Infrastructure Protection Engineering Platform</p>
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
            {!loading && attemptsRemaining < 5 && attemptsRemaining > 0 && (
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

          <div className="simulation-login-card" style={{ marginTop: '20px', borderTop: '1px dashed var(--border)', paddingTop: '20px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '10px', textAlign: 'center' }}>Simulation Mode Quick Sign-in</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button type="button" className="btn btn-sm" onClick={() => handleSimulationLogin('admin@ikkgroup.com')} disabled={loading}>
                Admin
              </button>
              <button type="button" className="btn btn-sm" onClick={() => handleSimulationLogin('manager@ikkgroup.com')} disabled={loading}>
                Manager
              </button>
              <button type="button" className="btn btn-sm" onClick={() => handleSimulationLogin('engineer@ikkgroup.com')} disabled={loading}>
                Engineer
              </button>
              <button type="button" className="btn btn-sm" onClick={() => handleSimulationLogin('reviewer@ikkgroup.com')} disabled={loading}>
                Reviewer
              </button>
            </div>
            <button type="button" className="btn btn-sm" style={{ width: '100%', marginTop: '8px', color: 'var(--fail)', borderColor: 'var(--fail-bg)' }} onClick={() => handleSimulationLogin('inactive@ikkgroup.com')} disabled={loading}>
              Login as Inactive User
            </button>
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

