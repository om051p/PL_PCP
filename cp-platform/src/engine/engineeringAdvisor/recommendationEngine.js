/**
 * recommendationEngine.js
 *
 * Top-level orchestrator that calls the existing engineeringAdvisorEngine,
 * transforms its output to the user's 4-category / 4-priority vocabulary,
 * layers on cost-reduction rules, and incorporates new advisory rules (proximity, TR band, coating, etc.).
 *
 * Links each recommendation to its corresponding Trace Step ID.
 */

import { analyze as analyzeBase } from './engineeringAdvisorEngine.js'
import { evaluateCostReduction } from './costReductionRules.js'
import { evaluateNewRules } from './newAdvisorRules.js'
import {
  mapRecommendation,
  RECOMMENDATION_CATEGORIES,
  RECOMMENDATION_PRIORITIES,
} from './recommendationRegistry.js'

const PRIORITY_ORDER = {
  [RECOMMENDATION_PRIORITIES.CRITICAL]: 0,
  [RECOMMENDATION_PRIORITIES.HIGH]: 1,
  [RECOMMENDATION_PRIORITIES.MEDIUM]: 2,
  [RECOMMENDATION_PRIORITIES.LOW]: 3,
}

function emptyBuckets() {
  return {
    [RECOMMENDATION_CATEGORIES.OPTIMIZATION]: [],
    [RECOMMENDATION_CATEGORIES.WARNING]: [],
    [RECOMMENDATION_CATEGORIES.COMPLIANCE]: [],
    [RECOMMENDATION_CATEGORIES.COST_REDUCTION]: [],
  }
}

function emptyPriorityBuckets() {
  return {
    [RECOMMENDATION_PRIORITIES.CRITICAL]: [],
    [RECOMMENDATION_PRIORITIES.HIGH]: [],
    [RECOMMENDATION_PRIORITIES.MEDIUM]: [],
    [RECOMMENDATION_PRIORITIES.LOW]: [],
  }
}

/**
 * Maps a recommendation's prefix or ID to the corresponding Trace Step ID.
 */
function getTraceStepIdForRec(rec) {
  if (rec.traceStepId) return rec.traceStepId
  if (!rec.id) return null
  if (rec.id.startsWith('soil.')) return 'GROUNDBED_RESISTANCE'
  if (rec.id.startsWith('pipeline.')) return 'SURFACE_AREA'
  if (rec.id.startsWith('current.')) return 'CURRENT_REQUIREMENT'
  if (rec.id.startsWith('groundbed.')) return 'GROUNDBED_RESISTANCE'
  if (rec.id.startsWith('tr.')) return 'TR_CIRCUIT_ANALYSIS'
  if (rec.id.startsWith('cable.')) return 'CABLE_RESISTANCE'
  if (rec.id.startsWith('design_life.')) return 'DESIGN_LIFE'
  if (rec.id.startsWith('cost.tr_oversized')) return 'TR_CIRCUIT_ANALYSIS'
  if (rec.id.startsWith('cost.groundbed_underutilized')) return 'GROUNDBED_RESISTANCE'
  if (rec.id.startsWith('cost.excess_anode_count')) return 'DESIGN_LIFE'
  return null
}

/**
 * Transform a single advisor recommendation into the new vocabulary.
 * Adds `category`, `priority`, and preserves all original fields.
 */
function transformRec(rec) {
  const { category, priority } = mapRecommendation(rec)
  return {
    ...rec,
    category,
    priority,
    traceStepId: getTraceStepIdForRec(rec),
  }
}

/**
 * Transform a cost-reduction rule result into a recommendation shape.
 */
function costRecFromRule(rule) {
  return {
    id: rule.id,
    category: RECOMMENDATION_CATEGORIES.COST_REDUCTION,
    priority: RECOMMENDATION_PRIORITIES.MEDIUM,
    severity: 'info',
    title: rule.title,
    message: rule.message,
    action: rule.action,
    observedValue: rule.observedValue,
    threshold: rule.threshold,
    source: 'rule',
    confidence: 0.8,
    traceStepId: getTraceStepIdForRec(rule),
  }
}

/**
 * Main entry point. Calls the existing advisor and layers on cost-reduction and new rules.
 */
export function analyze(input = {}) {
  const baseResult = analyzeBase(input)

  // Transform existing recommendations to new vocabulary
  const transformed = baseResult.recommendations.map(transformRec)

  // Evaluate cost-reduction rules
  const costRules = evaluateCostReduction(input)
  const costRecs = costRules.map(costRecFromRule)

  // Evaluate new advisory rules (proximity, TR band, life gap, coating soil mismatch)
  const newRules = evaluateNewRules(input)

  // Merge and sort by priority
  const all = [...transformed, ...costRecs, ...newRules]
  all.sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9))

  // Build category buckets
  const byCategory = emptyBuckets()
  for (const rec of all) {
    if (byCategory[rec.category]) {
      byCategory[rec.category].push(rec)
    }
  }

  // Build priority buckets
  const byPriority = emptyPriorityBuckets()
  for (const rec of all) {
    if (byPriority[rec.priority]) {
      byPriority[rec.priority].push(rec)
    }
  }

  return {
    recommendations: all,
    score: baseResult.score,
    scoreLabel: baseResult.scoreLabel,
    byCategory,
    byPriority,
    summary: baseResult.summary,
    inputEcho: baseResult.inputEcho,
  }
}

/**
 * Async-compatible signature for forward-compatibility with AI/LLM sources.
 */
export async function analyzeAsync(input, options = {}) {
  const result = analyze(input)
  if (!options.includeAI) return result
  return result
}

export { RECOMMENDATION_CATEGORIES, RECOMMENDATION_PRIORITIES }
export default analyze
