import { getFirestore, doc, getDoc, setDoc, collection, getDocs, query, where } from 'firebase/firestore'

export const firestoreUserApi = {
  /**
   * Fetch user profile from Firestore by UID
   * @param {string} uid
   */
  async getUserProfile(uid) {
    const db = getFirestore()
    return getDoc(doc(db, 'users', uid))
  },

  /**
   * Create or update user profile in Firestore
   * @param {string} uid
   * @param {object} data
   * @param {object} [options]
   */
  async setUserProfile(uid, data, options = {}) {
    const db = getFirestore()
    return setDoc(doc(db, 'users', uid), data, options)
  },

  /**
   * Fetch all users list from Firestore filtered by organization
   * @param {string} organizationId
   */
  async getAllUsers(organizationId = 'ikk') {
    const db = getFirestore()
    return getDocs(query(collection(db, 'users'), where('organizationId', '==', organizationId)))
  },

  /**
   * Create an audit log record
   * @param {string} logId
   * @param {object} logData
   */
  async createAuditLog(logId, logData) {
    const db = getFirestore()
    return setDoc(doc(db, 'audit_logs', logId), logData)
  },

  /**
   * Fetch all audit logs
   */
  async getAuditLogs() {
    const db = getFirestore()
    return getDocs(collection(db, 'audit_logs'))
  },
}
