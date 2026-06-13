/**
 * UserProvider — INTERFACE CONTRACT
 *
 * Every user-profile backend MUST implement these methods.
 * All return values MUST use NormalizedUser (not provider-native objects).
 *
 * Contract version: 1.0.0
 */

/** @typedef {import('../normalizedUser.js').NormalizedUser} NormalizedUser */

/**
 * @typedef {Object} UserProvider
 *
 * @property {(userId: string) => Promise<NormalizedUser|null>}           fetchProfile
 *   Fetch a single user's profile by ID.
 *   Returns null if the user does not exist (NOT an error).
 *
 * @property {(userId: string, data: object) => Promise<void>}            createProfile
 *   Create a new user profile. Called during self-registration.
 *   Data should include email, displayName, and organizationId at minimum.
 *
 * @property {(userId: string, data: object) => Promise<void>}            updateProfile
 *   Merge-update an existing user profile. Partial updates only.
 *   NEVER allows self-escalation of role or approved status (enforced by repository).
 *
 * @property {(organizationId: string) => Promise<NormalizedUser[]>}      listUsers
 *   Fetch all users in an organization, sorted by email ascending.
 *
 * @property {(userId: string) => Promise<void>}                          updateLastLogin
 *   Touch the user's lastLogin timestamp. Best-effort (fire-and-forget).
 *
 * @property {(logData: object) => Promise<void>}                         writeAuditLog
 *   Write an immutable audit log entry. The `logData` object must include:
 *   - timestamp (ISO 8601)
 *   - email (string)
 *   - action (string)
 *   - status (string)
 *   - performedBy (string)
 *   - details (object)
 *   - organizationId (string)
 *
 * @property {() => Promise<object[]>}                                    fetchAuditLogs
 *   Fetch all audit logs, sorted newest-first.
 *
 * @property {() => string}                                               providerId
 *   Stable identifier for the backend (e.g. 'firebase-firestore', 'supabase-pg').
 */

// Contract — no runtime exports.
export default {}
