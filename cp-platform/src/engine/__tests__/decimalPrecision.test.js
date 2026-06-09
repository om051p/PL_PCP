import { describe, it, expect } from 'vitest'
import {
  D,
  math,
  roundTo,
  withinTolerance,
  calcSurfaceAreaPrecise,
  tempCorrectedCurrentDensityPrecise,
} from '../../test-utils/decimalHelpers.js'

describe('Decimal.js Precision Arithmetic', () => {
  it('handles simple arithmetic without floating point errors', () => {
    expect(0.1 + 0.2).not.toBe(0.3)
    const result = D(0.1).plus(0.2).toNumber()
    expect(result).toBe(0.3)
  })

  it('performs multiplication precisely', () => {
    const a = D('1118.43')
    const b = D('0.18055')
    const result = a.times(b).dividedBy(1000).toNumber()
    expect(result).toBeCloseTo(0.20193, 4)
  })

  it('rounds to specified decimal places', () => {
    expect(roundTo(3.14159, 2)).toBe(3.14)
    expect(roundTo(3.14159, 4)).toBe(3.1416)
  })

  it('tolerance check works for engineering precision', () => {
    expect(withinTolerance(0.1135, 0.1135, 0.005, 0.001)).toBe(true)
    expect(withinTolerance(0.12, 0.1135, 0.005, 0.001)).toBe(false)
  })

  it('handles very small values without precision loss', () => {
    const small = D(1).dividedBy(1000000)
    expect(small.lessThan(0.00001)).toBe(true)
    const multiplied = small.times(1000000)
    expect(multiplied.toNumber()).toBe(1)
  })

  it('handles very large values without overflow', () => {
    const large = D('158877.93')
    const result = large.times('0.18055').dividedBy(1000)
    expect(result.toNumber()).toBeCloseTo(28.6854, 3)
  })
})

describe('Precise Engineering Calculations', () => {
  it('calcSurfaceAreaPrecise matches analytical value', () => {
    const result = calcSurfaceAreaPrecise(48, 292)
    expect(result).toBeCloseTo(1118.43, 1)
  })

  it('tempCorrectedCurrentDensityPrecise matches NACE formula', () => {
    const result = tempCorrectedCurrentDensityPrecise(0.1, 57.22)
    expect(result).toBeCloseTo(0.18055, 5)
  })
})

describe('MathJS Integration', () => {
  it('converts units correctly', () => {
    const inchesToMeters = math.unit(48, 'inch').toNumber('m')
    expect(inchesToMeters).toBeCloseTo(1.2192, 4)
  })

  it('evaluates expressions', () => {
    const area = math.evaluate('pi * 1.2192 * 292')
    expect(area).toBeCloseTo(1118.43, 1)
  })
})
