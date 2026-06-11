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
 *
 * Standard-driven design:
 *   Calculation functions accept optional standard config parameters.
 *   When omitted, they default to Saudi Aramco values (matching current THRESHOLDS).
 *   This preserves backward compatibility for all existing tests.
 *   The orchestrator (runStationCalculations) resolves the active standard and passes values through.
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
  if (odInches <= 0 || lengthM <= 0) return 0
  const odM = odInches * 0.0254
  return Math.PI * odM * lengthM
}

// ─── Module 2: Current Requirement ───────────────────────────────────────────

/**
 * Temperature-correct current density.
 * Supports two methods:
 *   'exponential' — Saudi Aramco (default): i_T = i_base × 1.25^((T − baseTempC) / 10)
 *   'linear'      — NACE SP0169:         i_T = i_base × [1 + (T − baseTempC) × 0.025]
 *
 * @param {number} baseCDmAm2 - Base current density at base temp (mA/m²)
 * @param {number} tempC      - Operating temperature (°C)
 * @param {string} [method='exponential'] - Correction method
 * @param {number} [baseTempC=30] - Base reference temperature (°C)
 * @returns {number} Temperature-corrected current density (mA/m²)
 */
export function calcTempCorrectedCurrentDensity(baseCDmAm2, tempC, method = 'exponential', baseTempC = 30) {
  if (method === 'linear') {
    // NACE SP0169: linear correction
    return baseCDmAm2 * (1 + (tempC - baseTempC) * 0.025)
  }
  // Saudi Aramco: exponential (default)
  return baseCDmAm2 * Math.pow(1.25, (tempC - baseTempC) / 10)
}

/**
 * Calculate total protection current requirement for a station.
 * I_req = Σ(A_i × i_T_i) × spare_factor
 * Note: Coating efficiency is NOT applied per NACE SP0169 and Saudi Aramco practice for bare-pipe equivalent.
 *
 * @param {import('../types').PipelineSegment[]} segments
 * @param {object} [currentConfig]
 * @param {number} [currentConfig.spareFactor=1.3] - Design spare factor (1.3 = 30%)
 * @param {string} [currentConfig.tempMethod='exponential'] - Temperature correction method
 * @param {number} [currentConfig.baseTempC=30] - Base temperature for correction (°C)
 * @returns {{ totalAreaM2: number, requiredA: number, designA: number, perSegment: object[] }}
 */
export function calcCurrentRequirement(segments, currentConfig = {}) {
  const {
    spareFactor = THRESHOLDS.SPARE_FACTOR,
    tempMethod = 'exponential',
    baseTempC = 30,
  } = currentConfig

  let totalAreaM2 = 0
  let totalCurrentA = 0
  const perSegment = []

  for (const seg of segments) {
    const area = calcSurfaceArea(seg.od, seg.lengthM)
    const iTemp = Math.max(
      calcTempCorrectedCurrentDensity(seg.currentDensityBase, seg.opTempC, tempMethod, baseTempC),
      0,
    )
    // Removed coating efficiency factor (ce) as per DEF-001 and Saudi Aramco standards
    const segCurrentA = (area * iTemp) / 1000 // mA → A
    totalAreaM2 += area
    totalCurrentA += segCurrentA
    perSegment.push({ segmentId: seg.id, areaM2: area, iTempMam2: iTemp, currentA: segCurrentA })
  }

  return {
    totalAreaM2,
    requiredA: totalCurrentA,
    designA: totalCurrentA * spareFactor,
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
export function calcDweellGroundbedResistance(
  soilResistivityOhmCm,
  activeLengthM,
  boreholeDiaM,
  topDepthM,
) {
  const rhoOhmM = soilResistivityOhmCm / 100 // Ω·cm → Ω·m
  const L = activeLengthM
  const d = boreholeDiaM
  const h = topDepthM + L / 2 // Depth to midpoint of active zone

  if (L <= 0 || d <= 0 || h <= 0) return 999

  const rG = (rhoOhmM / (2 * Math.PI * L)) * (Math.log((8 * L) / d) - 1 + L / (4 * h))
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
  soilResistivityOhmCm,
  anodeLengthM,
  boreholeDiaM,
  topDepthM,
  numAnodes,
  anodeSpacingM,
) {
  const rhoOhmM = soilResistivityOhmCm / 100
  const L = anodeLengthM
  const d = boreholeDiaM
  const h = topDepthM + L / 2

  if (L <= 0 || d <= 0 || numAnodes <= 0) return 999

  // Single vertical anode resistance
  const R_single = (rhoOhmM / (2 * Math.PI * L)) * (Math.log((4 * L) / d) - 1 + L / (2 * h))

  // Parallel combination with mutual interference factor
  // Mutual interference term (simplified Sunde):
  // ΔR = ρ/(π×L×N²) × Σln(s_ij / d)  where s_ij = spacing between anodes
  // Simplified for equally-spaced linear array:
  const N = numAnodes
  const S = anodeSpacingM > 0 ? anodeSpacingM : L * 2

  let mutualSum = 0
  for (let i = 1; i < N; i++) {
    mutualSum += Math.log((2 * i * S) / L)
  }
  const R_mutual = (rhoOhmM / (Math.PI * L * N * N)) * mutualSum

  return Math.max(R_single / N + R_mutual, 0.01)
}

/**
 * Distributed groundbed resistance — Parallel single anodes.
 * Assumes spacing > 10m where mutual interference is negligible.
 * R_G = R_single / N
 *
 * @param {number} soilResistivityOhmCm
 * @param {number} anodeLengthM
 * @param {number} boreholeDiaM
 * @param {number} topDepthM
 * @param {number} numAnodes
 * @returns {number} Distributed groundbed resistance (Ω)
 */
export function calcDistributedGroundbedResistance(
  soilResistivityOhmCm,
  anodeLengthM,
  boreholeDiaM,
  topDepthM,
  numAnodes,
) {
  const rhoOhmM = soilResistivityOhmCm / 100
  const L = anodeLengthM
  const d = boreholeDiaM
  const h = topDepthM + L / 2

  if (L <= 0 || d <= 0 || numAnodes <= 0) return 999

  // Single vertical anode resistance (Dwight)
  const R_single = (rhoOhmM / (2 * Math.PI * L)) * (Math.log((4 * L) / d) - 1 + L / (2 * h))

  return Math.max(R_single / numAnodes, 0.01)
}

/**
 * Route groundbed resistance calculation based on design mode.
 */
export function calcGroundbedResistance(groundbed, soilResistivityOhmCm, numAnodes) {
  const { type, startDepthM, anodeLengthM, anodeSpacingM, boreholeDiaM } = groundbed

  if (type === 'deepwell') {
    // Active column = N anodes + (N-1) spacers
    const activeLength = numAnodes * anodeLengthM + Math.max(0, numAnodes - 1) * anodeSpacingM
    return {
      resistanceOhm: calcDweellGroundbedResistance(
        soilResistivityOhmCm,
        activeLength,
        boreholeDiaM,
        startDepthM,
      ),
      activeLengthM: activeLength,
      totalDrillDepthM:
        startDepthM + activeLength + (groundbed.cokeCoverM || 0) + (groundbed.cementPlugM || 0),
    }
  }

  if (type === 'shallow_vertical') {
    const spacing = anodeLengthM + anodeSpacingM // End-to-end → centre-to-centre approx
    return {
      resistanceOhm: calcShallowVerticalGroundbedResistance(
        soilResistivityOhmCm,
        anodeLengthM,
        boreholeDiaM,
        startDepthM,
        numAnodes,
        spacing,
      ),
      activeLengthM: anodeLengthM,
      totalDrillDepthM: startDepthM + anodeLengthM,
    }
  }

  if (type === 'distributed') {
    return {
      resistanceOhm: calcDistributedGroundbedResistance(
        soilResistivityOhmCm,
        anodeLengthM,
        boreholeDiaM,
        startDepthM,
        numAnodes,
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
  const activeLengths = tailLengths.filter((l) => l > 0)
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
 * @param {object} [circuitConfig]
 * @param {number} [circuitConfig.circuitResOperating=0.7] - Operating limit fraction (e.g. 0.7 = 70%)
 * @param {number} [circuitConfig.circuitResWarning=0.9]  - Warning limit fraction (e.g. 0.9 = 90%)
 * @param {number} [circuitConfig.trEfficiency=0.8]       - TR overall efficiency
 * @param {number} [circuitConfig.rectifierEfficiency=0.8] - Rectifier stage efficiency
 * @returns {object}
 */
export function calcTRCircuit(
  groundbedResOhm,
  totalCableResOhm,
  backEMFVolts,
  structureResOhm,
  trRatedVoltage,
  trRatedCurrent,
  circuitConfig = {},
) {
  const {
    circuitResOperating = THRESHOLDS.CIRCUIT_RESISTANCE_OPERATING,
    circuitResWarning = THRESHOLDS.CIRCUIT_RESISTANCE_WARNING,
    trEfficiency = THRESHOLDS.TR_EFFICIENCY,
    rectifierEfficiency = THRESHOLDS.RECTIFIER_EFFICIENCY,
    acInputVoltage = 480,
    acInputPhase = 3,
  } = circuitConfig

  const R_emf = trRatedCurrent > 0 ? (2 * backEMFVolts) / trRatedCurrent : 0
  const R_T = groundbedResOhm + totalCableResOhm + R_emf + structureResOhm
  const V_min = R_T * trRatedCurrent + backEMFVolts
  const R_max_70 = circuitResOperating * (trRatedVoltage / trRatedCurrent)
  const R_max_90 = circuitResWarning * (trRatedVoltage / trRatedCurrent)
  const R_G_max_allowable = R_max_70 - totalCableResOhm - structureResOhm

  const dcPowerW = trRatedVoltage * trRatedCurrent
  const acInputKVA = dcPowerW / (trEfficiency * rectifierEfficiency * 1000)
  const acInputCurrentA = acInputPhase === 3
    ? (acInputKVA * 1000) / (acInputVoltage * Math.sqrt(3))
    : (acInputKVA * 1000) / acInputVoltage

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
 * Y = (N × W × U_f) / (C × I)
 *
 * @param {number} numAnodes
 * @param {number} anodeWeightKg
 * @param {number} consumptionRateKgAY  - kg / A·year
 * @param {number} trRatedCurrentA
 * @param {number} [utilizationFactor=0.85] - Anode utilization factor (default: 0.85 per NACE SP0169)
 * @returns {number} Design life (years)
 */
export function calcDesignLife(numAnodes, anodeWeightKg, consumptionRateKgAY, trRatedCurrentA, utilizationFactor = THRESHOLDS.ANODE_UTILIZATION_FACTOR) {
  if (consumptionRateKgAY <= 0 || trRatedCurrentA <= 0) return 0
  return (numAnodes * anodeWeightKg * utilizationFactor) / (consumptionRateKgAY * trRatedCurrentA)
}

// ─── Module 7: Coke (Calcined Petroleum Coke) Requirement ──────────────────

/**
 * Calculate calcined petroleum coke backfill requirement.
 * Matches Excel formula from Cal.(DW) Section 13:
 *   13.3: N_bags = CEILING(L_active × ftPerM × annulusFactor / bagLbs)
 *   13.4: N_final = CEILING(N_bags × contingency)
 *
 * @param {number} activeLengthM - Active column length (m)
 * @param {object} [cokeConfig]
 * @param {number} [cokeConfig.ftPerM=3.28]        - Feet per meter
 * @param {number} [cokeConfig.annulusFactor=39.2]  - Empirical annulus volume factor
 * @param {number} [cokeConfig.bagLbs=50]           - Pounds per bag
 * @param {number} [cokeConfig.contingency=1.15]    - Handling + site waste factor
 * @returns {{ bagsBase: number, bagsWithContingency: number }}
 */
export function calcCokeRequirement(activeLengthM, cokeConfig = {}) {
  const {
    ftPerM = THRESHOLDS.COKE_FT_PER_M,
    annulusFactor = THRESHOLDS.COKE_ANNULUS_FACTOR,
    bagLbs = THRESHOLDS.COKE_BAG_LBS,
    contingency = THRESHOLDS.COKE_BACKFILL_CONTINGENCY,
  } = cokeConfig

  if (activeLengthM <= 0) return { bagsBase: 0, bagsWithContingency: 0 }

  const bagsBase = Math.ceil((activeLengthM * ftPerM * annulusFactor) / bagLbs)
  const bagsWithContingency = Math.ceil(bagsBase * contingency)

  return { bagsBase, bagsWithContingency }
}

// ─── Master Calculation Orchestrator ─────────────────────────────────────────

/**
 * Run ALL calculations for a station in the correct sequence.
 * This is the single entry point called by the UI layer.
 *
 * @param {import('../types').Station} station
 * @param {number} systemDesignLifeYears
 * @param {object|null} [standardConfig=null] - Pre-resolved standard config. If null, uses Saudi Aramco defaults.
 * @returns {import('../types').CalcResult}
 */
export function runStationCalculations(station, systemDesignLifeYears, standardConfig = null, project = null) {
  const {
    id,
    pipelineSegments,
    groundbed,
    anodeSpec,
    proposedAnodes,
    cables,
    tr,
    soilResistivityOhmCm,
    designLifeYears,
  } = station

  // Use project-level overrides if available
  const db = project?.designBasis || {}
  const targetLife = db.systemDesignLifeYears !== undefined ? db.systemDesignLifeYears : (designLifeYears || systemDesignLifeYears)
  const backEMF = db.backEmfV !== undefined ? db.backEmfV : tr.backEMF
  const structureResistance = db.structureResistanceOhm !== undefined ? db.structureResistanceOhm : tr.structureResistance
  const actualRemoteness = db.actualRemotenessDistanceM !== undefined ? db.actualRemotenessDistanceM : station.actualRemotenesM
  const minRemoteness = db.minRemotenessDistanceM !== undefined ? db.minRemotenessDistanceM : station.requiredRemotenesM
  const soilResistivity = db.soilResistivityOhmCm !== undefined ? db.soilResistivityOhmCm : soilResistivityOhmCm

  // ── Extract standard-driven values ───────────────────────────────────────
  const cr = standardConfig?.currentRequirement || {}
  const dl = standardConfig?.designLife || {}
  const ts = standardConfig?.trSizing || {}
  const cb = standardConfig?.cokeBackfill || {}

  // 1. Current requirement (with standard-driven spare factor, temp method, base temp)
  const currentResult = calcCurrentRequirement(pipelineSegments, {
    spareFactor: cr.spareFactor,
    tempMethod: standardConfig?.temperatureCorrection?.method,
    baseTempC: standardConfig?.temperatureCorrection?.baseTempC,
  })

  // 2. Groundbed resistance (no standard-specific values — pure geometry/soil)
  const gbResult = calcGroundbedResistance(groundbed, soilResistivity, proposedAnodes)

  // 3. Cable resistances (no standard-specific values — pure cable specs)
  const cableResult = calcCableResistances(cables, proposedAnodes)

  // Resolve TR configuration overrides
  const trEfficiency = db.trEfficiencyPct !== undefined ? (db.trEfficiencyPct / 100) : ts.efficiency
  const trPowerFactor = db.trPowerFactor !== undefined ? db.trPowerFactor : ts.rectifierEfficiency
  const acInputVoltage = db.acInputVoltageV || ts.inputVoltage || 480
  const acInputPhase = db.acInputPhase || ts.inputPhases || 3

  // 4. TR circuit (with standard-driven efficiencies and limits)
  const trResult = calcTRCircuit(
    gbResult.resistanceOhm,
    cableResult.totalCableOhm,
    backEMF,
    structureResistance,
    tr.ratedVoltage,
    tr.ratedCurrent,
    {
      circuitResOperating: ts.circuitResistanceOperating,
      circuitResWarning: ts.circuitResistanceWarning,
      trEfficiency: trEfficiency,
      rectifierEfficiency: trPowerFactor,
      acInputVoltage: acInputVoltage,
      acInputPhase: acInputPhase,
    },
  )

  // 5. Design life (with standard-driven utilization factor)
  const designLife = calcDesignLife(
    proposedAnodes,
    anodeSpec.weightKg,
    anodeSpec.consumptionRate,
    tr.ratedCurrent,
    dl.anodeUtilizationFactor,
  )

  // Resolve Coke contingency overrides
  const cokeContingency = db.cokeContingencyPct !== undefined ? (1 + db.cokeContingencyPct / 100) : cb.contingency

  // 6. Coke backfill requirement (with standard-driven constants)
  const cokeActiveLength =
    groundbed.type === 'shallow_vertical'
      ? gbResult.activeLengthM * proposedAnodes
      : gbResult.activeLengthM
  const cokeResult = calcCokeRequirement(cokeActiveLength, {
    ftPerM: cb.ftPerM,
    annulusFactor: cb.annulusFactor,
    bagLbs: cb.bagLbs,
    contingency: cokeContingency,
  })

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
    // Coke backfill
    cokeBagsBase: cokeResult.bagsBase,
    cokeBagsWithContingency: cokeResult.bagsWithContingency,
    // Remoteness
    actualRemotenesM: actualRemoteness,
    requiredRemotenesM: minRemoteness,
    // Raw current calcs
    perSegmentCurrents: currentResult.perSegment,
  }
}
