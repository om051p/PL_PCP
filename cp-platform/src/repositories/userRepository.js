/**
 * USER REPOSITORY
 *
 * Manages user profiles and audit logging through configured providers.
 * All provider calls go through the registry — no direct SDK imports.
 *
 * Architecture rule:
 *   Stores → userRepository → registry.getUserProvider() / getAuditProvider()
 */

import { getUserProvider, getAuditProvider } from '../providers/backend/registry.js'
import { localStorageApi } from '../api/localStorageApi.js'

const AUDIT_QUEUE_KEY = 'cp-platform-failed-audit-logs'

/** @param {Promise} promise @param {number} timeoutMs */
function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Operation timed out')), timeoutMs)
    ),
  ])
}

/** @param {function} fn @param {number} retries @param {number} delay */
async function retryWithBackoff(fn, retries = 3, delay = 1000) {
  try {
    return await fn()
  } catch (err) {
    if (retries <= 0) throw err
    console.warn(`[UserRepository] Retrying operation... attempts remaining: ${retries}. Error:`, err.message)
    await new Promise((resolve) => setTimeout(resolve, delay))
    return retryWithBackoff(fn, retries - 1, delay * 2)
  }
}

export const userRepository = {
  /**
   * Fetch a user profile with timeout and admin bootstrap logic.
   * @param {string} userId
   * @param {string|null} email
   * @returns {Promise<object|null>}
   */
  async fetchUserProfile(userId, email = null) {
    if (!userId) return null

    try {
      const userProvider = getUserProvider()
      const profile = await withTimeout(userProvider.fetchProfile(userId), 2000)
      if (profile) return profile
    } catch (err) {
      console.warn('[UserRepository] Profile fetch timed out or failed:', err.message)
    }

    // Admin Bootstrap Account for rahul.panchel@ikkgroup.com
    if (email && email.toLowerCase() === 'rahul.panchel@ikkgroup.com') {
      try {
        const bootstrapData = {
          id: userId,
          email: 'rahul.panchel@ikkgroup.com',
          displayName: 'Rahul Panchal',
          organizationId: 'ikk',
          role: 'admin',
          approved: true,
          status: 'active',
          active: true,
          createdAt: new Date().toISOString(),
          approvedBy: 'system_bootstrap',
          approvedAt: new Date().toISOString(),
        }
        const userProvider = getUserProvider()
        await userProvider.createProfile(userId, bootstrapData)
        await this.logAuditEvent('USER_APPROVED', 'rahul.panchel@ikkgroup.com', 'system_bootstrap', { reason: 'bootstrap' })
        return bootstrapData
      } catch (bootstrapErr) {
        console.warn('[UserRepository] Failed to bootstrap admin user:', bootstrapErr.message)
      }
    }

    return null
  },

  /**
   * Create pending profile for self-registered user.
   * @param {string} userId
   * @param {string} email
   */
  async createUserProfile(userId, email) {
    const userProvider = getUserProvider()
    return userProvider.createProfile(userId, {
      email: email.trim().toLowerCase(),
      displayName: email.split('@')[0],
      organizationId: 'ikk',
      role: 'engineer',
      approved: false,
      status: 'pending',
      active: false,
      createdAt: new Date().toISOString(),
    })
  },

  /**
   * Fetch all users in an organization.
   * @param {string} organizationId
   * @returns {Promise<Array>}
   */
  async fetchUsersList(organizationId = 'ikk') {
    const userProvider = getUserProvider()
    return userProvider.listUsers(organizationId)
  },

  async approveUser(uid, email, adminEmail) {
    const userProvider = getUserProvider()
    await userProvider.updateProfile(uid, {
      approved: true,
      status: 'active',
      active: true,
      approvedBy: adminEmail,
      approvedAt: new Date().toISOString(),
    })
    await this.logAuditEvent('USER_APPROVED', email, adminEmail)
  },

  async rejectUser(uid, email, adminEmail) {
    const userProvider = getUserProvider()
    await userProvider.updateProfile(uid, {
      approved: false,
      status: 'rejected',
      active: false,
    })
    await this.logAuditEvent('USER_REJECTED', email, adminEmail)
  },

  async updateUserRole(uid, email, role, adminEmail) {
    const userProvider = getUserProvider()
    await userProvider.updateProfile(uid, { role })
    await this.logAuditEvent('ROLE_CHANGED', email, adminEmail, { newRole: role })
  },

  async suspendUser(uid, email, adminEmail) {
    const userProvider = getUserProvider()
    await userProvider.updateProfile(uid, { status: 'suspended', active: false })
    await this.logAuditEvent('USER_SUSPENDED', email, adminEmail)
  },

  async disableUser(uid, email, adminEmail) {
    const userProvider = getUserProvider()
    await userProvider.updateProfile(uid, { status: 'disabled', active: false })
    await this.logAuditEvent('USER_DISABLED', email, adminEmail)
  },

  async enableUser(uid, email, adminEmail) {
    const userProvider = getUserProvider()
    await userProvider.updateProfile(uid, {
      status: 'active',
      active: true,
      approved: true,
    })
    await this.logAuditEvent('USER_ENABLED', email, adminEmail)
  },

  /**
   * Log an audit event with exponential backoff and localStorage fallback queue.
   */
  async logAuditEvent(action, targetUser, performedBy, details = {}) {
    const logData = {
      timestamp: new Date().toISOString(),
      email: targetUser || '',
      action,
      status: details.status || 'success',
      ip: details.ip || null,
      performedBy: performedBy || 'system',
      details,
      organizationId: 'ikk',
    }

    try {
      const auditProvider = getAuditProvider()
      const writeFn = () => auditProvider.write(logData)
      await retryWithBackoff(writeFn, 3, 1000)
      await this.processQueue()
    } catch (err) {
      console.warn('[UserRepository] Failed to write audit log after retries. Queueing offline:', err.message)
      this.queueOffline(logData)
    }
  },

  queueOffline(logData) {
    const queue = localStorageApi.getJSON(AUDIT_QUEUE_KEY) || []
    queue.push({ logData })
    localStorageApi.setJSON(AUDIT_QUEUE_KEY, queue)
  },

  async processQueue() {
    const queue = localStorageApi.getJSON(AUDIT_QUEUE_KEY)
    if (!queue || queue.length === 0) return

    console.info(`[UserRepository] Found ${queue.length} queued offline logs. Attempting sync...`)
    const remaining = []

    for (const item of queue) {
      try {
        const auditProvider = getAuditProvider()
        await auditProvider.write(item.logData)
      } catch (err) {
        console.warn(`[UserRepository] Queue sync failed:`, err.message)
        remaining.push(item)
      }
    }

    if (remaining.length > 0) {
      localStorageApi.setJSON(AUDIT_QUEUE_KEY, remaining)
    } else {
      localStorageApi.removeItem(AUDIT_QUEUE_KEY)
      console.info('[UserRepository] All queued offline logs synced successfully.')
    }
  },

  /**
   * Fetch all audit logs, sorted newest-first.
   */
  async fetchAuditLogs() {
    const auditProvider = getAuditProvider()
    const list = await auditProvider.fetchAll()
    return list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  },

  /**
   * Touch the user's last login timestamp (fire-and-forget).
   */
  async updateUserLastLogin(userId) {
    const userProvider = getUserProvider()
    return userProvider.updateLastLogin(userId)
  },
}
