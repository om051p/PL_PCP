import { describe, it, expect } from 'vitest'
import {
  calcSurfaceArea,
  calcTempCorrectedCurrentDensity,
  calcCurrentRequirement,
  calcDweellGroundbedResistance,
  calcAnodeTailParallelResistance,
  calcTRCircuit,
  calcDesignLife,
  calcCokeRequirement,
  runStationCalculations,
} from '../modules/calculations.js'
import { THRESHOLDS, CABLE_SPECS } from '../../constants/index.js'

// ─── Dataset 1: Standard Deepwell Tie-In ────────────────────────────────
const TIEData = {
  station: {
    id: 'ds1',
    pipelineSegments: [
      {
        id: 'seg-ds1',
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
  },
  life: 25,
  excelExpected: {
    totalSurfaceAreaM2: 1118.43,
    requiredCurrentA: 0.2053,
    designCurrentA: 0.2669,
    groundbedResistanceOhm: 0.1135,
    activeLengthM: 31.17,
    totalDrillDepthM: 49.17,
    anodeTailParallelResOhm: 0.007627,
    posMainCableResOhm: 0.1186,
    negMainCableResOhm: 0.1291,
    totalCableResOhm: 0.2553,
    backEMFResistanceOhm: 0.08,
    totalCircuitResistanceOhm: 0.5039,
    minTRVoltage: 14.6,
    designLifeYears: 26.25,
  },
}

// ─── Dataset 2: Standard Deepwell Main Line ─────────────────────────────
const MAINData = {
  station: {
    id: 'ds2',
    pipelineSegments: [
      {
        id: 'seg-ds2',
        od: 48,
        lengthM: 41480,
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
  },
  life: 25,
  excelExpected: {
    totalSurfaceAreaM2: 158877.93,
    requiredCurrentA: 29.1643,
    designCurrentA: 37.9136,
  },
}

// ─── Dataset 3: Shallow Vertical Groundbed ──────────────────────────────
const SHALLOWData = {
  station: {
    id: 'ds3',
    pipelineSegments: [
      {
        id: 'seg-ds3',
        od: 48,
        lengthM: 292,
        opTempC: 57.22,
        currentDensityBase: 0.1,
        coatingEfficiency: 0.98,
      },
    ],
    groundbed: {
      type: 'shallow_vertical',
      startDepthM: 3,
      anodeLengthM: 2.13,
      anodeSpacingM: 1.5,
      boreholeDiaM: 0.25,
    },
    anodeSpec: { weightKg: 38.6, consumptionRate: 0.45, outputAmps: 3.56 },
    proposedAnodes: 12,
    cables: {
      anodeTailLengths: Array(12).fill(30),
      anodeCableSizeMm2: 16,
      posMainLengthM: 180,
      posMainSizeMm2: 35,
      negMainLengthM: 100,
      negMainSizeMm2: 35,
      negSecLengthM: 60,
      negSecSizeMm2: 25,
    },
    tr: { ratedVoltage: 50, ratedCurrent: 40, backEMF: 2, structureResistance: 0.055 },
    soilResistivityOhmCm: 5000,
    actualRemotenesM: 56,
    requiredRemotenesM: 20,
    designLifeYears: 25,
  },
  life: 25,
}

// ─── Dataset 4: High Resistivity Edge Case ──────────────────────────────
const HIGH_RHO_Data = {
  station: {
    ...JSON.parse(JSON.stringify(TIEData.station)),
    soilResistivityOhmCm: 80000,
    proposedAnodes: 20,
    groundbed: {
      ...TIEData.station.groundbed,
      startDepthM: 30,
      anodeLengthM: 2.13,
      anodeSpacingM: 1.5,
      boreholeDiaM: 0.25,
      cokeCoverM: 3.0,
      cementPlugM: 1.0,
    },
  },
  life: 25,
}

// ─── Dataset 5: Undersized TR ───────────────────────────────────────────
const UNDERSIZED_TR_Data = {
  station: {
    ...JSON.parse(JSON.stringify(TIEData.station)),
    tr: { ratedVoltage: 10, ratedCurrent: 5, backEMF: 2, structureResistance: 0.055 },
    proposedAnodes: 4,
  },
  life: 25,
}

// ─── Dataset 6: Zero Values ─────────────────────────────────────────────
const ZERO_Data = {
  station: {
    ...JSON.parse(JSON.stringify(TIEData.station)),
    pipelineSegments: [],
    proposedAnodes: 0,
  },
  life: 25,
}

// ═════════════════════════════════════════════════════════════════════════
//  MODULE-LEVEL TESTS — Verified Against Hand Calculations
// ═════════════════════════════════════════════════════════════════════════

describe('Hand Calculation Verification — Module Level', () => {
  // 1. Surface Area: A = π × D × L
  // D = 48in × 0.0254 = 1.2192m, L = 292m
  // A = π × 1.2192 × 292 = 1,118.43 m²
  it('calcSurfaceArea — 48in, 292m = 1118.43 m²', () => {
    const result = calcSurfaceArea(48, 292)
    expect(result).toBeCloseTo(1118.43, 1)
    const variance = (Math.abs(result - 1118.43) / 1118.43) * 100
    expect(variance).toBeLessThan(0.1)
  })

  // 2. Temperature-Corrected Current Density
  // i_T = 0.1 × 1.25^((57.22 - 30) / 10) = 0.1 × 1.83565 = 0.183565 mA/m²
  it('calcTempCorrectedCurrentDensity — 0.1, 57.22°C = 0.183565 mA/m²', () => {
    const result = calcTempCorrectedCurrentDensity(0.1, 57.22)
    expect(result).toBeCloseTo(0.183565, 5)
  })

  // 3. Current Requirement (bare pipe, no CE)
  // I_req = (1118.43 × 0.183565) / 1000 = 0.20530 A
  // I_design = 0.20530 × 1.30 = 0.26689 A
  it('calcCurrentRequirement — bare pipe current = 0.2053A, design = 0.2669A', () => {
    const seg = { id: 'h1', od: 48, lengthM: 292, opTempC: 57.22, currentDensityBase: 0.1 }
    const result = calcCurrentRequirement([seg])
    expect(result.requiredA).toBeCloseTo(0.2053, 4)
    expect(result.designA).toBeCloseTo(0.2669, 4)
    expect(result.totalAreaM2).toBeCloseTo(1118.43, 1)
  })

  // 4. Deepwell Groundbed Resistance (Dwight, 1936)
  // R_G = ρ/(2πL) × [ln(8L/d) − 1 + L/(4h)]
  // ρ = 3.61 Ω·m, L = 31.17m, d = 0.25m, h = 30.585m
  // R_G = 0.1135 Ω
  it('calcDweellGroundbedResistance — Dwight formula = 0.1135Ω', () => {
    const rho = 361
    const activeLength = 9 * 2.13 + 8 * 1.5 // 31.17m
    const result = calcDweellGroundbedResistance(rho, activeLength, 0.25, 15)
    expect(result).toBeCloseTo(0.1135, 4)
  })

  // 5. Anode Tail Parallel Resistance
  // 1 / Σ(1 / (L_i × 0.001673)) for 9 tails
  it('calcAnodeTailParallelResistance — 9 tails = 0.007627Ω', () => {
    const tails = [25, 30, 35, 40, 45, 50, 55, 60, 65]
    const result = calcAnodeTailParallelResistance(tails, 16)
    expect(result).toBeCloseTo(0.007627, 5)
  })

  // 6. Positive Main Cable: R = 180 × 6.59e-4 = 0.11862Ω
  it('positive main cable resistance = 0.1186Ω', () => {
    const spec = CABLE_SPECS[35]
    const result = 180 * spec.resistanceOhmPerM
    expect(result).toBeCloseTo(0.1186, 4)
  })

  // 7. Design Life: Y = (9 × 38.6 × 0.85) / (0.45 × 25) = 26.25 years
  it('calcDesignLife — 9 anodes = 26.25 years', () => {
    const result = calcDesignLife(9, 38.6, 0.45, 25)
    expect(result).toBeCloseTo(26.25, 2)
  })
})

// ═════════════════════════════════════════════════════════════════════════
//  GOLDEN DATASET REGRESSION — Verified Against Excel Reference
// ═════════════════════════════════════════════════════════════════════════

describe('Golden Dataset Regression — Excel Reference Comparison', () => {
  it('Dataset 1: Deepwell Tie-In — all output fields match Excel (±0.5%)', () => {
    const result = runStationCalculations(TIEData.station, TIEData.life)
    const checks = Object.entries(TIEData.excelExpected).map(([key, expected]) => {
      const actual = result[key]
      const pct = expected !== 0 ? Math.abs((actual - expected) / expected) * 100 : 0
      return { key, actual, expected, pct, pass: pct < 0.5 }
    })
    for (const c of checks) {
      expect(c.pass).toBe(true)
    }
  })

  it('Dataset 2: Deepwell Main Line — current matches Excel (±0.5%)', () => {
    const result = runStationCalculations(MAINData.station, MAINData.life)
    Object.entries(MAINData.excelExpected).forEach(([key, expected]) => {
      const actual = result[key]
      const pct = Math.abs((actual - expected) / expected) * 100
      expect(pct).toBeLessThan(0.5)
    })
  })

  it('Dataset 3: Shallow Vertical — groundbed resistance > deepwell equivalent', () => {
    const result = runStationCalculations(SHALLOWData.station, SHALLOWData.life)
    expect(result.groundbedResistanceOhm).toBeGreaterThan(
      TIEData.excelExpected.groundbedResistanceOhm,
    )
    expect(result.groundbedResistanceOhm).toBeGreaterThan(0)
    expect(result.designLifeYears).toBeGreaterThan(20)
  })

  it('Dataset 4: High Resistivity — groundbed resistance elevated', () => {
    const result = runStationCalculations(HIGH_RHO_Data.station, HIGH_RHO_Data.life)
    expect(result.groundbedResistanceOhm).toBeGreaterThan(10)
    expect(result.groundbedResistanceOhm).toBeGreaterThan(
      2 * TIEData.excelExpected.groundbedResistanceOhm,
    )
  })

  it('Dataset 5: Small TR — design life extended due to low rated current', () => {
    const result = runStationCalculations(UNDERSIZED_TR_Data.station, UNDERSIZED_TR_Data.life)
    expect(result.totalCircuitResistanceOhm).toBeGreaterThan(0)
    expect(result.designLifeYears).toBeGreaterThan(25)
    expect(result.requiredCurrentA).toBeGreaterThan(0)
  })

  it('Dataset 6: Zero Values — controlled degradation (no crash)', () => {
    const result = runStationCalculations(ZERO_Data.station, ZERO_Data.life)
    expect(result.requiredCurrentA).toBe(0)
    expect(result.designCurrentA).toBe(0)
    expect(result.designLifeYears).toBe(0)
  })
})

// ═════════════════════════════════════════════════════════════════════════
//  ENGINEERING ACCEPTANCE — Verify Formula Implementation Correctness
// ═════════════════════════════════════════════════════════════════════════

describe('Engineering Acceptance — Formula Correctness', () => {
  // Surface Area: verify πDL formula with known geometric properties
  it('surface area scales linearly with length', () => {
    const r1 = calcSurfaceArea(48, 100)
    const r2 = calcSurfaceArea(48, 200)
    expect(r2).toBeCloseTo(r1 * 2, 8)
  })

  it('surface area scales linearly with diameter', () => {
    const r1 = calcSurfaceArea(24, 100)
    const r2 = calcSurfaceArea(48, 100)
    expect(r2).toBeCloseTo(r1 * 2, 8)
  })

  // Temperature correction: verify exponential formula
  it('temperature correction follows exponential 1.25^((T-30)/10)', () => {
    const t20 = calcTempCorrectedCurrentDensity(1, 20)
    const t30 = calcTempCorrectedCurrentDensity(1, 30)
    const t40 = calcTempCorrectedCurrentDensity(1, 40)
    expect(t30).toBe(1)
    expect(t40).toBeCloseTo(1.25, 10)
    expect(t20).toBeCloseTo(0.8, 10)
  })

  // Current: verify spare factor = 1.3
  it('design current = required × 1.3', () => {
    const result = calcCurrentRequirement([
      { id: 't', od: 48, lengthM: 100, opTempC: 25, currentDensityBase: 0.1 },
    ])
    expect(result.designA).toBeCloseTo(result.requiredA * THRESHOLDS.SPARE_FACTOR, 10)
  })

  // Groundbed: verify Dwight formula monotonicity
  it('Dwight resistance increases with soil resistivity', () => {
    const low = calcDweellGroundbedResistance(100, 31.17, 0.25, 15)
    const high = calcDweellGroundbedResistance(10000, 31.17, 0.25, 15)
    expect(high).toBeGreaterThan(low)
    expect(high / low).toBeCloseTo(100, 0)
  })

  it('Dwight resistance decreases with active length', () => {
    const short = calcDweellGroundbedResistance(361, 10, 0.25, 15)
    const long = calcDweellGroundbedResistance(361, 50, 0.25, 15)
    expect(long).toBeLessThan(short)
  })

  // Cable resistance: verify parallel formula
  it('anode tail parallel resistance < any single tail', () => {
    const single = calcAnodeTailParallelResistance([30], 16)
    const parallel = calcAnodeTailParallelResistance([30, 30], 16)
    expect(parallel).toBeLessThan(single)
    expect(parallel).toBeCloseTo(single / 2, 4)
  })

  // TR Circuit: R_T = R_G + R_c + R_emf + R_s  (SAES-X-600 §5.2.5: R_emf = V_emf/I)
  it('total circuit resistance = sum of all components', () => {
    const result = calcTRCircuit(0.1135, 0.2553, 2, 0.055, 30, 25)
    const expected = 0.1135 + 0.2553 + 2 / 25 + 0.055
    expect(result.totalCircuitResOhm).toBeCloseTo(expected, 10)
  })

  it('min TR voltage = R_T × I_rated + V_emf', () => {
    const result = calcTRCircuit(0.1135, 0.2553, 2, 0.055, 30, 25)
    const expected = (0.1135 + 0.2553 + 2 / 25 + 0.055) * 25 + 2
    expect(result.minTRVoltage).toBeCloseTo(expected, 10)
  })

  // ─── Coke Requirement: N = CEILING(L × 3.28 × 39.2 / 50) ─────────────

  it('THRESHOLDS.COKE_BACKFILL_CONTINGENCY = 1.15 (matches Excel Cal.(DW) F213)', () => {
    expect(THRESHOLDS.COKE_BACKFILL_CONTINGENCY).toBe(1.15)
  })

  it('calcCokeRequirement — 35m active length = 91 base, 105 with contingency (matches Excel Cal.(DW) F212/F213)', () => {
    const result = calcCokeRequirement(35)
    expect(result.bagsBase).toBe(91)
    expect(result.bagsWithContingency).toBe(105)
  })

  it('calcCokeRequirement — 0m = 0 bags', () => {
    const result = calcCokeRequirement(0)
    expect(result.bagsBase).toBe(0)
    expect(result.bagsWithContingency).toBe(0)
  })

  it('calcCokeRequirement — scales linearly with length', () => {
    const r10 = calcCokeRequirement(10)
    const r20 = calcCokeRequirement(20)
    expect(r20.bagsBase).toBeGreaterThan(r10.bagsBase)
    // 10m: ceil(10×3.28×39.2/50) = ceil(25.72) = 26
    // 20m: ceil(20×3.28×39.2/50) = ceil(51.43) = 52
    expect(r10.bagsBase).toBe(26)
    expect(r20.bagsBase).toBe(52)
  })

  it('runStationCalculations includes cokeBagsBase and cokeBagsWithContingency', () => {
    const result = runStationCalculations(TIEData.station, TIEData.life)
    expect(result.cokeBagsBase).toBeDefined()
    expect(result.cokeBagsWithContingency).toBeDefined()
    expect(result.cokeBagsBase).toBeGreaterThan(0)
    expect(result.cokeBagsWithContingency).toBeGreaterThanOrEqual(result.cokeBagsBase)
  })

  // Design Life: Y = N×W / (C×I)
  it('design life halves when current doubles', () => {
    const r1 = calcDesignLife(9, 38.6, 0.45, 25)
    const r2 = calcDesignLife(9, 38.6, 0.45, 50)
    expect(r2).toBeCloseTo(r1 / 2, 5)
  })

  it('design life scales linearly with anode count', () => {
    const r1 = calcDesignLife(5, 38.6, 0.45, 25)
    const r2 = calcDesignLife(10, 38.6, 0.45, 25)
    expect(r2).toBeCloseTo(r1 * 2, 5)
  })
})

// ═════════════════════════════════════════════════════════════════════════
//  VARIANCE ANALYSIS — Per-Parameter Accuracy Report
// ═════════════════════════════════════════════════════════════════════════

describe('Variance Analysis — Parameter-Level Accuracy', () => {
  const result = runStationCalculations(TIEData.station, TIEData.life)
  const expected = TIEData.excelExpected
  const variances = []

  Object.entries(expected).forEach(([key, exp]) => {
    const act = result[key]
    const absErr = Math.abs(act - exp)
    const relErr = exp !== 0 ? (absErr / exp) * 100 : 0
    const tol = key.includes('Life')
      ? 0.1
      : key.includes('Voltage') || key.includes('Resistance')
        ? 0.005
        : 0.005
    variances.push({
      key,
      expected: exp,
      actual: act,
      absErr,
      relErr: Number(relErr.toFixed(4)),
      pass: relErr < tol * 100 || absErr < 0.001,
    })
  })

  it('all parameters within engineering tolerance', () => {
    const failures = variances.filter((v) => !v.pass)
    expect(failures.length).toBe(0)
  })

  it('generates variance report — all parameters accounted for', () => {
    expect(variances.length).toBe(Object.keys(expected).length)
  })

  it('maximum variance across all parameters < 0.5%', () => {
    const maxVar = Math.max(...variances.map((v) => v.relErr))
    expect(maxVar).toBeLessThan(0.5)
  })

  it('surface area accuracy < 0.01%', () => {
    const sa = variances.find((v) => v.key === 'totalSurfaceAreaM2')
    expect(sa.relErr).toBeLessThan(0.01)
  })

  it('groundbed resistance accuracy < 0.1%', () => {
    const rg = variances.find((v) => v.key === 'groundbedResistanceOhm')
    expect(rg.relErr).toBeLessThan(0.1)
  })

  it('design life accuracy < 0.1%', () => {
    const life = variances.find((v) => v.key === 'designLifeYears')
    expect(life.relErr).toBeLessThan(0.1)
  })
})
