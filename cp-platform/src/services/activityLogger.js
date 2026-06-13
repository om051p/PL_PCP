/**
 * activityLogger.js
 *
 * Real activity log backed by Firestore. Cross-user, persistent, queryable.
 *
 * Schema (collection `activity`):
 *   {
 *     id: string (uuid),
 *     projectId: string,
 *     userId: string,
 *     userEmail: string,
 *     action: string,         // e.g. 'Calculation Run', 'Revision Created', 'BOM Exported'
 *     module: string,         // e.g. 'Calculations', 'Design Basis', 'Workspace'
 *     details: string,        // free-text description
 *     metadata: object,       // optional structured data
 *     timestamp: string (ISO),
 *     kind: string,           // 'info' | 'success' | 'warning' | 'error' (UI dot color)
 *   }
 *
 * Indexes required in firestore.indexes.json:
 *   - (projectId ASC, timestamp DESC)
 *   - (userId ASC, timestamp DESC)
 *
 * Usage:
 *   await logActivity({ projectId, user, action, module, details, kind, metadata })
 *   subscribeToActivity(projectId, callback) -> unsubscribe
 *   listRecentActivity(projectId, limit=20) -> Promise<ActivityEntry[]>
 */

import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { v4 as uuid } from 'uuid'

const COLLECTION = 'activity'
const DEFAULT_LIMIT = 20

/**
 * Convert a Firestore Timestamp to ISO string.
 */
function tsToISO(ts) {
  if (!ts) return new Date().toISOString()
  if (ts instanceof Timestamp) return ts.toDate().toISOString()
  if (typeof ts === 'string') return ts
  return new Date(ts).toISOString()
}

/**
 * Normalize a Firestore doc into a plain ActivityEntry.
 */
function normalize(docSnap) {
  const data = docSnap.data()
  return {
    id: docSnap.id,
    projectId: data.projectId,
    userId: data.userId,
    userEmail: data.userEmail,
    action: data.action,
    module: data.module,
    details: data.details,
    metadata: data.metadata || {},
    timestamp: tsToISO(data.timestamp),
    kind: data.kind || 'info',
  }
}

/**
 * Log a single activity entry. Returns the created entry (with id).
 *
 * @param {object} params
 * @param {string} params.projectId
 * @param {object} params.user - { uid, email, displayName } (typically from useAuthStore)
 * @param {string} params.action
 * @param {string} params.module
 * @param {string} [params.details]
 * @param {object} [params.metadata]
 * @param {'info'|'success'|'warning'|'error'} [params.kind='info']
 * @returns {Promise<object>} the created ActivityEntry
 */
export async function logActivity({
  projectId,
  user,
  action,
  module,
  details = '',
  metadata = {},
  kind = 'info',
}) {
  if (!projectId) throw new Error('logActivity: projectId is required')
  if (!action) throw new Error('logActivity: action is required')
  if (!module) throw new Error('logActivity: module is required')

  const id = uuid()
  const entry = {
    id,
    projectId,
    userId: user?.uid || 'anonymous',
    userEmail: user?.email || user?.displayName || 'Anonymous',
    action,
    module,
    details,
    metadata,
    timestamp: new Date().toISOString(), // Client-side ISO; serverTimestamp alternative below
    kind,
  }

  try {
    const db = getFirestore()
    await setDoc(doc(db, COLLECTION, id), {
      ...entry,
      // Use Firestore server timestamp for accurate ordering
      _serverTimestamp: serverTimestamp(),
    })
  } catch (err) {
    // Log to console; don't throw — activity logging should never break a user action
    console.warn('[activityLogger] Failed to persist activity:', err.message)
  }

  return entry
}

/**
 * Fetch recent activity for a project (one-shot, no subscription).
 *
 * @param {string} projectId
 * @param {number} [max=20]
 * @returns {Promise<Array<ActivityEntry>>}
 */
export async function listRecentActivity(projectId, max = DEFAULT_LIMIT) {
  if (!projectId) return []
  try {
    const db = getFirestore()
    const q = query(
      collection(db, COLLECTION),
      where('projectId', '==', projectId),
      orderBy('timestamp', 'desc'),
      limit(max)
    )
    const snap = await getDocs(q)
    return snap.docs.map(normalize)
  } catch (err) {
    console.warn('[activityLogger] listRecentActivity failed:', err.message)
    return []
  }
}

/**
 * Subscribe to live activity updates for a project. Returns an unsubscribe function.
 *
 * @param {string} projectId
 * @param {(entries: ActivityEntry[]) => void} callback
 * @param {number} [max=20]
 * @returns {() => void} unsubscribe
 */
export function subscribeToActivity(projectId, callback, max = DEFAULT_LIMIT) {
  if (!projectId) {
    callback([])
    return () => {}
  }
  try {
    const db = getFirestore()
    const q = query(
      collection(db, COLLECTION),
      where('projectId', '==', projectId),
      orderBy('timestamp', 'desc'),
      limit(max)
    )
    return onSnapshot(
      q,
      (snap) => callback(snap.docs.map(normalize)),
      (err) => {
        console.warn('[activityLogger] subscribeToActivity error:', err.message)
        callback([])
      }
    )
  } catch (err) {
    console.warn('[activityLogger] subscribeToActivity failed:', err.message)
    callback([])
    return () => {}
  }
}

/**
 * Build an ActivityEntry from a store action result. Convenience helper for wiring
 * into existing actions. Pure function (no side effects).
 *
 * @param {string} projectId
 * @param {object} user
 * @param {string} action
 * @param {string} module
 * @param {string} details
 * @param {string} [kind]
 * @returns {ActivityEntry} the entry (not yet persisted)
 */
export function buildEntry(projectId, user, action, module, details, kind = 'info') {
  return {
    id: uuid(),
    projectId,
    userId: user?.uid || 'anonymous',
    userEmail: user?.email || user?.displayName || 'Anonymous',
    action,
    module,
    details,
    metadata: {},
    timestamp: new Date().toISOString(),
    kind,
  }
}
