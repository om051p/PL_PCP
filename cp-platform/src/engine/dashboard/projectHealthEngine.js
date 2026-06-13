/**
 * projectHealthEngine.js
 *
 * Pure, deterministic computation of 7 executive KPIs for the dashboard.
 * No DOM, no React, no Zustand. Fully unit-testable.
 *
 * KPIs:
 *   1. Project Health        — 50% calculated + 30% approved + 20% in review
 *   2. Compliance Score      — pass rate of validation checks
 *   3. Design Completion     — complete workflow stages / 10
 *   4. Current Requirement   — largest requiredCurrentA across stations
 *   5. Groundbed Status      — pass/warn/fail aggregate
 *   6. Validation Status     — counts of validation issues
 *   7. Engineering Risk      — composite score from compliance + advisor + errors
 *
 * Design principles:
 *   1. Pure - same input always produces same output.
 *   2. Defensive - handles null/missing fields without throwing.
 *   3. Returns null for N/A values (never NaN, never -1).
 */

import { countCompleteStages } from './workflowEngine.js'

/**
 * GROUNDBED RESISTANCE THRESHOLDS (Ohm)
 * Mirrors the advisor engine's groundbedOhm thresholds.
 */
const GROUNDBED_THRESHOLDS = {
  veryLow: 0.1,
  low: 0.3,
  nominal: 2.0,
  high: 5.0,
  veryHigh: 10.0,
}

const DEFAULT_RISK_WEIGHTS = Object.freeze({
  compliance: 0.4,
  advisorErrors: 0.3,
  validationErrors: 0.3,
})

/**
 * Counts stations by status category.
 */
function countStationCategories(stations) {
  const total = stations.length
  const calculated = stations.filter((s) => s.lastCalcResult).length
  const approved = stations.filter(
    (s) => s.status === 'approved' || s.status === 'issued_for_construction'
  ).length
  const review = stations.filter(
    (s) => s.status === 'engineering_review' || s.status === 'optimized'
  ).length
  return { total, calculated, approved, review }
}

/**
 * KPI 1: Project Health Score
 * Formula: 50% calculated + 30% approved + 20% in review
 * Range: 0–100
 */
export function computeProjectHealth(stations) {
  const safe = Array.isArray(stations) ? stations : []
  if (safe.length === 0) {
    return { score: 0, calculatedCount: 0, totalCount: 0, approvedCount: 0, reviewCount: 0 }
  }
  const { total, calculated, approved, review } = countStationCategories(safe)
  const score = Math.round(
    (calculated / total) * 50 + (approved / total) * 30 + (review / total) * 20
  )
  return { score, calculatedCount: calculated, totalCount: total, approvedCount: approved, reviewCount: review }
}

/**
 * KPI 2: Compliance Score
 * Formula: 100 - (fail_checks / total_checks) * 100
 * Returns null when no checks exist.
 */
export function computeComplianceScore(stations) {
  const safe = Array.isArray(stations) ? stations : []
  let totalChecks = 0
  let failChecks = 0
  for (const s of safe) {
    const checks = s?.lastCalcResult?.checks
    if (!Array.isArray(checks)) continue
    for (const c of checks) {
      totalChecks++
      if (c && c.status === 'fail') failChecks++
    }
  }
  if (totalChecks === 0) return null
  return Math.round(100 - (failChecks / totalChecks) * 100)
}

/**
 * KPI 3: Design Completion
 * Formula: completeStages / 10 * 100
 * Requires a workflow array.
 */
export function computeDesignCompletion(workflow) {
  if (!Array.isArray(workflow) || workflow.length === 0) return 0
  const total = workflow.length
  const complete = countCompleteStages(workflow)
  return Math.round((complete / total) * 100)
}

/**
 * KPI 4: Current Requirement
 * Returns the largest requiredCurrentA across stations (in A).
 * Returns null when no station has a calc result.
 */
export function computeCurrentRequirement(stations) {
  const safe = Array.isArray(stations) ? stations : []
  let max = null
  for (const s of safe) {
    const v = s?.lastCalcResult?.requiredCurrentA
    if (typeof v === 'number' && Number.isFinite(v)) {
      if (max === null || v > max) max = v
    }
  }
  return max
}

/**
 * KPI 5: Groundbed Status
 * Aggregates groundbedResistanceOhm values across stations into pass/warn/fail.
 */
export function computeGroundbedStatus(stations) {
  const safe = Array.isArray(stations) ? stations : []
  let pass = 0
  let warn = 0
  let fail = 0
  let total = 0
  for (const s of safe) {
    const r = s?.lastCalcResult?.groundbedResistanceOhm
    if (typeof r !== 'number' || !Number.isFinite(r)) continue
    total++
    if (r <= GROUNDBED_THRESHOLDS.high) pass++
    else if (r <= GROUNDBED_THRESHOLDS.veryHigh) warn++
    else fail++
  }
  if (total === 0) return { status: 'unknown', pass: 0, warn: 0, fail: 0, total: 0 }
  // Overall status: fail if any fail, warn if any warn, else pass
  if (fail > 0) return { status: 'fail', pass, warn, fail, total }
  if (warn > 0) return { status: 'warn', pass, warn, fail, total }
  return { status: 'pass', pass, warn, fail, total }
}

/**
 * KPI 6: Validation Status
 * Counts validation issues: (station.validationErrors || []) + (checks with status=fail)
 */
export function computeValidationStatus(stations) {
  const safe = Array.isArray(stations) ? stations : []
  let validationErrors = 0
  let checkFailures = 0
  for (const s of safe) {
    if (Array.isArray(s?.validationErrors)) {
      validationErrors += s.validationErrors.length
    }
    const checks = s?.lastCalcResult?.checks
    if (Array.isArray(checks)) {
      checkFailures += checks.filter((c) => c && c.status === 'fail').length
    }
  }
  const total = validationErrors + checkFailures
  let status = 'clean'
  if (total > 0) status = 'issues'
  return { status, validationErrors, checkFailures, totalIssues: total }
}

/**
 * KPI 7: Engineering Risk
 * Composite score: 0.4 * (100 - ComplianceScore) + 0.3 * (ERROR advisor recs * weight) + 0.3 * (stations with validation errors)
 * Range: 0–100. >70 = High, 40–70 = Medium, <40 = Low.
 *
 * Note: advisorRecs is an array of { severity, ... } objects from the engineering advisor.
 * Each ERROR rec contributes 10 points to the advisor component (capped at 100).
 */
export function computeEngineeringRisk(stations, advisorRecs = [], weights = DEFAULT_RISK_WEIGHTS) {
  const safe = Array.isArray(stations) ? stations : []
  const safeRecs = Array.isArray(advisorRecs) ? advisorRecs : []

  // Component 1: inverse compliance
  const complianceScore = computeComplianceScore(safe)
  const complianceComponent = complianceScore === null
    ? 50 // assume medium risk when no data
    : 100 - complianceScore

  // Component 2: advisor ERROR count (each ERROR = 10 points, capped at 100)
  const errorCount = safeRecs.filter((r) => r && r.severity === 'error').length
  const advisorComponent = Math.min(100, errorCount * 10)

  // Component 3: stations with validation errors
  const stationsWithErrors = safe.filter((s) => {
    if (Array.isArray(s?.validationErrors) && s.validationErrors.length > 0) return true
    const checks = s?.lastCalcResult?.checks
    if (Array.isArray(checks) && checks.some((c) => c && c.status === 'fail')) return true
    return false
  }).length
  // Normalize: assume 3+ stations with errors = max risk
  const validationComponent = safe.length > 0
    ? Math.min(100, (stationsWithErrors / safe.length) * 100)
    : 0

  const score = Math.round(
    weights.compliance * complianceComponent +
    weights.advisorErrors * advisorComponent +
    weights.validationErrors * validationComponent
  )

  let level = 'Low'
  if (score > 70) level = 'High'
  else if (score >= 40) level = 'Medium'

  return {
    score: Math.max(0, Math.min(100, score)),
    level,
    components: {
      compliance: Math.round(complianceComponent),
      advisorErrors: Math.round(advisorComponent),
      validationErrors: Math.round(validationComponent),
    },
    errorCount,
    stationsWithErrors,
  }
}

/**
 * Computes all 7 KPIs in a single call.
 * Returns an object with all KPI values.
 */
export function computeAllKPIs(project, stations, workflow, advisorRecs = []) {
  return {
    projectHealth: computeProjectHealth(stations),
    complianceScore: computeComplianceScore(stations),
    designCompletion: computeDesignCompletion(workflow),
    currentRequirement: computeCurrentRequirement(stations),
    groundbedStatus: computeGroundbedStatus(stations),
    validationStatus: computeValidationStatus(stations),
    engineeringRisk: computeEngineeringRisk(stations, advisorRecs),
  }
}

export default computeAllKPIs
