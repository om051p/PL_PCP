/* eslint-disable react-refresh/only-export-components */
/**
 * AuthBanner.jsx
 *
 * Shared error / status banner for auth pages. Replaces the duplicated
 * inline `auth-banner` JSX that was copy-pasted across 3 pages.
 *
 * Includes:
 *   - parseAuthMessage(msg) — single source of truth for auth error text
 *   - Banner component with type, title, body, statusLabel, action buttons
 *   - aria-live="polite" for screen readers
 *   - uses design system toast semantics (success/warning/error/info)
 *
 * Usage:
 *   const banner = parseAuthMessage(displayError)
 *   {banner && <AuthBanner banner={banner} onResend={...} onRequestApproval={...} />}
 */

import { AlertCircle, AlertTriangle, CheckCircle, Info, Loader2 } from 'lucide-react'

const KIND_ICONS = {
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertCircle,
  info: Info,
}

const KIND_VARS = {
  success: { bg: 'var(--pass-bg)', fg: 'var(--pass)', border: '#bbf7d0' },
  warning: { bg: 'var(--warn-bg)', fg: 'var(--warn)', border: '#fef08a' },
  error:   { bg: 'var(--fail-bg)', fg: 'var(--fail)', border: '#fca5a5' },
  info:    { bg: 'var(--info-bg)', fg: 'var(--brand-mid)', border: '#bfdbfe' },
}

/**
 * Parse a raw auth message (typically a Firebase auth error code or our
 * synthetic success codes) into a structured banner object.
 * @param {string|null|undefined} msg
 * @returns {null|{type, title, body, statusLabel?, showResendButton?, showRequestApprovalButton?}}
 */
export function parseAuthMessage(msg) {
  if (!msg) return null

  if (msg === 'SUCCESS_VERIFICATION_SENT') {
    return {
      type: 'success',
      title: 'Verification Email Sent',
      body: 'A new verification email has been sent. Please check your inbox and spam folder.',
    }
  }

  if (msg.startsWith('SUCCESS_APPROVAL_REQUESTED:')) {
    const refId = msg.split(':')[1] || ''
    return {
      type: 'success',
      title: 'Approval Request Sent',
      body: `Your request has been submitted to the RAXA administrator. Reference ID: ${refId}`,
    }
  }

  if (msg.includes('Access Pending Approval')) {
    return {
      type: 'warning',
      title: 'Access Pending Approval',
      body: 'Your account has been created successfully but has not yet been approved by an administrator. Please contact your RAXA administrator for access.',
      statusLabel: 'Pending Approval',
      showRequestApprovalButton: true,
    }
  }

  if (msg.includes('Account Suspended')) {
    return {
      type: 'error',
      title: 'Account Suspended',
      body: 'Your account has been temporarily disabled. Please contact your RAXA administrator.',
      statusLabel: 'Suspended',
    }
  }

  if (msg.includes('Email Verification Required')) {
    return {
      type: 'warning',
      title: 'Email Verification Required',
      body: 'Please verify your email address before accessing RAXA. Check your inbox and spam folder.',
      showResendButton: true,
    }
  }

  if (msg.includes('Organization Access Restricted')) {
    return {
      type: 'error',
      title: 'Organization Access Restricted',
      body: 'Only authorized organization email addresses may access RAXA. If you believe this is an error, contact your administrator.',
    }
  }

  if (msg.includes('Invalid Email or Password')) {
    return {
      type: 'error',
      title: 'Invalid Email or Password',
      body: 'The email address or password entered is incorrect. Please verify your credentials and try again.',
    }
  }

  if (msg.includes('Account Temporarily Locked')) {
    return {
      type: 'error',
      title: 'Account Temporarily Locked',
      body: 'Too many unsuccessful login attempts were detected. Please wait and try again later or reset your password.',
    }
  }

  if (msg.includes('Connection Error')) {
    return {
      type: 'error',
      title: 'Connection Error',
      body: 'Unable to contact the authentication service. Check your internet connection and try again.',
    }
  }

  if (msg.includes('Session Expired')) {
    return {
      type: 'warning',
      title: 'Session Expired',
      body: 'Your session has expired for security reasons. Please sign in again.',
    }
  }

  // Default error representation
  return {
    type: 'error',
    title: 'Error',
    body: msg,
  }
}

export function AuthBanner({ banner, onResend, onRequestApproval, resendLoading, approvalLoading, testId = 'auth-banner' }) {
  if (!banner) return null
  const Icon = KIND_ICONS[banner.type] || Info
  const v = KIND_VARS[banner.type] || KIND_VARS.info

  return (
    <div
      className={`auth-banner auth-banner--${banner.type}`}
      role={banner.type === 'error' ? 'alert' : 'status'}
      aria-live={banner.type === 'error' ? 'assertive' : 'polite'}
      data-testid={testId}
      style={{
        background: v.bg,
        color: v.fg,
        borderColor: v.border,
      }}
    >
      <div className="auth-banner__title">
        <Icon size={16} aria-hidden="true" />
        <span>{banner.title}</span>
        {banner.statusLabel && (
          <span className="auth-banner__status">{banner.statusLabel}</span>
        )}
      </div>
      <div className="auth-banner__body">{banner.body}</div>
      {banner.showResendButton && (
        <button
          type="button"
          className="auth-banner__action"
          onClick={onResend}
          disabled={resendLoading}
          data-testid="auth-banner-resend"
        >
          {resendLoading ? <><Loader2 size={12} className="spin" /> Sending...</> : 'Resend Verification Email'}
        </button>
      )}
      {banner.showRequestApprovalButton && (
        <button
          type="button"
          className="auth-banner__action"
          onClick={onRequestApproval}
          disabled={approvalLoading}
          data-testid="auth-banner-request-approval"
        >
          {approvalLoading ? <><Loader2 size={12} className="spin" /> Sending...</> : 'Request Approval'}
        </button>
      )}
    </div>
  )
}
