/**
 * AuthLayout.test.jsx
 *
 * Tests for the shared auth layout shell.
 * // @vitest-environment jsdom
 */

import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthLayout } from './AuthLayout.jsx'
import { Zap } from 'lucide-react'

function renderWithRouter(ui) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('<AuthLayout />', () => {
  afterEach(() => cleanup())

  it('renders the title and subtitle', () => {
    renderWithRouter(
      <AuthLayout title="Sign in to RAXA" subtitle="Test Subtitle" headerIcon={<Zap size={32} />}>
        <div data-testid="child">Child</div>
      </AuthLayout>
    )
    expect(screen.getByText('Sign in to RAXA')).toBeInTheDocument()
    expect(screen.getByText('Test Subtitle')).toBeInTheDocument()
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })

  it('renders the header icon', () => {
    const { container } = renderWithRouter(
      <AuthLayout title="X" headerIcon={<Zap size={32} data-testid="zap" />}>
        <div />
      </AuthLayout>
    )
    expect(screen.getByTestId('zap')).toBeInTheDocument()
  })

  it('renders default (engineer) branding copy', () => {
    renderWithRouter(
      <AuthLayout title="X">
        <div />
      </AuthLayout>
    )
    expect(screen.getByText(/Professional Infrastructure Protection/)).toBeInTheDocument()
    expect(screen.getByText(/Pipeline, Tank, Vessel/)).toBeInTheDocument()
    expect(screen.getByText(/Sensitivity analysis/)).toBeInTheDocument()
  })

  it('renders reset branding copy when variant=reset', () => {
    renderWithRouter(
      <AuthLayout title="X" brandingVariant="reset">
        <div />
      </AuthLayout>
    )
    expect(screen.getByText('Secure Account Recovery')).toBeInTheDocument()
    expect(screen.getByText(/Never share your password/)).toBeInTheDocument()
  })

  it('renders register branding copy when variant=register', () => {
    renderWithRouter(
      <AuthLayout title="X" brandingVariant="register">
        <div />
      </AuthLayout>
    )
    expect(screen.getByText('Join Your Engineering Team')).toBeInTheDocument()
    expect(screen.getByText(/Use your IKK Group email/)).toBeInTheDocument()
  })

  it('renders the back link when showBackLink=true', () => {
    renderWithRouter(
      <AuthLayout title="X" showBackLink backTo="/login" backLabel="Back to Sign In">
        <div />
      </AuthLayout>
    )
    const link = screen.getByText('Back to Sign In')
    expect(link).toBeInTheDocument()
    expect(link.closest('a')).toHaveAttribute('href', '/login')
  })

  it('does not render back link by default', () => {
    renderWithRouter(
      <AuthLayout title="X">
        <div />
      </AuthLayout>
    )
    expect(screen.queryByText(/Back to/)).not.toBeInTheDocument()
  })

  it('applies a custom data-testid', () => {
    renderWithRouter(
      <AuthLayout title="X" dataTestid="custom-auth">
        <div />
      </AuthLayout>
    )
    expect(screen.getByTestId('custom-auth')).toBeInTheDocument()
  })

  it('renders the visual brand mark svg in the branding panel', () => {
    const { container } = renderWithRouter(
      <AuthLayout title="X">
        <div />
      </AuthLayout>
    )
    const svgs = container.querySelectorAll('svg')
    expect(svgs.length).toBeGreaterThan(0)
  })
})
