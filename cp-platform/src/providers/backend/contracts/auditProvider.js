/**
 * AuditProvider — INTERFACE CONTRACT
 *
 * Immutable audit trail for all security-sensitive operations.
 * Separated from UserProvider so audit can use a different backend if needed
 * (e.g., append-only log vs. user profile database).
 *
 * Contract version: 1.0.0
 */

/**
 * @typedef {Object} AuditLogEntry
 * @property {string} timestamp      — ISO 8601
 * @property {string} email          — Target user email
 * @property {string} action         — Action code (LOGIN_SUCCESS, USER_APPROVED, etc.)
 * @property {string} status         — 'success' | 'failure' | 'pending'
 * @property {string} performedBy    — Email of the actor
 * @property {object} details        — Arbitrary metadata
 * @property {string} organizationId — Tenant scope
 */

/**
 * @typedef {Object} AuditProvider
 *
 * @property {(entry: AuditLogEntry) => Promise<void>}  write
 *   Write an immutable audit log entry.
 *   MUST succeed or throw — no silent failures.
 *   Implementations SHOULD handle offline queueing internally.
 *
 * @property {() => Promise<AuditLogEntry[]>}            fetchAll
 *   Fetch all audit logs, sorted newest-first.
 *
 * @property {() => string}                              providerId
 *   Stable identifier (e.g. 'firestore', 'postgres', 'filesystem').
 */

// Contract — no runtime exports.
export default {}
