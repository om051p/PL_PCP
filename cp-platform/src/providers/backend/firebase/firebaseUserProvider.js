/**
 * FIREBASE USER PROVIDER
 *
 * Implements UserProvider contract using Firestore.
 * Only this file imports 'firebase/firestore' for user operations.
 *
 * @implements {import('../contracts/userProvider.js').UserProvider}
 */

import { getFirestore, doc, getDoc, setDoc, collection, getDocs, query, where } from 'firebase/firestore'
import { normalizeUser } from '../normalizedUser.js'

export const firebaseUserProvider = {
  providerId: 'firebase-firestore',

  async fetchProfile(userId) {
    const db = getFirestore()
    const snap = await getDoc(doc(db, 'users', userId))
    if (!snap.exists()) return null
    return normalizeUser(snap.data())
  },

  async createProfile(userId, data) {
    const db = getFirestore()
    return setDoc(doc(db, 'users', userId), data)
  },

  async updateProfile(userId, data) {
    const db = getFirestore()
    return setDoc(doc(db, 'users', userId), data, { merge: true })
  },

  async listUsers(organizationId) {
    const db = getFirestore()
    const snap = await getDocs(
      query(collection(db, 'users'), where('organizationId', '==', organizationId))
    )
    const list = []
    snap.forEach((d) => list.push(normalizeUser(d.data())))
    return list
  },

  async updateLastLogin(userId) {
    const db = getFirestore()
    return setDoc(doc(db, 'users', userId), { lastLogin: new Date().toISOString() }, { merge: true })
  },

  async writeAuditLog(logData) {
    const db = getFirestore()
    const logId = `log-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
    return setDoc(doc(db, 'audit_logs', logId), logData)
  },

  async fetchAuditLogs() {
    const db = getFirestore()
    const snap = await getDocs(collection(db, 'audit_logs'))
    const list = []
    snap.forEach((d) => list.push(d.data()))
    return list
  },
}
