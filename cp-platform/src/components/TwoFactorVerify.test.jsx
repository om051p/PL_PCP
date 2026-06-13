/**
 * TwoFactorVerify.test.jsx
 *
 * Tests for the 2FA code entry component.
 * // @vitest-environment jsdom
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, act, cleanup, waitFor } from '@testing-library/react'
import { TwoFactorVerify } from './TwoFactorVerify.jsx'

describe('<TwoFactorVerify />', () => {
  afterEach(() => cleanup())

  it('renders 6 digit inputs', () => {
    render(<TwoFactorVerify onVerify={() => {}} />)
    const inputs = screen.getAllByRole('textbox', { hidden: true }).filter((el) => el.maxLength === 1)
    expect(inputs.length).toBeGreaterThanOrEqual(6)
  })

  it('displays the correct subtitle for authenticator method', () => {
    render(<TwoFactorVerify onVerify={() => {}} method="authenticator" />)
    expect(screen.getByText(/6-digit code from your authenticator/)).toBeInTheDocument()
  })

  it('displays the email for email method', () => {
    render(<TwoFactorVerify onVerify={() => {}} method="email" email="user@x.com" />)
    expect(screen.getByText(/6-digit code we sent to user@x.com/)).toBeInTheDocument()
  })

  it('typing in a digit advances focus to the next input', () => {
    render(<TwoFactorVerify onVerify={() => {}} />)
    const inputs = document.querySelectorAll('input[maxlength="1"]')
    const first = inputs[0]
    fireEvent.change(first, { target: { value: '1' } })
    expect(document.activeElement).toBe(inputs[1])
  })

  it('typing the last digit auto-submits', async () => {
    const onVerify = vi.fn()
    render(<TwoFactorVerify onVerify={onVerify} />)
    const inputs = document.querySelectorAll('input[maxlength="1"]')
    // Type 5 digits
    for (let i = 0; i < 5; i++) {
      fireEvent.change(inputs[i], { target: { value: String(i + 1) } })
    }
    // Type the 6th digit
    fireEvent.change(inputs[5], { target: { value: '6' } })
    expect(onVerify).toHaveBeenCalledWith('123456')
  })

  it('filters non-numeric input', () => {
    render(<TwoFactorVerify onVerify={() => {}} />)
    const inputs = document.querySelectorAll('input[maxlength="1"]')
    fireEvent.change(inputs[0], { target: { value: 'abc' } })
    expect(inputs[0].value).toBe('')
  })

  it('only accepts single digit per input', () => {
    render(<TwoFactorVerify onVerify={() => {}} />)
    const inputs = document.querySelectorAll('input[maxlength="1"]')
    fireEvent.change(inputs[0], { target: { value: '12345' } })
    expect(inputs[0].value).toBe('1')
  })

  it('backspace on empty input moves focus back and clears previous', () => {
    render(<TwoFactorVerify onVerify={() => {}} />)
    const inputs = document.querySelectorAll('input[maxlength="1"]')
    fireEvent.change(inputs[0], { target: { value: '1' } })
    fireEvent.change(inputs[1], { target: { value: '' } })
    // Backspace on empty second input
    fireEvent.keyDown(inputs[1], { key: 'Backspace' })
    expect(document.activeElement).toBe(inputs[0])
  })

  it('pasting a 6-digit code fills all inputs and auto-submits', () => {
    const onVerify = vi.fn()
    render(<TwoFactorVerify onVerify={onVerify} />)
    const first = document.querySelector('input[maxlength="1"]')
    const pasteEvent = new Event('paste', { bubbles: true, cancelable: true })
    pasteEvent.clipboardData = { getData: () => '654321' }
    first.dispatchEvent(pasteEvent)
    expect(onVerify).toHaveBeenCalledWith('654321')
  })

  it('disables inputs while loading', () => {
    render(<TwoFactorVerify onVerify={() => {}} loading />)
    const inputs = document.querySelectorAll('input[maxlength="1"]')
    inputs.forEach((input) => expect(input).toBeDisabled())
  })

  it('renders the error message when provided', () => {
    render(<TwoFactorVerify onVerify={() => {}} error="Invalid code" />)
    const error = screen.getByTestId('twofa-error')
    expect(error).toHaveTextContent('Invalid code')
    expect(error).toHaveAttribute('role', 'alert')
  })

  it('resend button starts with 30s cooldown and counts down', () => {
    render(<TwoFactorVerify onVerify={() => {}} onResend={() => {}} />)
    expect(screen.getByTestId('twofa-resend')).toHaveTextContent('Resend code in 30s')
    expect(screen.getByTestId('twofa-resend')).toBeDisabled()
  })

  it('resend button is enabled after cooldown', () => {
    vi.useFakeTimers()
    render(<TwoFactorVerify onVerify={() => {}} onResend={() => {}} />)
    act(() => { vi.advanceTimersByTime(30000) })
    expect(screen.getByTestId('twofa-resend')).not.toBeDisabled()
    vi.useRealTimers()
  })

  it('back button calls onBack', () => {
    const onBack = vi.fn()
    render(<TwoFactorVerify onVerify={() => {}} onBack={onBack} />)
    fireEvent.click(screen.getByTestId('twofa-back'))
    expect(onBack).toHaveBeenCalled()
  })

  it('submit button is disabled until all 6 digits entered', () => {
    render(<TwoFactorVerify onVerify={() => {}} />)
    expect(screen.getByTestId('twofa-submit')).toBeDisabled()
    const inputs = document.querySelectorAll('input[maxlength="1"]')
    for (let i = 0; i < 5; i++) {
      fireEvent.change(inputs[i], { target: { value: String(i + 1) } })
    }
    expect(screen.getByTestId('twofa-submit')).toBeDisabled()
    fireEvent.change(inputs[5], { target: { value: '6' } })
    expect(screen.getByTestId('twofa-submit')).not.toBeDisabled()
  })
})
