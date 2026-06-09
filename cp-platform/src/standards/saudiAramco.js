/**
 * SAUDI ARAMCO ENGINEERING STANDARDS
 * Default standard for the CP Designer platform.
 * Sources: SAES-X-400, 17-SAMSS series, Excel Cal.(DW) workbook.
 *
 * This is the most prescriptive standard — all values are extracted from
 * current THRESHOLDS in constants/index.js and Excel Cal.(DW) formulas.
 */

export const SAUDI_ARAMCO = {
  id: 'saudiAramco',
  label: 'Saudi Aramco',
  shortLabel: 'Aramco',
  version: 'SAES-X-400 / 17-SAMSS',
  description: 'Saudi Aramco Engineering Standards — Permanent Cathodic Protection Design',

  metadata: {
    organization: 'Saudi Aramco',
    standardsBody: 'SAES / SAMSS',
    region: 'Middle East',
    typicalApplication: 'Oil & gas pipelines, plant piping, tank bottoms in desert/harsh environments',
  },

  // ── Protection Criteria ──────────────────────────────────────────────────────

  protectionCriteria: {
    defaultMethod: 'native_potential_and_polarization',
    availableMethods: [
      { id: 'native_potential_comparison', label: 'Native Potential Comparison', description: 'Compare native vs polarized potentials per SAES-X-400' },
      { id: 'polarization_criteria', label: 'Polarization Criteria', description: '100 mV polarization shift from native potential' },
      { id: 'company_specific', label: 'Company-Specific Requirements', description: 'Additional Aramco field-specific criteria' },
    ],
    basePotentialMvCSE: -850,
    polarizationShiftMv: 100,
    irDropCorrectionRequired: true,
  },

  // ── Current Requirement ──────────────────────────────────────────────────────

  currentRequirement: {
    spareFactor: 1.3,
    tempCorrectionMethod: 'exponential', // 1.25^((T - baseTempC) / 10)
    baseTempC: 30,                       // Exponential formula base temp
    applyCoatingEfficiency: false,       // Bare-pipe equivalent per Aramco practice
    coatingDegradationEnabled: false,    // Not applied in current Excel workbook
  },

  // ── Temperature Correction ────────────────────────────────────────────────────

  temperatureCorrection: {
    method: 'exponential',
    formula: 'i_T = i_base × 1.25^((T − 30) / 10)',
    baseTempC: 30,
    referenceDoc: 'Saudi Aramco internal design data — Excel Cal.(DW) F18',
  },

  // ── Groundbed ────────────────────────────────────────────────────────────────

  groundbed: {
    minRemotenessM: 20,
    SAES_X_400_remotenessTable: true, // Use the lookup function per SAES-X-400
    resistivityThresholds: {
      high: 10000,    // Above this → recommend deeper groundbed
      veryHigh: 50000, // Above this → error severity
    },
    minAnodeSpacingM: 0.5,
    minBoreholeDiaM: 0.15,
  },

  // ── TR Sizing ────────────────────────────────────────────────────────────────

  trSizing: {
    efficiency: 0.8,           // TR overall efficiency
    rectifierEfficiency: 0.8,  // Rectifier stage efficiency
    circuitResistanceOperating: 0.7,  // 70% of rated V/I
    circuitResistanceWarning: 0.9,    // 90% of rated V/I
    stepVoltage: 10,  // Standard TR voltage increment (V)
    stepCurrent: 10,  // Standard TR current increment (A)
    inputVoltage: 480,
    inputPhases: 3,
  },

  // ── Design Life ──────────────────────────────────────────────────────────────

  designLife: {
    anodeUtilizationFactor: 0.85, // 85% per NACE SP0169 — applied
    minMarginYears: 3,            // Warn if design life within 3yr of target
    defaultTargetYears: 25,
    formula: 'Y = (N × W × U_f) / (C × I)',
    notes: 'U_f = 0.85 anode utilization factor per NACE SP0169 and Aramco practice',
  },

  // ── Coke Backfill ────────────────────────────────────────────────────────────

  cokeBackfill: {
    ftPerM: 3.28,                // Feet per meter
    annulusFactor: 39.2,         // Empirical annulus volume factor
    bagLbs: 50,                  // Pounds per bag
    contingency: 1.15,           // +15% site handling losses
    standardRef: '17-855-011',
    source: 'Excel Cal.(DW) §13 — Aramco practice',
  },

  // ── Cable ────────────────────────────────────────────────────────────────────

  cable: {
    cuttingWasteFactor: 1.05,   // +5% cutting waste for BOM
    maxAnodeCableSizeMm2: 25,
  },

  // ── Standards References ─────────────────────────────────────────────────────

  standardsReferences: {
    tru: '17-SAMSS-003',
    anode: '17-SAMSS-016',
    junctionBox: '17-SAMSS-008',
    cable: '17-SAMSS-020',
    cokeBackfill: '17-855-011',
    testStation: '17-SAMSS-007',
  },

  // ── Protection Current Density Basis ──────────────────────────────────────────

  currentDensityBasis: {
    source: '17-SAMSS-016 / Excel Cal.(DW)',
    defaultMAperM2: 0.1,  // Default base density at 25°C (mA/m²)
    highTempAdjustment: 'Exponential per Aramco method (1.25^((T-30)/10))',
    notes: 'Typical values: 0.08-0.12 mA/m² for FBE/3LPE in desert soil',
  },
}

export default SAUDI_ARAMCO
