import { describe, it, expect } from 'vitest'
import { verifyGoldenDataset, getGoldenDatasets } from '../../test-utils/verificationFramework.js'
import { runStationCalculations } from '../modules/calculations.js'

const datasets = getGoldenDatasets()

describe('Golden Dataset Regression Tests', () => {
  it('should have at least 2 datasets registered', () => {
    expect(Object.keys(datasets).length).toBeGreaterThanOrEqual(2)
  })

  Object.entries(datasets).forEach(([_key, { name, station, life, expected }]) => {
    it(name, () => {
      const result = runStationCalculations(station, life)
      Object.entries(expected).forEach(([field, value]) => {
        const tolerance = value < 1 ? 2 : 1
        expect(result[field]).toBeCloseTo(value, tolerance)
      })
    })
  })
})

describe('Golden Dataset Full Verification Report', () => {
  Object.entries(datasets).forEach(([_key, { name, station, life, expected }]) => {
    it(`${name} — detailed verification`, () => {
      const report = verifyGoldenDataset(name, station, life, expected)
      expect(report.allPassed).toBe(true)
      expect(report.results.length).toBeGreaterThan(0)
      report.results.forEach((check) => {
        expect(check.pass).toBe(true)
      })
    })
  })
})
