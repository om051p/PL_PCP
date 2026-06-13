/**
 * AuthPageShell.jsx
 *
 * Modern full-bleed auth layout with:
 *   - Animated gradient mesh background (3 radial gradients, slow drift)
 *   - Glassmorphism card (backdrop-filter blur, subtle gradient stroke)
 *   - Floating geometric shapes (decorative, subtle parallax via CSS)
 *   - Brand wordmark + tagline
 *   - Responsive: stacks vertically on mobile, side-by-side on desktop
 *
 * Replaces AuthLayout for the redesigned screens.
 */

import { useId } from 'react'
import { Zap } from 'lucide-react'

export function AuthPageShell({
  title,
  subtitle,
  children,
  heroTitle = 'Engineering, calculated.',
  heroBody = 'Professional infrastructure protection workspace. NACE SP0169 · Saudi Aramco · ISO 15589-1 compliant.',
  showLogo = true,
  testId = 'auth-page',
}) {
  const reactId = useId()
  return (
    <div className="auth-page-v2" data-testid={testId}>
      {/* Animated mesh background */}
      <div className="auth-mesh" aria-hidden="true">
        <div className="auth-mesh__blob auth-mesh__blob--1" />
        <div className="auth-mesh__blob auth-mesh__blob--2" />
        <div className="auth-mesh__blob auth-mesh__blob--3" />
      </div>

      {/* Decorative grid overlay */}
      <div className="auth-grid" aria-hidden="true" />

      {/* Floating geometric accents */}
      <svg className="auth-deco auth-deco--1" width="240" height="240" viewBox="0 0 240 240" aria-hidden="true">
        <circle cx="120" cy="120" r="80" stroke="currentColor" strokeWidth="1" fill="none" />
        <circle cx="120" cy="120" r="40" stroke="currentColor" strokeWidth="1" fill="none" />
        <line x1="0" y1="120" x2="240" y2="120" stroke="currentColor" strokeWidth="0.5" />
        <line x1="120" y1="0" x2="120" y2="240" stroke="currentColor" strokeWidth="0.5" />
      </svg>
      <svg className="auth-deco auth-deco--2" width="160" height="160" viewBox="0 0 160 160" aria-hidden="true">
        <polygon points="80,10 150,50 150,130 80,170 10,130 10,50" stroke="currentColor" strokeWidth="1" fill="none" />
      </svg>

      {/* Main grid: form + hero */}
      <div className="auth-page-grid">
        {/* Left: form card */}
        <main className="auth-form-pane" aria-label="Authentication form">
          <div className="auth-form-card">
            {showLogo && (
              <div className="auth-brand">
                <div className="auth-brand__mark" aria-hidden="true">
                  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="4" y="4" width="32" height="32" rx="8" fill="currentColor" />
                    <path
                      d="M14 12 L14 28 M14 20 L22 20 M22 12 L22 28 M28 12 L28 28"
                      stroke="white"
                      strokeWidth="2"
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

            <h1 className="auth-form-title">{title}</h1>
            {subtitle && <p className="auth-form-subtitle">{subtitle}</p>}

            <div className="auth-form-body">{children}</div>
          </div>
        </main>

        {/* Right: hero panel */}
        <aside className="auth-hero-pane" aria-hidden="true">
          <div className="auth-hero-inner">
            <div className="auth-hero-eyebrow">RAXA · v2.0</div>
            <h2 className="auth-hero-title">{heroTitle}</h2>
            <p className="auth-hero-body">{heroBody}</p>
            <ul className="auth-hero-stats">
              <li>
                <div className="stat-num">7</div>
                <div className="stat-label">Engineering workspaces</div>
              </li>
              <li>
                <div className="stat-num">38+</div>
                <div className="stat-label">Input dependencies</div>
              </li>
              <li>
                <div className="stat-num">3</div>
                <div className="stat-label">Live scenarios</div>
              </li>
            </ul>
            <div className="auth-hero-footer">
              <Zap size={12} aria-hidden="true" />
              <span>Real-time sensitivity · cross-user activity log · audit trail</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
