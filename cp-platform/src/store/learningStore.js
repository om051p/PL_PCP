/**
 * learningStore.js
 *
 * Top-level aggregator that joins decisionHistoryStore +
 * recommendationFeedbackStore into a unified training dataset.
 *
 * NO machine learning in this phase — pure data aggregation.
 *
 * Exports:
 *   - getTrainingDataset(filters) — joins decisions + feedback on (projectId, relatedRecommendationId)
 *   - exportDataset(filters) — returns versioned JSON envelope
 *   - getCounts(projectId) — counts of decisions, overrides, accepted
 *   - getOverrideHistory(projectId) — filtered feedback records
 */

import { useDecisionHistoryStore } from './decisionHistoryStore.js'
import { useRecommendationFeedbackStore, FEEDBACK_KINDS } from './recommendationFeedbackStore.js'

/**
 * Get the unified training dataset. Joins decision records with feedback
 * records on (projectId, relatedRecommendationId).
 *
 * @param {object} filters - { projectId, stationId, since, decisionType }
 * @returns {Array<{decision, feedback}>}
 */
export function getTrainingDataset(filters = {}) {
  const decisionStore = useDecisionHistoryStore.getState()
  const feedbackStore = useRecommendationFeedbackStore.getState()

  let decisions = decisionStore.records
  let feedbacks = feedbackStore.getTrainingDataset(filters)

  if (filters.projectId) {
    decisions = decisions.filter((d) => d.projectId === filters.projectId)
  }
  if (filters.stationId) {
    decisions = decisions.filter((d) => d.stationId === filters.stationId)
  }
  if (filters.decisionType) {
    decisions = decisions.filter((d) => d.decisionType === filters.decisionType)
  }
  if (filters.since) {
    decisions = decisions.filter((d) => d.timestamp >= filters.since)
    feedbacks = feedbacks.filter((f) => f.timestamp >= filters.since)
  }

  // Build feedback lookup by (projectId, recommendationId)
  const feedbackByKey = new Map()
  for (const f of feedbacks) {
    if (!f.recommendationId) continue
    const key = `${f.projectId}::${f.recommendationId}`
    feedbackByKey.set(key, f)
  }

  // Join: each decision gets its matching feedback (if any)
  const joined = []
  for (const d of decisions) {
    let feedback = null
    if (d.relatedRecommendationId) {
      const key = `${d.projectId}::${d.relatedRecommendationId}`
      feedback = feedbackByKey.get(key)
    }
    joined.push({ decision: d, feedback })
  }

  return joined.sort((a, b) => a.decision.timestamp.localeCompare(b.decision.timestamp))
}

/**
 * Export the unified training dataset as a versioned JSON envelope.
 */
export function exportDataset(filters = {}) {
  const data = getTrainingDataset(filters)
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    count: data.length,
    records: data,
  }
}

/**
 * Get counts for the UI.
 */
export function getCounts(projectId) {
  const decisionStore = useDecisionHistoryStore.getState()
  const feedbackStore = useRecommendationFeedbackStore.getState()

  const decisionCounts = decisionStore.getCounts(projectId)
  const feedbackCounts = feedbackStore.getCounts(projectId)

  return {
    decisions: decisionCounts,
    feedback: feedbackCounts,
  }
}

/**
 * Get override history — feedback records where user overrode the recommendation.
 */
export function getOverrideHistory(projectId) {
  const feedbackStore = useRecommendationFeedbackStore.getState()
  let records = feedbackStore.records.filter((r) => r.feedback === FEEDBACK_KINDS.OVERRIDDEN)
  if (projectId) {
    records = records.filter((r) => r.projectId === projectId)
  }
  return records.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
}

/**
 * Get accepted history — feedback records where user accepted the recommendation.
 */
export function getAcceptedHistory(projectId) {
  const feedbackStore = useRecommendationFeedbackStore.getState()
  let records = feedbackStore.records.filter((r) => r.feedback === FEEDBACK_KINDS.ACCEPTED)
  if (projectId) {
    records = records.filter((r) => r.projectId === projectId)
  }
  return records.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
}

export default {
  getTrainingDataset,
  exportDataset,
  getCounts,
  getOverrideHistory,
  getAcceptedHistory,
}
