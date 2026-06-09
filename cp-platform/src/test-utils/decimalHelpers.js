import Decimal from 'decimal.js'
import { create, all } from 'mathjs'

export const math = create(all)

export function D(value) {
  return new Decimal(value)
}

export function toNumber(decimal) {
  return decimal instanceof Decimal ? decimal.toNumber() : decimal
}

export function calcSurfaceAreaPrecise(odInches, lengthM) {
  if (odInches <= 0 || lengthM <= 0) return 0
  const inchesToMeters = new Decimal('0.0254')
  const diameterM = new Decimal(odInches).times(inchesToMeters)
  const pi = Decimal.acos(-1)
  const area = pi.times(diameterM).times(new Decimal(lengthM))
  return area.toNumber()
}

export function tempCorrectedCurrentDensityPrecise(baseDensity, tempC) {
  if (tempC <= 0) return 0
  const delta = new Decimal(tempC).minus(25)
  const factor = new Decimal(1).plus(delta.times('0.025'))
  return new Decimal(baseDensity).times(factor).toNumber()
}

export function roundTo(value, decimals) {
  return new Decimal(value).toDecimalPlaces(decimals).toNumber()
}

export function withinTolerance(actual, expected, relativeTol = 0.005, absoluteTol = 0.001) {
  const absError = Math.abs(actual - expected)
  if (absError <= absoluteTol) return true
  const relError = absError / Math.max(Math.abs(expected), 1e-10)
  return relError <= relativeTol
}

export function formatVerificationResult(actual, expected, label) {
  const pass = withinTolerance(actual, expected)
  const absError = Math.abs(actual - expected)
  const relError = expected !== 0 ? absError / Math.abs(expected) : absError
  return {
    label,
    expected,
    actual,
    pass,
    absError,
    relError: relError * 100,
    symbol: pass ? '\u2705' : '\u274C',
  }
}

export function verifyModule(name, results) {
  const allPassed = results.every((r) => r.pass)
  return { module: name, results, allPassed, timestamp: new Date().toISOString() }
}
