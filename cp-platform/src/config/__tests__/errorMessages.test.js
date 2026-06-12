import { describe, it, expect } from 'vitest'
import { mapFirebaseError, mapAuthError } from '../errorMessages.js'

describe('mapFirebaseError()', () => {
  it('maps auth/invalid-credential to friendly message', () => {
    const result = mapFirebaseError(new Error('Firebase: Error (auth/invalid-credential).'))
    expect(result).toBe('Invalid Email or Password\n\nThe email address or password entered is incorrect.\n\nPlease verify your credentials and try again.')
  })

  it('maps auth/user-not-found to friendly message', () => {
    const result = mapFirebaseError(new Error('Firebase: Error (auth/user-not-found).'))
    expect(result).toBe('Invalid Email or Password\n\nThe email address or password entered is incorrect.\n\nPlease verify your credentials and try again.')
  })

  it('maps auth/wrong-password to friendly message', () => {
    const result = mapFirebaseError(new Error('Firebase: Error (auth/wrong-password).'))
    expect(result).toBe('Invalid Email or Password\n\nThe email address or password entered is incorrect.\n\nPlease verify your credentials and try again.')
  })

  it('maps auth/too-many-requests to friendly message', () => {
    const result = mapFirebaseError(new Error('Firebase: Error (auth/too-many-requests).'))
    expect(result).toBe('Account Temporarily Locked\n\nToo many unsuccessful login attempts were detected.\n\nPlease wait and try again later or reset your password.')
  })

  it('maps permission-denied to friendly message', () => {
    const result = mapFirebaseError(new Error('permission-denied'))
    expect(result).toBe('You do not have permission to perform this action.')
  })

  it('maps auth/network-request-failed', () => {
    const result = mapFirebaseError(new Error('Firebase: Error (auth/network-request-failed).'))
    expect(result).toBe('Connection Error\n\nUnable to contact the authentication service.\n\nCheck your internet connection and try again.')
  })

  it('returns generic message for unknown errors', () => {
    const result = mapFirebaseError(new Error('Some random error'))
    expect(result).toBe('An unexpected error occurred. Please try again.')
  })

  it('handles string input', () => {
    const result = mapFirebaseError('auth/weak-password')
    expect(result).toBe('Password is too weak. Use at least 6 characters.')
  })

  it('does not leak implementation details', () => {
    const result = mapFirebaseError(new Error('Firebase: Error (auth/invalid-credential).'))
    expect(result).not.toContain('auth/')
    expect(result).not.toContain('Firebase')
  })

  it('maps auth/email-already-in-use', () => {
    const result = mapFirebaseError(new Error('Firebase: Error (auth/email-already-in-use).'))
    expect(result).toBe('An account with this email already exists.')
  })

  it('maps auth/popup-closed-by-user', () => {
    const result = mapFirebaseError(new Error('Firebase: Error (auth/popup-closed-by-user).'))
    expect(result).toBe('Sign-in popup was closed. Please try again.')
  })
})

describe('mapAuthError()', () => {
  it('preserves domain restriction errors', () => {
    const result = mapAuthError(new Error('Access restricted to IKK Group users.'))
    expect(result.message).toContain('Access restricted')
    expect(result.isDomainError).toBe(true)
  })

  it('maps regular auth errors', () => {
    const result = mapAuthError(new Error('Firebase: Error (auth/invalid-credential).'))
    expect(result.message).toBe('Invalid Email or Password\n\nThe email address or password entered is incorrect.\n\nPlease verify your credentials and try again.')
    expect(result.isDomainError).toBe(false)
  })

  it('preserves deactivation errors as non-domain errors', () => {
    const result = mapAuthError(new Error('Your account has been deactivated.'))
    expect(result.message).toBe('Your account has been deactivated.')
    expect(result.isDomainError).toBe(false)
  })
})
