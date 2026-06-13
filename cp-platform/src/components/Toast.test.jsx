/**
 * Toast.test.jsx
 *
 * Tests for the unified toast system.
 * // @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, fireEvent, cleanup } from '@testing-library/react'
import { ToastProvider, useToast } from './Toast.jsx'

function Probe() {
  const toast = useToast()
  return (
    <div>
      <button onClick={() => toast.success('Saved', 'Your changes were saved')}>ok</button>
      <button onClick={() => toast.error('Failed', 'Could not save')}>err</button>
      <button onClick={() => toast.warning('Heads up', 'You have unsaved changes')}>warn</button>
      <button onClick={() => toast.info('FYI', 'Auto-save is on')}>info</button>
      <button onClick={() => toast.success('Persistent', 'No auto-dismiss', { duration: 0 })}>sticky</button>
      <button onClick={() => toast.dismissAll()}>clear</button>
    </div>
  )
}

// StrictMode-safe helper: returns the first matching button
const btn = (text) => screen.getAllByText(text)[0]

describe('<ToastProvider /> + useToast', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => {
    vi.useRealTimers()
    cleanup()
    if (window.__raxaToast) delete window.__raxaToast
  })

  it('renders nothing when no toasts are shown', () => {
    render(<ToastProvider><Probe /></ToastProvider>)
    expect(screen.queryByTestId('toast-viewport')).not.toBeInTheDocument()
  })

  it('renders a success toast', () => {
    render(<ToastProvider><Probe /></ToastProvider>)
    fireEvent.click(btn('ok'))
    expect(screen.getByText('Saved')).toBeInTheDocument()
    expect(screen.getByText('Your changes were saved')).toBeInTheDocument()
    expect(screen.getAllByTestId('toast-success').length).toBeGreaterThanOrEqual(1)
  })

  it('renders error/warning/info variants with correct roles', () => {
    render(<ToastProvider><Probe /></ToastProvider>)
    fireEvent.click(btn('err'))
    fireEvent.click(btn('warn'))
    fireEvent.click(btn('info'))
    const errors = screen.getAllByTestId('toast-error')
    expect(errors[0]).toHaveAttribute('role', 'alert')
    expect(screen.getAllByTestId('toast-warning').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByTestId('toast-info').length).toBeGreaterThanOrEqual(1)
  })

  it('auto-dismisses after default duration', () => {
    render(<ToastProvider defaultDuration={3000}><Probe /></ToastProvider>)
    fireEvent.click(btn('ok'))
    expect(screen.getByText('Saved')).toBeInTheDocument()
    act(() => { vi.advanceTimersByTime(3100) })
    expect(screen.queryByText('Saved')).not.toBeInTheDocument()
  })

  it('does not auto-dismiss when duration=0 (sticky)', () => {
    render(<ToastProvider defaultDuration={1000}><Probe /></ToastProvider>)
    fireEvent.click(btn('sticky'))
    act(() => { vi.advanceTimersByTime(5000) })
    expect(screen.getByText('Persistent')).toBeInTheDocument()
  })

  it('dismisses when X is clicked', () => {
    render(<ToastProvider><Probe /></ToastProvider>)
    fireEvent.click(btn('ok'))
    const dismissBtns = screen.getAllByLabelText(/Dismiss success/i)
    fireEvent.click(dismissBtns[0])
    expect(screen.queryByText('Saved')).not.toBeInTheDocument()
  })

  it('dismisses all on ESC', () => {
    render(<ToastProvider><Probe /></ToastProvider>)
    fireEvent.click(btn('ok'))
    fireEvent.click(btn('err'))
    act(() => { fireEvent.keyDown(window, { key: 'Escape' }) })
    expect(screen.queryByTestId('toast-viewport')).not.toBeInTheDocument()
  })

  it('dismissAll() clears all toasts', () => {
    render(<ToastProvider><Probe /></ToastProvider>)
    fireEvent.click(btn('ok'))
    fireEvent.click(btn('clear'))
    expect(screen.queryByTestId('toast-viewport')).not.toBeInTheDocument()
  })

  it('caps the stack at maxStack', () => {
    render(<ToastProvider maxStack={2}><Probe /></ToastProvider>)
    fireEvent.click(btn('ok'))
    fireEvent.click(btn('err'))
    fireEvent.click(btn('warn'))
    // 3 toasts added but stack capped at 2 — the first (success/Saved) should be gone
    expect(screen.queryByText('Saved')).not.toBeInTheDocument()
    expect(screen.getByText('Failed')).toBeInTheDocument()
    expect(screen.getByText('Heads up')).toBeInTheDocument()
  })

  it('exposes api on window for non-React callers', () => {
    render(<ToastProvider><Probe /></ToastProvider>)
    expect(window.__raxaToast).toBeDefined()
    expect(typeof window.__raxaToast.success).toBe('function')
  })

  it('returns noop api when used outside provider (graceful degradation)', () => {
    function BareProbe() {
      const toast = useToast()
      return <button onClick={() => toast.success('x')}>x</button>
    }
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(<BareProbe />)
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('outside <ToastProvider>'))
    spy.mockRestore()
  })
})
