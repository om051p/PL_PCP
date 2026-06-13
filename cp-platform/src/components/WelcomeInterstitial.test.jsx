/**
 * WelcomeInterstitial.test.jsx
 *
 * Tests for the post-login welcome interstitial.
 * // @vitest-environment jsdom
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, act, cleanup } from '@testing-library/react'
import { WelcomeInterstitial } from './WelcomeInterstitial.jsx'

describe('<WelcomeInterstitial />', () => {
  afterEach(() => cleanup())

  it('renders with email', () => {
    render(<WelcomeInterstitial email="user@example.com" onContinue={() => {}} duration={1000} />)
    expect(screen.getByText('user@example.com')).toBeInTheDocument()
  })

  it('prefers displayName over email when provided', () => {
    render(<WelcomeInterstitial displayName="Alice" email="alice@x.com" onContinue={() => {}} duration={1000} />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })

  it('starts in loading phase', () => {
    render(<WelcomeInterstitial email="u@x.com" onContinue={() => {}} duration={2000} />)
    expect(screen.getByText(/Signing you in/)).toBeInTheDocument()
  })

  it('transitions to ready phase after ~duration/3', () => {
    vi.useFakeTimers()
    render(<WelcomeInterstitial email="u@x.com" onContinue={() => {}} duration={900} />)
    act(() => { vi.advanceTimersByTime(300) })
    expect(screen.getByText(/Welcome back/)).toBeInTheDocument()
    vi.useRealTimers()
  })

  it('calls onContinue after duration + 200ms (leave animation)', () => {
    vi.useFakeTimers()
    const onContinue = vi.fn()
    render(<WelcomeInterstitial email="u@x.com" onContinue={onContinue} duration={500} />)
    act(() => { vi.advanceTimersByTime(700) })
    expect(onContinue).toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('renders the progressbar with aria-busy=true initially', () => {
    render(<WelcomeInterstitial email="u@x.com" onContinue={() => {}} duration={2000} />)
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-busy', 'true')
  })

  it('applies welcome--leaving class during exit phase', () => {
    vi.useFakeTimers()
    render(<WelcomeInterstitial email="u@x.com" onContinue={() => {}} duration={500} />)
    act(() => { vi.advanceTimersByTime(500) })
    const root = screen.getByTestId('welcome-interstitial')
    expect(root.className).toMatch(/welcome--leaving/)
    vi.useRealTimers()
  })

  it('cleans up timers on unmount', () => {
    vi.useFakeTimers()
    const onContinue = vi.fn()
    const { unmount } = render(<WelcomeInterstitial email="u@x.com" onContinue={onContinue} duration={500} />)
    unmount()
    act(() => { vi.advanceTimersByTime(1000) })
    expect(onContinue).not.toHaveBeenCalled()
    vi.useRealTimers()
  })
})
