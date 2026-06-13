/**
 * dashboardStatusEngine.js
 *
 * Pure, deterministic computation of the "next best action" suggestion
 * for the dashboard's Current Project Focus card.
 *
 * Priority order:
 *   1. Blocked stage (downstream of a not_started upstream)
 *   2. ERROR advisor recommendation
 *   3. WARN advisor recommendation
 *   4. Review-required stage
 *   5. First not_started stage
 *
 * Returns null when the project is fully complete.
 *
 * Design principles:
 *   1. Pure - no DOM, no React, no Zustand.
 *   2. Deterministic - same input always produces same output.
 *   3. Defensive - handles null/missing fields without throwing.
 */

import { firstPendingStage, WORKFLOW_STATES } from './workflowEngine.js'

/**
 * Maps workflow stage keys to their deep-link paths.
 * Duplicated from workflowEngine.WORKFLOW_STAGES to avoid coupling.
 */
const STAGE_PATHS = {
  design_basis: '/project-setup',
  pipeline: '/pipeline',
  soil: '/soil',
  current: '/current',
  groundbed: '/groundbed',
  cable: '/cable',
  tr: '/tr',
  attenuation: '/attenuation',
  validation: '/validation',
  report: '/report',
}

/**
 * Maps advisor category to the relevant page path.
 * Categories come from the engineeringAdvisorEngine CATEGORY enum.
 */
const CATEGORY_PATHS = {
  soil: '/soil',
  pipeline: '/pipeline',
  current: '/current',
  groundbed: '/groundbed',
  tr: '/tr',
  cable: '/cable',
  attenuation: '/attenuation',
  design_life: '/pipeline',
  workflow: '/validation',
}

/**
 * Builds a link for a station-level page, including the station id.
 */
function buildStationLink(basePath, stationId) {
  if (!stationId) return basePath
  return `${basePath}?station=${stationId}`
}

/**
 * Computes the next best action for the dashboard.
 *
 * @param {Array} workflow - Result from workflowEngine.computeWorkflow()
 * @param {object} health - Result from projectHealthEngine (unused for now, reserved for future heuristics)
 * @param {Array} stations - Project stations
 * @param {Array} [advisorRecs] - Recommendations from engineeringAdvisorEngine
 * @returns {object|null} { title, body, link, priority, kind }
 */
export function nextBestAction(workflow, health, stations, advisorRecs = []) {
  const safeWorkflow = Array.isArray(workflow) ? workflow : []
  const safeStations = Array.isArray(stations) ? stations : []
  const safeRecs = Array.isArray(advisorRecs) ? advisorRecs : []

  // 1. Check for blocked stages (highest priority — user is stuck)
  const blocked = safeWorkflow.find((s) => s.state === WORKFLOW_STATES.BLOCKED)
  if (blocked) {
    return {
      title: `${blocked.label} is blocked`,
      body: `Complete the previous stage before working on ${blocked.label.toLowerCase()}.`,
      link: blocked.path,
      priority: 1,
      kind: 'blocked',
    }
  }

  // 2. Check for ERROR advisor recommendations
  const errorRec = safeRecs.find((r) => r && r.severity === 'error')
  if (errorRec) {
    const station = findStationForRec(errorRec, safeStations)
    const basePath = CATEGORY_PATHS[errorRec.category] || '/validation'
    return {
      title: errorRec.title || 'Critical issue detected',
      body: errorRec.message || errorRec.action || 'Review the engineering advisor for details.',
      link: buildStationLink(basePath, station?.id),
      priority: 2,
      kind: 'advisor_error',
      recommendationId: errorRec.id,
    }
  }

  // 3. Check for WARN advisor recommendations
  const warnRec = safeRecs.find((r) => r && r.severity === 'warn')
  if (warnRec) {
    const station = findStationForRec(warnRec, safeStations)
    const basePath = CATEGORY_PATHS[warnRec.category] || '/validation'
    return {
      title: warnRec.title || 'Warning',
      body: warnRec.message || warnRec.action || 'Review the engineering advisor for details.',
      link: buildStationLink(basePath, station?.id),
      priority: 3,
      kind: 'advisor_warn',
      recommendationId: warnRec.id,
    }
  }

  // 4. Check for review-required stages
  const reviewStage = safeWorkflow.find((s) => s.state === WORKFLOW_STATES.REVIEW_REQUIRED)
  if (reviewStage) {
    const station = safeStations.find(
      (s) => s.status === 'engineering_review' && s.lastCalcResult
    )
    return {
      title: `${reviewStage.label} requires review`,
      body: `Open station ${station?.name || ''} to review and approve.`,
      link: buildStationLink(reviewStage.path, station?.id),
      priority: 4,
      kind: 'review_required',
    }
  }

  // 5. First not_started or in_progress stage
  const pending = firstPendingStage(safeWorkflow)
  if (pending) {
    return {
      title: `Continue with ${pending.label}`,
      body: getStagePromptBody(pending.key),
      link: pending.path,
      priority: 5,
      kind: 'continue',
    }
  }

  // All complete
  return null
}

/**
 * Finds the station most likely associated with a recommendation.
 * Currently returns the first station with calc results (simple heuristic).
 */
function findStationForRec(rec, stations) {
  if (!stations || stations.length === 0) return null
  return stations.find((s) => s.lastCalcResult) || stations[0]
}

/**
 * Returns a prompt body for continuing a given stage.
 */
function getStagePromptBody(stageKey) {
  const prompts = {
    design_basis: 'Enter the design standard, system design life, and key constants.',
    pipeline: 'Add pipeline segments with diameter, wall thickness, length, and coating.',
    soil: 'Enter the soil resistivity (from design basis or field measurement).',
    current: 'Run the current requirement calculation to determine the required current.',
    groundbed: 'Run the groundbed design to verify the groundbed resistance is within target.',
    cable: 'Run the cable resistance calculation to verify voltage drop is acceptable.',
    tr: 'Run the TR sizing calculation to verify the TR unit is properly rated.',
    attenuation: 'Run the attenuation analysis to verify full pipeline protection.',
    validation: 'Review validation checks and resolve any open issues.',
    report: 'Generate the engineering report (PDF or Excel export).',
  }
  return prompts[stageKey] || 'Continue with this stage.'
}

/**
 * Convenience: returns true when the project has any pending work.
 */
export function hasPendingWork(workflow) {
  if (!Array.isArray(workflow)) return false
  return workflow.some(
    (s) => s.state !== WORKFLOW_STATES.COMPLETE && s.state !== WORKFLOW_STATES.REVIEW_REQUIRED
  )
}

/**
 * Returns a summary of the action for display in tooltips or logs.
 */
export function describeAction(action) {
  if (!action) return 'Project is complete.'
  const priorityLabels = {
    1: 'Blocked',
    2: 'Critical issue',
    3: 'Warning',
    4: 'Review required',
    5: 'Next step',
  }
  const kindLabel = priorityLabels[action.priority] || 'Next step'
  return `${kindLabel}: ${action.title}`
}

export { STAGE_PATHS, CATEGORY_PATHS }
export default nextBestAction
