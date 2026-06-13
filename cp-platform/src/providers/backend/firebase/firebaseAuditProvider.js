/**
 * FIREBASE AUDIT PROVIDER
 *
 * Implements AuditProvider contract using Firestore.
 * Audit logs are stored in the 'audit_logs' collection.
 *
 * @implements {import('../contracts/auditProvider.js').AuditProvider}
 */

import { getFirestore, doc, setDoc, collection, getDocs } from 'firebase/firestore'

export const firebaseAuditProvider = {
  providerId: 'firebase-firestore',

  async write(logData) {
    const db = getFirestore()
    const logId = `log-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
    return setDoc(doc(db, 'audit_logs', logId), logData)
  },

  async fetchAll() {
    const db = getFirestore()
    const snap = await getDocs(collection(db, 'audit_logs'))
    const list = []
    snap.forEach((d) => list.push(d.data()))
    return list
  },
}
