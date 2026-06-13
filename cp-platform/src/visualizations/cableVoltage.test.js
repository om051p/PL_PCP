import { describe, it, expect } from 'vitest'
import {
  classifyVoltageDrop,
  computeVoltageDrop,
  describeCableSegments,
  classifyCircuitMargin,
  VOLTAGE_DROP_THRESHOLDS,
  CABLE_STATUS_LABELS,
} from './cableVoltage.js'

describe('VOLTAGE_DROP_THRESHOLDS', () => {
  it('defines the industry-standard 5% / 10% thresholds', () => {
    expect(VOLTAGE_DROP_THRESHOLDS.warn).toBeCloseTo(0.05, 6)
    expect(VOLTAGE_DROP_THRESHOLDS.fail).toBeCloseTo(0.1, 6)
  })
})

describe('classifyVoltageDrop', () => {
  it('returns "draft" for null/undefined/non-finite', () => {
    expect(classifyVoltageDrop(null)).toBe('draft')
    expect(classifyVoltageDrop(undefined)).toBe('draft')
    expect(classifyVoltageDrop(NaN)).toBe('draft')
    expect(classifyVoltageDrop(-0.1)).toBe('draft')
  })

  it('returns "ok" below the 5% threshold', () => {
    expect(classifyVoltageDrop(0)).toBe('ok')
    expect(classifyVoltageDrop(0.01)).toBe('ok')
    expect(classifyVoltageDrop(0.0499)).toBe('ok')
  })

  it('returns "warn" at or above 5% but below 10%', () => {
    expect(classifyVoltageDrop(0.05)).toBe('warn')
    expect(classifyVoltageDrop(0.07)).toBe('warn')
    expect(classifyVoltageDrop(0.0999)).toBe('warn')
  })

  it('returns "fail" at or above 10%', () => {
    expect(classifyVoltageDrop(0.1)).toBe('fail')
    expect(classifyVoltageDrop(0.5)).toBe('fail')
  })
})

describe('computeVoltageDrop', () => {
  it('returns draft for missing inputs', () => {
    expect(computeVoltageDrop(null, 10, 50).status).toBe('draft')
    expect(computeVoltageDrop(0.1, null, 50).status).toBe('draft')
    expect(computeVoltageDrop(0.1, 10, 0).status).toBe('draft')
    expect(computeVoltageDrop(0.1, 10, -5).status).toBe('draft')
  })

  it('applies V = I × R', () => {
    const out = computeVoltageDrop(0.5, 10, 50)
    expect(out.voltageDropV).toBeCloseTo(5.0, 6)
    expect(out.fractionOfRated).toBeCloseTo(0.1, 6)
    expect(out.status).toBe('fail')
  })

  it('classifies a 2% drop as ok', () => {
    // 2V / 50V = 0.04
    const out = computeVoltageDrop(0.2, 10, 50)
    expect(out.fractionOfRated).toBeCloseTo(0.04, 6)
    expect(out.status).toBe('ok')
  })

  it('classifies a 7% drop as warn', () => {
    // 3.5V / 50V = 0.07
    const out = computeVoltageDrop(0.35, 10, 50)
    expect(out.fractionOfRated).toBeCloseTo(0.07, 6)
    expect(out.status).toBe('warn')
  })
})

describe('describeCableSegments', () => {
  it('returns empty array when station has no calculation result', () => {
    expect(describeCableSegments(null)).toEqual([])
    expect(describeCableSegments({ cables: {}, tr: {} })).toEqual([])
  })

  it('produces three segments with voltage drops', () => {
    const station = {
      tr: { ratedVoltage: 50, ratedCurrent: 10 },
      cables: {
        anodeCableSizeMm2: 16,
        anodeTailLengths: [5, 5, 5, 5],
        posMainLengthM: 100,
        posMainSizeMm2: 35,
        negMainLengthM: 80,
        negMainSizeMm2: 35,
        negSecLengthM: 20,
        negSecSizeMm2: 16,
      },
      lastCalcResult: {
        anodeTailParallelResOhm: 0.1,
        posMainCableResOhm: 0.05,
        negMainCableResOhm: 0.04,
      },
    }
    const segs = describeCableSegments(station)
    expect(segs).toHaveLength(3)
    expect(segs[0].id).toBe('anode-tail')
    expect(segs[1].id).toBe('pos-main')
    expect(segs[2].id).toBe('neg-main')
    // anode tail: 0.1 × 10 = 1.0V / 50V = 2% → ok
    expect(segs[0].voltageDropV).toBeCloseTo(1.0, 6)
    expect(segs[0].fractionOfRated).toBeCloseTo(0.02, 6)
    expect(segs[0].status).toBe('ok')
    // pos main: 0.05 × 10 = 0.5V / 50V = 1% → ok
    expect(segs[1].status).toBe('ok')
    // neg: 0.04 × 10 = 0.4V / 50V = 0.8% → ok
    expect(segs[2].status).toBe('ok')
  })

  it('flags a high-impedance cable as fail', () => {
    const station = {
      tr: { ratedVoltage: 20, ratedCurrent: 30 },
      cables: {
        anodeCableSizeMm2: 16,
        anodeTailLengths: [10],
        posMainLengthM: 500,
        posMainSizeMm2: 10,
        negMainLengthM: 100,
        negMainSizeMm2: 35,
        negSecLengthM: 0,
        negSecSizeMm2: 35,
      },
      lastCalcResult: {
        anodeTailParallelResOhm: 0.05,
        posMainCableResOhm: 0.5, // 0.5 × 30 = 15V / 20V = 75% → fail
        negMainCableResOhm: 0.05,
      },
    }
    const segs = describeCableSegments(station)
    expect(segs[1].status).toBe('fail')
    expect(segs[1].fractionOfRated).toBeGreaterThan(0.5)
  })

  it('sums anode tail lengths across anodes', () => {
    const station = {
      tr: { ratedVoltage: 50, ratedCurrent: 10 },
      cables: {
        anodeCableSizeMm2: 16,
        anodeTailLengths: [3, 4, 5, 6],
        posMainLengthM: 0,
        posMainSizeMm2: 35,
        negMainLengthM: 0,
        negMainSizeMm2: 35,
        negSecLengthM: 0,
        negSecSizeMm2: 35,
      },
      lastCalcResult: {
        anodeTailParallelResOhm: 0.01,
        posMainCableResOhm: 0,
        negMainCableResOhm: 0,
      },
    }
    const segs = describeCableSegments(station)
    expect(segs[0].lengthM).toBeCloseTo(18, 6)
  })
})

describe('classifyCircuitMargin', () => {
  it('returns draft when min TR voltage is unknown', () => {
    expect(classifyCircuitMargin(null)).toBe('draft')
    expect(classifyCircuitMargin({ minTRVoltage: 30 })).toBe('draft')
  })

  it('returns ok when required voltage is well below rated', () => {
    // Required 20V, rated 50V → margin 0.4 → ok
    expect(classifyCircuitMargin({ minTRVoltage: 20, trRatedVoltage: 50 })).toBe('ok')
  })

  it('returns warn when required is between 85% and 100% of rated', () => {
    // Required 45V, rated 50V → margin 0.9 → warn
    expect(classifyCircuitMargin({ minTRVoltage: 45, trRatedVoltage: 50 })).toBe('warn')
  })

  it('returns fail when required exceeds rated', () => {
    // Required 60V, rated 50V → margin 1.2 → fail
    expect(classifyCircuitMargin({ minTRVoltage: 60, trRatedVoltage: 50 })).toBe('fail')
  })
})

describe('CABLE_STATUS_LABELS', () => {
  it('has a label for every status key the classifier can produce', () => {
    expect(Object.keys(CABLE_STATUS_LABELS).sort()).toEqual(['draft', 'fail', 'ok', 'unknown', 'warn'])
  })
})
