/**
 * attenuationEngine.js
 *
 * Cathodic Protection Pipeline Attenuation Calculation Engine
 * Reverse-engineered from field-validated spreadsheet:
 *   "Attenuation Calculation for 30″ BB-2 – Shore to Berri Section"
 *
 * Standards: NACE SP0169, ISO 15589-1, BS EN 13509
 * Model:     Transmission-line / cosh attenuation model
 *            with linear superposition for multiple CP stations
 *
 * Architecture: Pure functions only.
 *               No React, Vue, Angular, Node.js, or browser dependencies.
 *               Runs in any JavaScript environment (browser, Node.js, Deno, worker).
 *
 * All potentials are expressed as POSITIVE MAGNITUDES (mV or V) measured
 * against the Cu/CuSO₄ reference electrode — consistent with industry
 * convention in the Arabian Gulf / Saudi Aramco project context.
 * e.g. −850 mV CSE is represented as 850.
 */

'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1 — CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const ATTENUATION_CONSTANTS = Object.freeze({
  /** Inches → metres conversion factor used in original spreadsheet (39.36, not 39.3701) */
  INCH_TO_M: 39.36,

  /** km → m */
  KM_TO_M: 1000,

  /** µΩ·cm → Ω·m: multiply by 1e-8 */
  MICRO_OHM_CM_TO_OHM_M: 1e-8,

  /** µS/m² → S/m²: multiply by 1e-6 */
  MICRO_SIEMENS_TO_SIEMENS: 1e-6,

  /** Maximum cosh argument before numerical overflow (cosh(710) ~ 1e308) */
  MAX_COSH_ARG: 700,

  /** NACE SP0169 minimum protection criterion (positive magnitude, mV Cu/CuSO₄) */
  NACE_MIN_PROTECTION_MV: 850,

  /** Default steel resistivity for carbon steel pipelines (µΩ·cm) */
  DEFAULT_STEEL_RESISTIVITY: 18,

  /** Aged FBE coating conductivity at 1000 Ω·cm soil (µS/m²) — 25-year condition */
  DEFAULT_COATING_G_FBE_AGED: 300,
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2 — VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validates attenuation input parameters.
 * @param {AttenuationInput} input
 * @returns {ValidationResult}
 */
function validateAttenuationInput(input) {
  const errors = [];
  const warnings = [];

  if (!input || typeof input !== 'object') {
    return { valid: false, errors: ['Input must be a non-null object'], warnings: [] };
  }

  const { pipe, coating, potentials, stations, profileConfig } = input;

  // Pipe validation
  if (!pipe) {
    errors.push('VAL-001: pipe object is required');
  } else {
    if (typeof pipe.diameterInches !== 'number' || pipe.diameterInches <= 0)
      errors.push('VAL-001: pipe.diameterInches must be > 0');
    if (typeof pipe.wallThicknessInches !== 'number' || pipe.wallThicknessInches <= 0)
      errors.push('VAL-002a: pipe.wallThicknessInches must be > 0');
    if (pipe.diameterInches && pipe.wallThicknessInches &&
        pipe.wallThicknessInches >= pipe.diameterInches / 2)
      errors.push('VAL-002b: wallThicknessInches must be less than OD/2');
    if (typeof pipe.totalLengthKm !== 'number' || pipe.totalLengthKm <= 0)
      errors.push('VAL-003: pipe.totalLengthKm must be > 0');
    if (typeof pipe.maxProtectionLengthKm !== 'number' || pipe.maxProtectionLengthKm <= 0)
      errors.push('VAL-003b: pipe.maxProtectionLengthKm must be > 0');
    if (pipe.totalLengthKm && pipe.maxProtectionLengthKm &&
        pipe.maxProtectionLengthKm > pipe.totalLengthKm)
      warnings.push('VAL-003c: maxProtectionLengthKm exceeds totalLengthKm');
    if (typeof pipe.steelResistivityMicroOhmCm !== 'number' || pipe.steelResistivityMicroOhmCm <= 0)
      errors.push('VAL-004: pipe.steelResistivityMicroOhmCm must be > 0');
  }

  // Coating validation
  if (!coating) {
    errors.push('VAL-005: coating object is required');
  } else {
    if (typeof coating.conductivityMicroSiemensPerM2 !== 'number' || coating.conductivityMicroSiemensPerM2 <= 0)
      errors.push('VAL-006: coating.conductivityMicroSiemensPerM2 must be > 0');
    if (typeof coating.soilResistivityOhmCm !== 'number' || coating.soilResistivityOhmCm <= 0)
      errors.push('VAL-007: coating.soilResistivityOhmCm must be > 0');
    if (typeof coating.currentDensityMaPerM2 !== 'number' || coating.currentDensityMaPerM2 <= 0)
      errors.push('VAL-008: coating.currentDensityMaPerM2 must be > 0');
  }

  // Potential validation
  if (!potentials) {
    errors.push('VAL-009: potentials object is required');
  } else {
    if (typeof potentials.naturalMv !== 'number' || potentials.naturalMv <= 0)
      errors.push('VAL-010: potentials.naturalMv must be > 0');
    if (typeof potentials.drainPointMv !== 'number' || potentials.drainPointMv <= 0)
      errors.push('VAL-011: potentials.drainPointMv must be > 0');
    if (typeof potentials.minimumMv !== 'number' || potentials.minimumMv <= 0)
      errors.push('VAL-012: potentials.minimumMv must be > 0');
    if (potentials.drainPointMv && potentials.naturalMv &&
        potentials.drainPointMv <= potentials.naturalMv)
      errors.push('VAL-013: drainPointMv must exceed naturalMv (drain point must be more negative)');
    if (potentials.minimumMv && potentials.naturalMv &&
        potentials.minimumMv <= potentials.naturalMv)
      errors.push('VAL-014: minimumMv must exceed naturalMv');
    if (potentials.minimumMv && potentials.drainPointMv &&
        potentials.minimumMv > potentials.drainPointMv)
      warnings.push('VAL-015: minimumMv exceeds drainPointMv — criterion is stricter than applied potential');
  }

  // Stations validation
  if (!Array.isArray(stations) || stations.length === 0) {
    errors.push('VAL-016: at least one CP station must be defined in stations array');
  } else {
    stations.forEach((station, i) => {
      if (typeof station.id === 'undefined')
        warnings.push(`VAL-017: station[${i}] missing id`);
      if (typeof station.positionKm !== 'number')
        errors.push(`VAL-018: station[${i}].positionKm must be a number`);
    });
  }

  // Profile config
  if (profileConfig) {
    if (typeof profileConfig.startKm !== 'number')
      errors.push('VAL-019: profileConfig.startKm must be a number');
    if (typeof profileConfig.endKm !== 'number')
      errors.push('VAL-020: profileConfig.endKm must be a number');
    if (profileConfig.startKm >= profileConfig.endKm)
      errors.push('VAL-021: profileConfig.startKm must be less than endKm');
    if (profileConfig.stepKm !== undefined && profileConfig.stepKm <= 0)
      errors.push('VAL-022: profileConfig.stepKm must be > 0');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3 — GEOMETRIC CALCULATIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculates the cross-sectional area of pipe steel wall.
 *
 * Formula: Ax = π/4 · [(D/39.36)² − ((D/39.36) − 2·(t/39.36))²]
 *
 * @param {number} diameterInches  - Pipe outside diameter (inches)
 * @param {number} wallThicknessInches - Pipe wall thickness (inches)
 * @returns {number} Cross-sectional area of steel (m²)
 */
function calculatePipeSteelArea(diameterInches, wallThicknessInches) {
  const D_m = diameterInches / ATTENUATION_CONSTANTS.INCH_TO_M;
  const t_m = wallThicknessInches / ATTENUATION_CONSTANTS.INCH_TO_M;
  return (Math.PI / 4) * (Math.pow(D_m, 2) - Math.pow(D_m - 2 * t_m, 2));
}

/**
 * Calculates unit surface area of pipe (circumference per metre length).
 *
 * Formula: A1 = π · (D / 39.36)
 *
 * @param {number} diameterInches - Pipe outside diameter (inches)
 * @returns {number} Unit surface area (m²/m)
 */
function calculateUnitSurfaceArea(diameterInches) {
  return Math.PI * (diameterInches / ATTENUATION_CONSTANTS.INCH_TO_M);
}

/**
 * Calculates total pipe surface area from drain point to check point X.
 *
 * @param {number} unitSurfaceAreaM2PerM - A1 (m²/m)
 * @param {number} lengthKm             - Distance to check point (km)
 * @returns {number} Total surface area (m²)
 */
function calculateTotalSurfaceArea(unitSurfaceAreaM2PerM, lengthKm) {
  return unitSurfaceAreaM2PerM * lengthKm * ATTENUATION_CONSTANTS.KM_TO_M;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4 — ELECTRICAL RESISTANCE CALCULATIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculates the unit longitudinal resistance of the pipe steel.
 *
 * Formula: RS = (r × 10⁻⁸) / Ax   [Ω/m]
 * Where r is in µΩ·cm, Ax in m².
 *
 * @param {number} steelResistivityMicroOhmCm - Steel resistivity (µΩ·cm), typically 18
 * @param {number} pipeSteelAreaM2           - Cross-sectional area of steel (m²)
 * @returns {number} Unit pipe resistance (Ω/m)
 */
function calculatePipeResistance(steelResistivityMicroOhmCm, pipeSteelAreaM2) {
  // Convert µΩ·cm to Ω·m: multiply by 1e-8
  const resistivity_OhmM = steelResistivityMicroOhmCm * ATTENUATION_CONSTANTS.MICRO_OHM_CM_TO_OHM_M;
  return resistivity_OhmM / pipeSteelAreaM2;
}

/**
 * Calculates the coating leakage resistivity (unit), corrected for actual soil resistivity.
 *
 * The coating conductance g is specified at a reference soil resistivity of 1000 Ω·cm.
 * Actual leakage scales proportionally with soil resistivity.
 *
 * Formula: RL = 1 / (g × 10⁻⁶ × A1) × (ρ / 1000)   [Ω·m]
 *
 * @param {number} coatingConductivityMicroSiemensPerM2 - g (µS/m²) at 1000 Ω·cm reference soil
 * @param {number} unitSurfaceAreaM2PerM               - A1 (m²/m)
 * @param {number} soilResistivityOhmCm                - Actual average soil resistivity (Ω·cm)
 * @returns {number} Coating leakage resistivity (Ω·m)
 */
function calculateLeakageResistance(
  coatingConductivityMicroSiemensPerM2,
  unitSurfaceAreaM2PerM,
  soilResistivityOhmCm
) {
  const g_S = coatingConductivityMicroSiemensPerM2 * ATTENUATION_CONSTANTS.MICRO_SIEMENS_TO_SIEMENS;
  // At actual soil resistivity (reference is 1000 Ω·cm)
  return (1 / (g_S * unitSurfaceAreaM2PerM)) * (soilResistivityOhmCm / 1000);
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5 — ATTENUATION CONSTANT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculates the pipeline attenuation constant α.
 *
 * Derived from transmission-line theory:
 *   α = √(RS / RL)   [/m]
 *
 * Interpretation: a larger α means faster potential decay with distance.
 * High soil resistivity → smaller α (better protection reach).
 * Poor coating (higher g) → larger α (faster decay).
 *
 * @param {number} unitPipeResistanceOhmPerM    - RS (Ω/m)
 * @param {number} coatingLeakageResistanceOhmM - RL (Ω·m)
 * @returns {number} Attenuation constant α (/m)
 */
function calculateAttenuationConstant(unitPipeResistanceOhmPerM, coatingLeakageResistanceOhmM) {
  return Math.sqrt(unitPipeResistanceOhmPerM / coatingLeakageResistanceOhmM);
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 6 — CURRENT REQUIREMENTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculates the current required to protect the pipeline to check point X.
 *
 * Formula: I_REQ(X) = A_TOT × cd / 1000   [A]
 *
 * @param {number} totalSurfaceAreaM2     - ATOT (m²) to check point X
 * @param {number} currentDensityMaPerM2  - Design current density (mA/m²)
 * @returns {number} Required current to check point X (A)
 */
function calculateCurrentRequirement(totalSurfaceAreaM2, currentDensityMaPerM2) {
  return (totalSurfaceAreaM2 * currentDensityMaPerM2) / 1000;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 7 — POTENTIAL PROFILE CALCULATIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculates the pipe potential at a given distance from a SINGLE CP station.
 *
 * Uses the cosh attenuation model:
 *   V(x) = E_NAT + ΔE₀ / cosh(α · |x - x_station| · 1000)
 *
 * Where:
 *   - x and x_station are in km (multiplied by 1000 to convert to metres for α in /m)
 *   - E_NAT = naturalPotentialMv / 1000 (volts, positive magnitude)
 *   - ΔE₀ = (drainPointMv - naturalMv) / 1000 (volts)
 *
 * @param {number} pipeKmPosition    - Evaluation point (km chainage)
 * @param {number} stationKmPosition - CP station drain point position (km)
 * @param {number} alpha             - Attenuation constant (1/m)
 * @param {number} naturalPotentialMv - Natural pipe potential (mV, positive magnitude)
 * @param {number} drainPointMv       - On-potential at drain point (mV, positive magnitude)
 * @returns {number} Pipe potential at x from this station (V, positive magnitude)
 */
function calculatePotentialAtDistance(
  pipeKmPosition,
  stationKmPosition,
  alpha,
  naturalPotentialMv,
  drainPointMv
) {
  const E_NAT_V = naturalPotentialMv / 1000;
  const deltaE0_V = (drainPointMv - naturalPotentialMv) / 1000;
  const distanceM = Math.abs(pipeKmPosition - stationKmPosition) * ATTENUATION_CONSTANTS.KM_TO_M;
  const coshArg = alpha * distanceM;

  // Protect against numerical overflow for very long distances
  if (coshArg > ATTENUATION_CONSTANTS.MAX_COSH_ARG) {
    return E_NAT_V; // Potential has decayed to natural — no protection
  }

  return E_NAT_V + deltaE0_V / Math.cosh(coshArg);
}

/**
 * Calculates the combined pipe potential at a point due to MULTIPLE CP stations.
 *
 * Uses linear superposition:
 *   V_combined(x) = E_NAT + Σᵢ [ Vᵢ(x) - E_NAT ]
 *
 * This correctly accounts for overlapping protection zones.
 *
 * @param {number}   pipeKmPosition    - Evaluation point (km chainage)
 * @param {number[]} stationPositionsKm - Array of CP station positions (km)
 * @param {number}   alpha             - Attenuation constant (1/m)
 * @param {number}   naturalPotentialMv - Natural pipe potential (mV)
 * @param {number}   drainPointMv       - On-potential at each drain point (mV)
 * @returns {number} Combined pipe potential at x (V, positive magnitude)
 */
function calculateCombinedPotentialAtPoint(
  pipeKmPosition,
  stationPositionsKm,
  alpha,
  naturalPotentialMv,
  drainPointMv
) {
  const E_NAT_V = naturalPotentialMv / 1000;

  const totalSwing = stationPositionsKm.reduce((sum, stationKm) => {
    const Vstation = calculatePotentialAtDistance(
      pipeKmPosition,
      stationKm,
      alpha,
      naturalPotentialMv,
      drainPointMv
    );
    return sum + (Vstation - E_NAT_V);
  }, 0);

  return E_NAT_V + totalSwing;
}

/**
 * Generates the full potential profile along the pipeline.
 *
 * Evaluates potential at regular km intervals for each station individually
 * and as a combined superposition.
 *
 * @param {Object} params
 * @param {number}   params.startKm            - Profile start (km chainage)
 * @param {number}   params.endKm              - Profile end (km chainage)
 * @param {number}   params.stepKm             - Evaluation step (km), default 1.0
 * @param {CPStation[]} params.stations        - Array of CP station objects
 * @param {number}   params.alpha              - Attenuation constant (1/m)
 * @param {number}   params.naturalPotentialMv - Natural potential (mV)
 * @param {number}   params.drainPointMv       - Drain point on-potential (mV)
 * @param {number}   params.minimumPotentialMv - Minimum protection criterion (mV)
 * @returns {PotentialProfilePoint[]} Array of profile points
 */
function calculatePotentialProfile({
  startKm,
  endKm,
  stepKm = 1.0,
  stations,
  alpha,
  naturalPotentialMv,
  drainPointMv,
  minimumPotentialMv,
}) {
  const profile = [];
  const stationPositionsKm = stations.map((s) => s.positionKm);

  let km = startKm;
  while (km <= endKm + 1e-9) {
    const roundedKm = Math.round(km * 1e6) / 1e6; // floating-point rounding guard

    // Per-station potentials
    const perStation = stations.map((station) => ({
      stationId: station.id,
      stationPositionKm: station.positionKm,
      potentialV: calculatePotentialAtDistance(
        roundedKm,
        station.positionKm,
        alpha,
        naturalPotentialMv,
        drainPointMv
      ),
    }));

    // Combined potential
    const combinedV = calculateCombinedPotentialAtPoint(
      roundedKm,
      stationPositionsKm,
      alpha,
      naturalPotentialMv,
      drainPointMv
    );

    const isProtected = combinedV >= minimumPotentialMv / 1000;

    profile.push({
      km: roundedKm,
      combinedPotentialV: combinedV,
      combinedPotentialMv: combinedV * 1000,
      isProtected,
      perStation,
    });

    km += stepKm;
  }

  return profile;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 8 — PROTECTION LENGTH ANALYSIS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculates the maximum protection reach from a single station.
 *
 * Solves: PotMIN/1000 = E_NAT + ΔE₀ / cosh(α · L)
 * → cosh(α · L) = ΔE₀ / (PotMIN/1000 - E_NAT)
 * → L = acosh(ΔE₀ / ΔE_req) / α
 *
 * @param {number} alpha             - Attenuation constant (1/m)
 * @param {number} naturalPotentialMv - Natural potential (mV)
 * @param {number} drainPointMv       - Drain point on-potential (mV)
 * @param {number} minimumPotentialMv - Minimum protection criterion (mV)
 * @returns {number|null} Maximum protection length (km), or null if criterion not achievable
 */
function calculateProtectionLength(alpha, naturalPotentialMv, drainPointMv, minimumPotentialMv) {
  const deltaE0 = (drainPointMv - naturalPotentialMv) / 1000;
  const deltaEreq = (minimumPotentialMv - naturalPotentialMv) / 1000;

  if (deltaEreq <= 0) return null; // criterion is at or below natural — always protected
  if (deltaE0 <= 0) return null;   // drain point swing is zero or negative — invalid

  const coshValue = deltaE0 / deltaEreq;
  if (coshValue < 1) return 0;     // cannot achieve minimum — drain point ΔE too small

  // acosh(x) = ln(x + sqrt(x²-1))
  const acoshValue = Math.log(coshValue + Math.sqrt(coshValue * coshValue - 1));
  const lengthM = acoshValue / alpha;
  return lengthM / ATTENUATION_CONSTANTS.KM_TO_M;
}

/**
 * Calculates the potential at the required check point X and determines if
 * the design criterion is met at that point (single station assessment).
 *
 * @param {number} alpha             - Attenuation constant (1/m)
 * @param {number} naturalPotentialMv - Natural potential (mV)
 * @param {number} drainPointMv       - Drain point potential (mV)
 * @param {number} minimumPotentialMv - Minimum protection criterion (mV)
 * @param {number} checkPointKm       - Distance to check point X (km)
 * @returns {CheckPointResult}
 */
function calculateCheckPointAssessment(
  alpha,
  naturalPotentialMv,
  drainPointMv,
  minimumPotentialMv,
  checkPointKm
) {
  const E_NAT_V = naturalPotentialMv / 1000;
  const deltaE0_V = (drainPointMv - naturalPotentialMv) / 1000;
  const deltaEreq_V = (minimumPotentialMv - naturalPotentialMv) / 1000;

  const distanceM = checkPointKm * ATTENUATION_CONSTANTS.KM_TO_M;
  const coshArg = alpha * distanceM;
  const coshValue = coshArg > ATTENUATION_CONSTANTS.MAX_COSH_ARG ? Infinity : Math.cosh(coshArg);

  const deltaEcalc_V = coshValue === Infinity ? 0 : deltaE0_V / coshValue;
  const potCalc_V = E_NAT_V + deltaEcalc_V;

  return {
    checkPointKm,
    deltaE0Volts: deltaE0_V,
    deltaERequired_V: deltaEreq_V,
    deltaECalculated_V: deltaEcalc_V,
    potentialCalculated_V: potCalc_V,
    potentialCalculated_mV: potCalc_V * 1000,
    criterionMet: potCalc_V >= minimumPotentialMv / 1000,
    deficitVolts: Math.max(0, minimumPotentialMv / 1000 - potCalc_V),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 9 — MASTER CALCULATION FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Master calculation: runs the full attenuation analysis from a validated input object.
 *
 * Calculation sequence:
 *   1. Pipe geometry → Ax, A1
 *   2. Surface areas → A_TOT(X), A_TOT(full)
 *   3. Current requirements → I_REQ(X), I_REQ(TOT)
 *   4. Electrical properties → RS, RL
 *   5. Attenuation constant → α
 *   6. Potential parameters → ΔE₀, ΔE_req
 *   7. Check point assessment (X)
 *   8. Protection reach from each station
 *   9. Full potential profile (all stations + combined)
 *
 * @param {AttenuationInput} input - Validated input object
 * @returns {AttenuationResult}
 */
function runAttenuationAnalysis(input) {
  const validation = validateAttenuationInput(input);
  if (!validation.valid) {
    return {
      success: false,
      errors: validation.errors,
      warnings: validation.warnings,
      intermediates: null,
      checkPointAssessment: null,
      profile: null,
      stationReachKm: null,
      summary: null,
    };
  }

  const { pipe, coating, potentials, stations, profileConfig } = input;

  // Step 1 — Pipe geometry
  const pipeSteelAreaM2 = calculatePipeSteelArea(pipe.diameterInches, pipe.wallThicknessInches);
  const unitSurfaceAreaM2PerM = calculateUnitSurfaceArea(pipe.diameterInches);

  // Step 2 — Surface areas
  const surfaceAreaToX_M2 = calculateTotalSurfaceArea(unitSurfaceAreaM2PerM, pipe.maxProtectionLengthKm);
  const surfaceAreaTotal_M2 = calculateTotalSurfaceArea(unitSurfaceAreaM2PerM, pipe.totalLengthKm);

  // Step 3 — Current requirements
  const currentRequiredToX_A = calculateCurrentRequirement(surfaceAreaToX_M2, coating.currentDensityMaPerM2);
  const currentRequiredTotal_A = calculateCurrentRequirement(surfaceAreaTotal_M2, coating.currentDensityMaPerM2);

  // Step 4 — Electrical resistance
  const unitPipeResistance_OhmPerM = calculatePipeResistance(
    pipe.steelResistivityMicroOhmCm,
    pipeSteelAreaM2
  );
  const coatingLeakageResistance_OhmM = calculateLeakageResistance(
    coating.conductivityMicroSiemensPerM2,
    unitSurfaceAreaM2PerM,
    coating.soilResistivityOhmCm
  );

  // Step 5 — Attenuation constant
  const alpha = calculateAttenuationConstant(
    unitPipeResistance_OhmPerM,
    coatingLeakageResistance_OhmM
  );

  // Step 6 — Check point assessment
  const checkPointAssessment = calculateCheckPointAssessment(
    alpha,
    potentials.naturalMv,
    potentials.drainPointMv,
    potentials.minimumMv,
    pipe.maxProtectionLengthKm
  );

  // Step 7 — Protection reach per station
  const stationReachKm = calculateProtectionLength(
    alpha,
    potentials.naturalMv,
    potentials.drainPointMv,
    potentials.minimumMv
  );

  // Step 8 — Full potential profile
  const profileStart = profileConfig
    ? profileConfig.startKm
    : Math.min(...stations.map((s) => s.positionKm)) - 5;
  const profileEnd = profileConfig
    ? profileConfig.endKm
    : Math.max(...stations.map((s) => s.positionKm)) + pipe.totalLengthKm;
  const profileStep = profileConfig ? (profileConfig.stepKm || 1.0) : 1.0;

  const profile = calculatePotentialProfile({
    startKm: profileStart,
    endKm: profileEnd,
    stepKm: profileStep,
    stations,
    alpha,
    naturalPotentialMv: potentials.naturalMv,
    drainPointMv: potentials.drainPointMv,
    minimumPotentialMv: potentials.minimumMv,
  });

  // Step 9 — Summary statistics
  const protectedPoints = profile.filter((p) => p.isProtected).length;
  const minCombinedV = Math.min(...profile.map((p) => p.combinedPotentialV));
  const maxCombinedV = Math.max(...profile.map((p) => p.combinedPotentialV));
  const unprotectedSegments = findUnprotectedSegments(profile);

  const intermediates = {
    pipeSteelAreaM2,
    unitSurfaceAreaM2PerM,
    surfaceAreaToX_M2,
    surfaceAreaTotal_M2,
    currentRequiredToX_A,
    currentRequiredTotal_A,
    unitPipeResistance_OhmPerM,
    coatingLeakageResistance_OhmM,
    alpha,
    deltaE0_V: (potentials.drainPointMv - potentials.naturalMv) / 1000,
    deltaERequired_V: (potentials.minimumMv - potentials.naturalMv) / 1000,
  };

  return {
    success: true,
    errors: [],
    warnings: validation.warnings,
    intermediates,
    checkPointAssessment,
    profile,
    stationReachKm,
    summary: {
      totalProfilePoints: profile.length,
      protectedPoints,
      unprotectedPoints: profile.length - protectedPoints,
      protectionPercentage: (protectedPoints / profile.length) * 100,
      minCombinedPotentialV: minCombinedV,
      maxCombinedPotentialV: maxCombinedV,
      minCombinedPotentialMv: minCombinedV * 1000,
      maxCombinedPotentialMv: maxCombinedV * 1000,
      criterionMv: potentials.minimumMv,
      stationReachKm,
      unprotectedSegments,
      designAdequate: unprotectedSegments.length === 0,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 10 — UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Finds contiguous unprotected segments in the profile.
 *
 * @param {PotentialProfilePoint[]} profile
 * @returns {Array<{startKm: number, endKm: number, minPotentialV: number}>}
 */
function findUnprotectedSegments(profile) {
  const segments = [];
  let inSegment = false;
  let segStart = null;
  let segMinV = Infinity;

  for (const point of profile) {
    if (!point.isProtected) {
      if (!inSegment) {
        inSegment = true;
        segStart = point.km;
        segMinV = point.combinedPotentialV;
      } else {
        segMinV = Math.min(segMinV, point.combinedPotentialV);
      }
    } else {
      if (inSegment) {
        segments.push({
          startKm: segStart,
          endKm: profile[profile.indexOf(point) - 1].km,
          minPotentialV: segMinV,
        });
        inSegment = false;
        segStart = null;
        segMinV = Infinity;
      }
    }
  }

  // Close open segment at end of profile
  if (inSegment && profile.length > 0) {
    segments.push({
      startKm: segStart,
      endKm: profile[profile.length - 1].km,
      minPotentialV: segMinV,
    });
  }

  return segments;
}

/**
 * Builds an AttenuationInput object from flat parameter values.
 * Convenience factory for applications not using the typed structure directly.
 *
 * @param {Object} params - See AttenuationInput type definition
 * @returns {AttenuationInput}
 */
function buildAttenuationInput({
  diameterInches,
  wallThicknessInches,
  totalLengthKm,
  maxProtectionLengthKm,
  steelResistivityMicroOhmCm = ATTENUATION_CONSTANTS.DEFAULT_STEEL_RESISTIVITY,
  currentDensityMaPerM2,
  coatingConductivityMicroSiemensPerM2 = ATTENUATION_CONSTANTS.DEFAULT_COATING_G_FBE_AGED,
  soilResistivityOhmCm,
  naturalPotentialMv,
  drainPointPotentialMv,
  minimumPotentialMv,
  stations,
  profileStartKm,
  profileEndKm,
  profileStepKm = 1.0,
}) {
  return {
    pipe: {
      diameterInches,
      wallThicknessInches,
      totalLengthKm,
      maxProtectionLengthKm,
      steelResistivityMicroOhmCm,
    },
    coating: {
      conductivityMicroSiemensPerM2: coatingConductivityMicroSiemensPerM2,
      soilResistivityOhmCm,
      currentDensityMaPerM2,
    },
    potentials: {
      naturalMv: naturalPotentialMv,
      drainPointMv: drainPointPotentialMv,
      minimumMv: minimumPotentialMv,
    },
    stations,
    profileConfig:
      profileStartKm !== undefined && profileEndKm !== undefined
        ? { startKm: profileStartKm, endKm: profileEndKm, stepKm: profileStepKm }
        : undefined,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────





// ─────────────────────────────────────────────────────────────────────────────
// ES MODULE EXPORTS — for Vite / React / bundler environments
// ─────────────────────────────────────────────────────────────────────────────
export {
  ATTENUATION_CONSTANTS,
  validateAttenuationInput,
  calculatePipeSteelArea,
  calculateUnitSurfaceArea,
  calculateTotalSurfaceArea,
  calculatePipeResistance,
  calculateLeakageResistance,
  calculateAttenuationConstant,
  calculateCurrentRequirement,
  calculatePotentialAtDistance,
  calculateCombinedPotentialAtPoint,
  calculatePotentialProfile,
  calculateProtectionLength,
  calculateCheckPointAssessment,
  findUnprotectedSegments,
  runAttenuationAnalysis,
  buildAttenuationInput,
};
