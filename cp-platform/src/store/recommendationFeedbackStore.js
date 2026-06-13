/**
 * recommendationFeedbackStore.js
 *
 * Captures user feedback on engineering recommendations. This is the
 * foundation for a future AI training dataset — no ML yet, just
 * structured data collection.
 *
 * Data shape (one record per recommendation decision):
 * {
 *   id, timestamp, userId, userEmail,
 *   projectId, stationId, sessionId,
 *   // The recommendation
 *   recommendationId, category, severity, title, message, action,
 *   confidence, source,
 *   // The observed engineering inputs at the time
 *   observedInputs,
 *   // The user's decision
 *   feedback,                  // 'accepted' | 'changed' | 'overridden' | 'ignored' | 'pending'
 *   changeDescription,         // free text when feedback=changed|overridden
 *   beforeValue, afterValue,   // numeric diff when applicable
 *   timeToDecisionMs,          // latency from rec shown to decision
 *   contextTags,               // {page, designStandard, orgId, ...}
 * }
 *
 * Persistence: zustand + persist middleware (localStorage for v1).
 * Future: will migrate to Firestore collection 'recommendation_feedback'.
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

const MAX_LOCAL_RECORDS = 5000

export const FEEDBACK_KINDS = Object.freeze({
  PENDING: 'pending',       // shown but not yet decided
  ACCEPTED: 'accepted',     // user agreed, no change
  CHANGED: 'changed',       // user modified inputs to address the rec
  OVERRIDDEN: 'overridden', // user dismissed without addressing
  IGNORED: 'ignored',       // shown, no action taken, marked as ignored later
})

export const FEEDBACK_LABELS = Object.freeze({
  [FEEDBACK_KINDS.PENDING]: 'Pending',
  [FEEDBACK_KINDS.ACCEPTED]: 'Accepted',
  [FEEDBACK_KINDS.CHANGED]: 'Addressed (design changed)',
  [FEEDBACK_KINDS.OVERRIDDEN]: 'Overridden',
  [FEEDBACK_KINDS.IGNORED]: 'Ignored',
})

let nextId = 1
function genId() {
  return 'fb_' + Date.now().toString(36) + '_' + (nextId++).toString(36)
}

function genSessionId() {
  return 'sess_' + Math.random().toString(36).slice(2, 10)
}

export const useRecommendationFeedbackStore = create(
  persist(
    (set, get) => ({
      // State
      records: [],
      currentSessionId: null,

      // Ensure a session id exists
      ensureSession: () => {
        let s = get().currentSessionId
        if (!s) {
          s = genSessionId()
          set({ currentSessionId: s })
        }
        return s
      },

      // Log a new feedback record. Required: recommendation, user, project, station.
      // The 'feedback' kind can be passed at log time, or set later via
      // `updateFeedback` when the user actually decides.
      logFeedback: (entry) => {
        const record = {
          id: genId(),
          timestamp: new Date().toISOString(),
          sessionId: get().ensureSession(),
          feedback: FEEDBACK_KINDS.PENDING,
          // Spread the rest
          ...entry,
        }
        set((state) => {
          const next = [...state.records, record]
          // Cap the in-memory store
          if (next.length > MAX_LOCAL_RECORDS) {
            next.splice(0, next.length - MAX_LOCAL_RECORDS)
          }
          return { records: next }
        })
        return record
      },

      // Update an existing record by id (e.g., when user clicks Accept later)
      updateFeedback: (id, patch) => {
        set((state) => ({
          records: state.records.map((r) =>
            r.id === id ? { ...r, ...patch, decidedAt: new Date().toISOString() } : r
          ),
        }))
      },

      // Bulk update: mark all PENDING records for a station as IGNORED
      // (used when user navigates away without deciding)
      markStationPendingAsIgnored: (projectId, stationId) => {
        set((state) => ({
          records: state.records.map((r) =>
            r.feedback === FEEDBACK_KINDS.PENDING &&
            r.projectId === projectId &&
            r.stationId === stationId
              ? { ...r, feedback: FEEDBACK_KINDS.IGNORED, decidedAt: new Date().toISOString() }
              : r
          ),
        }))
      },

      // Mark a specific recommendation as accepted (most common action)
      acceptFeedback: (id) => {
        get().updateFeedback(id, { feedback: FEEDBACK_KINDS.ACCEPTED })
      },

      // Mark a specific recommendation as overridden (user dismissed it)
      overrideFeedback: (id, reason) => {
        get().updateFeedback(id, { feedback: FEEDBACK_KINDS.OVERRIDDEN, changeDescription: reason })
      },

      // Mark a specific recommendation as addressed (user changed design)
      addressFeedback: (id, changeDescription, beforeValue, afterValue) => {
        get().updateFeedback(id, {
          feedback: FEEDBACK_KINDS.CHANGED,
          changeDescription,
          beforeValue,
          afterValue,
        })
      },

      // Get all records for a project (newest first)
      getProjectHistory: (projectId) => {
        return get().records
          .filter((r) => r.projectId === projectId)
          .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      },

      // Get all records for a station
      getStationHistory: (projectId, stationId) => {
        return get().records
          .filter((r) => r.projectId === projectId && r.stationId === stationId)
          .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      },

      // Get only decided records (for AI training)
      getTrainingDataset: (filters = {}) => {
        let r = get().records.filter((rec) => rec.feedback !== FEEDBACK_KINDS.PENDING)
        if (filters.projectId) r = r.filter((x) => x.projectId === filters.projectId)
        if (filters.stationId) r = r.filter((x) => x.stationId === filters.stationId)
        if (filters.since) r = r.filter((x) => x.timestamp >= filters.since)
        return r.sort((a, b) => a.timestamp.localeCompare(b.timestamp))
      },

      // Export the full dataset as JSON (for AI training or analytics)
      exportDataset: (filters = {}) => {
        const data = get().getTrainingDataset(filters)
        return {
          version: 1,
          exportedAt: new Date().toISOString(),
          count: data.length,
          records: data,
        }
      },

      // Counts for the UI
      getCounts: (projectId) => {
        const rs = projectId
          ? get().records.filter((r) => r.projectId === projectId)
          : get().records
        return {
          total: rs.length,
          pending: rs.filter((r) => r.feedback === FEEDBACK_KINDS.PENDING).length,
          accepted: rs.filter((r) => r.feedback === FEEDBACK_KINDS.ACCEPTED).length,
          changed: rs.filter((r) => r.feedback === FEEDBACK_KINDS.CHANGED).length,
          overridden: rs.filter((r) => r.feedback === FEEDBACK_KINDS.OVERRIDDEN).length,
          ignored: rs.filter((r) => r.feedback === FEEDBACK_KINDS.IGNORED).length,
        }
      },

      // Test/utility: clear all records (used in tests and admin tools)
      _clearAll: () => set({ records: [], currentSessionId: null }),
    }),
    {
      name: 'raxa.recommendationFeedback',
      version: 1,
      storage: createJSONStorage(() => localStorage),
    }
  )
)

export default useRecommendationFeedbackStore
