/**
 * AuthPageShell.jsx — M13 Premium Redesign
 *
 * Full-bleed dark auth layout with:
 *   - Animated gradient mesh (3 drifting orbs)
 *   - Glassmorphism form pane with card entrance animation
 *   - Premium brand wordmark with glow mark
 *   - Hero panel: title gradient, stats grid, compliance badges, feature list
 *   - Decorative SVG geometry (rotating, CSS-only)
 *   - Optional back-link support
 *   - Responsive: hero pane hidden on mobile
 *
 * Used by: LoginPage, RegisterPage, ForgotPasswordPage, TwoFactorVerify (via LoginPage)
 */

import { Shield, Zap, CheckCircle2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ElectricCircuitBackground } from './ElectricCircuitBackground.jsx'

const COMPLIANCE_BADGES = [
  'NACE SP0169',
  'SAES-X-400',
  'ISO 15589-1',
  'IEC 62395',
]

const HERO_FEATURES = [
  'Full impressed-current CP system design',
  'Live sensitivity & scenario analysis',
  'Digital twin asset registry with health scoring',
  'PDF engineering reports with full audit trail',
  'Role-based access with 2FA & activity logs',
]

export function AuthPageShell({
  title,
  subtitle,
  children,
  heroTitle = 'Engineering,\ncalculated.',
  heroBody = 'Professional infrastructure protection workspace for cathodic protection engineers.',
  showLogo = true,
  testId = 'auth-page',
  backTo = null,
  backLabel = 'Back',
}) {
  return (
    <div className="auth-page-v2" data-testid={testId}>
      {/* Animated electric-circuit background */}
      <ElectricCircuitBackground />

      {/* Main grid */}
      <div className="auth-page-grid">
        {/* Left pane — form */}
        <main className="auth-form-pane" aria-label="Authentication form">
          <div className="auth-form-card">
            {/* Back link */}
            {backTo && (
              <Link to={backTo} className="auth-back-link">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9 1L3 7l6 6" />
                </svg>
                {backLabel}
              </Link>
            )}

            {/* Brand mark */}
            {showLogo && (
              <div className="auth-brand">
                <div className="auth-brand__mark" aria-hidden="true">
                  <svg width="26" height="26" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M14 12 L14 28 M14 20 L22 20 M22 12 L22 28 M28 12 L28 28"
                      stroke="white"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <div className="auth-brand__text">
                  <div className="auth-brand__name">RAXA</div>
                  <div className="auth-brand__tag">Engineering Platform</div>
                </div>
              </div>
            )}

            {/* Title */}
            <h1 className="auth-form-title">{title}</h1>
            {subtitle && <p className="auth-form-subtitle">{subtitle}</p>}

            {/* Form content slot */}
            <div className="auth-form-body">{children}</div>
          </div>
        </main>

        {/* Right pane — hero */}
        <aside className="auth-hero-pane" aria-hidden="true">
          <div className="auth-hero-inner">
            {/* Eyebrow */}
            <div className="auth-hero-eyebrow">
              <Zap size={10} />
              RAXA v3.0
            </div>

            {/* Title */}
            <h2 className="auth-hero-title" style={{ whiteSpace: 'pre-line' }}>
              {heroTitle}
            </h2>

            {/* Subtitle */}
            <p className="auth-hero-body">{heroBody}</p>

            {/* Stats */}
            <ul className="auth-hero-stats" role="list">
              <li>
                <div className="stat-num">12+</div>
                <div className="stat-label">Engineering modules</div>
              </li>
              <li>
                <div className="stat-num">1,175</div>
                <div className="stat-label">Verified tests</div>
              </li>
              <li>
                <div className="stat-num">3</div>
                <div className="stat-label">Live standards</div>
              </li>
            </ul>

            {/* Feature list */}
            <ul className="auth-hero-features" role="list">
              {HERO_FEATURES.map((f) => (
                <li key={f}>
                  <CheckCircle2 size={16} color="rgba(16,185,129,0.7)" style={{ flexShrink: 0 }} />
                  {f}
                </li>
              ))}
            </ul>

            {/* Compliance badges */}
            <div className="auth-hero-badges">
              {COMPLIANCE_BADGES.map((badge) => (
                <span key={badge} className="auth-hero-badge">
                  <Shield size={10} />
                  {badge}
                </span>
              ))}
            </div>

            {/* Footer */}
            <div className="auth-hero-footer">
              <Zap size={10} aria-hidden="true" />
              <span>Real-time sensitivity · Scenario analysis · Activity audit trail</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
