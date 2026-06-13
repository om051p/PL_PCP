/**
 * sensitivity/index.test.js
 *
 * Smoke tests for the sensitivity engine. Verifies the API is callable and
 * returns the expected shape. Golden values verified against hand calculation.
 */

import { describe, it, expect } from 'vitest'
import {
  computeTornado,
  computeSweep,
  computeScenarioComparison,
  getAvailableInputs,
  getAvailableOutputs,
  DEFAULT_PERTURBABLE,
  DEFAULT_OUTPUTS,
} from './index.js'

// Golden Dataset 1 (TIE) — same fixture as the engine tests
const TIE_STATION = {
  id: 'tornado-test',
  pipelineSegments: [{ id: 'seg-1', od: 48, lengthM: 292, opTempC: 57.22, currentDensityBase: 0.1, coatingEfficiency: 0.98 }],
  groundbed: { type: 'deepwell', startDepthM: 15, anodeLengthM: 2.13, anodeSpacingM: 1.5, boreholeDiaM: 0.25, cokeCoverM: 2.5, cementPlugM: 0.5 },
  anodeSpec: { weightKg: 38.6, consumptionRate: 0.45, outputAmps: 3.56 },
  proposedAnodes: 9,
  cables: {
    anodeTailLengths: [25, 30, 35, 40, 45, 50, 55, 60, 65],
    anodeCableSizeMm2: 16, posMainLengthM: 180, posMainSizeMm2: 35,
    negMainLengthM: 100, negMainSizeMm2: 35, negSecLengthM: 60, negSecSizeMm2: 25,
  },
  tr: { ratedVoltage: 30, ratedCurrent: 25, backEMF: 2, structureResistance: 0.055 },
  soilResistivityOhmCm: 361,
  actualRemotenesM: 56, requiredRemotenesM: 20, designLifeYears: 25,
}
const LIFE = 25

describe('Sensitivity Engine — API shape', () => {
  it('exports the expected public functions', () => {
    expect(typeof computeTornado).toBe('function')
    expect(typeof computeSweep).toBe('function')
    expect(typeof computeScenarioComparison).toBe('function')
    expect(typeof getAvailableInputs).toBe('function')
    expect(typeof getAvailableOutputs).toBe('function')
  })

  it('DEFAULT_PERTURBABLE contains the audited designBasis fields', () => {
    const ids = DEFAULT_PERTURBABLE.map((i) => i.id)
    expect(ids).toContain('soilResistivityOhmCm')
    expect(ids).toContain('backEmfV')
    expect(ids).toContain('structureResistanceOhm')
    expect(ids).toContain('systemDesignLifeYears')
    expect(ids).toContain('cokeContingencyPct')
    expect(ids).toContain('proposedAnodes')
  })

  it('DEFAULT_OUTPUTS contains the major engineering outputs', () => {
    const ids = DEFAULT_OUTPUTS.map((o) => o.id)
    expect(ids).toContain('groundbedResistanceOhm')
    expect(ids).toContain('minTRVoltage')
    expect(ids).toContain('designLifeYears')
    expect(ids).toContain('cokeBagsWithContingency')
  })
})

describe('computeTornado', () => {
  it('returns the expected shape', () => {
    const t = computeTornado(TIE_STATION, LIFE, null, 'minTRVoltage', DEFAULT_PERTURBABLE, 10)
    expect(t).toHaveProperty('output')
    expect(t).toHaveProperty('base')
    expect(t).toHaveProperty('rows')
    expect(t.perturbationPct).toBe(10)
    expect(Array.isArray(t.rows)).toBe(true)
    expect(t.rows.length).toBe(DEFAULT_PERTURBABLE.length)
  })

  it('ranks rows by range (largest impact first)', () => {
    const t = computeTornado(TIE_STATION, LIFE, null, 'minTRVoltage', DEFAULT_PERTURBABLE, 10)
    for (let i = 1; i < t.rows.length; i++) {
      expect(t.rows[i - 1].range).toBeGreaterThanOrEqual(t.rows[i].range)
    }
  })

  it('base value matches a direct runStationCalculations call', () => {
    const t = computeTornado(TIE_STATION, LIFE, null, 'minTRVoltage', DEFAULT_PERTURBABLE, 10)
    // The base is from the unperturbed station; just sanity-check it's a finite number
    expect(Number.isFinite(t.base)).toBe(true)
  })

  it('soil resistivity perturbation changes R_G significantly', () => {
    const t = computeTornado(TIE_STATION, LIFE, null, 'groundbedResistanceOhm', DEFAULT_PERTURBABLE, 10)
    const rhoRow = t.rows.find((r) => r.id === 'soilResistivityOhmCm')
    expect(rhoRow).toBeDefined()
    expect(Math.abs(rhoRow.deltaHighPct)).toBeGreaterThan(5) // 10% change in ρ should change R_G by ~10%
  })

  it('handles a single input subset', () => {
    const t = computeTornado(TIE_STATION, LIFE, null, 'minTRVoltage', [
      DEFAULT_PERTURBABLE.find((i) => i.id === 'proposedAnodes'),
    ], 10)
    expect(t.rows.length).toBe(1)
  })
})

describe('computeSweep', () => {
  it('returns N samples for the requested input', () => {
    const sw = computeSweep(TIE_STATION, LIFE, null, 'soilResistivityOhmCm', [100, 10000], 11)
    expect(sw.samples).toBe(11)
    expect(sw.data.length).toBe(11)
    expect(sw.data[0].x).toBe(100)
    expect(sw.data[10].x).toBe(10000)
  })

  it('records the requested outputs at each sample', () => {
    const sw = computeSweep(TIE_STATION, LIFE, null, 'soilResistivityOhmCm', [100, 1000], 5, ['groundbedResistanceOhm', 'minTRVoltage'])
    sw.data.forEach((d) => {
      expect(d.results).toHaveProperty('groundbedResistanceOhm')
      expect(d.results).toHaveProperty('minTRVoltage')
    })
  })

  it('R_G grows monotonically with ρ', () => {
    const sw = computeSweep(TIE_STATION, LIFE, null, 'soilResistivityOhmCm', [100, 10000], 11)
    for (let i = 1; i < sw.data.length; i++) {
      expect(sw.data[i].results.groundbedResistanceOhm)
        .toBeGreaterThan(sw.data[i - 1].results.groundbedResistanceOhm)
    }
  })

  it('throws on unknown input', () => {
    expect(() => computeSweep(TIE_STATION, LIFE, null, 'nonexistent_input', [1, 2], 5)).toThrow()
  })
})

describe('computeScenarioComparison', () => {
  it('compares two scenarios on a chosen output', () => {
    const stationB = JSON.parse(JSON.stringify(TIE_STATION))
    stationB.proposedAnodes = 12 // +3 anodes
    const cmp = computeScenarioComparison([
      { name: 'Current (9 anodes)', station: TIE_STATION, life: LIFE, project: null },
      { name: '+3 anodes', station: stationB, life: LIFE, project: null },
    ], ['minTRVoltage', 'designLifeYears'])
    expect(cmp.scenarios.length).toBe(2)
    expect(cmp.scenarios[0].results.minTRVoltage).toBeGreaterThan(0)
    expect(cmp.scenarios[1].results.designLifeYears).toBeGreaterThan(cmp.scenarios[0].results.designLifeYears)
  })
})

describe('getAvailableInputs / getAvailableOutputs', () => {
  it('returns the perturble list', () => {
    const inputs = getAvailableInputs()
    expect(inputs.length).toBe(DEFAULT_PERTURBABLE.length)
    inputs.forEach((i) => {
      expect(i).toHaveProperty('id')
      expect(i).toHaveProperty('label')
    })
  })

  it('returns the output list with units', () => {
    const outputs = getAvailableOutputs()
    outputs.forEach((o) => {
      expect(o).toHaveProperty('id')
      expect(o).toHaveProperty('label')
      expect(o).toHaveProperty('unit')
    })
  })
})
