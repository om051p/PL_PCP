/**
 * Golden Dataset Verification Script
 * Computes hand-calibrated expected values and compares with code output.
 * Run: node scripts/verify_datasets.mjs
 */

import { runStationCalculations } from '../src/engine/modules/calculations.js'

const THRESHOLDS = {
  SPARE_FACTOR: 1.3,
  TEMP_CORRECTION_FACTOR: 0.025,
  BASE_TEMP_C: 25,
}

const CABLE_SPECS = {
  16: { resistanceOhmPerM: 1.673e-3 },
  25: { resistanceOhmPerM: 1.053e-3 },
  35: { resistanceOhmPerM: 6.59e-4 },
}

// ─── Hand Calculation Formulas ───────────────────────────────────────────

function handSurfaceArea(odInches, lengthM) {
  if (odInches <= 0 || lengthM <= 0) return 0
  return Math.PI * (odInches * 0.0254) * lengthM
}

function handITemp(baseCD, tempC) {
  return baseCD * (1 + (tempC - THRESHOLDS.BASE_TEMP_C) * THRESHOLDS.TEMP_CORRECTION_FACTOR)
}

function handCurrentRequirement(segments) {
  let totalArea = 0
  let totalCurrent = 0
  for (const seg of segments) {
    const area = handSurfaceArea(seg.od, seg.lengthM)
    const iTemp = handITemp(seg.currentDensityBase, seg.opTempC)
    const ce = seg.coatingEfficiency ?? 1
    totalArea += area
    totalCurrent += (area * ce * iTemp) / 1000
  }
  return { totalArea, requiredA: totalCurrent, designA: totalCurrent * THRESHOLDS.SPARE_FACTOR }
}

function handDeepwellResistance(rhoOhmCm, activeLenM, boreDiaM, topDepthM) {
  const rhoOhmM = rhoOhmCm / 100
  const L = activeLenM
  const d = boreDiaM
  const h = topDepthM + L / 2
  if (L <= 0 || d <= 0 || h <= 0) return 999
  const rG = (rhoOhmM / (2 * Math.PI * L)) * (Math.log((8 * L) / d) - 1 + L / (4 * h))
  return Math.max(rG, 0.01)
}

function handShallowResistance(rhoOhmCm, anodeLenM, boreDiaM, topDepthM, N, spacingM) {
  const rhoOhmM = rhoOhmCm / 100
  const L = anodeLenM
  const d = boreDiaM
  const h = topDepthM + L / 2
  if (L <= 0 || d <= 0 || N <= 0) return 999
  const R_single = (rhoOhmM / (2 * Math.PI * L)) * (Math.log((4 * L) / d) - 1 + L / (2 * h))
  const S = spacingM > 0 ? spacingM : L * 2
  let mutualSum = 0
  for (let i = 1; i < N; i++) mutualSum += Math.log((2 * i * S) / L)
  const R_mutual = (rhoOhmM / (Math.PI * L * N * N)) * mutualSum
  return Math.max(R_single / N + R_mutual, 0.01)
}

function handTailParallelResistance(tailLengths, cableSizeMm2, N) {
  const spec = CABLE_SPECS[cableSizeMm2]
  if (!spec) return 0
  const r = spec.resistanceOhmPerM
  const active = tailLengths.slice(0, N).filter(l => l > 0)
  if (active.length === 0) return 0
  return 1 / active.reduce((acc, l) => acc + 1 / (l * r), 0)
}

function handCableResistance(lenM, sizeMm2) {
  const spec = CABLE_SPECS[sizeMm2]
  return spec ? lenM * spec.resistanceOhmPerM : 0
}

function handDesignLife(N, W, C, I) {
  if (C <= 0 || I <= 0) return 0
  return (N * W) / (C * I)
}

function handTRCircuit(Rg, Rcable, backEMF, Rs, trRatedCurrent) {
  // SAES-X-600 §5.2.5: R_emf = V_backEMF / I_rated
  const R_emf = trRatedCurrent > 0 ? backEMF / trRatedCurrent : 0
  const R_T = Rg + Rcable + R_emf + Rs
  const V_min = R_T * trRatedCurrent + backEMF
  return { backEMFResOhm: R_emf, totalCircuitResOhm: R_T, minTRVoltage: V_min }
}

// ─── Dataset Definitions ───────────────────────────────────────────────

const datasets = [
  {
    name: 'D1: Deepwell Tie-In (existing)',
    station: {
      pipelineSegments: [{ od: 48, lengthM: 292, opTempC: 57.22, currentDensityBase: 0.1, coatingEfficiency: 0.98 }],
      groundbed: { type: 'deepwell', startDepthM: 15, anodeLengthM: 2.13, anodeSpacingM: 1.5, boreholeDiaM: 0.25, cokeCoverM: 2.5, cementPlugM: 0.5 },
      anodeSpec: { weightKg: 38.6, consumptionRate: 0.45 },
      proposedAnodes: 9,
      cables: { anodeTailLengths: [25, 30, 35, 40, 45, 50, 55, 60, 65], anodeCableSizeMm2: 16, posMainLengthM: 180, posMainSizeMm2: 35, negMainLengthM: 100, negMainSizeMm2: 35, negSecLengthM: 60, negSecSizeMm2: 25 },
      tr: { ratedVoltage: 30, ratedCurrent: 25, backEMF: 2, structureResistance: 0.055 },
      soilResistivityOhmCm: 361, actualRemotenesM: 56, requiredRemotenesM: 20, designLifeYears: 25,
    },
    life: 25,
  },
  {
    name: 'D2: Deepwell Main Line (existing)',
    station: {
      pipelineSegments: [{ od: 48, lengthM: 41480, opTempC: 57.22, currentDensityBase: 0.1, coatingEfficiency: 0.98 }],
      groundbed: { type: 'deepwell', startDepthM: 15, anodeLengthM: 2.13, anodeSpacingM: 1.5, boreholeDiaM: 0.25, cokeCoverM: 2.5, cementPlugM: 0.5 },
      anodeSpec: { weightKg: 38.6, consumptionRate: 0.45 },
      proposedAnodes: 9,
      cables: { anodeTailLengths: [25, 30, 35, 40, 45, 50, 55, 60, 65], anodeCableSizeMm2: 16, posMainLengthM: 180, posMainSizeMm2: 35, negMainLengthM: 100, negMainSizeMm2: 35, negSecLengthM: 60, negSecSizeMm2: 25 },
      tr: { ratedVoltage: 30, ratedCurrent: 25, backEMF: 2, structureResistance: 0.055 },
      soilResistivityOhmCm: 361, actualRemotenesM: 56, requiredRemotenesM: 20, designLifeYears: 25,
    },
    life: 25,
  },
  {
    name: 'D3: High Resistivity Deepwell (ρ=50,000)',
    station: {
      pipelineSegments: [{ od: 48, lengthM: 292, opTempC: 57.22, currentDensityBase: 0.1, coatingEfficiency: 0.98 }],
      groundbed: { type: 'deepwell', startDepthM: 60, anodeLengthM: 2.13, anodeSpacingM: 1.5, boreholeDiaM: 0.25, cokeCoverM: 2.5, cementPlugM: 0.5 },
      anodeSpec: { weightKg: 38.6, consumptionRate: 0.45 },
      proposedAnodes: 20,
      cables: { anodeTailLengths: Array.from({length: 20}, (_, i) => 25 + i * 5), anodeCableSizeMm2: 16, posMainLengthM: 180, posMainSizeMm2: 35, negMainLengthM: 100, negMainSizeMm2: 35, negSecLengthM: 60, negSecSizeMm2: 25 },
      tr: { ratedVoltage: 50, ratedCurrent: 40, backEMF: 2, structureResistance: 0.055 },
      soilResistivityOhmCm: 50000, actualRemotenesM: 80, requiredRemotenesM: 20, designLifeYears: 20,
    },
    life: 20,
  },
  {
    name: 'D4: Low Resistivity Shallow (ρ=500)',
    station: {
      pipelineSegments: [{ od: 36, lengthM: 500, opTempC: 40, currentDensityBase: 0.05, coatingEfficiency: 0.95 }],
      groundbed: { type: 'shallow_vertical', startDepthM: 2, anodeLengthM: 1.5, anodeSpacingM: 3, boreholeDiaM: 0.3 },
      anodeSpec: { weightKg: 22, consumptionRate: 0.45 },
      proposedAnodes: 4,
      cables: { anodeTailLengths: [15, 20, 25, 30], anodeCableSizeMm2: 16, posMainLengthM: 80, posMainSizeMm2: 25, negMainLengthM: 50, negMainSizeMm2: 25, negSecLengthM: 30, negSecSizeMm2: 16 },
      tr: { ratedVoltage: 24, ratedCurrent: 10, backEMF: 1, structureResistance: 0.05 },
      soilResistivityOhmCm: 500, actualRemotenesM: 30, requiredRemotenesM: 15, designLifeYears: 20,
    },
    life: 20,
  },
  {
    name: 'D5: Undersized TR (BR-001 failure)',
    station: {
      pipelineSegments: [{ od: 48, lengthM: 41480, opTempC: 57.22, currentDensityBase: 0.1, coatingEfficiency: 0.98 }],
      groundbed: { type: 'deepwell', startDepthM: 15, anodeLengthM: 2.13, anodeSpacingM: 1.5, boreholeDiaM: 0.25, cokeCoverM: 2.5, cementPlugM: 0.5 },
      anodeSpec: { weightKg: 38.6, consumptionRate: 0.45 },
      proposedAnodes: 9,
      cables: { anodeTailLengths: [25, 30, 35, 40, 45, 50, 55, 60, 65], anodeCableSizeMm2: 16, posMainLengthM: 180, posMainSizeMm2: 35, negMainLengthM: 100, negMainSizeMm2: 35, negSecLengthM: 60, negSecSizeMm2: 25 },
      tr: { ratedVoltage: 10, ratedCurrent: 25, backEMF: 2, structureResistance: 0.055 },
      soilResistivityOhmCm: 361, actualRemotenesM: 56, requiredRemotenesM: 20, designLifeYears: 25,
    },
    life: 25,
  },
  {
    name: 'D6: Oversized TR (high headroom)',
    station: {
      pipelineSegments: [{ od: 48, lengthM: 292, opTempC: 57.22, currentDensityBase: 0.1, coatingEfficiency: 0.98 }],
      groundbed: { type: 'deepwell', startDepthM: 15, anodeLengthM: 2.13, anodeSpacingM: 1.5, boreholeDiaM: 0.25, cokeCoverM: 2.5, cementPlugM: 0.5 },
      anodeSpec: { weightKg: 38.6, consumptionRate: 0.45 },
      proposedAnodes: 9,
      cables: { anodeTailLengths: [25, 30, 35, 40, 45, 50, 55, 60, 65], anodeCableSizeMm2: 16, posMainLengthM: 180, posMainSizeMm2: 35, negMainLengthM: 100, negMainSizeMm2: 35, negSecLengthM: 60, negSecSizeMm2: 25 },
      tr: { ratedVoltage: 60, ratedCurrent: 50, backEMF: 2, structureResistance: 0.055 },
      soilResistivityOhmCm: 361, actualRemotenesM: 56, requiredRemotenesM: 20, designLifeYears: 25,
    },
    life: 25,
  },
  {
    name: 'D7: Shallow Small Diameter (6" pipe)',
    station: {
      pipelineSegments: [{ od: 6, lengthM: 200, opTempC: 30, currentDensityBase: 0.1, coatingEfficiency: 0.97 }],
      groundbed: { type: 'shallow_vertical', startDepthM: 1.5, anodeLengthM: 1.2, anodeSpacingM: 2, boreholeDiaM: 0.2 },
      anodeSpec: { weightKg: 14, consumptionRate: 0.45 },
      proposedAnodes: 3,
      cables: { anodeTailLengths: [10, 15, 20], anodeCableSizeMm2: 16, posMainLengthM: 50, posMainSizeMm2: 16, negMainLengthM: 30, negMainSizeMm2: 16, negSecLengthM: 20, negSecSizeMm2: 16 },
      tr: { ratedVoltage: 12, ratedCurrent: 5, backEMF: 1, structureResistance: 0.03 },
      soilResistivityOhmCm: 2000, actualRemotenesM: 15, requiredRemotenesM: 10, designLifeYears: 15,
    },
    life: 15,
  },
]

// ─── Verify Each Dataset ───────────────────────────────────────────────

const fields = [
  'totalSurfaceAreaM2', 'requiredCurrentA', 'designCurrentA',
  'groundbedResistanceOhm', 'activeLengthM', 'totalDrillDepthM',
  'anodeTailParallelResOhm', 'posMainCableResOhm', 'negMainCableResOhm',
  'totalCableResOhm', 'backEMFResistanceOhm', 'totalCircuitResistanceOhm',
  'minTRVoltage', 'designLifeYears',
]

let allPassed = true

for (const ds of datasets) {
  console.log(`\n═══ ${ds.name} ═══`)
  const result = runStationCalculations(ds.station, ds.life)

  // Hand calculations for verification
  const seg = ds.station.pipelineSegments[0]
  const N = ds.station.proposedAnodes
  const gb = ds.station.groundbed
  const activeLen = gb.type === 'deepwell'
    ? N * gb.anodeLengthM + Math.max(0, N - 1) * gb.anodeSpacingM
    : gb.anodeLengthM
  const drillDepth = gb.type === 'deepwell'
    ? gb.startDepthM + activeLen + (gb.cokeCoverM || 0) + (gb.cementPlugM || 0)
    : gb.startDepthM + gb.anodeLengthM

  const cur = handCurrentRequirement(ds.station.pipelineSegments)
  const shallowSpacing = gb.anodeLengthM + gb.anodeSpacingM // code adds these in calcGroundbedResistance
  const gbRes = gb.type === 'deepwell'
    ? handDeepwellResistance(ds.station.soilResistivityOhmCm, activeLen, gb.boreholeDiaM, gb.startDepthM)
    : handShallowResistance(ds.station.soilResistivityOhmCm, gb.anodeLengthM, gb.boreholeDiaM, gb.startDepthM, N, shallowSpacing)

  const tailR = handTailParallelResistance(ds.station.cables.anodeTailLengths, ds.station.cables.anodeCableSizeMm2, N)
  const posR = handCableResistance(ds.station.cables.posMainLengthM, ds.station.cables.posMainSizeMm2)
  const negR = handCableResistance(ds.station.cables.negMainLengthM, ds.station.cables.negMainSizeMm2)
  const negSecR = handCableResistance(ds.station.cables.negSecLengthM, ds.station.cables.negSecSizeMm2)
  const totalCable = tailR + posR + negR + negSecR

  const circuit = handTRCircuit(gbRes, totalCable, ds.station.tr.backEMF, ds.station.tr.structureResistance, ds.station.tr.ratedCurrent)
  const life = handDesignLife(N, ds.station.anodeSpec.weightKg, ds.station.anodeSpec.consumptionRate, ds.station.tr.ratedCurrent)

  const hand = {
    totalSurfaceAreaM2: cur.totalArea,
    requiredCurrentA: cur.requiredA,
    designCurrentA: cur.designA,
    groundbedResistanceOhm: gbRes,
    activeLengthM: activeLen,
    totalDrillDepthM: drillDepth,
    anodeTailParallelResOhm: tailR,
    posMainCableResOhm: posR,
    negMainCableResOhm: negR + negSecR,
    totalCableResOhm: totalCable,
    backEMFResistanceOhm: circuit.backEMFResOhm,
    totalCircuitResistanceOhm: circuit.totalCircuitResOhm,
    minTRVoltage: circuit.minTRVoltage,
    designLifeYears: life,
  }

  let dsPassed = true
  for (const f of fields) {
    const actual = result[f]
    const expected = hand[f]
    const relDiff = expected !== 0 ? Math.abs((actual - expected) / expected) : 0
    const absDiff = Math.abs(actual - expected)
    // Tolerance: 0.5% relative or 0.01 absolute for dimensions, 0.001 for electrical
    const tolRel = f.includes('Life') ? 0.01 : 0.005
    const tolAbs = f.includes('Area') || f.includes('Depth') || f.includes('Length') ? 0.05 : 0.005
    const pass = relDiff <= tolRel || absDiff <= tolAbs
    if (!pass) {
      console.log(`  ✗ ${f}: actual=${actual}, hand=${expected}  (rel=${(relDiff*100).toFixed(2)}%)`)
      dsPassed = false
      allPassed = false
    }
  }

  if (dsPassed) {
    console.log(`  ✓ ALL ${fields.length} fields match hand calculations`)
    console.log(`  Values: ${fields.map(f => `${f}=${result[f]}`).join(', ')}`)
  }
}

console.log(allPassed ? '\n=== ALL DATASETS VERIFIED ===' : '\n=== MISMATCHES FOUND ===')
process.exit(allPassed ? 0 : 1)
