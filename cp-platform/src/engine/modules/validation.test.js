import { describe, it, expect } from 'vitest'
import { validateStation, StationSchema } from './validation.js'

const validStation = {
  pipelineSegments: [
    {
      od: 48,
      lengthM: 292,
      opTempC: 57.22,
      currentDensityBase: 0.1,
      coatingEfficiency: 0.98,
    },
  ],
  groundbed: {
    type: 'deepwell',
    startDepthM: 15,
    anodeLengthM: 2.13,
    anodeSpacingM: 1.5,
    boreholeDiaM: 0.25,
  },
  anodeSpec: { weightKg: 38.6, consumptionRate: 0.45 },
  proposedAnodes: 9,
  cables: {
    anodeTailLengths: [25, 30, 35],
    anodeCableSizeMm2: 16,
    posMainLengthM: 180,
    posMainSizeMm2: 35,
    negMainLengthM: 100,
    negMainSizeMm2: 35,
    negSecLengthM: 60,
    negSecSizeMm2: 25,
  },
  tr: { ratedVoltage: 30, ratedCurrent: 25, backEMF: 2, structureResistance: 0.055 },
  soilResistivityOhmCm: 361,
  designLifeYears: 25,
}

describe('StationSchema', () => {
  it('validates a correct station object', () => {
    const result = StationSchema.safeParse(validStation)
    expect(result.success).toBe(true)
  })

  it('rejects negative pipe OD', () => {
    const bad = {
      ...validStation,
      pipelineSegments: [{ ...validStation.pipelineSegments[0], od: -48 }],
    }
    const result = StationSchema.safeParse(bad)
    expect(result.success).toBe(false)
  })

  it('rejects missing required fields', () => {
    const result = StationSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects invalid groundbed type', () => {
    const bad = { ...validStation, groundbed: { ...validStation.groundbed, type: 'invalid' } }
    const result = StationSchema.safeParse(bad)
    expect(result.success).toBe(false)
  })

  it('rejects zero soil resistivity', () => {
    const bad = { ...validStation, soilResistivityOhmCm: 0 }
    const result = StationSchema.safeParse(bad)
    expect(result.success).toBe(false)
  })

  it('accepts distributed groundbed type', () => {
    const distributed = {
      ...validStation,
      groundbed: { ...validStation.groundbed, type: 'distributed' },
    }
    const result = StationSchema.safeParse(distributed)
    expect(result.success).toBe(true)
  })
})

describe('validateStation()', () => {
  it('returns valid for correct data', () => {
    const result = validateStation(validStation)
    expect(result.valid).toBe(true)
  })

  it('returns errors for invalid data', () => {
    const result = validateStation({})
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('has descriptive error messages', () => {
    const result = validateStation({})
    result.errors.forEach((err) => {
      expect(err.path).toBeTruthy()
      expect(err.message).toBeTruthy()
    })
  })
})
