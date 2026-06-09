import { describe, it, expect } from 'vitest'
import { getTolerance, VERIFICATION_TOLERANCES } from '../verificationFramework.js'

describe('VERIFICATION_TOLERANCES', () => {
  it('defines electrical tolerance', () => {
    expect(VERIFICATION_TOLERANCES.electrical.relative).toBe(0.005)
    expect(VERIFICATION_TOLERANCES.electrical.absolute).toBe(0.001)
  })

  it('defines dimension tolerance', () => {
    expect(VERIFICATION_TOLERANCES.dimensions.relative).toBe(0.001)
    expect(VERIFICATION_TOLERANCES.dimensions.absolute).toBe(0.01)
  })

  it('defines life tolerance', () => {
    expect(VERIFICATION_TOLERANCES.life.relative).toBe(0.005)
    expect(VERIFICATION_TOLERANCES.life.absolute).toBe(0.1)
  })

  it('defines current tolerance', () => {
    expect(VERIFICATION_TOLERANCES.current.relative).toBe(0.005)
    expect(VERIFICATION_TOLERANCES.current.absolute).toBe(0.0001)
  })
})

describe('getTolerance()', () => {
  it('returns electrical tolerance for Ohmic fields', () => {
    const tol = getTolerance('groundbedResistanceOhm')
    expect(tol).toBe(VERIFICATION_TOLERANCES.electrical)
  })

  it('returns dimension tolerance for area', () => {
    const tol = getTolerance('totalSurfaceAreaM2')
    expect(tol).toBe(VERIFICATION_TOLERANCES.dimensions)
  })

  it('returns life tolerance for year fields', () => {
    const tol = getTolerance('designLifeYears')
    expect(tol).toBe(VERIFICATION_TOLERANCES.life)
  })

  it('returns current tolerance for Amp fields', () => {
    const tol = getTolerance('requiredCurrentA')
    expect(tol).toBe(VERIFICATION_TOLERANCES.current)
  })

  it('falls back to electrical for unknown fields', () => {
    const tol = getTolerance('unknown_field')
    expect(tol).toBe(VERIFICATION_TOLERANCES.electrical)
  })
})
