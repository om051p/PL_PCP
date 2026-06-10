/**
 * ADNOC (ABU DHABI NATIONAL OIL COMPANY) ENGINEERING STANDARDS
 * Primary standard: A0-IG-C-SP-006 — Cathodic Protection Design
 *
 * ADNOC builds on ISO 15589-2 and DNV-RP-B401:
 * - High-salinity seawater environment
 * - High ambient ground temperatures (UAE)
 * - Specific industrial harshness classes
 * - DNV-RP-B401 alignment for anode utilization and design life
 */

export const ADNOC = {
  id: 'adnoc',
  label: 'ADNOC A0-IG-C-SP-006',
  shortLabel: 'ADNOC',
  version: 'A0-IG-C-SP-006 (Internal)',
  description: 'ADNOC Group — Cathodic Protection Design Specification',

  metadata: {
    organization: 'Abu Dhabi National Oil Company',
    standardsBody: 'ADNOC Group Engineering',
    region: 'UAE',
    typicalApplication: 'Offshore and onshore pipelines in UAE — high-salinity seawater, high ambient temperatures, industrial harshness',
    parentStandards: ['ISO 15589-2', 'DNV-RP-B401', 'IEC 61936-1'],
  },

  // ── Protection Criteria ──────────────────────────────────────────────────────
  // ADNOC follows ISO 15589 criteria with Ag/AgCl reference for seawater.

  protectionCriteria: {
    defaultMethod: 'neg850_mv_polarized',
    availableMethods: [
      { id: 'neg850_mv_polarized', label: '-850 mV (vs CSE or Ag/AgCl)', description: 'Polarized potential more negative than -850 mV' },
      { id: 'neg850_mv_instant_off', label: '-950 mV (Instant-Off)', description: 'Instant-off potential with IR drop elimination' },
      { id: 'polarization_100mv', label: '100 mV Polarization Shift', description: 'Minimum 100 mV cathodic polarization from native potential' },
      { id: 'potential_band', label: 'Potential Band (-850 to -1050 mV)', description: 'Maintain within band to avoid over-protection in high-salinity' },
    ],
    basePotentialMvCSE: -850,
    offPotentialMvCSE: -950,
    polarizationShiftMv: 100,
    irDropCorrectionRequired: true,
    overProtectionLimitMvCSE: -1050, // Critical in high-salinity to avoid hydrogen
    referenceElectrode: 'Ag/AgCl (seawater) or Cu/CuSO4 (onshore)',
  },

  // ── Current Requirement ──────────────────────────────────────────────────────
  // ADNOC uses conservative spare factors for high-salinity environment.

  currentRequirement: {
    spareFactor: 1.30, // 30% spare — conservative for harsh environment
    tempCorrectionMethod: 'exponential', // Arrhenius equation applications
    baseTempC: 25,
    applyCoatingEfficiency: true,
    coatingDegradationEnabled: true,
    coatingDegradationFactor: 0.03, // Higher degradation due to salinity/temperature
  },

  // ── Temperature Correction ────────────────────────────────────────────────────
  // UAE has extreme ground and seawater temperatures.
  // Exponential correction required per electrochemical kinetics.

  temperatureCorrection: {
    method: 'exponential',
    formula: 'i_T = i_base × e^(α(T − 25))',
    baseTempC: 25,
    alpha: 0.028, // Between NACE (0.025) and Aramco (0.03)
    referenceDoc: 'ADNOC A0-IG-C-SP-006 / ISO 15589-2',
    notes: 'UAE ground temperatures: 35-50°C. Seawater temperatures: 20-35°C. Both require exponential correction.',
  },

  // ── Groundbed ────────────────────────────────────────────────────────────────
  // ADNOC requires detailed interference modeling per ISO 15589.

  groundbed: {
    minRemotenessM: 15,
    SAES_X_400_remotenessTable: false,
    resistivityThresholds: {
      high: 12000, // Moderate threshold
      veryHigh: 60000,
    },
    minAnodeSpacingM: 0.3,
    minBoreholeDiaM: 0.1,
    interferenceModelingRequired: true, // ISO requirement
    soilResistivitySurveyRequired: true,
    seawaterResistivityConsideration: true, // UAE-specific: low resistivity seawater
  },

  // ── TR Sizing ────────────────────────────────────────────────────────────────
  // ADNOC follows IEC 61936-1 for power supply requirements.

  trSizing: {
    efficiency: 0.80, // Standard range
    rectifierEfficiency: 0.80,
    circuitResistanceOperating: 0.75,
    circuitResistanceWarning: 0.90,
    stepVoltage: 5,
    stepCurrent: 5,
    inputVoltage: 230, // UAE standard: 230V/400V
    inputPhases: 3,
    iec61936_1Compliance: true, // Power supply safety standard
  },

  // ── Design Life ──────────────────────────────────────────────────────────────
  // ADNOC aligns with DNV-RP-B401 for anode utilization and design life.

  designLife: {
    anodeUtilizationFactor: 0.85, // DNV-RP-B401 aligned
    minMarginYears: 3, // Conservative for critical infrastructure
    defaultTargetYears: 30, // Extended for major ADNOC infrastructure
    formula: 'Y = (N × W × U_f) / (C × I)',
    notes: 'Design life must match asset service life (20, 30, or 40 years). DNV-RP-B401 alignment for offshore.',
  },

  // ── Coke Backfill ────────────────────────────────────────────────────────────

  cokeBackfill: {
    ftPerM: 3.28,
    annulusFactor: 35.0,
    bagLbs: 50,
    contingency: 1.15, // 15% for harsh environment
    standardRef: 'ADNOC A0-IG-C-SP-006',
    source: 'ADNOC A0-IG-C-SP-006 / DNV-RP-B401',
  },

  // ── Cable ────────────────────────────────────────────────────────────────────

  cable: {
    cuttingWasteFactor: 1.05,
    maxAnodeCableSizeMm2: 25,
  },

  // ── Standards References ─────────────────────────────────────────────────────

  standardsReferences: {
    tru: 'ADNOC A0-IG-C-SP-006 / IEC 61936-1',
    anode: 'ADNOC A0-IG-C-SP-006 / DNV-RP-B401',
    junctionBox: 'IEC 60529 (IP rating)',
    cable: 'IEC 60228',
    cokeBackfill: 'ADNOC A0-IG-C-SP-006',
    testStation: 'ISO 15589-2 / EN 12957',
  },

  // ── Protection Current Density Basis ──────────────────────────────────────────

  currentDensityBasis: {
    source: 'ADNOC A0-IG-C-SP-006 / ISO 15589-2',
    defaultMAperM2: 0.07, // Higher due to high salinity and temperature
    highTempAdjustment: 'Exponential per Arrhenius: i_T = i_base × e^(α(T-25))',
    notes: 'UAE onshore: 0.04-0.08 mA/m². Offshore/seawater: 0.06-0.12 mA/m². Must be verified by site survey.',
  },

  // ── UAE-Specific Requirements ─────────────────────────────────────────────────

  uaeSpecific: {
    highSalinityEnvironment: true,
    highAmbientTemperature: true,
    seawaterDesignConsideration: true,
    industrialHarshnessClasses: true,
    agAgClReferenceForSeawater: true, // Preferred over CSE in marine environments
  },
}

export default ADNOC
