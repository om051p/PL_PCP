/**
 * AuthBanner.test.jsx
 *
 * Tests for the unified auth banner + parseAuthMessage parser.
 * // @vitest-environment jsdom
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AuthBanner, parseAuthMessage } from './AuthBanner.jsx'

describe('parseAuthMessage', () => {
  it('returns null for empty/null input', () => {
    expect(parseAuthMessage(null)).toBeNull()
    expect(parseAuthMessage(undefined)).toBeNull()
    expect(parseAuthMessage('')).toBeNull()
  })

  it('parses SUCCESS_VERIFICATION_SENT', () => {
    const b = parseAuthMessage('SUCCESS_VERIFICATION_SENT')
    expect(b.type).toBe('success')
    expect(b.title).toBe('Verification Email Sent')
  })

  it('parses SUCCESS_APPROVAL_REQUESTED with reference ID', () => {
    const b = parseAuthMessage('SUCCESS_APPROVAL_REQUESTED:REF-12345')
    expect(b.type).toBe('success')
    expect(b.title).toBe('Approval Request Sent')
    expect(b.body).toContain('REF-12345')
  })

  it('parses Access Pending Approval', () => {
    const b = parseAuthMessage('Access Pending Approval')
    expect(b.type).toBe('warning')
    expect(b.statusLabel).toBe('Pending Approval')
    expect(b.showRequestApprovalButton).toBe(true)
  })

  it('parses Account Suspended', () => {
    const b = parseAuthMessage('Account Suspended')
    expect(b.type).toBe('error')
    expect(b.statusLabel).toBe('Suspended')
  })

  it('parses Email Verification Required', () => {
    const b = parseAuthMessage('Email Verification Required')
    expect(b.type).toBe('warning')
    expect(b.showResendButton).toBe(true)
  })

  it('parses Organization Access Restricted', () => {
    const b = parseAuthMessage('Organization Access Restricted')
    expect(b.type).toBe('error')
  })

  it('parses Invalid Email or Password', () => {
    const b = parseAuthMessage('Invalid Email or Password')
    expect(b.type).toBe('error')
  })

  it('parses Account Temporarily Locked', () => {
    const b = parseAuthMessage('Account Temporarily Locked')
    expect(b.type).toBe('error')
  })

  it('parses Connection Error', () => {
    const b = parseAuthMessage('Connection Error')
    expect(b.type).toBe('error')
  })

  it('parses Session Expired', () => {
    const b = parseAuthMessage('Session Expired')
    expect(b.type).toBe('warning')
  })

  it('falls back to generic error for unknown messages', () => {
    const b = parseAuthMessage('Some random failure XYZ')
    expect(b.type).toBe('error')
    expect(b.body).toBe('Some random failure XYZ')
  })
})

describe('<AuthBanner />', () => {
  afterEach(() => { /* cleanup handled by testing-library */ })

  it('renders nothing when banner is null', () => {
    const { container } = render(<AuthBanner banner={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders error variant with role=alert', () => {
    render(<AuthBanner banner={{ type: 'error', title: 'Error', body: 'X' }} />)
    const banner = screen.getByTestId('auth-banner')
    expect(banner).toHaveAttribute('role', 'alert')
    expect(banner).toHaveClass('auth-banner--error')
    expect(screen.getByText('Error')).toBeInTheDocument()
    expect(screen.getByText('X')).toBeInTheDocument()
  })

  it('renders success variant with role=status', () => {
    render(<AuthBanner banner={{ type: 'success', title: 'OK', body: 'Done' }} />)
    const banner = screen.getByTestId('auth-banner')
    expect(banner).toHaveAttribute('role', 'status')
    expect(banner).toHaveClass('auth-banner--success')
  })

  it('renders status label when present', () => {
    render(<AuthBanner banner={{ type: 'warning', title: 'Pending', body: 'X', statusLabel: 'PENDING' }} />)
    expect(screen.getByText('PENDING')).toBeInTheDocument()
  })

  it('renders resend button when showResendButton is true', () => {
    const onResend = vi.fn()
    render(<AuthBanner banner={{ type: 'warning', title: 'Verify', body: 'X', showResendButton: true }} onResend={onResend} />)
    const btns = screen.getAllByTestId('auth-banner-resend')
    expect(btns.length).toBeGreaterThanOrEqual(1)
  })

  it('renders request-approval button when showRequestApprovalButton is true', () => {
    const onRequestApproval = vi.fn()
    render(<AuthBanner banner={{ type: 'warning', title: 'Pending', body: 'X', showRequestApprovalButton: true }} onRequestApproval={onRequestApproval} />)
    const btns = screen.getAllByTestId('auth-banner-request-approval')
    expect(btns.length).toBeGreaterThanOrEqual(1)
  })

  it('disables action buttons while loading', () => {
    render(
      <AuthBanner
        banner={{ type: 'warning', title: 'X', body: 'Y', showResendButton: true, showRequestApprovalButton: true }}
        resendLoading
        approvalLoading
        onResend={() => {}}
        onRequestApproval={() => {}}
      />
    )
    expect(screen.getAllByTestId('auth-banner-resend')[0]).toBeDisabled()
    expect(screen.getAllByTestId('auth-banner-request-approval')[0]).toBeDisabled()
  })
})
