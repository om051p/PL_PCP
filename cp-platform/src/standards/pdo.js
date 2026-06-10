/**
 * PDO (PETROLEUM DEVELOPMENT OMAN) ENGINEERING STANDARDS
 * Primary standard: SP-1128 — Specification for Cathodic Protection Design
 *
 * PDO aligns with NACE/ISO standards but adds Oman-specific requirements:
 * - Extreme desert environment (high soil resistivity, high ambient temperatures)
 * - Hyper-saline and rocky soils requiring deep groundbeds
 * - Comprehensive soil resistivity surveys mandatory
 * - Protection criteria aligned with NACE (-850mV CSE ON, -950mV CSE OFF)
 */

export const PDO = {
  id: 'pdo',
  label: 'PDO SP-1128',
  shortLabel: 'PDO',
  version: 'SP-1128 (Internal)',
  description: 'Petroleum Development Oman — Specification for Cathodic Protection Design',

  metadata: {
    organization: 'Petroleum Development Oman',
    standardsBody: 'PDO Engineering',
    region: 'Oman',
    typicalApplication: 'Oil & gas pipelines and infrastructure in Oman desert environment — hyper-saline soils, high resistivity, extreme temperatures',
    parentStandards: ['NACE/AMPP Standards', 'ISO 15589', 'BS EN 12954'],
  },

  // ── Protection Criteria ──────────────────────────────────────────────────────
  // PDO follows NACE criteria with -850mV CSE ON or -950mV CSE OFF potential.

  protectionCriteria: {
    defaultMethod: 'neg850_mv_polarized',
    availableMethods: [
      { id: 'neg850_mv_polarized', label: '-850 mV CSE (ON)', description: 'ON potential more negative than -850 mV vs Cu/CuSO₄' },
      { id: 'neg850_mv_instant_off', label: '-950 mV CSE (OFF)', description: 'Instant-off potential more negative than -950 mV' },
      { id: 'polarization_100mv', label: '100 mV Polarization Shift', description: 'Minimum 100 mV cathodic polarization from native potential' },
    ],
    basePotentialMvCSE: -850,
    offPotentialMvCSE: -950, // PDO uses stricter OFF criterion
    polarizationShiftMv: 100,
    irDropCorrectionRequired: true,
  },

  // ── Current Requirement ──────────────────────────────────────────────────────
  // PDO uses conservative spare factors due to harsh desert environment.

  currentRequirement: {
    spareFactor: 1.25, // 25% spare — standard for desert environment
    tempCorrectionMethod: 'exponential', // High ambient temperature correction
    baseTempC: 25,
    applyCoatingEfficiency: true,
    coatingDegradationEnabled: true,
    coatingDegradationFactor: 0.025, // Higher degradation rate due to UV/thermal cycling
  },

  // ── Temperature Correction ────────────────────────────────────────────────────
  // Oman has extreme ambient temperatures (45-55°C ground temp).
  // Exponential correction required for accurate design.

  temperatureCorrection: {
    method: 'exponential',
    formula: 'i_T = i_base × 1.25^((T − 25) / 10)',
    baseTempC: 25,
    alpha: 0.022, // Slightly lower than Aramco (0.025)
    referenceDoc: 'PDO SP-1128 / ISO 15589-1',
    notes: 'Oman ground temperatures frequently exceed 45°C. Exponential correction essential for accurate current demand.',
  },

  // ── Groundbed ────────────────────────────────────────────────────────────────
  // PDO requires comprehensive soil resistivity surveys.
  // Deep groundbeds commonly employed due to high surface resistivity.

  groundbed: {
    minRemotenessM: 15,
    SAES_X_400_remotenessTable: false, // PDO uses site-specific surveys
    resistivityThresholds: {
      high: 10000, // Same as Aramco
      veryHigh: 50000, // Same as Aramco
    },
    minAnodeSpacingM: 0.3,
    minBoreholeDiaM: 0.1,
    deepGroundbedsRequired: true, // Common in Oman due to surface resistivity
    soilResistivitySurveyRequired: true, // Mandatory comprehensive survey
    hyperSalineSoil: true, // Oman-specific consideration
  },

  // ── TR Sizing ────────────────────────────────────────────────────────────────
  // PDO follows NACE industry defaults with conservative approach.

  trSizing: {
    efficiency: 0.75, // Conservative TR efficiency
    rectifierEfficiency: 0.75,
    circuitResistanceOperating: 0.75,
    circuitResistanceWarning: 0.90,
    stepVoltage: 5, // International increments
    stepCurrent: 5,
    inputVoltage: 230, // International standard
    inputPhases: 3,
  },

  // ── Design Life ──────────────────────────────────────────────────────────────
  // PDO typically specifies 20-30 years for major infrastructure.

  designLife: {
    anodeUtilizationFactor: 0.85, // Standard for galvanic anodes
    minMarginYears: 3, // Conservative for harsh environment
    defaultTargetYears: 25, // Standard for major PDO infrastructure
    formula: 'Y = (N × W × U_f) / (C × I)',
    notes: 'Design life must match project Basis of Design requirements.',
  },

  // ── Coke Backfill ────────────────────────────────────────────────────────────
  // Standard contingency for desert environment.

  cokeBackfill: {
    ftPerM: 3.28,
    annulusFactor: 35.0,
    bagLbs: 50,
    contingency: 1.15, // 15% for desert handling losses
    standardRef: 'PDO SP-1128',
    source: 'PDO SP-1128 / Industry practice',
  },

  // ── Cable ────────────────────────────────────────────────────────────────────

  cable: {
    cuttingWasteFactor: 1.05,
    maxAnodeCableSizeMm2: 25,
  },

  // ── Standards References ─────────────────────────────────────────────────────

  standardsReferences: {
    tru: 'PDO SP-1128 / NACE TM0108',
    anode: 'PDO SP-1128 / NACE TM0108',
    junctionBox: 'NEMA 4X / IEC 60529',
    cable: 'IEC 60228',
    cokeBackfill: 'PDO SP-1128',
    testStation: 'NACE TM0497',
  },

  // ── Protection Current Density Basis ──────────────────────────────────────────

  currentDensityBasis: {
    source: 'PDO SP-1128 / Field Survey Data',
    defaultMAperM2: 0.06, // Slightly higher than NACE due to high temperature
    highTempAdjustment: 'Exponential per PDO method: i_T = i_base × 1.25^((T-25)/10)',
    notes: 'Oman desert soils: typical 0.04-0.08 mA/m² for FBE. Must be verified by comprehensive soil resistivity survey.',
  },
}

export default PDO
