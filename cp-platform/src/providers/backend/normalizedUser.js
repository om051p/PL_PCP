/**
 * NORMALIZED USER MODEL
 *
 * Backend-agnostic user representation used across the entire application.
 * No Firebase, Supabase, or any provider-specific fields leak past this type.
 *
 * Every provider MUST normalize its native user object into this shape
 * before returning it to repositories, stores, or UI.
 *
 * @typedef {Object} NormalizedUser
 * @property {string}  id             — Stable unique identifier for this user
 * @property {string}  email          — Verified email address (always lowercase)
 * @property {string}  displayName    — Human-readable display name
 * @property {string}  role           — RBAC role: 'admin' | 'manager' | 'engineer' | 'reviewer' | 'viewer'
 * @property {boolean} isActive       — Whether the account is allowed to sign in
 * @property {boolean} emailVerified  — Whether the email has been verified
 * @property {string}  status         — 'pending' | 'active' | 'suspended' | 'disabled' | 'rejected'
 * @property {string}  organizationId — Tenant organization identifier
 * @property {string}  [avatarUrl]    — Optional avatar/photo URL
 */

/**
 * Default role for a newly registered, unapproved user.
 */
export const DEFAULT_ROLE = 'engineer'

/**
 * Default organization ID — only applicable for single-org deployments.
 * Multi-org deployments MUST override via user profile.
 */
export const DEFAULT_ORGANIZATION_ID = 'ikk'

/**
 * Sentinel object representing an anonymous/unauthenticated visitor.
 * Use identity checks against this constant instead of null checks.
 */
export const ANONYMOUS_USER = Object.freeze({
  id: null,
  email: null,
  displayName: 'Guest',
  role: 'viewer',
  isActive: false,
  emailVerified: false,
  status: 'pending',
  organizationId: DEFAULT_ORGANIZATION_ID,
  avatarUrl: null,
})

/**
 * Assert that an object conforms to NormalizedUser shape.
 * Returns a properly-shaped NormalizedUser with safe defaults.
 *
 * @param {Object} raw — Raw user data from a provider
 * @returns {NormalizedUser}
 */
export function normalizeUser(raw) {
  if (!raw || typeof raw !== 'object') return { ...ANONYMOUS_USER }

  return {
    id:             String(raw.id ?? raw.uid ?? ''),
    email:          String(raw.email ?? '').toLowerCase().trim(),
    displayName:    String(raw.displayName || raw.name || raw.email?.split('@')[0] || 'User'),
    role:           ['admin', 'manager', 'engineer', 'reviewer', 'viewer'].includes(raw.role) ? raw.role : DEFAULT_ROLE,
    isActive:       Boolean(raw.isActive ?? raw.active ?? (raw.status === 'active')),
    emailVerified:  Boolean(raw.emailVerified ?? false),
    status:         ['pending', 'active', 'suspended', 'disabled', 'rejected'].includes(raw.status) ? raw.status : 'pending',
    organizationId: String(raw.organizationId || DEFAULT_ORGANIZATION_ID),
    avatarUrl:      raw.avatarUrl || raw.photoURL || null,
  }
}
