import { describe, it, expect } from 'vitest'
import {
  D,
  roundTo,
  withinTolerance,
  formatVerificationResult,
  verifyModule,
} from '../decimalHelpers.js'

describe('D() — Decimal constructor', () => {
  it('creates Decimal from number', () => {
    expect(D(3.14).toNumber()).toBe(3.14)
  })

  it('creates Decimal from string', () => {
    expect(D('1234.5678').toNumber()).toBe(1234.5678)
  })

  it('performs chained arithmetic', () => {
    const result = D(10).plus(5).times(2).dividedBy(3).toNumber()
    expect(result).toBeCloseTo(10, 10)
  })
})

describe('roundTo()', () => {
  it('rounds to 0 decimal places', () => {
    expect(roundTo(3.7, 0)).toBe(4)
  })

  it('rounds to 2 decimal places', () => {
    expect(roundTo(3.14159, 2)).toBe(3.14)
  })

  it('rounds negative numbers', () => {
    expect(roundTo(-3.14159, 2)).toBe(-3.14)
  })
})

describe('withinTolerance()', () => {
  it('passes exact match', () => {
    expect(withinTolerance(1.0, 1.0)).toBe(true)
  })

  it('passes within absolute tolerance', () => {
    expect(withinTolerance(1.0005, 1.0, 0.005, 0.001)).toBe(true)
  })

  it('fails outside absolute tolerance', () => {
    expect(withinTolerance(1.01, 1.0, 0.005, 0.001)).toBe(false)
  })
})

describe('formatVerificationResult()', () => {
  it('marks passing result', () => {
    const r = formatVerificationResult(1.0, 1.0, 'test')
    expect(r.pass).toBe(true)
    expect(r.symbol).toBe('\u2705')
    expect(r.label).toBe('test')
  })

  it('marks failing result', () => {
    const r = formatVerificationResult(2.0, 1.0, 'test')
    expect(r.pass).toBe(false)
    expect(r.symbol).toBe('\u274C')
  })
})

describe('verifyModule()', () => {
  it('aggregates all passing results', () => {
    const results = [
      { label: 'a', pass: true, expected: 1, actual: 1 },
      { label: 'b', pass: true, expected: 2, actual: 2 },
    ]
    const report = verifyModule('test-module', results)
    expect(report.allPassed).toBe(true)
    expect(report.module).toBe('test-module')
  })

  it('flags failure when any result fails', () => {
    const results = [
      { label: 'a', pass: true, expected: 1, actual: 1 },
      { label: 'b', pass: false, expected: 2, actual: 3 },
    ]
    const report = verifyModule('test-module', results)
    expect(report.allPassed).toBe(false)
  })
})
