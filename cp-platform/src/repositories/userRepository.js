import { firestoreUserApi } from '../api/firestoreUserApi.js'
import { localStorageApi } from '../api/localStorageApi.js'

const AUDIT_QUEUE_KEY = 'cp-platform-failed-audit-logs'

/**
 * Execute a promise with a timeout
 * @param {Promise} promise
 * @param {number} timeoutMs
 */
function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Operation timed out')), timeoutMs)
    ),
  ])
}

/**
 * Helper to run async task with exponential backoff retries
 * @param {function} fn - Returns a promise
 * @param {number} retries - Maximum retries
 * @param {number} delay - Base delay in ms
 */
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
   * Fetch a user profile with timeout and admin bootstrap logic
   * @param {string} uid
   * @param {string|null} email
   * @returns {Promise<object|null>}
   */
  async fetchUserProfile(uid, email = null) {
    if (!uid) return null

    try {
      // Fetch with a 2-second timeout
      const userDoc = await withTimeout(firestoreUserApi.getUserProfile(uid), 2000)
      if (userDoc.exists()) {
        return userDoc.data()
      }
    } catch (err) {
      console.warn('[UserRepository] Firestore profile fetch timed out or failed:', err.message)
    }

    // Admin Bootstrap Account for rahul.panchel@ikkgroup.com
    if (email && email.toLowerCase() === 'rahul.panchel@ikkgroup.com') {
      try {
        const bootstrapData = {
          uid,
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
        await firestoreUserApi.setUserProfile(uid, bootstrapData)
        await this.logAuditEvent('USER_APPROVED', 'rahul.panchel@ikkgroup.com', 'system_bootstrap', { reason: 'bootstrap' })
        return bootstrapData
      } catch (bootstrapErr) {
        console.warn('[UserRepository] Failed to bootstrap admin user:', bootstrapErr.message)
      }
    }

    return null
  },

  /**
   * Create pending profile for self-registered user
   * @param {string} uid
   * @param {string} email
   */
  async createUserProfile(uid, email) {
    const profile = {
      uid,
      email: email.trim().toLowerCase(),
      displayName: email.split('@')[0],
      organizationId: 'ikk',
      role: 'engineer',
      approved: false,
      status: 'pending',
      active: false,
      createdAt: new Date().toISOString(),
    }
    return firestoreUserApi.setUserProfile(uid, profile)
  },

  /**
   * Fetch all users
   * @param {string} organizationId
   */
  async fetchUsersList(organizationId = 'ikk') {
    const querySnapshot = await firestoreUserApi.getAllUsers(organizationId)
    const list = []
    querySnapshot.forEach((doc) => {
      list.push(doc.data())
    })
    return list
  },

  /**
   * Approve pending user
   */
  async approveUser(uid, email, adminEmail) {
    await firestoreUserApi.setUserProfile(uid, {
      approved: true,
      status: 'active',
      active: true,
      approvedBy: adminEmail,
      approvedAt: new Date().toISOString(),
    }, { merge: true })
    
    await this.logAuditEvent('USER_APPROVED', email, adminEmail)
  },

  /**
   * Reject pending user
   */
  async rejectUser(uid, email, adminEmail) {
    await firestoreUserApi.setUserProfile(uid, {
      approved: false,
      status: 'rejected',
      active: false,
    }, { merge: true })
    
    await this.logAuditEvent('USER_REJECTED', email, adminEmail)
  },

  /**
   * Update user role
   */
  async updateUserRole(uid, email, role, adminEmail) {
    await firestoreUserApi.setUserProfile(uid, { role }, { merge: true })
    await this.logAuditEvent('ROLE_CHANGED', email, adminEmail, { newRole: role })
  },

  /**
   * Suspend user account
   */
  async suspendUser(uid, email, adminEmail) {
    await firestoreUserApi.setUserProfile(uid, {
      status: 'suspended',
      active: false,
    }, { merge: true })
    
    await this.logAuditEvent('USER_SUSPENDED', email, adminEmail)
  },

  /**
   * Disable user account
   */
  async disableUser(uid, email, adminEmail) {
    await firestoreUserApi.setUserProfile(uid, {
      status: 'disabled',
      active: false,
    }, { merge: true })
    
    await this.logAuditEvent('USER_DISABLED', email, adminEmail)
  },

  /**
   * Enable user account
   */
  async enableUser(uid, email, adminEmail) {
    await firestoreUserApi.setUserProfile(uid, {
      status: 'active',
      active: true,
      approved: true,
    }, { merge: true })
    
    await this.logAuditEvent('USER_ENABLED', email, adminEmail)
  },

  /**
   * Log an audit event with exponential backoff and localstorage fallback queueing
   * @param {string} action
   * @param {string} targetUser
   * @param {string} performedBy
   * @param {object} [details]
   */
  async logAuditEvent(action, targetUser, performedBy, details = {}) {
    const logId = `log-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
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

    const writeFn = () => firestoreUserApi.createAuditLog(logId, logData)

    try {
      // Try writing log with 3 retries (1s, 2s, 4s delay)
      await retryWithBackoff(writeFn, 3, 1000)
      
      // Successfully wrote log. Now trigger processing of any previously queued logs.
      await this.processQueue()
    } catch (err) {
      console.warn('[UserRepository] Failed to write audit log after retries. Queueing offline:', err.message)
      this.queueOffline(logId, logData)
    }
  },

  /**
   * Save failed log to local queue
   * @param {string} logId
   * @param {object} logData
   */
  queueOffline(logId, logData) {
    const queue = localStorageApi.getJSON(AUDIT_QUEUE_KEY) || []
    queue.push({ logId, logData })
    localStorageApi.setJSON(AUDIT_QUEUE_KEY, queue)
  },

  /**
   * Process and flush locally queued logs
   */
  async processQueue() {
    const queue = localStorageApi.getJSON(AUDIT_QUEUE_KEY)
    if (!queue || queue.length === 0) return

    console.info(`[UserRepository] Found ${queue.length} queued offline logs. Attempting sync...`)
    const remaining = []

    for (const item of queue) {
      try {
        await firestoreUserApi.createAuditLog(item.logId, item.logData)
      } catch (err) {
        console.warn(`[UserRepository] Queue sync failed for log ${item.logId}:`, err.message)
        remaining.push(item) // Re-queue on failure
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
   * Fetch all audit logs
   * @returns {Promise<Array>}
   */
  async fetchAuditLogs() {
    const querySnapshot = await firestoreUserApi.getAuditLogs()
    const list = []
    querySnapshot.forEach((doc) => {
      list.push(doc.data())
    })
    // Sort descending by timestamp
    return list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  },

  /**
   * Update a user's last login timestamp
   * @param {string} uid
   */
  async updateUserLastLogin(uid) {
    return firestoreUserApi.setUserProfile(uid, {
      lastLogin: new Date().toISOString()
    }, { merge: true })
  },
}
