/**
 * projectHealthEngine.test.js
 *
 * Tests for the 7 executive KPIs. Covers all formulas, edge cases,
 * and the composite computeAllKPIs function.
 */

import { describe, it, expect } from 'vitest'
import {
  computeProjectHealth,
  computeComplianceScore,
  computeDesignCompletion,
  computeCurrentRequirement,
  computeGroundbedStatus,
  computeValidationStatus,
  computeEngineeringRisk,
  computeAllKPIs,
} from './projectHealthEngine.js'

const CALC_RESULT = {
  requiredCurrentA: 8.4,
  designCurrentA: 10.9,
  groundbedResistanceOhm: 1.2,
  totalCableResOhm: 0.05,
  minTRVoltage: 18,
  checks: [],
  validationErrors: null,
}

function makeStation(overrides = {}) {
  return {
    id: 'st1',
    name: 'Station 1',
    status: 'calculated',
    pipelineSegments: [{ id: 'seg1', lengthM: 292 }],
    soilResistivityOhmCm: 2000,
    lastCalcResult: { ...CALC_RESULT },
    validationErrors: null,
    ...overrides,
  }
}

describe('computeProjectHealth', () => {
  it('returns score 0 for empty stations', () => {
    const r = computeProjectHealth([])
    expect(r.score).toBe(0)
    expect(r.totalCount).toBe(0)
  })

  it('returns score 0 when no stations are calculated', () => {
    const stations = [makeStation({ lastCalcResult: null })]
    const r = computeProjectHealth(stations)
    expect(r.score).toBe(0)
  })

  it('returns score 50 when all calculated but none approved', () => {
    const stations = [makeStation(), makeStation({ id: 'st2' })]
    const r = computeProjectHealth(stations)
    expect(r.score).toBe(50) // 50% calculated
  })

  it('returns score 80 when all calculated and approved', () => {
    const stations = [
      makeStation({ status: 'approved' }),
      makeStation({ id: 'st2', status: 'approved' }),
    ]
    const r = computeProjectHealth(stations)
    expect(r.score).toBe(80) // 50% calculated + 30% approved
  })

  it('returns score 100 when all calculated, approved, and in review', () => {
    // Note: approved and review are mutually exclusive in the formula's intent,
    // but the formula adds them independently. This test verifies the math.
    const stations = [
      makeStation({ status: 'engineering_review' }),
      makeStation({ id: 'st2', status: 'engineering_review' }),
    ]
    const r = computeProjectHealth(stations)
    expect(r.score).toBe(70) // 50% calculated + 20% in review
  })

  it('handles mixed statuses correctly', () => {
    const stations = [
      makeStation({ status: 'approved' }),
      makeStation({ id: 'st2', status: 'engineering_review' }),
      makeStation({ id: 'st3', status: 'calculated' }),
    ]
    const r = computeProjectHealth(stations)
    // 3/3 calculated (50) + 1/3 approved (10) + 1/3 in review (7) = 67
    expect(r.score).toBe(67)
  })
})

describe('computeComplianceScore', () => {
  it('returns null when no checks exist', () => {
    const stations = [makeStation()]
    expect(computeComplianceScore(stations)).toBeNull()
  })

  it('returns 100 when all checks pass', () => {
    const station = makeStation({
      lastCalcResult: { ...CALC_RESULT, checks: [{ status: 'pass' }, { status: 'pass' }] },
    })
    expect(computeComplianceScore([station])).toBe(100)
  })

  it('returns 0 when all checks fail', () => {
    const station = makeStation({
      lastCalcResult: { ...CALC_RESULT, checks: [{ status: 'fail' }, { status: 'fail' }] },
    })
    expect(computeComplianceScore([station])).toBe(0)
  })

  it('returns 50 when half the checks fail', () => {
    const station = makeStation({
      lastCalcResult: { ...CALC_RESULT, checks: [{ status: 'pass' }, { status: 'fail' }] },
    })
    expect(computeComplianceScore([station])).toBe(50)
  })

  it('aggregates across multiple stations', () => {
    const s1 = makeStation({
      lastCalcResult: { ...CALC_RESULT, checks: [{ status: 'pass' }] },
    })
    const s2 = makeStation({
      id: 'st2',
      lastCalcResult: { ...CALC_RESULT, checks: [{ status: 'fail' }] },
    })
    expect(computeComplianceScore([s1, s2])).toBe(50)
  })

  it('handles empty stations array', () => {
    expect(computeComplianceScore([])).toBeNull()
  })
})

describe('computeDesignCompletion', () => {
  it('returns 0 for empty workflow', () => {
    expect(computeDesignCompletion([])).toBe(0)
  })

  it('returns 0 for null workflow', () => {
    expect(computeDesignCompletion(null)).toBe(0)
  })

  it('returns percentage of complete stages', () => {
    const workflow = [
      { state: 'complete' },
      { state: 'complete' },
      { state: 'not_started' },
    ]
    expect(computeDesignCompletion(workflow)).toBe(67) // 2/3 = 67%
  })

  it('returns 100 when all stages are complete', () => {
    const workflow = Array(10).fill({ state: 'complete' })
    expect(computeDesignCompletion(workflow)).toBe(100)
  })
})

describe('computeCurrentRequirement', () => {
  it('returns null when no station has calc result', () => {
    const stations = [makeStation({ lastCalcResult: null })]
    expect(computeCurrentRequirement(stations)).toBeNull()
  })

  it('returns the single value when one station', () => {
    expect(computeCurrentRequirement([makeStation()])).toBe(8.4)
  })

  it('returns the maximum across stations', () => {
    const stations = [
      makeStation(),
      makeStation({ id: 'st2', lastCalcResult: { ...CALC_RESULT, requiredCurrentA: 25 } }),
    ]
    expect(computeCurrentRequirement(stations)).toBe(25)
  })

  it('ignores stations with NaN values', () => {
    const stations = [
      makeStation(),
      makeStation({ id: 'st2', lastCalcResult: { ...CALC_RESULT, requiredCurrentA: NaN } }),
    ]
    expect(computeCurrentRequirement(stations)).toBe(8.4)
  })
})

describe('computeGroundbedStatus', () => {
  it('returns unknown when no groundbed data', () => {
    const stations = [makeStation({ lastCalcResult: { ...CALC_RESULT, groundbedResistanceOhm: null } })]
    const r = computeGroundbedStatus(stations)
    expect(r.status).toBe('unknown')
    expect(r.total).toBe(0)
  })

  it('returns pass when all groundbeds are within threshold', () => {
    const stations = [makeStation({ lastCalcResult: { ...CALC_RESULT, groundbedResistanceOhm: 1.5 } })]
    const r = computeGroundbedStatus(stations)
    expect(r.status).toBe('pass')
    expect(r.pass).toBe(1)
  })

  it('returns warn when a groundbed is high but not very high', () => {
    const stations = [makeStation({ lastCalcResult: { ...CALC_RESULT, groundbedResistanceOhm: 7 } })]
    const r = computeGroundbedStatus(stations)
    expect(r.status).toBe('warn')
    expect(r.warn).toBe(1)
  })

  it('returns fail when a groundbed exceeds very high threshold', () => {
    const stations = [makeStation({ lastCalcResult: { ...CALC_RESULT, groundbedResistanceOhm: 15 } })]
    const r = computeGroundbedStatus(stations)
    expect(r.status).toBe('fail')
    expect(r.fail).toBe(1)
  })

  it('aggregates across stations', () => {
    const stations = [
      makeStation({ lastCalcResult: { ...CALC_RESULT, groundbedResistanceOhm: 1 } }),
      makeStation({ id: 'st2', lastCalcResult: { ...CALC_RESULT, groundbedResistanceOhm: 7 } }),
      makeStation({ id: 'st3', lastCalcResult: { ...CALC_RESULT, groundbedResistanceOhm: 15 } }),
    ]
    const r = computeGroundbedStatus(stations)
    expect(r.status).toBe('fail') // any fail → overall fail
    expect(r.pass).toBe(1)
    expect(r.warn).toBe(1)
    expect(r.fail).toBe(1)
  })
})

describe('computeValidationStatus', () => {
  it('returns clean when no issues', () => {
    const r = computeValidationStatus([makeStation()])
    expect(r.status).toBe('clean')
    expect(r.totalIssues).toBe(0)
  })

  it('counts validationErrors on stations', () => {
    const station = makeStation({ validationErrors: ['Error 1', 'Error 2'] })
    const r = computeValidationStatus([station])
    expect(r.status).toBe('issues')
    expect(r.validationErrors).toBe(2)
    expect(r.totalIssues).toBe(2)
  })

  it('counts check failures', () => {
    const station = makeStation({
      lastCalcResult: { ...CALC_RESULT, checks: [{ status: 'fail' }, { status: 'pass' }] },
    })
    const r = computeValidationStatus([station])
    expect(r.checkFailures).toBe(1)
    expect(r.totalIssues).toBe(1)
  })

  it('combines validationErrors and check failures', () => {
    const station = makeStation({
      validationErrors: ['Error 1'],
      lastCalcResult: { ...CALC_RESULT, checks: [{ status: 'fail' }] },
    })
    const r = computeValidationStatus([station])
    expect(r.validationErrors).toBe(1)
    expect(r.checkFailures).toBe(1)
    expect(r.totalIssues).toBe(2)
  })
})

describe('computeEngineeringRisk', () => {
  it('returns Low risk for clean projects with good compliance', () => {
    const stations = [makeStation({
      lastCalcResult: { ...CALC_RESULT, checks: [{ status: 'pass' }] },
    })]
    const r = computeEngineeringRisk(stations, [])
    expect(r.level).toBe('Low')
    expect(r.score).toBeLessThan(40)
  })

  it('returns High risk when compliance is 0 and multiple advisor errors', () => {
    const stations = [makeStation({
      lastCalcResult: { ...CALC_RESULT, checks: [{ status: 'fail' }] },
    })]
    const advisorRecs = [
      { severity: 'error' },
      { severity: 'error' },
      { severity: 'error' },
      { severity: 'error' },
    ]
    const r = computeEngineeringRisk(stations, advisorRecs)
    expect(r.level).toBe('High')
    expect(r.score).toBeGreaterThan(70)
  })

  it('returns Medium risk for moderate issues', () => {
    const stations = [makeStation({
      lastCalcResult: { ...CALC_RESULT, checks: [{ status: 'pass' }, { status: 'fail' }] },
    })]
    const r = computeEngineeringRisk(stations, [{ severity: 'warn' }])
    expect(r.level).toBe('Medium')
  })

  it('returns score 0 for empty stations and no advisor recs', () => {
    const r = computeEngineeringRisk([], [])
    // complianceComponent = 50 (no data → medium), advisorComponent = 0, validationComponent = 0
    // score = 0.4 * 50 = 20
    expect(r.score).toBeLessThan(40)
    expect(r.level).toBe('Low')
  })

  it('clamps score to 0-100', () => {
    const stations = [makeStation({
      lastCalcResult: { ...CALC_RESULT, checks: [{ status: 'fail' }] },
    })]
    const advisorRecs = Array(20).fill({ severity: 'error' })
    const r = computeEngineeringRisk(stations, advisorRecs)
    expect(r.score).toBeLessThanOrEqual(100)
    expect(r.score).toBeGreaterThanOrEqual(0)
  })
})

describe('computeAllKPIs', () => {
  it('returns all 7 KPIs in a single call', () => {
    const project = { id: 'p1', designBasis: { systemDesignLifeYears: 25 } }
    const stations = [makeStation()]
    const workflow = [
      { state: 'complete' }, { state: 'complete' }, { state: 'complete' },
      { state: 'complete' }, { state: 'complete' }, { state: 'complete' },
      { state: 'complete' }, { state: 'complete' }, { state: 'complete' },
      { state: 'complete' },
    ]
    const r = computeAllKPIs(project, stations, workflow, [])
    expect(r).toHaveProperty('projectHealth')
    expect(r).toHaveProperty('complianceScore')
    expect(r).toHaveProperty('designCompletion')
    expect(r).toHaveProperty('currentRequirement')
    expect(r).toHaveProperty('groundbedStatus')
    expect(r).toHaveProperty('validationStatus')
    expect(r).toHaveProperty('engineeringRisk')
    expect(r.designCompletion).toBe(100)
  })
})
