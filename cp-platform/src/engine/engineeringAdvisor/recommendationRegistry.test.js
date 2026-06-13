/**
 * recommendationRegistry.test.js
 *
 * Tests for the category/priority mapping registry.
 */

import { describe, it, expect } from 'vitest'
import {
  RECOMMENDATION_CATEGORIES,
  RECOMMENDATION_PRIORITIES,
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  CATEGORY_MAP,
  SEVERITY_TO_PRIORITY,
  mapRecommendation,
  getAllRuleIds,
} from './recommendationRegistry.js'

describe('recommendationRegistry — constants', () => {
  it('exports 4 categories', () => {
    expect(Object.keys(RECOMMENDATION_CATEGORIES)).toHaveLength(4)
    expect(Object.values(RECOMMENDATION_CATEGORIES).sort()).toEqual([
      'compliance', 'cost_reduction', 'optimization', 'warning',
    ])
  })

  it('exports 4 priorities', () => {
    expect(Object.keys(RECOMMENDATION_PRIORITIES)).toHaveLength(4)
    expect(Object.values(RECOMMENDATION_PRIORITIES).sort()).toEqual([
      'critical', 'high', 'low', 'medium',
    ])
  })

  it('has labels for every category', () => {
    for (const cat of Object.values(RECOMMENDATION_CATEGORIES)) {
      expect(CATEGORY_LABELS[cat]).toBeTruthy()
    }
  })

  it('has labels for every priority', () => {
    for (const pri of Object.values(RECOMMENDATION_PRIORITIES)) {
      expect(PRIORITY_LABELS[pri]).toBeTruthy()
    }
  })
})

describe('CATEGORY_MAP — old category to new category', () => {
  it('maps cable to compliance', () => {
    expect(CATEGORY_MAP.cable).toBe(RECOMMENDATION_CATEGORIES.COMPLIANCE)
  })

  it('maps design_life to optimization', () => {
    expect(CATEGORY_MAP.design_life).toBe(RECOMMENDATION_CATEGORIES.OPTIMIZATION)
  })

  it('maps soil/pipeline/current/groundbed/tr/attenuation/workflow to warning', () => {
    expect(CATEGORY_MAP.soil).toBe(RECOMMENDATION_CATEGORIES.WARNING)
    expect(CATEGORY_MAP.pipeline).toBe(RECOMMENDATION_CATEGORIES.WARNING)
    expect(CATEGORY_MAP.current).toBe(RECOMMENDATION_CATEGORIES.WARNING)
    expect(CATEGORY_MAP.groundbed).toBe(RECOMMENDATION_CATEGORIES.WARNING)
    expect(CATEGORY_MAP.tr).toBe(RECOMMENDATION_CATEGORIES.WARNING)
    expect(CATEGORY_MAP.attenuation).toBe(RECOMMENDATION_CATEGORIES.WARNING)
    expect(CATEGORY_MAP.workflow).toBe(RECOMMENDATION_CATEGORIES.WARNING)
  })
})

describe('SEVERITY_TO_PRIORITY — severity to priority', () => {
  it('maps error to critical', () => {
    expect(SEVERITY_TO_PRIORITY.error).toBe(RECOMMENDATION_PRIORITIES.CRITICAL)
  })

  it('maps warn to high', () => {
    expect(SEVERITY_TO_PRIORITY.warn).toBe(RECOMMENDATION_PRIORITIES.HIGH)
  })

  it('maps info to medium', () => {
    expect(SEVERITY_TO_PRIORITY.info).toBe(RECOMMENDATION_PRIORITIES.MEDIUM)
  })

  it('maps success to low', () => {
    expect(SEVERITY_TO_PRIORITY.success).toBe(RECOMMENDATION_PRIORITIES.LOW)
  })
})

describe('mapRecommendation — ID prefix overrides', () => {
  it('overrides groundbed.unusually_low to optimization', () => {
    const r = mapRecommendation({ id: 'groundbed.unusually_low', category: 'groundbed', severity: 'success' })
    expect(r.category).toBe(RECOMMENDATION_CATEGORIES.OPTIMIZATION)
  })

  it('overrides design_life.can_be_increased to optimization', () => {
    const r = mapRecommendation({ id: 'design_life.can_be_increased', category: 'design_life', severity: 'success' })
    expect(r.category).toBe(RECOMMENDATION_CATEGORIES.OPTIMIZATION)
  })

  it('overrides attenuation.excellent to optimization', () => {
    const r = mapRecommendation({ id: 'attenuation.excellent', category: 'attenuation', severity: 'success' })
    expect(r.category).toBe(RECOMMENDATION_CATEGORIES.OPTIMIZATION)
  })

  it('overrides tr.optimal to optimization', () => {
    const r = mapRecommendation({ id: 'tr.optimal', category: 'tr', severity: 'success' })
    expect(r.category).toBe(RECOMMENDATION_CATEGORIES.OPTIMIZATION)
  })

  it('overrides cable.oversized to optimization', () => {
    const r = mapRecommendation({ id: 'cable.oversized', category: 'cable', severity: 'warn' })
    expect(r.category).toBe(RECOMMENDATION_CATEGORIES.OPTIMIZATION)
  })
})

describe('mapRecommendation — edge cases', () => {
  it('handles null input', () => {
    const r = mapRecommendation(null)
    expect(r.category).toBe(RECOMMENDATION_CATEGORIES.WARNING)
    expect(r.priority).toBe(RECOMMENDATION_PRIORITIES.MEDIUM)
  })

  it('handles unknown category', () => {
    const r = mapRecommendation({ id: 'test', category: 'unknown', severity: 'warn' })
    expect(r.category).toBe(RECOMMENDATION_CATEGORIES.WARNING)
  })

  it('handles unknown severity', () => {
    const r = mapRecommendation({ id: 'test', category: 'soil', severity: 'unknown' })
    expect(r.priority).toBe(RECOMMENDATION_PRIORITIES.MEDIUM)
  })
})

describe('getAllRuleIds', () => {
  it('returns at least 32 rule IDs (26 existing + 3 cost + 3 extras)', () => {
    const ids = getAllRuleIds()
    expect(ids.length).toBeGreaterThanOrEqual(32)
  })

  it('includes the 3 cost-reduction rules', () => {
    const ids = getAllRuleIds()
    expect(ids).toContain('cost.tr_oversized')
    expect(ids).toContain('cost.groundbed_underutilized')
    expect(ids).toContain('cost.excess_anode_count')
  })
})
