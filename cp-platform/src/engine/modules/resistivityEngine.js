/**
 * resistivityEngine.js
 *
 * Soil Resistivity & Groundbed Resistance Calculation Engine
 * Reverse-engineered from: PCP.xlsx — "PERMANENT CATHODIC PROTECTION OF HAJAR IPP"
 *
 * Standards: NACE SP0169, 17-SAMSS-003/016, Saudi Aramco Engineering
 * Models:
 *   - Wenner 4-pin soil resistivity measurement
 *   - Sunde formula: deepwell/vertical groundbed resistance
 *   - Dwight formula: single vertical anode resistance
 *   - Multiple anode parallel combination
 *   - Temperature-corrected current density
 *   - TR sizing and circuit resistance validation
 *
 * Architecture: Pure functions, zero dependencies, ESM exports.
 * Runs in any JS environment — browser, Node.js, worker.
 */

'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1 — CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

export const RESISTIVITY_CONSTANTS = Object.freeze({
  /** Reference temperature for current density (°C) */
  REFERENCE_TEMP_C: 15,

  /** Back EMF of pipeline structure (V) — standard value */
  BACK_EMF_V: 2,

  /** TR efficiency factor (70%) */
  TR_EFFICIENCY: 0.7,

  /** Structure-to-remote-earth resistance default (Ω) */
  DEFAULT_STRUCTURE_EARTH_RESISTANCE: 0.055,

  /** 16mm² cable resistance per metre (Ω/m) — from spreadsheet D101 */
  CABLE_16MM2_RESISTANCE_PER_M: 0.001673,

  /** 25mm² cable resistance per metre (Ω/m) — from spreadsheet D140 */
  CABLE_25MM2_RESISTANCE_PER_M: 0.001053,

  /** 35mm² cable resistance per metre (Ω/m) — from spreadsheet D124/D134/D138 */
  CABLE_35MM2_RESISTANCE_PER_M: 0.000659,

  /** Design life (years) */
  DEFAULT_DESIGN_LIFE_YEARS: 25,

  /** TA-4 HSCI anode current output at 25 years (A) */
  TA4_ANODE_CURRENT_OUTPUT_A: 3.56,

  /** TA-4 HSCI anode consumption rate (kg/A·year) */
  TA4_CONSUMPTION_RATE_KG_A_YEAR: 0.45,

  /** TA-4 HSCI single anode weight (kg) */
  TA4_ANODE_WEIGHT_KG: 38.6,

  /** Deepwell borehole standard diameter (m) */
  DEFAULT_BOREHOLE_DIAMETER_M: 0.25,

  /** π */
  PI: Math.PI,
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2 — VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validates resistivity/groundbed input.
 * @param {ResistivityInput} input
 * @returns {ValidationResult}
 */
export function validateResistivityInput(input) {
  const errors = [];
  const warnings = [];

  if (!input || typeof input !== 'object') {
    return { valid: false, errors: ['Input must be a non-null object'], warnings: [] };
  }

  const { wenner, groundbed, pipeline, circuit } = input;

  // Wenner (optional — only validate if provided)
  if (wenner) {
    if (typeof wenner.spacingM !== 'number' || wenner.spacingM <= 0)
      errors.push('VAL-W01: wenner.spacingM must be > 0');
    if (typeof wenner.resistanceOhm !== 'number' || wenner.resistanceOhm <= 0)
      errors.push('VAL-W02: wenner.resistanceOhm must be > 0');
  }

  // Groundbed
  if (!groundbed) {
    errors.push('VAL-G01: groundbed object is required');
  } else {
    if (!['deepwell', 'shallow_vertical', 'horizontal'].includes(groundbed.type))
      errors.push('VAL-G02: groundbed.type must be "deepwell", "shallow_vertical", or "horizontal"');
    if (typeof groundbed.soilResistivityOhmCm !== 'number' || groundbed.soilResistivityOhmCm <= 0)
      errors.push('VAL-G03: groundbed.soilResistivityOhmCm must be > 0');
    if (typeof groundbed.activeColumnLengthM !== 'number' || groundbed.activeColumnLengthM <= 0)
      errors.push('VAL-G04: groundbed.activeColumnLengthM must be > 0');
    if (typeof groundbed.columnDiameterM !== 'number' || groundbed.columnDiameterM <= 0)
      errors.push('VAL-G05: groundbed.columnDiameterM must be > 0');
    if (groundbed.activeColumnLengthM && groundbed.columnDiameterM &&
        groundbed.columnDiameterM >= groundbed.activeColumnLengthM)
      warnings.push('VAL-G06: columnDiameterM >= activeColumnLengthM — unusually wide column');
    if (groundbed.type !== 'deepwell') {
      if (typeof groundbed.numberOfAnodes !== 'number' || groundbed.numberOfAnodes < 1)
        errors.push('VAL-G07: groundbed.numberOfAnodes must be >= 1 for shallow/horizontal');
      if (typeof groundbed.anodeSpacingM !== 'number' || groundbed.anodeSpacingM <= 0)
        errors.push('VAL-G08: groundbed.anodeSpacingM must be > 0 for shallow/horizontal');
    }
    if (typeof groundbed.installationDepthM !== 'number' || groundbed.installationDepthM <= 0)
      errors.push('VAL-G09: groundbed.installationDepthM must be > 0');
  }

  // Pipeline (optional)
  if (pipeline) {
    if (typeof pipeline.diameterM !== 'number' || pipeline.diameterM <= 0)
      errors.push('VAL-P01: pipeline.diameterM must be > 0');
    if (typeof pipeline.lengthM !== 'number' || pipeline.lengthM <= 0)
      errors.push('VAL-P02: pipeline.lengthM must be > 0');
    if (typeof pipeline.currentDensityMaPerM2 !== 'number' || pipeline.currentDensityMaPerM2 <= 0)
      errors.push('VAL-P03: pipeline.currentDensityMaPerM2 must be > 0');
    if (pipeline.operatingTempC !== undefined &&
        (typeof pipeline.operatingTempC !== 'number'))
      errors.push('VAL-P04: pipeline.operatingTempC must be a number');
  }

  // Circuit (optional)
  if (circuit) {
    if (typeof circuit.trCurrentRatingA !== 'number' || circuit.trCurrentRatingA <= 0)
      errors.push('VAL-C01: circuit.trCurrentRatingA must be > 0');
    if (typeof circuit.trVoltageRatingV !== 'number' || circuit.trVoltageRatingV <= 0)
      errors.push('VAL-C02: circuit.trVoltageRatingV must be > 0');
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3 — WENNER 4-PIN SOIL RESISTIVITY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculates apparent soil resistivity from a Wenner 4-pin field measurement.
 *
 * Formula: ρ = 2π · a · R    (SI: Ω·m)
 * Converted to Ω·cm: multiply by 100
 *
 * Reference: ASTM G57, IEEE Std 81
 *
 * @param {number} spacingM     - Electrode spacing (m) — "a" in Wenner formula
 * @param {number} resistanceOhm - Measured resistance (Ω) from instrument
 * @returns {WennerResult}
 */
export function calculateWennerResistivity(spacingM, resistanceOhm) {
  const resistivityOhmM = 2 * Math.PI * spacingM * resistanceOhm;
  const resistivityOhmCm = resistivityOhmM * 100;
  return {
    spacingM,
    resistanceOhm,
    resistivityOhmM,
    resistivityOhmCm,
    depthOfMeasurementM: spacingM, // Wenner depth ≈ electrode spacing
    classification: classifySoilResistivity(resistivityOhmCm),
  };
}

/**
 * Calculates average soil resistivity from multiple Wenner readings.
 * Filters outliers using IQR method before averaging.
 *
 * @param {WennerReading[]} readings - Array of {spacingM, resistanceOhm} objects
 * @returns {WennerAverageResult}
 */
export function calculateAverageResistivity(readings) {
  if (!Array.isArray(readings) || readings.length === 0) {
    return { valid: false, error: 'No readings provided' };
  }

  const results = readings.map(r => calculateWennerResistivity(r.spacingM, r.resistanceOhm));
  const values = results.map(r => r.resistivityOhmCm).sort((a, b) => a - b);

  // IQR outlier filter
  const q1 = values[Math.floor(values.length * 0.25)];
  const q3 = values[Math.floor(values.length * 0.75)];
  const iqr = q3 - q1;
  const lower = q1 - 1.5 * iqr;
  const upper = q3 + 1.5 * iqr;
  const filtered = values.filter(v => v >= lower && v <= upper);

  const average = filtered.reduce((a, b) => a + b, 0) / filtered.length;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const stdDev = Math.sqrt(filtered.reduce((sum, v) => sum + Math.pow(v - average, 2), 0) / filtered.length);

  return {
    valid: true,
    readings: results,
    averageResistivityOhmCm: average,
    minResistivityOhmCm: min,
    maxResistivityOhmCm: max,
    stdDevOhmCm: stdDev,
    outliersRemoved: values.length - filtered.length,
    classification: classifySoilResistivity(average),
  };
}

/**
 * Classifies soil corrosivity based on resistivity.
 * Per NACE SP0169 and BS EN 12501-1.
 *
 * @param {number} resistivityOhmCm
 * @returns {SoilClassification}
 */
export function classifySoilResistivity(resistivityOhmCm) {
  if (resistivityOhmCm < 1000)  return { class: 'Very Corrosive',    risk: 'very_high', color: '#dc2626' };
  if (resistivityOhmCm < 3000)  return { class: 'Corrosive',         risk: 'high',      color: '#ea580c' };
  if (resistivityOhmCm < 10000) return { class: 'Moderately Corrosive', risk: 'medium', color: '#ca8a04' };
  if (resistivityOhmCm < 30000) return { class: 'Mildly Corrosive',  risk: 'low',       color: '#65a30d' };
  return                               { class: 'Non-Corrosive',      risk: 'very_low',  color: '#16a34a' };
}

/**
 * Applies seasonal correction factor to measured resistivity.
 * Dry season soil is higher resistivity; wet season lower.
 *
 * @param {number} measuredResistivityOhmCm - As-measured value
 * @param {string} season - 'dry' | 'wet' | 'average'
 * @returns {number} Corrected resistivity (Ω·cm) for design
 */
export function applySeasonalCorrection(measuredResistivityOhmCm, season) {
  // Conservative factors per field practice (Saudi/Gulf region)
  const factors = { dry: 0.6, wet: 1.0, average: 0.8 };
  const factor = factors[season] ?? 1.0;
  return measuredResistivityOhmCm * factor;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4 — PIPELINE CURRENT REQUIREMENTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculates pipeline surface area.
 *
 * @param {number} diameterM - Pipe outside diameter (m)
 * @param {number} lengthM   - Pipe section length (m)
 * @returns {number} Surface area (m²)
 */
export function calculatePipelineSurfaceArea(diameterM, lengthM) {
  // Spreadsheet uses 3.14 (not Math.PI): =3.14*(L*D)
  return 3.14 * diameterM * lengthM;
}

/**
 * Converts pipe diameter from inches to metres using spreadsheet factor 39.37.
 * Spreadsheet formula: =D_inches/39.37
 */
export function convertDiameterInchesToMetres(diameterInches) {
  return diameterInches / 39.37;
}

/**
 * Calculates temperature-corrected current density.
 *
 * Formula (from PCP spreadsheet cell F22):
 *   i_corrected = i_base × (1 + 0.025 × (T_operating - T_reference))
 *
 * The factor 0.025 represents ~2.5% increase per °C above reference (15°C),
 * reflecting increased electrochemical activity at higher temperatures.
 *
 * @param {number} baseCurrentDensityMaPerM2 - Base current density at reference temp (mA/m²)
 * @param {number} operatingTempC            - Pipeline operating temperature (°C)
 * @param {number} referenceTempC            - Reference temperature (°C), default 15
 * @returns {number} Temperature-corrected current density (mA/m²)
 */
export function calculateTemperatureCorrectedCurrentDensity(
  baseCurrentDensityMaPerM2,
  operatingTempC,
  referenceTempC = RESISTIVITY_CONSTANTS.REFERENCE_TEMP_C
) {
  // Spreadsheet formula: =i_base * 1.25^((T_operating - 30) / 10)
  // Reference temperature in formula is 30°C (not 15°C)
  // The referenceTempC parameter is ignored — formula is fixed at 30°C base
  return baseCurrentDensityMaPerM2 * Math.pow(1.25, (operatingTempC - 30) / 10);
}

/**
 * Calculates total current required for pipeline protection.
 *
 * @param {number} surfaceAreaM2          - Pipeline surface area (m²)
 * @param {number} currentDensityMaPerM2  - Design current density (mA/m²)
 * @param {number} spareFactorPercent     - Spare current factor (%), default 30
 * @returns {CurrentRequirementResult}
 */
export function calculateCurrentRequirement(
  surfaceAreaM2,
  currentDensityMaPerM2,
  spareFactorPercent = 30
) {
  const baseCurrentA = (surfaceAreaM2 * currentDensityMaPerM2) / 1000;
  const withSpareA = baseCurrentA * (1 + spareFactorPercent / 100);
  return {
    surfaceAreaM2,
    baseCurrentA,
    withSpareA,
    spareFactorPercent,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5 — GROUNDBED RESISTANCE (SUNDE / DWIGHT FORMULAS)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculates deepwell groundbed resistance using the Sunde formula.
 *
 * Sunde formula (single vertical column):
 *   RG = (ρ / (2π·La)) × [ln(8·La/d) - 1]
 *
 * Source: Spreadsheet cell F75:
 *   =(F71/(2*PI()*F72))*(LN((8*F72/F73))-1)
 *
 * Where:
 *   ρ  = soil resistivity (Ω·cm → converted to Ω·m by /100)
 *   La = active column length (cm → m by /100) [F72]
 *   d  = column diameter (cm) [F73]
 *
 * @param {number} soilResistivityOhmCm    - Soil resistivity (Ω·cm)
 * @param {number} activeColumnLengthCm    - Coke column active length (cm)
 * @param {number} columnDiameterCm        - Borehole/column diameter (cm)
 * @returns {number} Groundbed resistance (Ω)
 */
export function calculateDeepwellResistance(
  soilResistivityOhmCm,
  activeColumnLengthCm,
  columnDiameterCm
) {
  // Spreadsheet uses raw cm values in formula — no unit conversion needed
  // Formula: =(rho/(2*PI()*La))*(LN((8*La/d))-1)
  const rho = soilResistivityOhmCm;   // Ω·cm (spreadsheet formula uses Ω·cm directly)
  const La  = activeColumnLengthCm;   // cm
  const d   = columnDiameterCm;       // cm

  return (rho / (2 * Math.PI * La)) * (Math.log((8 * La) / d) - 1);
}

/**
 * Calculates shallow vertical (distributed) groundbed resistance using the
 * modified Sunde formula for multiple vertical anodes in a row.
 *
 * Formula (from spreadsheet cell I75):
 *   RG = (ρ / (2π·N·La)) × [ln(8·La/d) - 1 + (2·La/S)·ln(0.656·N)]
 *
 * Where:
 *   N  = number of anode holes [I69]
 *   La = active column length per hole (cm) [I72]
 *   d  = column diameter (cm) [I73]
 *   S  = anode spacing centre-to-centre (cm) [I70]
 *
 * @param {number} soilResistivityOhmCm  - Soil resistivity (Ω·cm)
 * @param {number} numberOfAnodes        - Number of anode holes
 * @param {number} activeColumnLengthCm  - Active length per hole (cm)
 * @param {number} columnDiameterCm      - Column/borehole diameter (cm)
 * @param {number} anodeSpacingCm        - Centre-to-centre spacing (cm)
 * @returns {number} Groundbed resistance (Ω)
 */
export function calculateShallowVerticalResistance(
  soilResistivityOhmCm,
  numberOfAnodes,
  activeColumnLengthCm,
  columnDiameterCm,
  anodeSpacingCm
) {
  const rho = soilResistivityOhmCm;
  const N   = numberOfAnodes;
  const La  = activeColumnLengthCm;
  const d   = columnDiameterCm;
  const S   = anodeSpacingCm;

  return (rho / (2 * Math.PI * N * La)) *
    (Math.log((8 * La) / d) - 1 + ((2 * La) / S) * Math.log(0.656 * N));
}

/**
 * Calculates single vertical anode resistance using the Dwight formula.
 *
 * Dwight formula:
 *   R = (ρ / (2π·L)) × [ln(4L/d) - 1]
 *
 * Used for individual anode resistance before combining in parallel.
 *
 * @param {number} soilResistivityOhmCm - Soil resistivity (Ω·cm)
 * @param {number} anodeLengthCm        - Anode length (cm)
 * @param {number} anodeDiameterCm      - Anode diameter (cm)
 * @returns {number} Single anode resistance (Ω)
 */
export function calculateDwightAnodeResistance(
  soilResistivityOhmCm,
  anodeLengthCm,
  anodeDiameterCm
) {
  const rho = soilResistivityOhmCm;
  const L   = anodeLengthCm;
  const d   = anodeDiameterCm;

  return (rho / (2 * Math.PI * L)) * (Math.log((4 * L) / d) - 1);
}

/**
 * Calculates parallel resistance of multiple identical anodes.
 *
 * For N identical anodes at sufficient spacing:
 *   R_parallel = R_single / N
 *
 * @param {number} singleAnodeResistance - Single anode resistance (Ω)
 * @param {number} numberOfAnodes        - Number of anodes in parallel
 * @returns {number} Combined parallel resistance (Ω)
 */
export function calculateParallelAnodeResistance(singleAnodeResistance, numberOfAnodes) {
  if (numberOfAnodes <= 0) return Infinity;
  return singleAnodeResistance / numberOfAnodes;
}

/**
 * Selects and runs the appropriate groundbed resistance formula.
 *
 * @param {GroundbedParameters} params
 * @returns {GroundbedResistanceResult}
 */
export function calculateGroundbedResistance(params) {
  const {
    type,
    soilResistivityOhmCm,
    activeColumnLengthM,
    columnDiameterM,
    numberOfAnodes = 1,
    anodeSpacingM,
    installationDepthM,
  } = params;

  // Convert to cm for formula (spreadsheet uses cm throughout)
  const La_cm = activeColumnLengthM * 100;
  const d_cm  = columnDiameterM * 100;
  const S_cm  = (anodeSpacingM || 0) * 100;

  let resistance;
  let formulaUsed;

  switch (type) {
    case 'deepwell':
      resistance = calculateDeepwellResistance(soilResistivityOhmCm, La_cm, d_cm);
      formulaUsed = 'Sunde (single vertical column deepwell)';
      break;

    case 'shallow_vertical':
      resistance = calculateShallowVerticalResistance(
        soilResistivityOhmCm, numberOfAnodes, La_cm, d_cm, S_cm
      );
      formulaUsed = 'Sunde (multiple vertical anodes)';
      break;

    case 'horizontal':
      // Horizontal uses Dwight with depth correction; treat La as length
      resistance = calculateDwightAnodeResistance(soilResistivityOhmCm, La_cm, d_cm);
      formulaUsed = 'Dwight (horizontal anode)';
      break;

    default:
      return { valid: false, error: `Unknown groundbed type: ${type}` };
  }

  return {
    valid: true,
    type,
    resistanceOhm: resistance,
    soilResistivityOhmCm,
    activeColumnLengthM,
    columnDiameterM,
    numberOfAnodes,
    anodeSpacingM,
    installationDepthM,
    formulaUsed,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 6 — ANODE DESIGN
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculates the number of anodes required based on current demand.
 *
 * @param {number} requiredCurrentA      - Total current required with spare (A)
 * @param {number} anodeCurrentOutputA   - Single anode output (A), default TA-4 = 3.56A
 * @returns {number} Minimum number of anodes (rounded up)
 */
export function calculateAnodesFromCurrent(
  requiredCurrentA,
  anodeCurrentOutputA = RESISTIVITY_CONSTANTS.TA4_ANODE_CURRENT_OUTPUT_A
) {
  return Math.ceil(requiredCurrentA / anodeCurrentOutputA);
}

/**
 * Calculates the number of anodes required based on TR current rating.
 *
 * @param {number} trCurrentRatingA      - TR DC current rating (A)
 * @param {number} anodeCurrentOutputA   - Single anode output (A)
 * @returns {number} Minimum number of anodes from TR sizing
 */
export function calculateAnodesFromTRRating(
  trCurrentRatingA,
  anodeCurrentOutputA = RESISTIVITY_CONSTANTS.TA4_ANODE_CURRENT_OUTPUT_A
) {
  return trCurrentRatingA / anodeCurrentOutputA;
}

/**
 * Calculates design lifetime of the anode installation.
 *
 * Formula: Y = (N × W) / (C × Ir)
 *
 * @param {number} numberOfAnodes       - Proposed number of anodes
 * @param {number} anodeWeightKg        - Single anode weight (kg)
 * @param {number} consumptionRateKgAYr - Consumption rate (kg/A·year)
 * @param {number} trCurrentRatingA     - TR current rating (A)
 * @returns {number} Design lifetime (years)
 */
export function calculateAnodeLifetime(
  numberOfAnodes,
  anodeWeightKg,
  consumptionRateKgAYr,
  trCurrentRatingA
) {
  // Spreadsheet formula: =(N*W*0.85)/(Ir*C)  — 0.85 = residual material factor
  return (numberOfAnodes * anodeWeightKg * 0.85) / (consumptionRateKgAYr * trCurrentRatingA);
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 7 — CABLE & CIRCUIT RESISTANCE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculates resistance of a single cable run.
 *
 * @param {number} lengthM           - Cable length (m)
 * @param {number} resistancePerMOhm - Cable resistance per metre (Ω/m)
 * @returns {number} Cable resistance (Ω)
 */
export function calculateCableResistance(lengthM, resistancePerMOhm) {
  return lengthM * resistancePerMOhm;
}

/**
 * Calculates total anode tail cable resistance.
 * Anode cables are in parallel — sum of parallel resistances.
 *
 * For N cables with individual resistances R1, R2 ... Rn in parallel:
 *   1/R_total = Σ(1/Ri)
 *
 * @param {number[]} cableLengthsM       - Array of individual cable lengths (m)
 * @param {number}   resistancePerMOhm   - Cable resistance per metre (Ω/m)
 * @returns {AnodeCableResult}
 */
export function calculateAnodeTailCableResistance(cableLengthsM, resistancePerMOhm) {
  const individualResistances = cableLengthsM.map(l => l * resistancePerMOhm);
  // Parallel combination
  const reciprocalSum = individualResistances.reduce((sum, r) => sum + 1 / r, 0);
  const parallelResistance = 1 / reciprocalSum;

  return {
    numberOfCables: cableLengthsM.length,
    individualResistancesOhm: individualResistances,
    parallelResistanceOhm: parallelResistance,
    minCableResistanceOhm: Math.min(...individualResistances),
    maxCableResistanceOhm: Math.max(...individualResistances),
  };
}

/**
 * Calculates total circuit resistance.
 *
 * Formula (from spreadsheet section 8):
 *   RT = R_positive + R_negative + R_emf + R_structure
 *
 * @param {CircuitParameters} params
 * @returns {CircuitResistanceResult}
 */
export function calculateTotalCircuitResistance(params) {
  const {
    groundbedResistanceOhm,
    positiveMainCableResistanceOhm,
    negativeMainCableResistanceOhm,
    anodeTailCableResistanceOhm = 0,
    trCurrentRatingA,
    backEmfV = RESISTIVITY_CONSTANTS.BACK_EMF_V,
    structureEarthResistanceOhm = RESISTIVITY_CONSTANTS.DEFAULT_STRUCTURE_EARTH_RESISTANCE,
  } = params;

  const backEmfResistanceOhm = backEmfV / trCurrentRatingA;
  const positiveCircuitOhm = positiveMainCableResistanceOhm + groundbedResistanceOhm;
  const negativeCircuitOhm = negativeMainCableResistanceOhm;
  const totalOhm = positiveCircuitOhm + negativeCircuitOhm + backEmfResistanceOhm + structureEarthResistanceOhm;

  return {
    groundbedResistanceOhm,
    positiveMainCableResistanceOhm,
    negativeMainCableResistanceOhm,
    anodeTailCableResistanceOhm,
    backEmfResistanceOhm,
    structureEarthResistanceOhm,
    positiveCircuitOhm,
    negativeCircuitOhm,
    totalCircuitResistanceOhm: totalOhm,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 8 — TR SIZING & VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculates minimum TR voltage required.
 *
 * Formula (from spreadsheet cell F161):
 *   V_min = (RT × I_rated) / 0.7
 *
 * @param {number} totalCircuitResistanceOhm - RT (Ω)
 * @param {number} trCurrentRatingA          - TR rated current (A)
 * @param {number} efficiency                - TR efficiency factor, default 0.7
 * @returns {number} Minimum TR voltage (V)
 */
export function calculateMinimumTRVoltage(
  totalCircuitResistanceOhm,
  trCurrentRatingA,
  efficiency = RESISTIVITY_CONSTANTS.TR_EFFICIENCY
) {
  return (totalCircuitResistanceOhm * trCurrentRatingA) / efficiency;
}

/**
 * Calculates maximum allowable groundbed resistance.
 *
 * Formula (from spreadsheet cell F178):
 *   R_G_max = (V_rated / I_rated) × 0.7 − R_cable − R_structure
 *
 * This is the **maximum allowable** groundbed resistance — i.e. the remaining
 * voltage budget for the groundbed given the TR's voltage, cable losses and
 * structure resistance. It is the inverse budget check, NOT the effective
 * back-EMF resistance used in the total circuit R_T.
 *
 * It does NOT conflict with the SAES-X-600 §5.2.5 R_emf formula
 * (R_emf = V_backEMF / I_rated) used in calcTRCircuit. The two formulas
 * answer different questions:
 *   - R_emf:     "How much of the total R_T is contributed by back EMF?"
 *   - R_G_max:   "What is the maximum R_G we can tolerate and still meet V_min?"
 *
 * @param {number} trVoltageRatingV           - TR rated voltage (V)
 * @param {number} trCurrentRatingA           - TR rated current (A)
 * @param {number} totalCableResistanceOhm    - Total cable circuit resistance (Ω)
 * @param {number} backEmfV                   - Back EMF (V), default 2
 * @param {number} structureEarthResistanceOhm - Rs (Ω)
 * @returns {number} Maximum allowable groundbed resistance (Ω)
 */
export function calculateMaxAllowableGroundbedResistance(
  trVoltageRatingV,
  trCurrentRatingA,
  totalCableResistanceOhm,
  backEmfV = RESISTIVITY_CONSTANTS.BACK_EMF_V,
  structureEarthResistanceOhm = RESISTIVITY_CONSTANTS.DEFAULT_STRUCTURE_EARTH_RESISTANCE
) {
  return (RESISTIVITY_CONSTANTS.TR_EFFICIENCY * ((trVoltageRatingV - backEmfV) / trCurrentRatingA))
    - totalCableResistanceOhm
    - structureEarthResistanceOhm;
}

/**
 * Calculates maximum allowable total circuit resistance.
 *
 * @param {number} trVoltageRatingV  - TR rated voltage (V)
 * @param {number} trCurrentRatingA  - TR rated current (A)
 * @returns {number} Maximum allowable circuit resistance (Ω)
 */
export function calculateMaxAllowableCircuitResistance(trVoltageRatingV, trCurrentRatingA) {
  return (trVoltageRatingV / trCurrentRatingA) * RESISTIVITY_CONSTANTS.TR_EFFICIENCY;
}

/**
 * Full TR sizing validation.
 *
 * Checks:
 *   1. Groundbed resistance < max allowable groundbed resistance
 *   2. Total circuit resistance < max allowable circuit resistance
 *   3. Minimum required voltage <= proposed TR voltage rating
 *
 * @param {TRValidationParams} params
 * @returns {TRValidationResult}
 */
export function validateTRSizing(params) {
  const {
    trVoltageRatingV,
    trCurrentRatingA,
    groundbedResistanceOhm,
    totalCircuitResistanceOhm,
    totalCableResistanceOhm,
    backEmfV = RESISTIVITY_CONSTANTS.BACK_EMF_V,
    structureEarthResistanceOhm = RESISTIVITY_CONSTANTS.DEFAULT_STRUCTURE_EARTH_RESISTANCE,
  } = params;

  const rgMax = calculateMaxAllowableGroundbedResistance(
    trVoltageRatingV, trCurrentRatingA, totalCableResistanceOhm, backEmfV, structureEarthResistanceOhm
  );
  const rtMax = calculateMaxAllowableCircuitResistance(trVoltageRatingV, trCurrentRatingA);
  const vMin  = calculateMinimumTRVoltage(totalCircuitResistanceOhm, trCurrentRatingA);

  const groundbedOk    = groundbedResistanceOhm < rgMax;
  const circuitOk      = totalCircuitResistanceOhm < rtMax;
  const voltageOk      = vMin <= trVoltageRatingV;

  return {
    trVoltageRatingV,
    trCurrentRatingA,
    groundbedResistanceOhm,
    totalCircuitResistanceOhm,
    maxAllowableGroundbedResistanceOhm: rgMax,
    maxAllowableCircuitResistanceOhm: rtMax,
    minimumRequiredVoltageV: vMin,
    checks: {
      groundbedResistanceOk:    { pass: groundbedOk,    actual: groundbedResistanceOhm.toFixed(4),    limit: rgMax.toFixed(4),    unit: 'Ω' },
      circuitResistanceOk:      { pass: circuitOk,      actual: totalCircuitResistanceOhm.toFixed(4), limit: rtMax.toFixed(4),    unit: 'Ω' },
      voltageAdequate:          { pass: voltageOk,      actual: vMin.toFixed(2),                      limit: trVoltageRatingV,    unit: 'V' },
    },
    allChecksPassed: groundbedOk && circuitOk && voltageOk,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 9 — MASTER CALCULATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Runs the complete resistivity and groundbed analysis.
 *
 * @param {ResistivityInput} input
 * @returns {ResistivityResult}
 */
export function runResistivityAnalysis(input) {
  const validation = validateResistivityInput(input);
  if (!validation.valid) {
    return { success: false, errors: validation.errors, warnings: validation.warnings };
  }

  const { wenner, groundbed, pipeline, circuit } = input;

  // ── Wenner readings (optional) ───────────────────────────────────────────
  let wennerResult = null;
  if (wenner?.readings?.length > 0) {
    wennerResult = calculateAverageResistivity(wenner.readings);
  } else if (wenner?.spacingM && wenner?.resistanceOhm) {
    wennerResult = calculateWennerResistivity(wenner.spacingM, wenner.resistanceOhm);
    wennerResult = { valid: true, averageResistivityOhmCm: wennerResult.resistivityOhmCm, readings: [wennerResult], classification: wennerResult.classification };
  }

  // ── Soil classification ──────────────────────────────────────────────────
  const soilClassification = classifySoilResistivity(groundbed.soilResistivityOhmCm);

  // ── Groundbed resistance ─────────────────────────────────────────────────
  const groundbedResult = calculateGroundbedResistance(groundbed);
  if (!groundbedResult.valid) {
    return { success: false, errors: [groundbedResult.error], warnings: validation.warnings };
  }

  // ── Pipeline current requirement (optional) ──────────────────────────────
  let currentResult = null;
  if (pipeline) {
    const surfaceArea = calculatePipelineSurfaceArea(pipeline.diameterM, pipeline.lengthM);
    const correctedDensity = pipeline.operatingTempC !== undefined
      ? calculateTemperatureCorrectedCurrentDensity(pipeline.currentDensityMaPerM2, pipeline.operatingTempC)
      : pipeline.currentDensityMaPerM2;
    currentResult = {
      ...calculateCurrentRequirement(surfaceArea, correctedDensity, pipeline.spareFactorPercent ?? 30),
      correctedCurrentDensityMaPerM2: correctedDensity,
      temperatureCorrectionApplied: pipeline.operatingTempC !== undefined,
    };
  }

  // ── Anode design ─────────────────────────────────────────────────────────
  let anodeResult = null;
  if (circuit && currentResult) {
    const anodesFromCurrent = calculateAnodesFromCurrent(currentResult.withSpareA, circuit.anodeCurrentOutputA ?? RESISTIVITY_CONSTANTS.TA4_ANODE_CURRENT_OUTPUT_A);
    const anodesFromTR = calculateAnodesFromTRRating(circuit.trCurrentRatingA, circuit.anodeCurrentOutputA ?? RESISTIVITY_CONSTANTS.TA4_ANODE_CURRENT_OUTPUT_A);
    const proposedAnodes = circuit.proposedNumberOfAnodes ?? Math.max(anodesFromCurrent, Math.ceil(anodesFromTR));
    const lifetime = calculateAnodeLifetime(
      proposedAnodes,
      circuit.anodeWeightKg ?? RESISTIVITY_CONSTANTS.TA4_ANODE_WEIGHT_KG,
      circuit.consumptionRateKgAYear ?? RESISTIVITY_CONSTANTS.TA4_CONSUMPTION_RATE_KG_A_YEAR,
      circuit.trCurrentRatingA
    );
    anodeResult = {
      anodesRequiredFromCurrent: anodesFromCurrent,
      anodesRequiredFromTR: anodesFromTR,
      proposedNumberOfAnodes: proposedAnodes,
      designLifetimeYears: lifetime,
      meetsDesignLife: lifetime >= (circuit.requiredDesignLifeYears ?? RESISTIVITY_CONSTANTS.DEFAULT_DESIGN_LIFE_YEARS),
    };
  }

  // ── TR validation (optional) ─────────────────────────────────────────────
  let trValidation = null;
  if (circuit?.trVoltageRatingV && circuit?.trCurrentRatingA) {
    const positiveCableR = circuit.positiveMainCableLengthM
      ? calculateCableResistance(circuit.positiveMainCableLengthM, RESISTIVITY_CONSTANTS.CABLE_35MM2_RESISTANCE_PER_M)
      : 0;
    const negativeCableR = circuit.negativeMainCableLengthM
      ? calculateCableResistance(circuit.negativeMainCableLengthM, RESISTIVITY_CONSTANTS.CABLE_35MM2_RESISTANCE_PER_M)
      : 0;

    const circuitR = calculateTotalCircuitResistance({
      groundbedResistanceOhm: groundbedResult.resistanceOhm,
      positiveMainCableResistanceOhm: positiveCableR,
      negativeMainCableResistanceOhm: negativeCableR,
      trCurrentRatingA: circuit.trCurrentRatingA,
    });

    trValidation = validateTRSizing({
      trVoltageRatingV: circuit.trVoltageRatingV,
      trCurrentRatingA: circuit.trCurrentRatingA,
      groundbedResistanceOhm: groundbedResult.resistanceOhm,
      totalCircuitResistanceOhm: circuitR.totalCircuitResistanceOhm,
      totalCableResistanceOhm: positiveCableR + negativeCableR,
    });
  }

  return {
    success: true,
    errors: [],
    warnings: validation.warnings,
    soilClassification,
    wennerResult,
    groundbedResult,
    currentResult,
    anodeResult,
    trValidation,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 10 — UTILITY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds a ResistivityInput from flat parameters.
 * Convenience factory.
 */
export function buildResistivityInput({
  // Wenner
  wennerReadings,
  wennerSpacingM,
  wennerResistanceOhm,
  // Groundbed
  groundbedType = 'deepwell',
  soilResistivityOhmCm,
  activeColumnLengthM,
  columnDiameterM,
  numberOfAnodes,
  anodeSpacingM,
  installationDepthM,
  // Pipeline
  pipelineDiameterM,
  pipelineLengthM,
  currentDensityMaPerM2,
  operatingTempC,
  spareFactorPercent,
  // Circuit
  trCurrentRatingA,
  trVoltageRatingV,
  positiveMainCableLengthM,
  negativeMainCableLengthM,
  proposedNumberOfAnodes,
  anodeCurrentOutputA,
  anodeWeightKg,
  consumptionRateKgAYear,
  requiredDesignLifeYears,
}) {
  return {
    wenner: wennerReadings
      ? { readings: wennerReadings }
      : (wennerSpacingM ? { spacingM: wennerSpacingM, resistanceOhm: wennerResistanceOhm } : undefined),
    groundbed: {
      type: groundbedType,
      soilResistivityOhmCm,
      activeColumnLengthM,
      columnDiameterM,
      numberOfAnodes,
      anodeSpacingM,
      installationDepthM,
    },
    pipeline: pipelineDiameterM ? {
      diameterM: pipelineDiameterM,
      lengthM: pipelineLengthM,
      currentDensityMaPerM2,
      operatingTempC,
      spareFactorPercent,
    } : undefined,
    circuit: trCurrentRatingA ? {
      trCurrentRatingA,
      trVoltageRatingV,
      positiveMainCableLengthM,
      negativeMainCableLengthM,
      proposedNumberOfAnodes,
      anodeCurrentOutputA,
      anodeWeightKg,
      consumptionRateKgAYear,
      requiredDesignLifeYears,
    } : undefined,
  };
}
