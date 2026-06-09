/**
 * NACE SP0169 ENGINEERING STANDARDS
 * Control of External Corrosion on Underground Metallic Piping Systems.
 * Internationally accepted baseline standard for CP design.
 *
 * Values differ from Saudi Aramco where noted.
 * Key differences: linear temp correction, -850mV criterion, lower safety factors.
 */

export const NACE_SP0169 = {
  id: 'nace',
  label: 'NACE SP0169',
  shortLabel: 'NACE',
  version: 'NACE SP0169-2013',
  description: 'Control of External Corrosion on Underground or Submerged Metallic Piping Systems',

  metadata: {
    organization: 'NACE International (now AMPP)',
    standardsBody: 'NACE/AMPP',
    region: 'International',
    typicalApplication: 'Buried/submerged pipelines worldwide baseline design',
  },

  // ── Protection Criteria ──────────────────────────────────────────────────────
  // NACE defines -850mV polarized potential or 100mV polarization shift as criteria.

  protectionCriteria: {
    defaultMethod: 'neg850_mv_polarized',
    availableMethods: [
      { id: 'neg850_mv_polarized', label: '-850 mV CSE (Polarized)', description: 'Polarized potential more negative than -850 mV vs Cu/CuSO₄' },
      { id: 'neg850_mv_instant_off', label: '-850 mV CSE (Instant-Off)', description: 'Instant-off potential more negative than -850 mV (with IR compensation)' },
      { id: 'polarization_100mv', label: '100 mV Polarization Shift', description: 'Minimum 100 mV cathodic polarization from native potential' },
      { id: 'polarization_300mv', label: '300 mV Polarization (Austenitic Steel)', description: 'For austenitic stainless steel in specific environments' },
    ],
    basePotentialMvCSE: -850,
    polarizationShiftMv: 100,
    irDropCorrectionRequired: false, // Instant-off can be used instead
  },

  // ── Current Requirement ──────────────────────────────────────────────────────
  // NACE uses linear temperature correction: i_T = i_base × [1 + α(T − 25)]
  // where α = 0.025 per °C above 25°C

  currentRequirement: {
    spareFactor: 1.25,           // Typically 20-25% per NACE (Aramco uses 30%)
    tempCorrectionMethod: 'linear', // i_T = i_base × [1 + (T - baseTempC) × α]
    baseTempC: 25,                 // NACE base temperature
    applyCoatingEfficiency: true,  // NACE applies coating efficiency (Aramco does not)
    coatingDegradationEnabled: true, // NACE recommends considering coating degradation over time
  },

  // ── Temperature Correction ────────────────────────────────────────────────────

  temperatureCorrection: {
    method: 'linear',
    formula: 'i_T = i_base × [1 + (T − 25) × 0.025]',
    baseTempC: 25,
    alpha: 0.025,  // Temperature coefficient per °C
    referenceDoc: 'NACE SP0169 Section 5.1.2.3',
  },

  // ── Groundbed ────────────────────────────────────────────────────────────────
  // NACE does not prescribe a specific remoteness table; relies on
  // engineering judgment based on soil resistivity and current output.

  groundbed: {
    minRemotenessM: 15,          // Less prescriptive than SAES-X-400 (20m)
    SAES_X_400_remotenessTable: false, // SAES-X-400 table is Aramco-specific
    resistivityThresholds: {
      high: 15000,               // Higher threshold than Aramco (10000)
      veryHigh: 100000,          // Much higher than Aramco (50000)
    },
    minAnodeSpacingM: 0.3,
    minBoreholeDiaM: 0.1,
  },

  // ── TR Sizing ────────────────────────────────────────────────────────────────
  // NACE does not mandate specific TR efficiency values; uses industry defaults.

  trSizing: {
    efficiency: 0.75,            // Conservative TR efficiency (Aramco: 0.8)
    rectifierEfficiency: 0.75,   // Conservative rectifier efficiency (Aramco: 0.8)
    circuitResistanceOperating: 0.75, // 75% (Aramco: 70%)
    circuitResistanceWarning: 0.9,    // 90% (same as Aramco)
    stepVoltage: 5,               // Smaller voltage steps common in intl. markets
    stepCurrent: 5,               // Smaller current steps
    inputVoltage: 230,            // International: 230V/400V (Aramco: 480V)
    inputPhases: 3,
  },

  // ── Design Life ──────────────────────────────────────────────────────────────
  // NACE SP0169 does not mandate a specific utilization factor;
  // 0.80 is commonly used for conservative design when unspecified.

  designLife: {
    anodeUtilizationFactor: 0.80, // NACE default (Aramco: 0.85)
    minMarginYears: 2,            // Smaller margin (Aramco: 3)
    defaultTargetYears: 20,       // NACE typical minimum (Aramco: 25)
    formula: 'Y = (N × W × U_f) / (C × I)',
    notes: 'U_f = 0.80 per industry default. Engineer may increase for critical assets.',
  },

  // ── Coke Backfill ────────────────────────────────────────────────────────────
  // NACE does not prescribe Aramco-specific coke constants.
  // Values below are engineering defaults when not specified by client.

  cokeBackfill: {
    ftPerM: 3.28,
    annulusFactor: 35.0,         // Less conservative than Aramco (39.2)
    bagLbs: 50,
    contingency: 1.10,           // +10% (Aramco: +15%)
    standardRef: 'NACE RP0288',
    source: 'Industry default — shall be verified with client specification',
  },

  // ── Cable ────────────────────────────────────────────────────────────────────

  cable: {
    cuttingWasteFactor: 1.05,
    maxAnodeCableSizeMm2: 25,
  },

  // ── Standards References ─────────────────────────────────────────────────────
  // General international equivalents of Aramco 17-SAMSS series.

  standardsReferences: {
    tru: 'NACE TM0108 / IEEE 665',
    anode: 'NACE TM0108',
    junctionBox: 'NEMA 4X / IEC 60529',
    cable: 'IEC 60228 / NEPA 70',
    cokeBackfill: 'NACE RP0288',
    testStation: 'NACE TM0497',
  },

  // ── Protection Current Density Basis ──────────────────────────────────────────

  currentDensityBasis: {
    source: 'NACE SP0169 Section 5 / Industry Survey Data',
    defaultMAperM2: 0.05,       // Lower default than Aramco (0.1 mA/m²)
    highTempAdjustment: 'Linear per NACE SP0169: i_T = i_base × [1 + (T-25)×0.025]',
    notes: 'Typical values: 0.02-0.06 mA/m² for FBE in moderate soil. Shall be verified by field survey.',
  },
}

export default NACE_SP0169
