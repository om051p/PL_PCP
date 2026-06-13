/**
 * PasswordInput.test.jsx
 *
 * Tests for the shared password input component + strength computation.
 * // @vitest-environment jsdom
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { PasswordInput, computePasswordStrength } from './PasswordInput.jsx'

describe('computePasswordStrength', () => {
  it('returns score 0 + all rules pending for empty password', () => {
    const s = computePasswordStrength('')
    expect(s.score).toBe(0)
    expect(s.rules.every((r) => !r.ok)).toBe(true)
  })

  it('returns undefined password yields score 0', () => {
    const s = computePasswordStrength()
    expect(s.score).toBe(0)
  })

  it('returns score 0 for password failing all 4 rules', () => {
    const s = computePasswordStrength('abc')
    // 'abc' fails: length<8, no upper, no number, no special
    expect(s.score).toBe(0)
    expect(s.rules[0].ok).toBe(false) // length ≥ 8
    expect(s.rules[1].ok).toBe(false) // mixed case
  })

  it('returns score 2 for password with length and number but no upper/special', () => {
    const s = computePasswordStrength('lowercase8')
    // length ok, number ok, no upper, no special
    expect(s.rules[0].ok).toBe(true)   // length
    expect(s.rules[1].ok).toBe(false)  // mixed case
    expect(s.rules[2].ok).toBe(true)   // number
    expect(s.rules[3].ok).toBe(false)  // special
    expect(s.score).toBe(2)
  })

  it('returns score 4 for a strong password', () => {
    const s = computePasswordStrength('Passw0rd!@#')
    expect(s.score).toBe(4)
    expect(s.rules.every((r) => r.ok)).toBe(true)
  })

  it('counts mixed case, number, and special char correctly', () => {
    const s = computePasswordStrength('lowercase8')
    expect(s.rules[0].ok).toBe(true)   // length
    expect(s.rules[1].ok).toBe(false)  // mixed case
    expect(s.rules[2].ok).toBe(true)   // number
    expect(s.rules[3].ok).toBe(false)  // special
    expect(s.score).toBe(2)
  })
})

describe('<PasswordInput />', () => {
  afterEach(() => cleanup())

  it('renders label and input with the correct id', () => {
    render(<PasswordInput id="pw1" label="Password" value="" onChange={() => {}} />)
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password')
  })

  it('calls onChange with the new value', () => {
    const onChange = vi.fn()
    render(<PasswordInput id="pw1" label="Password" value="" onChange={onChange} />)
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'x' } })
    expect(onChange).toHaveBeenCalledWith('x')
  })

  it('toggles password visibility', () => {
    render(<PasswordInput id="pw1" label="Password" value="abc" onChange={() => {}} />)
    const input = screen.getByLabelText('Password')
    expect(input).toHaveAttribute('type', 'password')
    fireEvent.click(screen.getByLabelText(/Show password/i))
    expect(input).toHaveAttribute('type', 'text')
    fireEvent.click(screen.getByLabelText(/Hide password/i))
    expect(input).toHaveAttribute('type', 'password')
  })

  it('does not show strength meter by default', () => {
    render(<PasswordInput id="pw1" label="Password" value="Passw0rd!@#" onChange={() => {}} />)
    expect(screen.queryByText(/Too weak|Weak|Fair|Good|Strong/)).not.toBeInTheDocument()
  })

  it('shows strength meter when showStrength=true', () => {
    render(<PasswordInput id="pw1" label="Password" value="Passw0rd!@#" onChange={() => {}} showStrength />)
    expect(screen.getByText('Strong')).toBeInTheDocument()
    expect(screen.getByText('At least 8 characters')).toBeInTheDocument()
    expect(screen.getByText('Mixed case')).toBeInTheDocument()
    expect(screen.getByText('At least one number')).toBeInTheDocument()
    expect(screen.getByText('At least one special character')).toBeInTheDocument()
  })

  it('shows "Enter a password" when value is empty and showStrength=true', () => {
    render(<PasswordInput id="pw1" label="Password" value="" onChange={() => {}} showStrength />)
    expect(screen.getByText('Enter a password')).toBeInTheDocument()
  })

  it('does not show match hint by default', () => {
    render(<PasswordInput id="pw1" label="Password" value="x" matchValue="x" onChange={() => {}} />)
    expect(screen.queryByText(/match/i)).not.toBeInTheDocument()
  })

  it('shows match hint when showMatchHint=true and values match', () => {
    render(<PasswordInput id="pw1" label="Confirm" value="abc123" matchValue="abc123" onChange={() => {}} showMatchHint />)
    expect(screen.getByText('Passwords match')).toBeInTheDocument()
  })

  it('shows fail match hint when values differ', () => {
    render(<PasswordInput id="pw1" label="Confirm" value="abc" matchValue="xyz" onChange={() => {}} showMatchHint />)
    expect(screen.getByText('Passwords do not match')).toBeInTheDocument()
  })

  it('marks input as aria-invalid when password is too weak', () => {
    render(<PasswordInput id="pw1" label="Password" value="abc" onChange={() => {}} showStrength />)
    expect(screen.getByLabelText('Password')).toHaveAttribute('aria-invalid', 'true')
  })

  it('is disabled when disabled prop is true', () => {
    render(<PasswordInput id="pw1" label="Password" value="" onChange={() => {}} disabled />)
    expect(screen.getByLabelText('Password')).toBeDisabled()
  })
})
