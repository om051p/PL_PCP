/**
 * recommendationRegistry.js
 *
 * Declarative registry mapping the existing advisor's 9 categories
 * to the user's 4-category vocabulary, and 4 severities to 4 priorities.
 *
 * This is a pure data module — no functions, no side effects.
 *
 * The registry serves two purposes:
 *   1. The recommendationEngine uses it to transform advisor output.
 *   2. The EngineeringAdvisorPanel uses it to render filter chips and
 *      display labels.
 */

// ─── New category vocabulary ──────────────────────────────────────────────────

export const RECOMMENDATION_CATEGORIES = Object.freeze({
  OPTIMIZATION: 'optimization',
  WARNING: 'warning',
  COMPLIANCE: 'compliance',
  COST_REDUCTION: 'cost_reduction',
})

export const CATEGORY_LABELS = Object.freeze({
  [RECOMMENDATION_CATEGORIES.OPTIMIZATION]: 'Optimization',
  [RECOMMENDATION_CATEGORIES.WARNING]: 'Warning',
  [RECOMMENDATION_CATEGORIES.COMPLIANCE]: 'Compliance',
  [RECOMMENDATION_CATEGORIES.COST_REDUCTION]: 'Cost Reduction',
})

// ─── New priority vocabulary ──────────────────────────────────────────────────

export const RECOMMENDATION_PRIORITIES = Object.freeze({
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
})

export const PRIORITY_LABELS = Object.freeze({
  [RECOMMENDATION_PRIORITIES.CRITICAL]: 'Critical',
  [RECOMMENDATION_PRIORITIES.HIGH]: 'High',
  [RECOMMENDATION_PRIORITIES.MEDIUM]: 'Medium',
  [RECOMMENDATION_PRIORITIES.LOW]: 'Low',
})

// ─── Mapping: old category → new category ─────────────────────────────────────

/**
 * Maps advisor category strings to the new 4-bucket vocabulary.
 * Some advisor categories map to different new categories depending on severity
 * (e.g., GROUNDBED "below target" → optimization, but GROUNDBED "too high" → warning).
 */
export const CATEGORY_MAP = Object.freeze({
  soil: RECOMMENDATION_CATEGORIES.WARNING,
  pipeline: RECOMMENDATION_CATEGORIES.WARNING,
  current: RECOMMENDATION_CATEGORIES.WARNING,
  groundbed: RECOMMENDATION_CATEGORIES.WARNING,
  tr: RECOMMENDATION_CATEGORIES.WARNING,
  cable: RECOMMENDATION_CATEGORIES.COMPLIANCE,
  attenuation: RECOMMENDATION_CATEGORIES.WARNING,
  design_life: RECOMMENDATION_CATEGORIES.OPTIMIZATION,
  workflow: RECOMMENDATION_CATEGORIES.WARNING,
})

// ─── Mapping: severity → priority ─────────────────────────────────────────────

export const SEVERITY_TO_PRIORITY = Object.freeze({
  error: RECOMMENDATION_PRIORITIES.CRITICAL,
  warn: RECOMMENDATION_PRIORITIES.HIGH,
  info: RECOMMENDATION_PRIORITIES.MEDIUM,
  success: RECOMMENDATION_PRIORITIES.LOW,
})

// ─── Override rules ───────────────────────────────────────────────────────────

/**
 * Rules that override the default CATEGORY_MAP based on the recommendation's
 * ID prefix. This is how "positive findings" get bucketed as optimization
 * (e.g., "groundbed.unusually_low" → optimization, not warning).
 */
const ID_PREFIX_OVERRIDES = [
  { prefix: 'groundbed.unusually_low', category: RECOMMENDATION_CATEGORIES.OPTIMIZATION },
  { prefix: 'design_life.can_be_increased', category: RECOMMENDATION_CATEGORIES.OPTIMIZATION },
  { prefix: 'attenuation.excellent', category: RECOMMENDATION_CATEGORIES.OPTIMIZATION },
  { prefix: 'tr.optimal', category: RECOMMENDATION_CATEGORIES.OPTIMIZATION },
  { prefix: 'cable.oversized', category: RECOMMENDATION_CATEGORIES.OPTIMIZATION },
]

/**
 * Maps a single advisor recommendation to the new vocabulary.
 * Returns { category, priority }.
 */
export function mapRecommendation(rec) {
  if (!rec || typeof rec !== 'object') {
    return { category: RECOMMENDATION_CATEGORIES.WARNING, priority: RECOMMENDATION_PRIORITIES.MEDIUM }
  }

  // Check ID-prefix overrides first
  let category = null
  if (rec.id) {
    for (const override of ID_PREFIX_OVERRIDES) {
      if (rec.id.startsWith(override.prefix)) {
        category = override.category
        break
      }
    }
  }

  // Fall back to category map
  if (!category) {
    category = CATEGORY_MAP[rec.category] || RECOMMENDATION_CATEGORIES.WARNING
  }

  const priority = SEVERITY_TO_PRIORITY[rec.severity] || RECOMMENDATION_PRIORITIES.MEDIUM

  return { category, priority }
}

// ─── List of all registered rules (for test verification) ─────────────────────

/**
 * Returns a flat list of all rule IDs that the system knows about.
 * Used by tests to verify every registered rule is reachable.
 */
export function getAllRuleIds() {
  // The existing advisor engine has 26 rules. We list them here for
  // verification purposes only — the actual rules live in
  // engineeringAdvisorEngine.js.
  return [
    'soil.very_high', 'soil.high', 'soil.very_low', 'soil.deepwell_alternative',
    'pipeline.very_long', 'pipeline.long', 'pipeline.very_short',
    'current.very_high', 'current.high', 'current.very_low',
    'groundbed.unusually_low', 'groundbed.very_high', 'groundbed.high', 'groundbed.missing',
    'tr.undersized', 'tr.tight', 'tr.optimal', 'tr.oversized',
    'cable.very_high_drop', 'cable.high_drop', 'cable.oversized',
    'attenuation.inadequate', 'attenuation.marginal',
    'attenuation.worst_point_marginal', 'attenuation.worst_point_inadequate',
    'attenuation.excellent', 'attenuation.review_recommended',
    'design_life.undersized', 'design_life.tight', 'design_life.can_be_increased',
    'workflow.approval_pending', 'workflow.export_report',
    // Cost-reduction rules (new in P7)
    'cost.tr_oversized', 'cost.groundbed_underutilized', 'cost.excess_anode_count',
  ]
}

export default {
  RECOMMENDATION_CATEGORIES,
  CATEGORY_LABELS,
  RECOMMENDATION_PRIORITIES,
  PRIORITY_LABELS,
  CATEGORY_MAP,
  SEVERITY_TO_PRIORITY,
  mapRecommendation,
  getAllRuleIds,
}
