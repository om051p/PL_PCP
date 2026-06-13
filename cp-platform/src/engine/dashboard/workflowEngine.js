/**
 * workflowEngine.js
 *
 * Pure, deterministic 10-stage engineering workflow state computation.
 * No DOM, no React, no Zustand. Fully unit-testable.
 *
 * Design principles:
 *   1. Pure - same input always produces same output.
 *   2. Defensive - handles null/missing fields without throwing.
 *   3. Documented - every stage's completion rule is listed in
 *      docs/DASHBOARD_3_SPEC.md §4.2.
 */

export const WORKFLOW_STATES = Object.freeze({
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  COMPLETE: 'complete',
  REVIEW_REQUIRED: 'review_required',
  BLOCKED: 'blocked',
})

export const WORKFLOW_STAGES = Object.freeze([
  { key: 'design_basis',     label: 'Design Basis',         path: '/project-setup' },
  { key: 'pipeline',         label: 'Pipeline Parameters',  path: '/pipeline' },
  { key: 'soil',             label: 'Soil Resistivity',     path: '/soil' },
  { key: 'current',          label: 'Current Requirement',  path: '/current' },
  { key: 'groundbed',        label: 'Groundbed Design',     path: '/groundbed' },
  { key: 'cable',            label: 'Cable Resistance',     path: '/cable' },
  { key: 'tr',               label: 'TR Sizing',            path: '/tr' },
  { key: 'attenuation',      label: 'Attenuation',          path: '/attenuation' },
  { key: 'validation',       label: 'Validation',           path: '/validation' },
  { key: 'report',           label: 'Engineering Report',   path: '/report' },
])

const REVIEW_STATUSES = new Set(['engineering_review'])

/**
 * Returns true if `project.designBasis` has at least one numeric field set.
 */
function designBasisComplete(project) {
  const db = project?.designBasis
  if (!db || typeof db !== 'object') return false
  return Object.values(db).some(
    (v) => typeof v === 'number' && Number.isFinite(v)
  )
}

/**
 * Returns one of: 'none' (no stations with segments), 'partial' (some), 'all' (all).
 */
function pipelineProgress(stations) {
  if (!stations || stations.length === 0) return 'none'
  const withSegments = stations.filter(
    (s) => Array.isArray(s.pipelineSegments) && s.pipelineSegments.length > 0
  )
  if (withSegments.length === 0) return 'none'
  if (withSegments.length === stations.length) return 'all'
  return 'partial'
}

/**
 * Returns true if any station has soil resistivity set (station-level or design basis).
 */
function soilComplete(stations, project) {
  if (typeof project?.designBasis?.soilResistivityOhmCm === 'number') return true
  return (stations || []).some(
    (s) => typeof s.soilResistivityOhmCm === 'number' && Number.isFinite(s.soilResistivityOhmCm)
  )
}

/**
 * Returns true if any station has a current calculation result.
 */
function stationHasCalcField(stations, field) {
  return (stations || []).some(
    (s) => {
      const lr = s?.lastCalcResult
      if (!lr || typeof lr !== 'object') return false
      const v = lr[field]
      return v != null && !(typeof v === 'number' && Number.isNaN(v))
    }
  )
}

/**
 * Returns true if the project has been approved or issued for construction.
 */
function reportComplete(project) {
  const s = project?.status
  return s === 'approved' || s === 'issued_for_construction'
}

/**
 * Returns true if the project is in engineering review.
 */
function reportInReview(project) {
  return project?.status === 'engineering_review'
}

/**
 * Returns true if the attenuation service has been run successfully and
 * the design is adequate.
 */
function attenuationComplete(attenuationResult) {
  if (!attenuationResult || typeof attenuationResult !== 'object') return false
  if (attenuationResult.success !== true) return false
  const summary = attenuationResult.summary
  if (!summary || typeof summary !== 'object') return false
  return summary.designAdequate === true
}

/**
 * Returns true if all stations have a calc result and no validation errors.
 */
function validationComplete(stations) {
  if (!stations || stations.length === 0) return false
  return stations.every((s) => {
    if (!s.lastCalcResult) return false
    const errs = s.validationErrors
    if (Array.isArray(errs) && errs.length > 0) return false
    return true
  })
}

/**
 * Returns the review-required status for station-level stages.
 * True if any station has data for this stage but is in engineering_review.
 */
function isStageInReview(stations, check) {
  if (!stations || stations.length === 0) return false
  return stations.some((s) => {
    if (!REVIEW_STATUSES.has(s.status)) return false
    // Stage has data if the check passes for this station
    return check(s)
  })
}

/**
 * Derives the raw completion state for a given stage key.
 * Returns one of: 'not_started', 'in_progress', 'complete'.
 */
function deriveRawState(stageKey, project, stations, options) {
  switch (stageKey) {
    case 'design_basis':
      return designBasisComplete(project) ? 'complete' : 'not_started'
    case 'pipeline': {
      const p = pipelineProgress(stations)
      if (p === 'all') return 'complete'
      if (p === 'partial') return 'in_progress'
      return 'not_started'
    }
    case 'soil':
      return soilComplete(stations, project) ? 'complete' : 'not_started'
    case 'current':
      return stationHasCalcField(stations, 'requiredCurrentA') ? 'complete' : 'not_started'
    case 'groundbed':
      return stationHasCalcField(stations, 'groundbedResistanceOhm') ? 'complete' : 'not_started'
    case 'cable':
      return stationHasCalcField(stations, 'totalCableResOhm') ? 'complete' : 'not_started'
    case 'tr':
      return stationHasCalcField(stations, 'minTRVoltage') ? 'complete' : 'not_started'
    case 'attenuation':
      return attenuationComplete(options?.attenuationResult) ? 'complete' : 'not_started'
    case 'validation':
      return validationComplete(stations) ? 'complete' : 'not_started'
    case 'report':
      if (reportComplete(project)) return 'complete'
      if (reportInReview(project)) return 'in_progress'
      return 'not_started'
    default:
      return 'not_started'
  }
}

/**
 * Checks if a station has data for a given stage (for review-required detection).
 */
function stationHasStageData(stageKey, station) {
  if (!station) return false
  const lr = station.lastCalcResult
  switch (stageKey) {
    case 'pipeline':
      return Array.isArray(station.pipelineSegments) && station.pipelineSegments.length > 0
    case 'soil':
      return typeof station.soilResistivityOhmCm === 'number'
    case 'current':
      return lr != null && lr.requiredCurrentA != null
    case 'groundbed':
      return lr != null && lr.groundbedResistanceOhm != null
    case 'cable':
      return lr != null && lr.totalCableResOhm != null
    case 'tr':
      return lr != null && lr.minTRVoltage != null
    case 'attenuation':
      return false // attenuation is project-level, not station-level
    case 'validation':
      return lr != null
    default:
      return false
  }
}

/**
 * Computes the 10-stage workflow state for a project.
 *
 * @param {object} project - The active project object
 * @param {Array} stations - The project's stations array
 * @param {object} [options] - Optional context
 * @param {object} [options.attenuationResult] - Result from attenuationService
 * @returns {Array<{key: string, label: string, path: string, state: string, hint: string}>}
 */
export function computeWorkflow(project, stations, options = {}) {
  const safeStations = Array.isArray(stations) ? stations : []
  const rawStates = WORKFLOW_STAGES.map((s) => ({
    key: s.key,
    label: s.label,
    path: s.path,
    rawState: deriveRawState(s.key, project, safeStations, options),
  }))

  return rawStates.map((stage, i) => {
    let finalState = stage.rawState

    // Review-required override: applies to station-level stages (pipeline through validation)
    if (
      finalState === 'complete' &&
      stage.key !== 'design_basis' &&
      stage.key !== 'report' &&
      stage.key !== 'attenuation'
    ) {
      if (isStageInReview(safeStations, (s) => stationHasStageData(stage.key, s))) {
        finalState = WORKFLOW_STATES.REVIEW_REQUIRED
      }
    }

    // Blocked detection: a stage is blocked if ANY upstream stage is not_started
    // and the user has attempted to visit this stage's page.
    // This prevents users from "jumping ahead" when earlier work is missing.
    if (finalState === 'not_started' && i > 0) {
      const anyUpstreamNotStarted = rawStates
        .slice(0, i)
        .some((prev) => prev.rawState === WORKFLOW_STATES.NOT_STARTED)
      if (anyUpstreamNotStarted && options?.attemptedPages?.has?.(stage.path)) {
        finalState = WORKFLOW_STATES.BLOCKED
      }
    }

    return {
      key: stage.key,
      label: stage.label,
      path: stage.path,
      state: finalState,
      hint: hintFor(stage.key, finalState, safeStations, project),
    }
  })
}

/**
 * Returns a human-readable hint for a stage's state.
 */
function hintFor(stageKey, state, stations, project) {
  if (state === WORKFLOW_STATES.NOT_STARTED) return 'Not started'
  if (state === WORKFLOW_STATES.BLOCKED) return 'Complete previous stage first'
  if (state === WORKFLOW_STATES.REVIEW_REQUIRED) return 'In engineering review'
  if (state === WORKFLOW_STATES.IN_PROGRESS) {
    if (stageKey === 'pipeline') {
      const total = stations.length
      const done = stations.filter(
        (s) => Array.isArray(s.pipelineSegments) && s.pipelineSegments.length > 0
      ).length
      return `${done} of ${total} stations`
    }
    if (stageKey === 'report') return 'In review'
    return 'In progress'
  }
  if (state === WORKFLOW_STATES.COMPLETE) {
    if (stageKey === 'validation') {
      const total = stations.length
      return `All ${total} stations validated`
    }
    if (stageKey === 'report') {
      return project?.status === 'issued_for_construction' ? 'Issued for construction' : 'Approved'
    }
    return 'Complete'
  }
  return ''
}

/**
 * Returns the number of stages in the 'complete' state.
 */
export function countCompleteStages(workflow) {
  return workflow.filter((s) => s.state === WORKFLOW_STATES.COMPLETE).length
}

/**
 * Returns the first stage that is not 'complete' and not 'review_required'.
 * Used by nextBestAction.
 */
export function firstPendingStage(workflow) {
  return workflow.find(
    (s) => s.state !== WORKFLOW_STATES.COMPLETE && s.state !== WORKFLOW_STATES.REVIEW_REQUIRED
  ) || null
}

export default computeWorkflow
