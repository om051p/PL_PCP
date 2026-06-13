/**
 * costReductionRules.test.js
 *
 * Tests for the 3 new cost-reduction rules.
 */

import { describe, it, expect } from 'vitest'
import { evaluateCostReduction, COST_REDUCTION_RULES } from './costReductionRules.js'

describe('evaluateCostReduction — shape', () => {
  it('exports exactly 3 rules', () => {
    expect(COST_REDUCTION_RULES).toHaveLength(3)
  })

  it('returns an array for null input', () => {
    expect(evaluateCostReduction(null)).toEqual([])
  })

  it('returns an array for undefined input', () => {
    expect(evaluateCostReduction(undefined)).toEqual([])
  })

  it('returns an array for non-object input', () => {
    expect(evaluateCostReduction('string')).toEqual([])
  })

  it('skips misbehaving rules without throwing', () => {
    expect(() => evaluateCostReduction({ trMinVoltage: 'NaN' })).not.toThrow()
  })
})

describe('Rule 1: TR oversized (cost.tr_oversized)', () => {
  it('triggers when utilization < 0.55', () => {
    const r = evaluateCostReduction({ trMinVoltage: 10, trRatedVoltage: 30 })
    expect(r).toHaveLength(1)
    expect(r[0].id).toBe('cost.tr_oversized')
    expect(r[0].observedValue).toBeCloseTo(0.333, 2)
  })

  it('does not trigger when utilization >= 0.55', () => {
    const r = evaluateCostReduction({ trMinVoltage: 20, trRatedVoltage: 30 })
    expect(r.find((x) => x.id === 'cost.tr_oversized')).toBeUndefined()
  })

  it('does not trigger when trRatedVoltage is 0', () => {
    const r = evaluateCostReduction({ trMinVoltage: 5, trRatedVoltage: 0 })
    expect(r.find((x) => x.id === 'cost.tr_oversized')).toBeUndefined()
  })

  it('does not trigger when fields are missing', () => {
    expect(evaluateCostReduction({})).toEqual([])
  })

  it('includes title, message, action, observedValue, threshold', () => {
    const r = evaluateCostReduction({ trMinVoltage: 10, trRatedVoltage: 30 })
    const rec = r[0]
    expect(rec.title).toBeTruthy()
    expect(rec.message).toBeTruthy()
    expect(rec.action).toBeTruthy()
    expect(rec.observedValue).toBeCloseTo(0.333, 2)
    expect(rec.threshold).toBe(0.55)
  })
})

describe('Rule 2: Groundbed far below target (cost.groundbed_underutilized)', () => {
  it('triggers when R_G < 30% of max and design life factor > 1.5', () => {
    const r = evaluateCostReduction({
      groundbedResistanceOhm: 0.2,
      maxAllowableGroundbedRes: 2.0,
      designLifeYears: 40,
      targetDesignLifeYears: 25,
    })
    expect(r.find((x) => x.id === 'cost.groundbed_underutilized')).toBeDefined()
  })

  it('does not trigger when R_G >= 30% of max', () => {
    const r = evaluateCostReduction({
      groundbedResistanceOhm: 1.0,
      maxAllowableGroundbedRes: 2.0,
      designLifeYears: 40,
      targetDesignLifeYears: 25,
    })
    expect(r.find((x) => x.id === 'cost.groundbed_underutilized')).toBeUndefined()
  })

  it('does not trigger when design life factor <= 1.5', () => {
    const r = evaluateCostReduction({
      groundbedResistanceOhm: 0.2,
      maxAllowableGroundbedRes: 2.0,
      designLifeYears: 30,
      targetDesignLifeYears: 25,
    })
    expect(r.find((x) => x.id === 'cost.groundbed_underutilized')).toBeUndefined()
  })

  it('triggers even without design life data if R_G is very low', () => {
    const r = evaluateCostReduction({
      groundbedResistanceOhm: 0.05,
      maxAllowableGroundbedRes: 2.0,
    })
    expect(r.find((x) => x.id === 'cost.groundbed_underutilized')).toBeDefined()
  })

  it('does not trigger when maxAllowable is missing', () => {
    const r = evaluateCostReduction({ groundbedResistanceOhm: 0.2 })
    expect(r.find((x) => x.id === 'cost.groundbed_underutilized')).toBeUndefined()
  })
})

describe('Rule 3: Excess anode count (cost.excess_anode_count)', () => {
  it('triggers when specified > calculated * 1.5', () => {
    const r = evaluateCostReduction({ sacrificialAnodeCount: 15, calculatedAnodeCount: 8 })
    expect(r.find((x) => x.id === 'cost.excess_anode_count')).toBeDefined()
  })

  it('does not trigger when specified <= calculated * 1.5', () => {
    const r = evaluateCostReduction({ sacrificialAnodeCount: 10, calculatedAnodeCount: 8 })
    expect(r.find((x) => x.id === 'cost.excess_anode_count')).toBeUndefined()
  })

  it('does not trigger when calculatedAnodeCount is 0', () => {
    const r = evaluateCostReduction({ sacrificialAnodeCount: 10, calculatedAnodeCount: 0 })
    expect(r.find((x) => x.id === 'cost.excess_anode_count')).toBeUndefined()
  })

  it('recommends calculated + 1 for spares', () => {
    const r = evaluateCostReduction({ sacrificialAnodeCount: 15, calculatedAnodeCount: 8 })
    const rec = r.find((x) => x.id === 'cost.excess_anode_count')
    expect(rec.message).toContain('9')
  })
})

describe('evaluateCostReduction — multiple rules can fire', () => {
  it('fires all 3 rules simultaneously when all conditions met', () => {
    const r = evaluateCostReduction({
      trMinVoltage: 10,
      trRatedVoltage: 30,
      groundbedResistanceOhm: 0.2,
      maxAllowableGroundbedRes: 2.0,
      designLifeYears: 40,
      targetDesignLifeYears: 25,
      sacrificialAnodeCount: 15,
      calculatedAnodeCount: 8,
    })
    expect(r).toHaveLength(3)
  })
})
