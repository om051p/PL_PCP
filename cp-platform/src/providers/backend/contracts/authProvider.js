/**
 * AuthProvider — INTERFACE CONTRACT
 *
 * Every authentication backend MUST implement these methods.
 * Do NOT import this file from UI, pages, or stores.
 * Repositories consume this interface; the provider registry resolves the implementation.
 *
 * Contract version: 1.0.0
 */

/**
 * @typedef {Object} AuthCredentials
 * @property {string} email
 * @property {string} password
 */

/**
 * @typedef {Object} AuthSession
 * @property {string} userId       — Normalized user ID
 * @property {string} email        — Verified email address
 * @property {boolean} emailVerified
 * @property {Object} [raw]        — Provider-native session object (for internal use)
 */

/**
 * @callback AuthStateCallback
 * @param {AuthSession|null} session — null when signed out
 * @returns {void}
 */

/**
 * @typedef {Object} AuthProvider
 *
 * @property {(credentials: AuthCredentials) => Promise<AuthSession>}   signIn
 *   Authenticate user with email + password.
 *   MUST throw on failure (repository wraps with user-friendly error).
 *
 * @property {(credentials: AuthCredentials) => Promise<AuthSession>}   signUp
 *   Create a new user account.
 *   MUST send verification email as part of sign-up flow.
 *
 * @property {() => Promise<void>}                                      signOut
 *   End the current session. MUST be idempotent (safe to call when no session exists).
 *
 * @property {(callback: AuthStateCallback) => () => void}              onAuthStateChanged
 *   Subscribe to authentication state changes.
 *   Returns an unsubscribe function.
 *   MUST fire immediately with the current state on subscription.
 *
 * @property {(email: string) => Promise<void>}                         sendPasswordReset
 *   Send a password reset email.
 *   MUST NOT reveal whether the email exists (security best practice).
 *
 * @property {(session: AuthSession) => Promise<void>}                  sendEmailVerification
 *   Send/re-send an email verification message for the given session.
 *
 * @property {() => string}                                             providerId
 *   Stable identifier for the backend (e.g. 'firebase', 'supabase', 'rest').
 */

// This file defines a contract — no runtime exports.
// Implementations in providers/backend/firebase/ and providers/backend/supabase/.
export default {}
