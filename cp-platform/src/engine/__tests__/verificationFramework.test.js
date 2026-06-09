import { describe, it, expect } from 'vitest'
import { getTolerance, verifyGoldenDataset } from '../../test-utils/verificationFramework.js'

describe('getTolerance()', () => {
  it('returns electrical tolerance for voltage fields', () => {
    const tol = getTolerance('minTRVoltage')
    expect(tol.relative).toBe(0.005)
    expect(tol.absolute).toBe(0.001)
  })

  it('returns dimension tolerance for area fields', () => {
    const tol = getTolerance('totalSurfaceAreaM2')
    expect(tol.relative).toBe(0.001)
    expect(tol.absolute).toBe(0.01)
  })

  it('returns life tolerance for life fields', () => {
    const tol = getTolerance('designLifeYears')
    expect(tol.relative).toBe(0.005)
    expect(tol.absolute).toBe(0.1)
  })

  it('returns current tolerance for current fields', () => {
    const tol = getTolerance('requiredCurrentA')
    expect(tol.relative).toBe(0.005)
    expect(tol.absolute).toBe(0.0001)
  })

  it('falls back to electrical for unknown fields', () => {
    const tol = getTolerance('unknownField')
    expect(tol.relative).toBe(0.005)
    expect(tol.absolute).toBe(0.001)
  })
})

describe('verifyGoldenDataset()', () => {
  it('verifies Dataset 1 (Deepwell Tie-In) against golden values', () => {
    const station = {
      pipelineSegments: [
        {
          id: 'seg-1',
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
        cokeCoverM: 2.5,
        cementPlugM: 0.5,
      },
      anodeSpec: { weightKg: 38.6, consumptionRate: 0.45, outputAmps: 3.56 },
      proposedAnodes: 9,
      cables: {
        anodeTailLengths: [25, 30, 35, 40, 45, 50, 55, 60, 65],
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
      actualRemotenesM: 56,
      requiredRemotenesM: 20,
      designLifeYears: 25,
    }

    const expected = {
      totalSurfaceAreaM2: 1118.43,
      requiredCurrentA: 0.2053,
      designCurrentA: 0.2669,
      groundbedResistanceOhm: 0.1135,
      designLifeYears: 26.25,
    }

    const report = verifyGoldenDataset('Deepwell Tie-In', station, 25, expected)
    expect(report.allPassed).toBe(true)
    expect(report.module).toBe('Deepwell Tie-In')
    expect(report.results.length).toBe(Object.keys(expected).length)
  })

  it('fails when golden values do not match', () => {
    const station = {
      pipelineSegments: [
        {
          id: 'seg-1',
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
        cokeCoverM: 2.5,
        cementPlugM: 0.5,
      },
      anodeSpec: { weightKg: 38.6, consumptionRate: 0.45, outputAmps: 3.56 },
      proposedAnodes: 9,
      cables: {
        anodeTailLengths: [25, 30, 35, 40, 45, 50, 55, 60, 65],
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
      actualRemotenesM: 56,
      requiredRemotenesM: 20,
      designLifeYears: 25,
    }

    const report = verifyGoldenDataset('Bad Dataset', station, 25, { totalSurfaceAreaM2: 99999 })
    expect(report.allPassed).toBe(false)
  })
})
