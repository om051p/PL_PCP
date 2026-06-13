/**
 * recommendationEngine.test.js
 *
 * Tests for the top-level orchestrator. Verifies:
 *   1. Output shape matches the spec
 *   2. Mapping from 9-category to 4-category works
 *   3. Mapping from severity to priority works
 *   4. Cost-reduction rules are layered on top
 *   5. byCategory and byPriority buckets are correct
 *   6. Score and scoreLabel are preserved from base engine
 *   7. Edge cases (null input, empty input)
 */

import { describe, it, expect } from 'vitest'
import { analyze, analyzeAsync } from './recommendationEngine.js'
import { RECOMMENDATION_CATEGORIES, RECOMMENDATION_PRIORITIES } from './recommendationRegistry.js'

const BASE = {
  soilResistivityOhmCm: 2000,
  pipelineLengthKm: 12,
  currentReqA: 8.4,
  groundbedResistanceOhm: 1.2,
  trRatedVoltage: 30,
  trMinVoltage: 18,
  cableDropV: 0.3,
  attenuationCoveragePct: 92,
  attenuationWorstPointMv: -900,
  designLifeYears: 28,
  targetDesignLifeYears: 25,
  pendingApprovalDays: 0,
}

describe('analyze() — output shape', () => {
  it('returns recommendations, score, scoreLabel, byCategory, byPriority, summary, inputEcho', () => {
    const r = analyze(BASE)
    expect(Array.isArray(r.recommendations)).toBe(true)
    expect(typeof r.score).toBe('number')
    expect(typeof r.scoreLabel).toBe('string')
    expect(r.byCategory).toBeDefined()
    expect(r.byPriority).toBeDefined()
    expect(r.summary).toBeDefined()
    expect(r.inputEcho).toBeDefined()
  })

  it('byCategory has exactly 4 buckets', () => {
    const r = analyze(BASE)
    expect(Object.keys(r.byCategory).sort()).toEqual([
      'compliance', 'cost_reduction', 'optimization', 'warning',
    ])
  })

  it('byPriority has exactly 4 buckets', () => {
    const r = analyze(BASE)
    expect(Object.keys(r.byPriority).sort()).toEqual([
      'critical', 'high', 'low', 'medium',
    ])
  })

  it('every recommendation has category and priority', () => {
    const r = analyze(BASE)
    for (const rec of r.recommendations) {
      expect(Object.values(RECOMMENDATION_CATEGORIES)).toContain(rec.category)
      expect(Object.values(RECOMMENDATION_PRIORITIES)).toContain(rec.priority)
    }
  })
})

describe('analyze() — category mapping', () => {
  it('maps cable recommendations to compliance', () => {
    const r = analyze({ ...BASE, cableDropV: 1.5 })
    const cableRecs = r.recommendations.filter((x) => x.id.startsWith('cable.'))
    for (const rec of cableRecs) {
      expect(rec.category).toBe(RECOMMENDATION_CATEGORIES.COMPLIANCE)
    }
  })

  it('maps soil/pipeline/current recommendations to warning', () => {
    const r = analyze({ ...BASE, soilResistivityOhmCm: 60000 })
    const soilRecs = r.recommendations.filter((x) => x.id.startsWith('soil.'))
    for (const rec of soilRecs) {
      expect(rec.category).toBe(RECOMMENDATION_CATEGORIES.WARNING)
    }
  })

  it('maps positive findings (groundbed.unusually_low) to optimization', () => {
    const r = analyze({ ...BASE, groundbedResistanceOhm: 0.05 })
    const rec = r.recommendations.find((x) => x.id === 'groundbed.unusually_low')
    expect(rec).toBeDefined()
    expect(rec.category).toBe(RECOMMENDATION_CATEGORIES.OPTIMIZATION)
  })
})

describe('analyze() — priority mapping', () => {
  it('maps error severity to critical priority', () => {
    const r = analyze({ ...BASE, groundbedResistanceOhm: 15 })
    const errRec = r.recommendations.find((x) => x.id === 'groundbed.very_high')
    expect(errRec.priority).toBe(RECOMMENDATION_PRIORITIES.CRITICAL)
  })

  it('maps warn severity to high priority', () => {
    const r = analyze({ ...BASE, soilResistivityOhmCm: 60000 })
    const rec = r.recommendations.find((x) => x.id === 'soil.very_high')
    expect(rec.priority).toBe(RECOMMENDATION_PRIORITIES.HIGH)
  })

  it('maps info severity to medium priority', () => {
    const r = analyze({ ...BASE, currentReqA: 60 })
    const rec = r.recommendations.find((x) => x.id === 'current.high')
    expect(rec.priority).toBe(RECOMMENDATION_PRIORITIES.MEDIUM)
  })

  it('maps success severity to low priority', () => {
    const r = analyze({ ...BASE, trMinVoltage: 21, trRatedVoltage: 30 })
    const rec = r.recommendations.find((x) => x.id === 'tr.optimal')
    expect(rec.priority).toBe(RECOMMENDATION_PRIORITIES.LOW)
  })
})

describe('analyze() — cost-reduction rules layered on top', () => {
  it('includes cost.tr_oversized when TR is oversized', () => {
    const r = analyze({ ...BASE, trMinVoltage: 10, trRatedVoltage: 30 })
    const rec = r.recommendations.find((x) => x.id === 'cost.tr_oversized')
    expect(rec).toBeDefined()
    expect(rec.category).toBe(RECOMMENDATION_CATEGORIES.COST_REDUCTION)
  })

  it('includes cost.groundbed_underutilized when R_G is very low', () => {
    const r = analyze({
      ...BASE,
      groundbedResistanceOhm: 0.2,
      maxAllowableGroundbedRes: 2.0,
      designLifeYears: 40,
      targetDesignLifeYears: 25,
    })
    const rec = r.recommendations.find((x) => x.id === 'cost.groundbed_underutilized')
    expect(rec).toBeDefined()
  })

  it('includes cost.excess_anode_count when anode count is excessive', () => {
    const r = analyze({ ...BASE, sacrificialAnodeCount: 15, calculatedAnodeCount: 8 })
    const rec = r.recommendations.find((x) => x.id === 'cost.excess_anode_count')
    expect(rec).toBeDefined()
  })

  it('cost-reduction recs appear in byCategory.cost_reduction', () => {
    const r = analyze({ ...BASE, trMinVoltage: 10, trRatedVoltage: 30 })
    expect(r.byCategory.cost_reduction.length).toBeGreaterThan(0)
    expect(r.byCategory.cost_reduction[0].id).toBe('cost.tr_oversized')
  })
})

describe('analyze() — sort order', () => {
  it('sorts recommendations by priority (critical first)', () => {
    const r = analyze({
      ...BASE,
      groundbedResistanceOhm: 15, // critical
      soilResistivityOhmCm: 60000, // high
      currentReqA: 60, // medium
    })
    const priorities = r.recommendations.map((x) => x.priority)
    const firstHigh = priorities.indexOf(RECOMMENDATION_PRIORITIES.HIGH)
    const firstCritical = priorities.indexOf(RECOMMENDATION_PRIORITIES.CRITICAL)
    if (firstCritical !== -1 && firstHigh !== -1) {
      expect(firstCritical).toBeLessThan(firstHigh)
    }
  })
})

describe('analyze() — score and scoreLabel preservation', () => {
  it('preserves score from base engine', () => {
    const r = analyze(BASE)
    expect(typeof r.score).toBe('number')
    expect(r.score).toBeGreaterThanOrEqual(0)
    expect(r.score).toBeLessThanOrEqual(100)
  })

  it('preserves scoreLabel from base engine', () => {
    const r = analyze(BASE)
    expect(['Optimal', 'Good', 'Marginal', 'Critical', 'Severe']).toContain(r.scoreLabel)
  })
})

describe('analyze() — edge cases', () => {
  it('handles null input', () => {
    const r = analyze(null)
    expect(r.recommendations).toEqual([])
    expect(r.score).toBe(100)
  })

  it('handles undefined input', () => {
    const r = analyze(undefined)
    expect(r.recommendations).toEqual([])
  })

  it('handles empty object input', () => {
    const r = analyze({})
    expect(r.recommendations).toEqual([])
  })

  it('is deterministic', () => {
    expect(analyze(BASE)).toEqual(analyze(BASE))
  })
})

describe('analyzeAsync()', () => {
  it('returns the rule-based result by default', async () => {
    const r = await analyzeAsync(BASE)
    expect(r.recommendations).toBeDefined()
  })

  it('matches analyze() when includeAI is false', async () => {
    const sync = analyze(BASE)
    const async1 = await analyzeAsync(BASE)
    expect(async1.recommendations.map((r) => r.id).sort()).toEqual(
      sync.recommendations.map((r) => r.id).sort()
    )
  })
})
