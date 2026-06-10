/**
 * AUTHENTICATION & AUTHORIZATION POLICY
 *
 * Centralized configuration for domain-restricted access and role-based authorization.
 * All checks go through this module — no hardcoded domains or roles elsewhere.
 *
 * Architecture supports:
 * - Multiple allowed domains
 * - User roles (admin, engineer, viewer)
 * - User activation/deactivation
 */

/**
 * User roles with permission levels.
 * Hierarchy: admin > manager > engineer > reviewer > viewer
 */
export const USER_ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  ENGINEER: 'engineer',
  REVIEWER: 'reviewer',
  VIEWER: 'viewer',
}

/**
 * Role hierarchy for permission checks.
 * Higher index = more permissions.
 */
const ROLE_HIERARCHY = [
  USER_ROLES.VIEWER,
  USER_ROLES.REVIEWER,
  USER_ROLES.ENGINEER,
  USER_ROLES.MANAGER,
  USER_ROLES.ADMIN,
]

/**
 * Permissions granted to each role.
 */
export const ROLE_PERMISSIONS = {
  [USER_ROLES.ADMIN]: [
    'projects.create',
    'projects.read',
    'projects.update',
    'projects.delete',
    'projects.archive',
    'calculations.run',
    'reports.generate',
    'bom.generate',
    'settings.manage',
    'users.manage',
  ],
  [USER_ROLES.MANAGER]: [
    'projects.create',
    'projects.read',
    'projects.update',
    'projects.delete',
    'projects.archive',
    'calculations.run',
    'reports.generate',
    'bom.generate',
  ],
  [USER_ROLES.ENGINEER]: [
    'projects.create',
    'projects.read',
    'projects.update',
    'calculations.run',
    'reports.generate',
    'bom.generate',
  ],
  [USER_ROLES.REVIEWER]: [
    'projects.read',
    'reports.generate',
  ],
  [USER_ROLES.VIEWER]: [
    'projects.read',
    'reports.generate',
  ],
}

/**
 * List of allowed email domains.
 * Users must authenticate with an email from one of these domains.
 * Case-insensitive matching.
 *
 * @type {string[]}
 */
export const AUTH_ALLOWED_DOMAINS = [
  'ikkgroup.com',
]

/**
 * Default role assigned to new users from allowed domains.
 */
export const DEFAULT_ROLE = USER_ROLES.ENGINEER

/**
 * Error message shown when user's email domain is not allowed.
 */
export const DOMAIN_RESTRICTION_MESSAGE = 'Access restricted to IKK Group users.'

/**
 * Error message shown when user lacks required role.
 */
export const ROLE_RESTRICTION_MESSAGE = 'You do not have permission to access this page.'

/**
 * Error message shown when user account is deactivated.
 */
export const DEACTIVATION_MESSAGE = 'Your account has been deactivated. Contact your administrator.'

/**
 * Check if an email address belongs to an allowed domain.
 *
 * @param {string} email - The user's email address
 * @returns {boolean} True if the email domain is allowed
 */
export function isEmailDomainAllowed(email) {
  if (!email || typeof email !== 'string') return false

  const emailLower = email.toLowerCase().trim()
  const atIndex = emailLower.lastIndexOf('@')

  if (atIndex === -1 || atIndex === emailLower.length - 1) return false

  const domain = emailLower.slice(atIndex + 1)
  return AUTH_ALLOWED_DOMAINS.some((allowed) => allowed.toLowerCase() === domain)
}

/**
 * Extract the domain from an email address.
 * Used internally by validateUserDomain and available for future use.
 *
 * @param {string} email - The user's email address
 * @returns {string | null} The domain part, or null if invalid
 */
export function extractEmailDomain(email) {
  if (!email || typeof email !== 'string') return null

  const emailLower = email.toLowerCase().trim()
  const atIndex = emailLower.lastIndexOf('@')

  if (atIndex === -1 || atIndex === emailLower.length - 1) return null

  return emailLower.slice(atIndex + 1)
}

/**
 * Validate a user object against the domain policy.
 *
 * @param {Object} user - User object with email property
 * @returns {{ allowed: boolean, reason: string }} Validation result
 */
export function validateUserDomain(user) {
  if (!user) {
    return { allowed: false, reason: 'No user provided' }
  }

  if (!user.email) {
    return { allowed: false, reason: 'No email address on file' }
  }

  if (!isEmailDomainAllowed(user.email)) {
    const domain = extractEmailDomain(user.email)
    return {
      allowed: false,
      reason: `${DOMAIN_RESTRICTION_MESSAGE} (detected: @${domain || 'unknown'})`,
    }
  }

  return { allowed: true, reason: '' }
}

/**
 * Check if a user has the required role (or higher).
 *
 * @param {Object} user - User object with role property
 * @param {string} requiredRole - Minimum role required
 * @returns {boolean} True if user's role meets or exceeds the requirement
 */
export function hasRole(user, requiredRole) {
  if (!user || !user.role) return false

  const userLevel = ROLE_HIERARCHY.indexOf(user.role)
  const requiredLevel = ROLE_HIERARCHY.indexOf(requiredRole)

  if (userLevel === -1 || requiredLevel === -1) return false

  return userLevel >= requiredLevel
}

/**
 * Check if a user has a specific permission.
 *
 * @param {Object} user - User object with role property
 * @param {string} permission - Permission to check (e.g., 'projects.create')
 * @returns {boolean} True if user has the permission
 */
export function hasPermission(user, permission) {
  if (!user || !user.role) return false

  const permissions = ROLE_PERMISSIONS[user.role]
  if (!permissions) return false

  return permissions.includes(permission)
}

/**
 * Get all permissions for a user's role.
 *
 * @param {Object} user - User object with role property
 * @returns {string[]} Array of permission strings
 */
export function getUserPermissions(user) {
  if (!user || !user.role) return []
  return ROLE_PERMISSIONS[user.role] || []
}
