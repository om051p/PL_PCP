/**
 * ISO 15589-1 ENGINEERING STANDARDS
 * Petroleum and natural gas industries — Cathodic protection of pipeline transportation systems.
 * Performance-based international standard with flexible, context-dependent criteria.
 *
 * Key differences from NACE SP0169:
 * - More comprehensive lifecycle approach (pre-survey → commissioning → maintenance)
 * - Emphasizes IR drop elimination and rigorous documentation
 * - Provides explicit anode utilization factors based on geometry
 * - Higher emphasis on personnel competency (references EN 15257)
 */

export const ISO_15589 = {
  id: 'iso15589',
  label: 'ISO 15589-1',
  shortLabel: 'ISO',
  version: 'ISO 15589-1:2015',
  description: 'Cathodic protection of pipeline transportation systems — Part 1: On-land pipelines',

  metadata: {
    organization: 'International Organization for Standardization',
    standardsBody: 'ISO',
    region: 'International',
    typicalApplication: 'Large-scale international pipeline projects, complex offshore-to-onshore transitions, diverse global environments',
  },

  // ── Protection Criteria ──────────────────────────────────────────────────────
  // ISO recognizes -850mV CSE and 100mV polarization shift, but allows
  // context-dependent selection based on engineering analysis.

  protectionCriteria: {
    defaultMethod: 'neg850_mv_polarized',
    availableMethods: [
      { id: 'neg850_mv_polarized', label: '-850 mV CSE (Polarized)', description: 'Polarized potential more negative than -850 mV vs Cu/CuSO₄' },
      { id: 'neg850_mv_instant_off', label: '-850 mV CSE (Instant-Off)', description: 'Instant-off potential with IR drop elimination' },
      { id: 'polarization_100mv', label: '100 mV Polarization Shift', description: 'Minimum 100 mV cathodic polarization from native potential' },
      { id: 'potential_band', label: 'Potential Band (-850 to -1050 mV)', description: 'Maintain potential within specified band to avoid over-protection' },
    ],
    basePotentialMvCSE: -850,
    polarizationShiftMv: 100,
    irDropCorrectionRequired: true, // ISO emphasizes rigorous IR drop elimination
    overProtectionLimitMvCSE: -1050, // Avoid hydrogen embrittlement
  },

  // ── Current Requirement ──────────────────────────────────────────────────────
  // ISO provides explicit guidance on spare factors based on coating condition
  // and foreseeable degradation over design life.

  currentRequirement: {
    spareFactor: 1.20, // 10-20% per ISO guidance (NACE: 1.25, Aramco: 1.30)
    tempCorrectionMethod: 'exponential', // Nernst equation for electrode kinetics
    baseTempC: 25, // Standard reference temperature
    applyCoatingEfficiency: true, // ISO requires coating efficiency assessment
    coatingDegradationEnabled: true, // Explicit consideration of coating degradation over time
    coatingDegradationFactor: 0.02, // 2% annual degradation assumption for FBE/3LPE
  },

  // ── Temperature Correction ────────────────────────────────────────────────────
  // ISO 15589-1 acknowledges Nernst equation effects on electrode potential.
  // Uses exponential approach for accuracy at elevated temperatures.

  temperatureCorrection: {
    method: 'exponential',
    formula: 'i_T = i_base × e^(α(T − T_ref))',
    baseTempC: 25,
    alpha: 0.03, // Temperature coefficient (Nernst-based)
    referenceDoc: 'ISO 15589-1:2015, Section 6.3 — Temperature effects on potential criteria',
    notes: 'ISO emphasizes exponential relationship for high-temperature pipelines carrying heated products',
  },

  // ── Groundbed ────────────────────────────────────────────────────────────────
  // ISO requires systematic approach with site surveys and interference modeling.
  // More detailed than NACE regarding shielding effects and placement.

  groundbed: {
    minRemotenessM: 15, // Similar to NACE, less prescriptive than SAES-X-400
    SAES_X_400_remotenessTable: false, // ISO uses site-specific surveys
    resistivityThresholds: {
      high: 15000, // Same as NACE
      veryHigh: 80000, // Higher than NACE (100000)
    },
    minAnodeSpacingM: 0.3,
    minBoreholeDiaM: 0.1,
    interferenceModelingRequired: true, // ISO emphasizes interference analysis
    soilResistivitySurveyRequired: true, // Mandatory site survey before design
  },

  // ── TR Sizing ────────────────────────────────────────────────────────────────
  // ISO treats TR efficiency as component specification matched to load profile.

  trSizing: {
    efficiency: 0.80, // Industry standard range: 60-85%
    rectifierEfficiency: 0.80,
    circuitResistanceOperating: 0.75, // Conservative estimate
    circuitResistanceWarning: 0.90,
    stepVoltage: 5, // Smaller increments for international markets
    stepCurrent: 5,
    inputVoltage: 230, // International standard: 230V/400V
    inputPhases: 3,
    loadProfileMatching: true, // ISO requires matching unit to calculated load
  },

  // ── Design Life ──────────────────────────────────────────────────────────────
  // ISO 15589-1 explicitly integrates design life into documentation and calculations.
  // Common practice: 20-30 years for major infrastructure.

  designLife: {
    anodeUtilizationFactor: 0.85, // 0.80-0.90 range; 0.85 is typical midpoint
    minMarginYears: 3, // Conservative margin for critical assets
    defaultTargetYears: 25, // Industry standard for major pipelines
    formula: 'Y = (N × W × U_f) / (C × I)',
    notes: 'U_f = 0.85 typical midpoint of 0.80-0.90 range per ISO 15589-1. Design life must be explicitly stated in documentation.',
  },

  // ── Coke Backfill ────────────────────────────────────────────────────────────
  // ISO treats backfill as critical for lowering contact resistance.
  // Contingency of 10-15% for consumption/settling.

  cokeBackfill: {
    ftPerM: 3.28,
    annulusFactor: 35.0, // Same as NACE
    bagLbs: 50,
    contingency: 1.12, // 10-15% range; 12% midpoint
    standardRef: 'ISO 15589-1:2015',
    source: 'ISO 15589-1:2015, Section 7.4 — Backfill requirements',
  },

  // ── Cable ────────────────────────────────────────────────────────────────────

  cable: {
    cuttingWasteFactor: 1.05,
    maxAnodeCableSizeMm2: 25,
  },

  // ── Standards References ─────────────────────────────────────────────────────

  standardsReferences: {
    tru: 'ISO 15589-1 / IEC 60077',
    anode: 'ISO 15589-1 / ASTM G97',
    junctionBox: 'IEC 60529 (IP rating)',
    cable: 'IEC 60228',
    cokeBackfill: 'ISO 15589-1:2015',
    testStation: 'ISO 15589-1 / EN 12957',
  },

  // ── Protection Current Density Basis ──────────────────────────────────────────

  currentDensityBasis: {
    source: 'ISO 15589-1:2015, Section 6.2 / Field Survey Data',
    defaultMAperM2: 0.05, // Conservative baseline for FBE coating
    highTempAdjustment: 'Exponential per Nernst equation: i_T = i_base × e^(α(T-25))',
    notes: 'Typical values: 0.02-0.06 mA/m² for FBE in moderate soil. ISO emphasizes field survey verification.',
  },

  // ── Documentation Requirements ────────────────────────────────────────────────
  // ISO places higher emphasis on documentation than NACE.

  documentationRequirements: {
    personnelCompetency: 'EN 15257 certification referenced',
    designDocumentation: 'Full lifecycle documentation required (pre-survey → commissioning → maintenance)',
    annualMonitoring: 'Annual potential surveys recommended',
    recordsRetention: 'Minimum 10 years design records',
  },
}

export default ISO_15589
