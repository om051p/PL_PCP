/**
 * decisionHistoryStore.js
 *
 * Captures every design decision as a future AI training dataset.
 * NO machine learning in this phase — pure structured data collection.
 *
 * Decision types: 'input_change' | 'calc_run' | 'status_change' | 'bom_generated' | 'report_exported' | 'validation_resolved'
 *
 * Persistence: zustand + persist middleware (localStorage, version 1, cap 5000).
 * Backward compatibility: separate localStorage key from recommendationFeedbackStore.
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

const MAX_LOCAL_RECORDS = 5000
const STORAGE_KEY = 'raxa.decisionHistory'

export const DECISION_TYPES = Object.freeze({
  INPUT_CHANGE: 'input_change',
  CALC_RUN: 'calc_run',
  STATUS_CHANGE: 'status_change',
  BOM_GENERATED: 'bom_generated',
  REPORT_EXPORTED: 'report_exported',
  VALIDATION_RESOLVED: 'validation_resolved',
})

export const TRIGGERS = Object.freeze({
  USER_EDIT: 'user_edit',
  AUTO_RECALC: 'auto_recalc',
  WORKFLOW_ADVANCE: 'workflow_advance',
  SYSTEM: 'system',
})

let nextSeq = 1
function genId() {
  return 'dh_' + Date.now().toString(36) + '_' + (nextSeq++).toString(36)
}

export const useDecisionHistoryStore = create(
  persist(
    (set, get) => ({
      records: [],

      /**
       * Log a new decision record. Returns the created record.
       * @param {object} entry - decision fields
       */
      logDecision: (entry) => {
        const record = {
          id: genId(),
          timestamp: new Date().toISOString(),
          ...entry,
        }
        set((state) => {
          const next = [...state.records, record]
          if (next.length > MAX_LOCAL_RECORDS) {
            next.splice(0, next.length - MAX_LOCAL_RECORDS)
          }
          return { records: next }
        })
        return record
      },

      /**
       * Get all records for a project (newest first).
       */
      getProjectHistory: (projectId) => {
        return get().records
          .filter((r) => r.projectId === projectId)
          .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      },

      /**
       * Get all records for a station.
       */
      getStationHistory: (projectId, stationId) => {
        return get().records
          .filter((r) => r.projectId === projectId && r.stationId === stationId)
          .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      },

      /**
       * Find records by decision type.
       */
      getByType: (decisionType) => {
        return get().records.filter((r) => r.decisionType === decisionType)
      },

      /**
       * Find records joined to a specific recommendation ID.
       */
      getByRecommendation: (recommendationId) => {
        return get().records.filter((r) => r.relatedRecommendationId === recommendationId)
      },

      /**
       * Export the full dataset as a versioned JSON envelope.
       */
      exportDataset: (filters = {}) => {
        let data = get().records
        if (filters.projectId) data = data.filter((r) => r.projectId === filters.projectId)
        if (filters.stationId) data = data.filter((r) => r.stationId === filters.stationId)
        if (filters.decisionType) data = data.filter((r) => r.decisionType === filters.decisionType)
        if (filters.since) data = data.filter((r) => r.timestamp >= filters.since)
        return {
          version: 1,
          exportedAt: new Date().toISOString(),
          count: data.length,
          records: data,
        }
      },

      /**
       * Counts for the UI.
       */
      getCounts: (projectId) => {
        const rs = projectId
          ? get().records.filter((r) => r.projectId === projectId)
          : get().records
        const byType = {}
        for (const r of rs) {
          byType[r.decisionType] = (byType[r.decisionType] || 0) + 1
        }
        return { total: rs.length, byType }
      },

      /** Test/utility: clear all records */
      _clearAll: () => set({ records: [] }),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
    }
  )
)

export default useDecisionHistoryStore
