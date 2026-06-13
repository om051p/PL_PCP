/**
 * BACKEND PROVIDER REGISTRY — Dependency Injection Container
 *
 * Single point of configuration for which backend providers are active.
 * Repositories import from here instead of importing provider implementations directly.
 *
 * To switch backends, change the `configureBackend(...)` call in main.jsx.
 * Everything else stays unchanged.
 *
 * Usage:
 *   import { getAuthProvider } from '../providers/backend/registry.js'
 *   const authProvider = getAuthProvider()
 *   await authProvider.signIn({ email, password })
 */

/** @type {import('./contracts/authProvider.js').AuthProvider|null} */
let _authProvider = null

/** @type {import('./contracts/userProvider.js').UserProvider|null} */
let _userProvider = null

/** @type {import('./contracts/projectProvider.js').ProjectProvider|null} */
let _projectProvider = null

/** @type {import('./contracts/auditProvider.js').AuditProvider|null} */
let _auditProvider = null

/** @type {import('./contracts/storageProvider.js').StorageProvider|null} */
let _storageProvider = null

/**
 * Configure all backend providers at once.
 * Called once at application startup (main.jsx).
 *
 * @param {Object} opts
 * @param {import('./contracts/authProvider.js').AuthProvider}       opts.auth
 * @param {import('./contracts/userProvider.js').UserProvider}       opts.user
 * @param {import('./contracts/projectProvider.js').ProjectProvider} opts.project
 * @param {import('./contracts/auditProvider.js').AuditProvider}     opts.audit
 * @param {import('./contracts/storageProvider.js').StorageProvider} [opts.storage]
 */
export function configureBackend({ auth, user, project, audit, storage }) {
  _authProvider = auth
  _userProvider = user
  _projectProvider = project
  _auditProvider = audit
  _storageProvider = storage || null

  if (import.meta.env.DEV) {
    console.log('[Backend Registry] Configured backend:', {
      auth: auth.providerId,
      user: user.providerId,
      project: project.providerId,
      audit: audit.providerId,
      storage: storage?.providerId || 'none',
    })
  }
}

/** @returns {import('./contracts/authProvider.js').AuthProvider} */
export function getAuthProvider() {
  if (!_authProvider) throw new Error('[Registry] AuthProvider not configured. Call configureBackend() first.')
  return _authProvider
}

/** @returns {import('./contracts/userProvider.js').UserProvider} */
export function getUserProvider() {
  if (!_userProvider) throw new Error('[Registry] UserProvider not configured. Call configureBackend() first.')
  return _userProvider
}

/** @returns {import('./contracts/projectProvider.js').ProjectProvider} */
export function getProjectProvider() {
  if (!_projectProvider) throw new Error('[Registry] ProjectProvider not configured. Call configureBackend() first.')
  return _projectProvider
}

/** @returns {import('./contracts/auditProvider.js').AuditProvider} */
export function getAuditProvider() {
  if (!_auditProvider) throw new Error('[Registry] AuditProvider not configured. Call configureBackend() first.')
  return _auditProvider
}

/** @returns {import('./contracts/storageProvider.js').StorageProvider|null} */
export function getStorageProvider() {
  return _storageProvider
}

/**
 * For development/debugging: reset all providers to null.
 * Never call in production code paths.
 */
export function _resetRegistry() {
  _authProvider = null
  _userProvider = null
  _projectProvider = null
  _auditProvider = null
  _storageProvider = null
}
