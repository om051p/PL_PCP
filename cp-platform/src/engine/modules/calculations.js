/**
 * BUSINESS LOGIC ENGINE
 * Pure, stateless calculation functions.
 * Zero side effects. Zero DOM access. Zero state mutation.
 * Every function is independently unit-testable.
 *
 * Formula references:
 * - NACE SP0169-2013
 * - Dwight (1936) — Groundbed resistance formula
 * - IEC 60287 — Cable ampacity
 * - 17-SAMSS-003/016 — Saudi Aramco Engineering Standards
 */

import { THRESHOLDS, CABLE_SPECS } from '../../constants/index.js'

// ─── Module 1: Surface Area ───────────────────────────────────────────────────

/**
 * Calculate external surface area of a pipeline section.
 * @param {number} odInches - Outside diameter in inches
 * @param {number} lengthM  - Section length in meters
 * @returns {number} Surface area in m²
 */
export function calcSurfaceArea(odInches, lengthM) {
  const odM = odInches * 0.0254
  return Math.PI * odM * lengthM
}

// ─── Module 2: Current Requirement ───────────────────────────────────────────

/**
 * Temperature-correct current density.
 * i_T = i_base × [1 + (T - T_base) × k]
 * @param {number} baseCDmAm2 - Base current density at 25°C (mA/m²)
 * @param {number} tempC      - Operating temperature (°C)
 * @returns {number} Temperature-corrected current density (mA/m²)
 */
export function calcTempCorrectedCurrentDensity(baseCDmAm2, tempC) {
  const factor = 1 + (tempC - THRESHOLDS.BASE_TEMP_C) * THRESHOLDS.TEMP_CORRECTION_FACTOR
  return baseCDmAm2 * factor
}

/**
 * Calculate total protection current requirement for a station.
 * I_req = Σ(A_i × i_T_i) × spare_factor
 * @param {import('../types').PipelineSegment[]} segments
 * @returns {{ totalAreaM2: number, requiredA: number, designA: number, perSegment: object[] }}
 */
export function calcCurrentRequirement(segments) {
  let totalAreaM2 = 0
  let totalCurrentA = 0
  const perSegment = []

  for (const seg of segments) {
    const area = calcSurfaceArea(seg.od, seg.lengthM)
    const iTemp = calcTempCorrectedCurrentDensity(seg.currentDensityBase, seg.opTempC)
    const coatingFactor = 1 - (seg.coatingEfficiency ?? 0.98)
    // Effective current needed = area × current density × coating factor (bare area fraction)
    // For heavily coated pipe, coatingFactor approaches 0 (very little bare area)
    // Standard practice: use base mA/m² without coating reduction for design conservatism
    const segCurrentA = (area * iTemp) / 1000   // mA → A
    totalAreaM2 += area
    totalCurrentA += segCurrentA
    perSegment.push({ segmentId: seg.id, areaM2: area, iTempMam2: iTemp, currentA: segCurrentA })
  }

  return {
    totalAreaM2,
    requiredA: totalCurrentA,
    designA: totalCurrentA * THRESHOLDS.SPARE_FACTOR,
    perSegment,
  }
}

// ─── Module 3: Groundbed Resistance ──────────────────────────────────────────

/**
 * Deepwell groundbed resistance — Dwight (1936) formula for vertical electrode.
 * R_G = ρ/(2πL) × (ln(8L/d) - 1 + L/(4h))
 *
 * @param {number} soilResistivityOhmCm - Soil resistivity
 * @param {number} activeLengthM        - Active column length (m)
 * @param {number} boreholeDiaM         - Borehole diameter (m)
 * @param {number} topDepthM            - Depth to top of active zone (m)
 * @returns {number} Groundbed resistance (Ω)
 */
export function calcDweellGroundbedResistance(soilResistivityOhmCm, activeLengthM, boreholeDiaM, topDepthM) {
  const rhoOhmM = soilResistivityOhmCm / 100  // Ω·cm → Ω·m
  const L = activeLengthM
  const d = boreholeDiaM
  const h = topDepthM + L / 2   // Depth to midpoint of active zone

  if (L <= 0 || d <= 0 || h <= 0) return 999

  const rG = (rhoOhmM / (2 * Math.PI * L)) * (Math.log(8 * L / d) - 1 + L / (4 * h))
  return Math.max(rG, 0.01)
}

/**
 * Shallow vertical parallel groundbed resistance — Sunde (1968) formula.
 * R_G = (R_single / N) × F_spacing
 * where F_spacing accounts for mutual interference
 *
 * @param {number} soilResistivityOhmCm
 * @param {number} anodeLengthM
 * @param {number} boreholeDiaM
 * @param {number} topDepthM
 * @param {number} numAnodes
 * @param {number} anodeSpacingM  - Centre-to-centre spacing
 * @returns {number} Parallel groundbed resistance (Ω)
 */
export function calcShallowVerticalGroundbedResistance(
  soilResistivityOhmCm, anodeLengthM, boreholeDiaM, topDepthM, numAnodes, anodeSpacingM
) {
  const rhoOhmM = soilResistivityOhmCm / 100
  const L = anodeLengthM
  const d = boreholeDiaM
  const h = topDepthM + L / 2

  if (L <= 0 || d <= 0 || numAnodes <= 0) return 999

  // Single vertical anode resistance
  const R_single = (rhoOhmM / (2 * Math.PI * L)) * (Math.log(4 * L / d) - 1 + (L / (2 * h)))

  // Parallel combination with mutual interference factor
  // Mutual interference term (simplified Sunde):
  // ΔR = ρ/(π×L×N²) × Σln(s_ij / d)  where s_ij = spacing between anodes
  // Simplified for equally-spaced linear array:
  const N = numAnodes
  const S = anodeSpacingM > 0 ? anodeSpacingM : L * 2

  let mutualSum = 0
  for (let i = 1; i < N; i++) {
    mutualSum += Math.log(2 * i * S / L)
  }
  const R_mutual = (rhoOhmM / (Math.PI * L * N * N)) * mutualSum

  return Math.max(R_single / N + R_mutual, 0.01)
}

/**
 * Route groundbed resistance calculation based on design mode.
 */
export function calcGroundbedResistance(groundbed, soilResistivityOhmCm, numAnodes, anodeSpec) {
  const { type, startDepthM, anodeLengthM, anodeSpacingM, boreholeDiaM } = groundbed

  if (type === 'deepwell') {
    // Active column = N anodes + (N-1) spacers
    const activeLength = numAnodes * anodeLengthM + Math.max(0, numAnodes - 1) * anodeSpacingM
    return {
      resistanceOhm: calcDweellGroundbedResistance(soilResistivityOhmCm, activeLength, boreholeDiaM, startDepthM),
      activeLengthM: activeLength,
      totalDrillDepthM: startDepthM + activeLength + (groundbed.cokeCoverM || 0) + (groundbed.cementPlugM || 0),
    }
  }

  if (type === 'shallow_vertical') {
    const spacing = anodeLengthM + anodeSpacingM   // End-to-end → centre-to-centre approx
    return {
      resistanceOhm: calcShallowVerticalGroundbedResistance(
        soilResistivityOhmCm, anodeLengthM, boreholeDiaM, startDepthM, numAnodes, spacing
      ),
      activeLengthM: anodeLengthM,
      totalDrillDepthM: startDepthM + anodeLengthM,
    }
  }

  return { resistanceOhm: 0, activeLengthM: 0, totalDrillDepthM: 0 }
}

// ─── Module 4: Cable Resistance ───────────────────────────────────────────────

/**
 * Calculate parallel resistance of all anode tail cables.
 * R_ac = 1 / Σ(1 / (L_i × r))
 * @param {number[]} tailLengths  - Per-anode cable lengths (m)
 * @param {number} cableSizeMm2   - Cable cross-section (mm²)
 * @returns {number} Parallel resistance (Ω)
 */
export function calcAnodeTailParallelResistance(tailLengths, cableSizeMm2) {
  const spec = CABLE_SPECS[cableSizeMm2]
  if (!spec) return 0
  const r = spec.resistanceOhmPerM
  const activeLengths = tailLengths.filter(l => l > 0)
  if (activeLengths.length === 0) return 0
  const sumInverse = activeLengths.reduce((acc, l) => acc + 1 / (l * r), 0)
  return 1 / sumInverse
}

/**
 * Calculate full cable circuit resistance.
 * @param {import('../types').CableConfig} cables
 * @param {number} numAnodes
 * @returns {object} All cable resistance components
 */
export function calcCableResistances(cables, numAnodes) {
  const activeTails = cables.anodeTailLengths.slice(0, numAnodes)

  const Rac = calcAnodeTailParallelResistance(activeTails, cables.anodeCableSizeMm2)

  const posSpec = CABLE_SPECS[cables.posMainSizeMm2]
  const negMainSpec = CABLE_SPECS[cables.negMainSizeMm2]
  const negSecSpec = CABLE_SPECS[cables.negSecSizeMm2]

  const Rpc = cables.posMainLengthM * (posSpec?.resistanceOhmPerM ?? 0)
  const Rnc_main = cables.negMainLengthM * (negMainSpec?.resistanceOhmPerM ?? 0)
  const Rnc_sec = cables.negSecLengthM * (negSecSpec?.resistanceOhmPerM ?? 0)

  return {
    anodeTailParallelOhm: Rac,
    posMainOhm: Rpc,
    negMainOhm: Rnc_main,
    negSecOhm: Rnc_sec,
    totalPositiveOhm: Rac + Rpc,
    totalNegativeOhm: Rnc_main + Rnc_sec,
    totalCableOhm: Rac + Rpc + Rnc_main + Rnc_sec,
  }
}

// ─── Module 5: TR Circuit Analysis ───────────────────────────────────────────

/**
 * Analyse the complete TR circuit.
 * R_T = R_G + R_c + R_emf + R_s
 * V_min = R_T × I_rated
 *
 * @param {number} groundbedResOhm
 * @param {number} totalCableResOhm
 * @param {number} backEMFVolts
 * @param {number} structureResOhm
 * @param {number} trRatedVoltage
 * @param {number} trRatedCurrent
 * @returns {object}
 */
export function calcTRCircuit(groundbedResOhm, totalCableResOhm, backEMFVolts, structureResOhm, trRatedVoltage, trRatedCurrent) {
  const R_emf = trRatedCurrent > 0 ? (2 * backEMFVolts) / trRatedCurrent : 0
  const R_T = groundbedResOhm + totalCableResOhm + R_emf + structureResOhm
  const V_min = R_T * trRatedCurrent + backEMFVolts
  const R_max_70 = THRESHOLDS.CIRCUIT_RESISTANCE_OPERATING * (trRatedVoltage / trRatedCurrent)
  const R_max_90 = THRESHOLDS.CIRCUIT_RESISTANCE_WARNING * (trRatedVoltage / trRatedCurrent)
  const R_G_max_allowable = R_max_70 - totalCableResOhm - structureResOhm

  const dcPowerW = trRatedVoltage * trRatedCurrent
  const acInputKVA = dcPowerW / (0.80 * 0.80 * 1000)
  const acInputCurrentA = (acInputKVA * 1000) / (480 * Math.sqrt(3))

  return {
    backEMFResOhm: R_emf,
    totalCircuitResOhm: R_T,
    minTRVoltage: V_min,
    maxCircuitRes70: R_max_70,
    maxCircuitRes90: R_max_90,
    maxGroundbedResAllowable: R_G_max_allowable,
    dcPowerW,
    acInputKVA,
    acInputCurrentA,
  }
}

// ─── Module 6: Design Life ────────────────────────────────────────────────────

/**
 * Calculate anode bed design life.
 * Y = (N × W) / (C × I)
 * @param {number} numAnodes
 * @param {number} anodeWeightKg
 * @param {number} consumptionRateKgAY  - kg / A·year
 * @param {number} trRatedCurrentA
 * @returns {number} Design life (years)
 */
export function calcDesignLife(numAnodes, anodeWeightKg, consumptionRateKgAY, trRatedCurrentA) {
  if (consumptionRateKgAY <= 0 || trRatedCurrentA <= 0) return 0
  return (numAnodes * anodeWeightKg) / (consumptionRateKgAY * trRatedCurrentA)
}

// ─── Master Calculation Orchestrator ─────────────────────────────────────────

/**
 * Run ALL calculations for a station in the correct sequence.
 * This is the single entry point called by the UI layer.
 *
 * @param {import('../types').Station} station
 * @param {number} systemDesignLifeYears
 * @returns {import('../types').CalcResult}
 */
export function runStationCalculations(station, systemDesignLifeYears) {
  const { id, pipelineSegments, groundbed, anodeSpec, proposedAnodes, cables, tr, soilResistivityOhmCm, designLifeYears } = station
  const targetLife = designLifeYears || systemDesignLifeYears

  // 1. Current requirement
  const currentResult = calcCurrentRequirement(pipelineSegments)

  // 2. Groundbed resistance
  const gbResult = calcGroundbedResistance(groundbed, soilResistivityOhmCm, proposedAnodes, anodeSpec)

  // 3. Cable resistances
  const cableResult = calcCableResistances(cables, proposedAnodes)

  // 4. TR circuit
  const trResult = calcTRCircuit(
    gbResult.resistanceOhm,
    cableResult.totalCableOhm,
    tr.backEMF,
    tr.structureResistance,
    tr.ratedVoltage,
    tr.ratedCurrent
  )

  // 5. Design life
  const designLife = calcDesignLife(proposedAnodes, anodeSpec.weightKg, anodeSpec.consumptionRate, tr.ratedCurrent)

  return {
    stationId: id,
    calculatedAt: new Date().toISOString(),
    // Current
    totalSurfaceAreaM2: currentResult.totalAreaM2,
    tempCorrectedCurrentDensity: currentResult.perSegment[0]?.iTempMam2 ?? 0,
    requiredCurrentA: currentResult.requiredA,
    designCurrentA: currentResult.designA,
    // Groundbed
    groundbedResistanceOhm: gbResult.resistanceOhm,
    activeLengthM: gbResult.activeLengthM,
    totalDrillDepthM: gbResult.totalDrillDepthM,
    // Cable
    anodeTailParallelResOhm: cableResult.anodeTailParallelOhm,
    posMainCableResOhm: cableResult.posMainOhm,
    negMainCableResOhm: cableResult.totalNegativeOhm,
    totalCableResOhm: cableResult.totalCableOhm,
    // TR
    backEMFResistanceOhm: trResult.backEMFResOhm,
    totalCircuitResistanceOhm: trResult.totalCircuitResOhm,
    minTRVoltage: trResult.minTRVoltage,
    maxAllowableGroundbedRes: trResult.maxGroundbedResAllowable,
    maxCircuitRes70pct: trResult.maxCircuitRes70,
    maxCircuitRes90pct: trResult.maxCircuitRes90,
    dcPowerW: trResult.dcPowerW,
    acInputKVA: trResult.acInputKVA,
    acInputCurrentA: trResult.acInputCurrentA,
    // Design life
    designLifeYears: designLife,
    targetDesignLifeYears: targetLife,
    // Raw current calcs
    perSegmentCurrents: currentResult.perSegment,
  }
}
