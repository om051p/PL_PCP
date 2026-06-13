import { describe, it, expect } from 'vitest'
import { classifyGroundbedStatus, GROUNDBED_STATUS_LABELS } from './groundbedStatus.js'

describe('classifyGroundbedStatus', () => {
  it('returns "draft" when no result is present', () => {
    expect(classifyGroundbedStatus(null)).toBe('draft')
    expect(classifyGroundbedStatus(undefined)).toBe('draft')
  })

  it('returns "ok" when R_G is within max allowable AND design life meets target', () => {
    const result = {
      groundbedResistanceOhm: 0.5,
      maxAllowableGroundbedRes: 1.0,
      designLifeYears: 30,
      targetDesignLifeYears: 25,
    }
    expect(classifyGroundbedStatus(result)).toBe('ok')
  })

  it('returns "warn" when R_G is within limit but design life is short', () => {
    const result = {
      groundbedResistanceOhm: 0.5,
      maxAllowableGroundbedRes: 1.0,
      designLifeYears: 20,
      targetDesignLifeYears: 25,
    }
    expect(classifyGroundbedStatus(result)).toBe('warn')
  })

  it('returns "warn" when R_G exceeds limit but design life is good', () => {
    const result = {
      groundbedResistanceOhm: 1.5,
      maxAllowableGroundbedRes: 1.0,
      designLifeYears: 30,
      targetDesignLifeYears: 25,
    }
    expect(classifyGroundbedStatus(result)).toBe('warn')
  })

  it('returns "fail" when both R_G exceeds and design life is short', () => {
    const result = {
      groundbedResistanceOhm: 2.0,
      maxAllowableGroundbedRes: 1.0,
      designLifeYears: 10,
      targetDesignLifeYears: 25,
    }
    expect(classifyGroundbedStatus(result)).toBe('fail')
  })

  it('treats boundary R_G (equal to max) as exceeding the limit', () => {
    const result = {
      groundbedResistanceOhm: 1.0,
      maxAllowableGroundbedRes: 1.0,
      designLifeYears: 30,
      targetDesignLifeYears: 25,
    }
    expect(classifyGroundbedStatus(result)).toBe('warn')
  })

  it('treats boundary design life (equal to target) as meeting the target', () => {
    const result = {
      groundbedResistanceOhm: 0.5,
      maxAllowableGroundbedRes: 1.0,
      designLifeYears: 25,
      targetDesignLifeYears: 25,
    }
    expect(classifyGroundbedStatus(result)).toBe('ok')
  })

  it('returns "draft" when fields are missing (cannot evaluate)', () => {
    expect(classifyGroundbedStatus({})).toBe('draft')
    expect(classifyGroundbedStatus({ groundbedResistanceOhm: 0.5 })).toBe('draft')
  })

  it('does not recompute any engineering values — pure inspection only', () => {
    // The function must not call any external helpers or perform math.
    // We assert that supplying raw fields is sufficient.
    const result = {
      groundbedResistanceOhm: 0.5,
      maxAllowableGroundbedRes: 1.0,
      designLifeYears: 30,
      targetDesignLifeYears: 25,
    }
    const a = classifyGroundbedStatus(result)
    // Mutate input — result must not be cached or mutated
    result.groundbedResistanceOhm = 99
    const b = classifyGroundbedStatus(result)
    expect(a).toBe('ok')
    expect(b).toBe('warn')
  })
})

describe('GROUNDBED_STATUS_LABELS', () => {
  it('has a label for every status key the classifier can produce', () => {
    expect(Object.keys(GROUNDBED_STATUS_LABELS).sort()).toEqual(['draft', 'fail', 'ok', 'warn'])
  })
})
