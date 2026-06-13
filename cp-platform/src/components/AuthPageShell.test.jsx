/**
 * AuthPageShell.test.jsx
 *
 * Tests for the modern glassmorphism auth page shell.
 * // @vitest-environment jsdom
 */

import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { AuthPageShell } from './AuthPageShell.jsx'

describe('<AuthPageShell />', () => {
  afterEach(() => cleanup())

  it('renders the title and children', () => {
    render(
      <AuthPageShell title="Sign in" subtitle="Welcome">
        <div data-testid="child">Form goes here</div>
      </AuthPageShell>
    )
    expect(screen.getByText('Sign in')).toBeInTheDocument()
    expect(screen.getByText('Welcome')).toBeInTheDocument()
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })

  it('renders the RAXA brand mark by default', () => {
    render(<AuthPageShell title="X"><div /></AuthPageShell>)
    expect(screen.getByText('RAXA')).toBeInTheDocument()
    expect(screen.getByText(/Engineering Platform/)).toBeInTheDocument()
  })

  it('hides the logo when showLogo=false', () => {
    render(<AuthPageShell title="X" showLogo={false}><div /></AuthPageShell>)
    expect(screen.queryByText('RAXA')).not.toBeInTheDocument()
  })

  it('renders the hero panel with default copy', () => {
    render(<AuthPageShell title="X"><div /></AuthPageShell>)
    expect(screen.getByText(/Engineering, calculated/)).toBeInTheDocument()
    expect(screen.getByText(/NACE SP0169/)).toBeInTheDocument()
  })

  it('renders custom hero title and body', () => {
    render(
      <AuthPageShell title="X" heroTitle="Custom Hero" heroBody="Custom body text here.">
        <div />
      </AuthPageShell>
    )
    expect(screen.getByText('Custom Hero')).toBeInTheDocument()
    expect(screen.getByText('Custom body text here.')).toBeInTheDocument()
  })

  it('renders the animated mesh background', () => {
    const { container } = render(<AuthPageShell title="X"><div /></AuthPageShell>)
    const mesh = container.querySelector('.auth-mesh')
    expect(mesh).toBeInTheDocument()
    const blobs = container.querySelectorAll('.auth-mesh__blob')
    expect(blobs.length).toBe(3)
  })

  it('renders the decorative SVGs', () => {
    const { container } = render(<AuthPageShell title="X"><div /></AuthPageShell>)
    const decos = container.querySelectorAll('.auth-deco')
    expect(decos.length).toBe(2)
  })

  it('renders the grid layout with form-pane and hero-pane', () => {
    const { container } = render(<AuthPageShell title="X"><div /></AuthPageShell>)
    const formPane = container.querySelector('.auth-form-pane')
    const heroPane = container.querySelector('.auth-hero-pane')
    expect(formPane).toBeInTheDocument()
    expect(heroPane).toBeInTheDocument()
  })

  it('renders the hero stats with 3 metrics', () => {
    render(<AuthPageShell title="X"><div /></AuthPageShell>)
    expect(screen.getByText('7')).toBeInTheDocument() // engineering workspaces
    expect(screen.getByText('38+')).toBeInTheDocument() // input dependencies
    expect(screen.getByText('3')).toBeInTheDocument() // live scenarios
  })

  it('applies a custom testid', () => {
    render(<AuthPageShell title="X" testId="my-auth-page"><div /></AuthPageShell>)
    expect(screen.getByTestId('my-auth-page')).toBeInTheDocument()
  })
})
