import { describe, it, expect } from 'vitest'
import {
  calcSurfaceArea,
  calcTempCorrectedCurrentDensity,
  calcCurrentRequirement,
  calcDweellGroundbedResistance,
  calcShallowVerticalGroundbedResistance,
  calcGroundbedResistance,
  calcAnodeTailParallelResistance,
  calcCableResistances,
  calcTRCircuit,
  calcDesignLife,
  runStationCalculations,
} from './calculations.js'

// ─── Module 1: calcSurfaceArea ──────────────────────────────────────────────

describe('calcSurfaceArea', () => {
  it('computes surface area for standard 48" pipe, 292m', () => {
    const result = calcSurfaceArea(48, 292)
    expect(result).toBeCloseTo(1118.43, 1)
  })

  it('computes surface area for 48" pipe, 41480m', () => {
    const result = calcSurfaceArea(48, 41480)
    expect(result).toBeCloseTo(158877.93, 1)
  })

  it('returns 0 when length is 0', () => {
    expect(calcSurfaceArea(48, 0)).toBe(0)
  })

  it('returns 0 when OD is 0', () => {
    expect(calcSurfaceArea(0, 100)).toBe(0)
  })

  it('handles small diameter pipe', () => {
    const result = calcSurfaceArea(6, 100)
    expect(result).toBeGreaterThan(0)
    expect(result).toBeLessThan(calcSurfaceArea(48, 100))
  })
})

// ─── Module 2: calcTempCorrectedCurrentDensity ──────────────────────────────

describe('calcTempCorrectedCurrentDensity', () => {
  it('returns base density at 25°C', () => {
    expect(calcTempCorrectedCurrentDensity(0.1, 25)).toBeCloseTo(0.1, 10)
  })

  it('increases density above 25°C (NACE SP0169)', () => {
    const result = calcTempCorrectedCurrentDensity(0.1, 57.22)
    expect(result).toBeCloseTo(0.18055, 5)
  })

  it('decreases density below 25°C', () => {
    const result = calcTempCorrectedCurrentDensity(0.1, 10)
    expect(result).toBeCloseTo(0.0625, 4)
  })

  it('linearly scales with base density', () => {
    const half = calcTempCorrectedCurrentDensity(0.05, 50)
    const full = calcTempCorrectedCurrentDensity(0.10, 50)
    expect(half * 2).toBeCloseTo(full, 10)
  })
})

// ─── Module 3: calcCurrentRequirement ───────────────────────────────────────

describe('calcCurrentRequirement', () => {
  const tieInSegment = {
    id: 'seg-1',
    od: 48,
    lengthM: 292,
    opTempC: 57.22,
    currentDensityBase: 0.1,
    coatingEfficiency: 0.98,
  }

  const mainSegment = {
    id: 'seg-2',
    od: 48,
    lengthM: 41480,
    opTempC: 57.22,
    currentDensityBase: 0.1,
    coatingEfficiency: 0.98,
  }

  it('calculates single segment (tie-in)', () => {
    const result = calcCurrentRequirement([tieInSegment])
    expect(result.totalAreaM2).toBeCloseTo(1118.43, 1)
    expect(result.requiredA).toBeCloseTo(0.2019, 3)
    expect(result.designA).toBeCloseTo(0.2624, 3)
    expect(result.perSegment).toHaveLength(1)
  })

  it('calculates single segment (main line)', () => {
    const result = calcCurrentRequirement([mainSegment])
    expect(result.totalAreaM2).toBeCloseTo(158877.93, 1)
    expect(result.requiredA).toBeCloseTo(28.6854, 3)
    expect(result.designA).toBeCloseTo(37.2910, 3)
  })

  it('sums multiple segments', () => {
    const result = calcCurrentRequirement([tieInSegment, mainSegment])
    const expectedArea = 1118.43 + 158877.93
    const expectedReq = 0.2019 + 28.6863
    expect(result.totalAreaM2).toBeCloseTo(expectedArea, 0)
    expect(result.requiredA).toBeCloseTo(expectedReq, 2)
    expect(result.perSegment).toHaveLength(2)
  })

  it('returns zeros for empty segments', () => {
    const result = calcCurrentRequirement([])
    expect(result.totalAreaM2).toBe(0)
    expect(result.requiredA).toBe(0)
    expect(result.designA).toBe(0)
    expect(result.perSegment).toHaveLength(0)
  })
})

// ─── Module 4: calcDweellGroundbedResistance ────────────────────────────────

describe('calcDweellGroundbedResistance', () => {
  it('calculates typical deepwell resistance', () => {
    const rho = 361
    const L = 35
    const d = 0.25
    const h = 15 + L / 2
    const result = calcDweellGroundbedResistance(rho, L, d, h - L / 2)
    expect(result).toBeGreaterThan(0)
    expect(result).toBeLessThan(10)
  })

  it('returns 999 for zero active length', () => {
    expect(calcDweellGroundbedResistance(361, 0, 0.25, 15)).toBe(999)
  })

  it('returns 999 for zero borehole diameter', () => {
    expect(calcDweellGroundbedResistance(361, 35, 0, 15)).toBe(999)
  })

  it('increases resistance with higher resistivity', () => {
    const low = calcDweellGroundbedResistance(1000, 35, 0.25, 15)
    const high = calcDweellGroundbedResistance(10000, 35, 0.25, 15)
    expect(high).toBeGreaterThan(low)
  })

  it('returns at least 0.01 ohm for valid inputs', () => {
    const result = calcDweellGroundbedResistance(1, 100, 1, 1)
    expect(result).toBeGreaterThanOrEqual(0.01)
  })
})

// ─── Module 5: calcShallowVerticalGroundbedResistance ───────────────────────

describe('calcShallowVerticalGroundbedResistance', () => {
  it('calculates single anode resistance', () => {
    const result = calcShallowVerticalGroundbedResistance(361, 2.13, 0.25, 3, 1, 3)
    expect(result).toBeGreaterThan(0)
    expect(result).toBeLessThan(50)
  })

  it('reduces resistance with more anodes', () => {
    const single = calcShallowVerticalGroundbedResistance(361, 2.13, 0.25, 3, 1, 3)
    const multiple = calcShallowVerticalGroundbedResistance(361, 2.13, 0.25, 3, 5, 3)
    expect(multiple).toBeLessThan(single)
  })

  it('returns 999 for zero length', () => {
    expect(calcShallowVerticalGroundbedResistance(361, 0, 0.25, 3, 1, 3)).toBe(999)
  })

  it('returns 999 for zero anodes', () => {
    expect(calcShallowVerticalGroundbedResistance(361, 2.13, 0.25, 3, 0, 3)).toBe(999)
  })
})

// ─── Module 6: calcGroundbedResistance (router) ─────────────────────────────

describe('calcGroundbedResistance', () => {
  it('routes to deepwell formula', () => {
    const gb = { type: 'deepwell', startDepthM: 15, anodeLengthM: 2.13, anodeSpacingM: 1.5, boreholeDiaM: 0.25, cokeCoverM: 2.5, cementPlugM: 0.5 }
    const result = calcGroundbedResistance(gb, 361, 9, {})
    expect(result.resistanceOhm).toBeGreaterThan(0)
    expect(result.activeLengthM).toBeGreaterThan(0)
    expect(result.totalDrillDepthM).toBeGreaterThan(0)
  })

  it('routes to shallow vertical formula', () => {
    const gb = { type: 'shallow_vertical', startDepthM: 3, anodeLengthM: 2.13, anodeSpacingM: 1.5, boreholeDiaM: 0.25 }
    const result = calcGroundbedResistance(gb, 361, 12, {})
    expect(result.resistanceOhm).toBeGreaterThan(0)
    expect(result.activeLengthM).toBe(2.13)
  })

  it('returns zeros for unknown type', () => {
    const gb = { type: 'unknown', startDepthM: 0, anodeLengthM: 0, anodeSpacingM: 0, boreholeDiaM: 0 }
    const result = calcGroundbedResistance(gb, 361, 1, {})
    expect(result.resistanceOhm).toBe(0)
    expect(result.activeLengthM).toBe(0)
    expect(result.totalDrillDepthM).toBe(0)
  })
})

// ─── Module 7: calcAnodeTailParallelResistance ──────────────────────────────

describe('calcAnodeTailParallelResistance', () => {
  it('calculates parallel resistance for multiple tails', () => {
    const tails = [25, 30, 35, 40, 45, 50, 55, 60, 65]
    const result = calcAnodeTailParallelResistance(tails, 16)
    expect(result).toBeGreaterThan(0)
    expect(result).toBeLessThan(0.05)
  })

  it('returns 0 for empty tails', () => {
    expect(calcAnodeTailParallelResistance([], 16)).toBe(0)
  })

  it('returns 0 for all-zero tails', () => {
    expect(calcAnodeTailParallelResistance([0, 0, 0], 16)).toBe(0)
  })

  it('returns 0 for unknown cable spec', () => {
    expect(calcAnodeTailParallelResistance([25, 30], 999)).toBe(0)
  })

  it('lower resistance with more parallel tails', () => {
    const one = calcAnodeTailParallelResistance([30], 16)
    const three = calcAnodeTailParallelResistance([30, 30, 30], 16)
    expect(three).toBeLessThan(one)
  })
})

// ─── Module 8: calcCableResistances ─────────────────────────────────────────

describe('calcCableResistances', () => {
  const cables = {
    anodeTailLengths: [25, 30, 35, 40, 45, 50, 55, 60, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    anodeCableSizeMm2: 16,
    posMainLengthM: 180,
    posMainSizeMm2: 35,
    negMainLengthM: 100,
    negMainSizeMm2: 35,
    negSecLengthM: 60,
    negSecSizeMm2: 25,
  }

  it('calculates all cable resistance components', () => {
    const result = calcCableResistances(cables, 9)
    expect(result.anodeTailParallelOhm).toBeGreaterThan(0)
    expect(result.posMainOhm).toBeGreaterThan(0)
    expect(result.negMainOhm).toBeGreaterThan(0)
    expect(result.negSecOhm).toBeGreaterThan(0)
    expect(result.totalCableOhm).toBeGreaterThan(0)
    expect(result.totalCableOhm).toBeCloseTo(result.totalPositiveOhm + result.totalNegativeOhm, 8)
  })

  it('only includes active tails based on numAnodes', () => {
    const with9 = calcCableResistances(cables, 9)
    const with5 = calcCableResistances(cables, 5)
    expect(with9.anodeTailParallelOhm).toBeLessThan(with5.anodeTailParallelOhm)
  })
})

// ─── Module 9: calcTRCircuit ────────────────────────────────────────────────

describe('calcTRCircuit', () => {
  it('calculates circuit with typical values', () => {
    const result = calcTRCircuit(0.3722, 0.160, 2, 0.055, 30, 25)
    expect(result.totalCircuitResOhm).toBeGreaterThan(0)
    expect(result.minTRVoltage).toBeGreaterThan(0)
    expect(result.backEMFResOhm).toBeGreaterThan(0)
    expect(result.maxCircuitRes70).toBeGreaterThan(0)
    expect(result.maxCircuitRes90).toBeGreaterThan(0)
    expect(result.dcPowerW).toBe(750)
  })

  it('handles zero TR current', () => {
    const result = calcTRCircuit(0.5, 0.1, 2, 0.05, 30, 0)
    expect(result.backEMFResOhm).toBe(0)
  })

  it('computes AC power correctly', () => {
    const result = calcTRCircuit(0.3722, 0.160, 2, 0.055, 30, 25)
    expect(result.dcPowerW).toBe(750)
    expect(result.acInputKVA).toBeCloseTo(1.1719, 3)
    expect(result.acInputCurrentA).toBeGreaterThan(0)
  })
})

// ─── Module 10: calcDesignLife ───────────────────────────────────────────────

describe('calcDesignLife', () => {
  it('calculates 25+ year design life for typical deepwell', () => {
    const result = calcDesignLife(9, 38.6, 0.45, 25)
    expect(result).toBeCloseTo(30.88, 1)
  })

  it('returns 0 for zero consumption rate', () => {
    expect(calcDesignLife(9, 38.6, 0, 25)).toBe(0)
  })

  it('returns 0 for zero TR current', () => {
    expect(calcDesignLife(9, 38.6, 0.45, 0)).toBe(0)
  })

  it('scales linearly with anode count', () => {
    const half = calcDesignLife(10, 38.6, 0.45, 25)
    const double = calcDesignLife(20, 38.6, 0.45, 25)
    expect(double).toBeCloseTo(half * 2, 5)
  })
})

// ─── Master Orchestrator: runStationCalculations ────────────────────────────

describe('runStationCalculations', () => {
  const station = {
    id: 'test-station-1',
    pipelineSegments: [{
      id: 'seg-1',
      name: '48" Gas Sales Pipeline',
      od: 48,
      wallThk: 0.875,
      lengthM: 292,
      opTempC: 57.22,
      currentDensityBase: 0.1,
      coatingType: 'fusion_bonded_epoxy',
      coatingEfficiency: 0.98,
    }],
    groundbed: {
      type: 'deepwell',
      startDepthM: 15,
      anodeLengthM: 2.13,
      inactiveLenM: 1.5,
      anodeSpacingM: 1.5,
      boreholeDiaM: 0.25,
      numHoles: 1,
      cokeCoverM: 2.5,
      cementPlugM: 0.5,
    },
    anodeSpec: { id: 'HSCI_TA4', type: 'HSCI', label: 'High-Silicon Cast Iron Tubular TA-4', weightKg: 38.6, consumptionRate: 0.45, outputAmps: 3.56 },
    proposedAnodes: 9,
    cables: {
      anodeTailLengths: [25, 30, 35, 40, 45, 50, 55, 60, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
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

  it('returns all calculation fields', () => {
    const result = runStationCalculations(station, 25)
    expect(result.stationId).toBe('test-station-1')
    expect(result.calculatedAt).toBeTruthy()
    expect(result.totalSurfaceAreaM2).toBeGreaterThan(0)
    expect(result.requiredCurrentA).toBeGreaterThan(0)
    expect(result.designCurrentA).toBeGreaterThan(0)
    expect(result.groundbedResistanceOhm).toBeGreaterThan(0)
    expect(result.activeLengthM).toBeGreaterThan(0)
    expect(result.totalDrillDepthM).toBeGreaterThan(0)
    expect(result.anodeTailParallelResOhm).toBeGreaterThan(0)
    expect(result.posMainCableResOhm).toBeGreaterThan(0)
    expect(result.totalCableResOhm).toBeGreaterThan(0)
    expect(result.totalCircuitResistanceOhm).toBeGreaterThan(0)
    expect(result.minTRVoltage).toBeGreaterThan(0)
    expect(result.designLifeYears).toBeGreaterThan(0)
  })

  it('matches the Excel reference values (Station 1: Deepwell, Tie-In)', () => {
    const result = runStationCalculations(station, 25)
    expect(result.totalSurfaceAreaM2).toBeCloseTo(1118.43, 1)
    expect(result.designLifeYears).toBeCloseTo(30.88, 1)
  })

  it('uses system design life when station design life is not set', () => {
    const st = { ...station, designLifeYears: 0 }
    const result = runStationCalculations(st, 30)
    expect(result.targetDesignLifeYears).toBe(30)
  })

  it('prefers station design life over system design life', () => {
    const st = { ...station, designLifeYears: 20 }
    const result = runStationCalculations(st, 30)
    expect(result.targetDesignLifeYears).toBe(20)
  })
})
