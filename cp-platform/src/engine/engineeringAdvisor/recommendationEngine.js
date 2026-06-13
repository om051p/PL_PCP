/**
 * recommendationEngine.js
 *
 * Top-level orchestrator that calls the existing engineeringAdvisorEngine,
 * transforms its output to the user's 4-category / 4-priority vocabulary,
 * and layers on 3 new cost-reduction rules.
 *
 * The existing engineeringAdvisorEngine is NOT modified — this is a pure
 * transformation layer on top.
 *
 * Returns:
 *   {
 *     recommendations: [{ id, category, priority, severity, title, message, action, observedValue, threshold, source }],
 *     score,        // 0-100, from existing engine
 *     scoreLabel,   // 'Optimal' | 'Good' | 'Marginal' | 'Critical' | 'Severe'
 *     byCategory: { optimization: [...], warning: [...], compliance: [...], cost_reduction: [...] },
 *     byPriority:  { critical: [...], high: [...], medium: [...], low: [...] },
 *     summary,      // from existing engine
 *     inputEcho,
 *   }
 */

import { analyze as analyzeBase } from './engineeringAdvisorEngine.js'
import { evaluateCostReduction } from './costReductionRules.js'
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
 * Transform a single advisor recommendation into the new vocabulary.
 * Adds `category`, `priority`, and preserves all original fields.
 */
function transformRec(rec) {
  const { category, priority } = mapRecommendation(rec)
  return {
    ...rec,
    category,
    priority,
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
  }
}

/**
 * Main entry point. Calls the existing advisor and layers on cost-reduction rules.
 */
export function analyze(input = {}) {
  const baseResult = analyzeBase(input)

  // Transform existing recommendations to new vocabulary
  const transformed = baseResult.recommendations.map(transformRec)

  // Evaluate cost-reduction rules
  const costRules = evaluateCostReduction(input)
  const costRecs = costRules.map(costRecFromRule)

  // Merge and sort by priority
  const all = [...transformed, ...costRecs]
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
