/**
 * AuthLayout.jsx
 *
 * Shared layout for all auth pages (login, forgot-password, register).
 * Two-column responsive layout: form card on the left, branding panel on the right.
 *
 * Replaces the duplicated `<div className="login-page">...login-container...login-card...login-branding`
 * pattern that was copy-pasted across 3 pages.
 *
 * Usage:
 *   <AuthLayout
 *     title="Sign in to RAXA"
 *     subtitle="Infrastructure Protection Engineering Platform"
 *     headerIcon={<Zap size={32} />}
 *     brandingVariant="engineer"
 *   >
 *     <form>...</form>
 *   </AuthLayout>
 *
 * Branding variants:
 *   - 'engineer' (default): engineering focus
 *   - 'reset': password reset focus
 *   - 'register': onboarding focus
 */

import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

const BRANDING_COPY = {
  engineer: {
    title: 'Professional Infrastructure Protection',
    body: 'Integrated engineering workspace platform with NACE SP0169 & Saudi Aramco standards compliance.',
    bullets: [
      'Pipeline, Tank, Vessel, Plant engineering workspaces',
      'Sensitivity analysis + attenuation explorer + automated validation',
      'BOM generation, real-time activity log, PDF/Excel reports',
    ],
  },
  reset: {
    title: 'Secure Account Recovery',
    body: 'Reset your RAXA password via secure email link. The link expires in 1 hour.',
    bullets: [
      'Never share your password with anyone',
      'Use a strong password with letters, numbers, and symbols',
      'Contact your administrator if you cannot recover access',
    ],
  },
  register: {
    title: 'Join Your Engineering Team',
    body: 'New accounts are subject to administrator approval. You will receive an email once your access is granted.',
    bullets: [
      'Use your IKK Group email address',
      'Strong password: 8+ characters with mixed case',
      'Approval typically takes 1-2 business days',
    ],
  },
}

export function AuthLayout({
  title,
  subtitle,
  headerIcon,
  children,
  brandingVariant = 'engineer',
  showBackLink = false,
  backTo = '/login',
  backLabel = 'Back to Sign In',
  dataTestid = 'auth-layout',
}) {
  const branding = BRANDING_COPY[brandingVariant] || BRANDING_COPY.engineer

  return (
    <div className="auth-page" data-testid={dataTestid}>
      <div className="auth-container">
        <div className="auth-card">
          {showBackLink && (
            <Link to={backTo} className="auth-back-link" aria-label={backLabel}>
              <ArrowLeft size={14} />
              <span>{backLabel}</span>
            </Link>
          )}

          <div className="auth-header">
            <div className="auth-logo">{headerIcon}</div>
            <h1 className="auth-title">{title}</h1>
            {subtitle && <p className="auth-subtitle">{subtitle}</p>}
          </div>

          <div className="auth-content">{children}</div>
        </div>

        <aside className="auth-branding" aria-label="About RAXA">
          <div className="auth-brand-content">
            <div className="auth-brand-mark" aria-hidden="true">
              {/* Visual mark for the branding panel */}
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="8" y="8" width="48" height="48" rx="12" fill="var(--brand)" />
                <path
                  d="M22 20 L22 44 M22 32 L34 32 M34 20 L34 44 M42 20 L42 44"
                  stroke="white"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <h2>{branding.title}</h2>
            <p>{branding.body}</p>
            <ul className="auth-feature-list">
              {branding.bullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  )
}
