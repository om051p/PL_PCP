/**
 * feedbackCollector.js
 *
 * Auto-capture hooks for the learning foundation. Centralizes the
 * collection of user decisions, overrides, validation outcomes, and
 * calculation runs into the decisionHistoryStore and recommendationFeedbackStore.
 *
 * Exposes 4 collect functions:
 *   - collectFromAdvisorPanel(project, station, recs) — calls feedbackStore.logFeedback
 *   - collectFromValidation(project, station, errors) — logs validation_resolved
 *   - collectFromCalculation(project, station, before, after) — logs calc_run + input_change
 *   - collectFromApproval(project, station, fromStatus, toStatus) — logs status_change
 *
 * All functions are pure (no side effects beyond calling the stores).
 * Safe to call multiple times — stores are idempotent on dedup keys.
 */

import { useRecommendationFeedbackStore, FEEDBACK_KINDS } from './recommendationFeedbackStore.js'
import { useDecisionHistoryStore, DECISION_TYPES, TRIGGERS } from './decisionHistoryStore.js'

/**
 * Build a sessionId for grouping related decisions.
 * Uses the feedback store's session if available, else generates a new one.
 */
function ensureSession() {
  const feedbackStore = useRecommendationFeedbackStore.getState()
  return feedbackStore.ensureSession()
}

/**
 * Collect feedback from the advisor panel. Logs PENDING feedback for
 * each recommendation that hasn't been seen before.
 *
 * @returns {Array<{recId: string, recordId: string}>} lookup for update later
 */
export function collectFromAdvisorPanel(project, station, recommendations) {
  if (!project || !station || !Array.isArray(recommendations)) return []

  const feedbackStore = useRecommendationFeedbackStore.getState()
  const existing = useRecommendationFeedbackStore.getState().records
  const result = []

  for (const rec of recommendations) {
    if (!rec || !rec.id) continue

    // Check for existing PENDING record
    const existingRec = existing.find(
      (r) => r.recommendationId === rec.id
        && r.stationId === station.id
        && r.projectId === project.id
        && r.feedback === FEEDBACK_KINDS.PENDING
    )
    if (existingRec) {
      result.push({ recId: rec.id, recordId: existingRec.id })
      continue
    }

    // Log new PENDING feedback
    const record = feedbackStore.logFeedback({
      userId: undefined,
      userEmail: undefined,
      projectId: project.id,
      stationId: station.id,
      recommendationId: rec.id,
      category: rec.category,
      severity: rec.severity,
      title: rec.title,
      message: rec.message,
      action: rec.action,
      confidence: rec.confidence,
      source: rec.source,
      observedInputs: rec.observedInputs,
    })
    result.push({ recId: rec.id, recordId: record.id })
  }

  return result
}

/**
 * Collect a validation outcome. Logs a decision record with type 'validation_resolved'.
 */
export function collectFromValidation(project, station, errors) {
  if (!project || !station) return null

  return useDecisionHistoryStore.getState().logDecision({
    userId: undefined,
    userEmail: undefined,
    projectId: project.id,
    stationId: station.id,
    sessionId: ensureSession(),
    decisionType: DECISION_TYPES.VALIDATION_RESOLVED,
    field: 'validationErrors',
    afterValue: Array.isArray(errors) ? errors.length : 0,
    trigger: TRIGGERS.SYSTEM,
    contextTags: {
      page: typeof window !== 'undefined' ? window.location?.pathname : null,
      designStandard: project.designBasis?.designStandard,
    },
  })
}

/**
 * Collect a calculation run. Logs a decision record with type 'calc_run'
 * and optionally an 'input_change' record if inputs changed.
 */
export function collectFromCalculation(project, station, before, after) {
  if (!project || !station) return null

  const records = []

  // Log the calc_run event
  const calcRec = useDecisionHistoryStore.getState().logDecision({
    userId: undefined,
    userEmail: undefined,
    projectId: project.id,
    stationId: station.id,
    sessionId: ensureSession(),
    decisionType: DECISION_TYPES.CALC_RUN,
    trigger: TRIGGERS.AUTO_RECALC,
    contextTags: {
      page: typeof window !== 'undefined' ? window.location?.pathname : null,
      designStandard: project.designBasis?.designStandard,
    },
  })
  records.push(calcRec)

  // If before is provided, log input changes for each differing field
  if (before && typeof before === 'object' && after && typeof after === 'object') {
    for (const key of Object.keys(after)) {
      if (before[key] !== after[key] && before[key] !== undefined) {
        const changeRec = useDecisionHistoryStore.getState().logDecision({
          userId: undefined,
          userEmail: undefined,
          projectId: project.id,
          stationId: station.id,
          sessionId: ensureSession(),
          decisionType: DECISION_TYPES.INPUT_CHANGE,
          field: key,
          beforeValue: before[key],
          afterValue: after[key],
          trigger: TRIGGERS.USER_EDIT,
          contextTags: {
            page: typeof window !== 'undefined' ? window.location?.pathname : null,
            designStandard: project.designBasis?.designStandard,
          },
          relatedRecommendationId: null,
        })
        records.push(changeRec)
      }
    }
  }

  return records
}

/**
 * Collect a status change (approval transition). Logs a decision record with type 'status_change'.
 */
export function collectFromApproval(project, station, fromStatus, toStatus) {
  if (!project || !station) return null

  return useDecisionHistoryStore.getState().logDecision({
    userId: undefined,
    userEmail: undefined,
    projectId: project.id,
    stationId: station.id,
    sessionId: ensureSession(),
    decisionType: DECISION_TYPES.STATUS_CHANGE,
    field: 'status',
    beforeValue: fromStatus,
    afterValue: toStatus,
    trigger: TRIGGERS.WORKFLOW_ADVANCE,
    contextTags: {
      page: typeof window !== 'undefined' ? window.location?.pathname : null,
      designStandard: project.designBasis?.designStandard,
    },
  })
}

export { FEEDBACK_KINDS, DECISION_TYPES, TRIGGERS }
export default {
  collectFromAdvisorPanel,
  collectFromValidation,
  collectFromCalculation,
  collectFromApproval,
}
