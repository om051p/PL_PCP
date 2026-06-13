/**
 * AUTH REPOSITORY
 *
 * Orchestrates authentication through the configured AuthProvider.
 * Normalizes provider-native users into NormalizedUser before returning to stores.
 * Wraps provider errors with user-friendly messages.
 *
 * Architecture rule:
 *   Stores → authRepository → registry.getAuthProvider() → provider implementation
 */

import { getAuthProvider } from '../providers/backend/registry.js'
import { normalizeUser, ANONYMOUS_USER } from '../providers/backend/normalizedUser.js'
import { mapFirebaseError } from '../config/errorMessages.js'

// Retain the last raw auth session so sendEmailVerification can use it
let _lastRawSession = null

export const authRepository = {
  /**
   * Log in user and return a NormalizedUser.
   * @param {string} email
   * @param {string} password
   * @returns {Promise<import('../providers/backend/normalizedUser.js').NormalizedUser>}
   */
  async signIn(email, password) {
    try {
      const authProvider = getAuthProvider()
      const session = await authProvider.signIn({ email, password })
      _lastRawSession = session
      return normalizeUser({
        uid: session.userId,
        email: session.email,
        emailVerified: session.emailVerified,
      })
    } catch (err) {
      throw new Error(mapFirebaseError(err), { cause: err })
    }
  },

  /**
   * Register user, send verification, and return a NormalizedUser.
   * @param {string} email
   * @param {string} password
   * @returns {Promise<{ user: import('../providers/backend/normalizedUser.js').NormalizedUser }>}
   */
  async signUp(email, password) {
    try {
      const authProvider = getAuthProvider()
      const session = await authProvider.signUp({ email, password })
      _lastRawSession = session
      const normalized = normalizeUser({
        uid: session.userId,
        email: session.email,
        emailVerified: session.emailVerified,
      })
      return { user: normalized }
    } catch (err) {
      throw new Error(mapFirebaseError(err), { cause: err })
    }
  },

  /**
   * Sign out the current user.
   */
  async signOut() {
    try {
      _lastRawSession = null
      const authProvider = getAuthProvider()
      await authProvider.signOut()
    } catch (err) {
      throw new Error(mapFirebaseError(err), { cause: err })
    }
  },

  /**
   * Subscribe to auth state changes.
   * Callback receives a NormalizedUser (or ANONYMOUS_USER sentinel when signed out).
   *
   * @param {(user: import('../providers/backend/normalizedUser.js').NormalizedUser) => void} callback
   * @returns {() => void} Unsubscribe function
   */
  onAuthStateChanged(callback) {
    const authProvider = getAuthProvider()
    return authProvider.onAuthStateChanged((session) => {
      if (session) {
        _lastRawSession = session
        callback(normalizeUser({
          uid: session.userId,
          email: session.email,
          emailVerified: session.emailVerified,
        }))
      } else {
        _lastRawSession = null
        callback(ANONYMOUS_USER)
      }
    })
  },

  /**
   * Request password reset email.
   * @param {string} email
   */
  async sendPasswordReset(email) {
    try {
      const authProvider = getAuthProvider()
      await authProvider.sendPasswordReset(email)
    } catch (err) {
      throw new Error(mapFirebaseError(err), { cause: err })
    }
  },

  /**
   * Send/re-send email verification.
   * @param {import('../providers/backend/normalizedUser.js').NormalizedUser} normalizedUser
   */
  async sendVerification(normalizedUser) {
    if (!normalizedUser || normalizedUser === ANONYMOUS_USER) {
      throw new Error('No user provided for verification.')
    }
    const authProvider = getAuthProvider()
    // Prefer the retained raw session; fall back to a synthetic session from normalized user
    const session = _lastRawSession || {
      userId: normalizedUser.id,
      email: normalizedUser.email,
      emailVerified: normalizedUser.emailVerified,
    }
    await authProvider.sendEmailVerification(session)
  },
}
