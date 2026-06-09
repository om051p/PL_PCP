/**
 * ENGINEERING CONSTANTS REGISTRY
 * Single source of truth for all engineering parameters.
 * All values are referenced by ID — no hardcoding in calculation modules.
 */

// ─── Design Modes ────────────────────────────────────────────────────────────

export const DESIGN_MODES = {
  deepwell: {
    id: 'deepwell',
    label: 'Deepwell ICCP',
    description: 'Impressed Current — Single Deep Borehole Groundbed',
    icon: 'layers-subtract',
    available: true,
    calcModules: [
      'currentRequirement',
      'groundbedResistance',
      'cableResistance',
      'trSizing',
      'designLife',
    ],
    bomModules: [
      'tru',
      'anodes_deepwell',
      'cables_positive',
      'cables_negative',
      'junction_boxes',
      'test_station',
      'coke_backfill',
      'cement_plug',
      'vent_pipe',
      'thermoweld',
    ],
  },
  shallow_vertical: {
    id: 'shallow_vertical',
    label: 'Shallow Vertical Groundbed',
    description: 'Impressed Current — Multiple Shallow Vertical Anodes',
    icon: 'layout-distribute-vertical',
    available: true,
    calcModules: [
      'currentRequirement',
      'groundbedResistance',
      'cableResistance',
      'trSizing',
      'designLife',
    ],
    bomModules: [
      'tru',
      'anodes_shallow',
      'cables_positive',
      'cables_negative',
      'junction_boxes',
      'test_station',
      'coke_backfill',
      'thermoweld',
    ],
  },
  distributed: {
    id: 'distributed',
    label: 'Distributed Anode Groundbed',
    description: 'Impressed Current — Distributed Anodes Along Pipeline',
    icon: 'layout-distribute-horizontal',
    available: true,
    calcModules: [
      'currentRequirement',
      'distributedGroundbed',
      'cableResistance',
      'trSizing',
      'designLife',
    ],
    bomModules: [
      'tru',
      'anodes_distributed',
      'cables_distributed',
      'junction_boxes_distributed',
      'test_stations_distributed',
    ],
  },
  tank_bottom: {
    id: 'tank_bottom',
    label: 'Tank Bottom ICCP',
    description: 'Impressed Current — Tank Floor Protection',
    icon: 'box',
    available: false,
    calcModules: [
      'tankCurrentRequirement',
      'tankGroundbed',
      'cableResistance',
      'trSizing',
      'designLife',
    ],
    bomModules: [],
  },
  plant_piping: {
    id: 'plant_piping',
    label: 'Plant Piping ICCP',
    description: 'Impressed Current — Aboveground / Buried Plant Piping',
    icon: 'git-branch',
    available: false,
    calcModules: [],
    bomModules: [],
  },
  sacrificial: {
    id: 'sacrificial',
    label: 'Sacrificial Anode Design',
    description: 'Galvanic Anodes — Zinc / Aluminum / Magnesium',
    icon: 'battery',
    available: false,
    calcModules: ['currentRequirement', 'sacrificialAnodeOutput', 'designLife'],
    bomModules: ['sacrificial_anodes', 'cables_sacrificial', 'test_station'],
  },
}

// ─── Workflow Statuses ───────────────────────────────────────────────────────

export const WORKFLOW_STATUSES = [
  { id: 'draft', label: 'Draft', order: 0, color: '#6b7280' },
  { id: 'input_complete', label: 'Input Complete', order: 1, color: '#2563eb' },
  { id: 'calculated', label: 'Calculated', order: 2, color: '#7c3aed' },
  { id: 'engineering_review', label: 'Engineering Review', order: 3, color: '#d97706' },
  { id: 'optimized', label: 'Optimized', order: 4, color: '#059669' },
  { id: 'approved', label: 'Approved', order: 5, color: '#16a34a' },
  { id: 'issued_for_construction', label: 'Issued for Construction', order: 6, color: '#0f766e' },
]

export const WORKFLOW_STATUS_MAP = Object.fromEntries(WORKFLOW_STATUSES.map((s) => [s.id, s]))

// BOM and procurement only allowed from approved state
export const BOM_ALLOWED_STATUSES = ['approved', 'issued_for_construction']
export const PROCUREMENT_ALLOWED_STATUSES = ['issued_for_construction']

// ─── Anode Specifications ────────────────────────────────────────────────────

export const ANODE_SPECS = {
  HSCI_TA4: {
    id: 'HSCI_TA4',
    type: 'HSCI',
    label: 'High-Silicon Cast Iron Tubular TA-4',
    standard: '17-SAMSS-016',
    weightKg: 38.6,
    outputAmps: 3.56, // A per anode
    consumptionRate: 0.45, // kg / A·year
    lengthM: 2.13,
    diameterM: 0.064,
    maxCurrentDensity: 10.8, // A/m²
    material: 'High-Silicon Cast Iron (14.5% Si)',
  },
  HSCI_TA2: {
    id: 'HSCI_TA2',
    type: 'HSCI',
    label: 'High-Silicon Cast Iron Tubular TA-2',
    standard: '17-SAMSS-016',
    weightKg: 23.5,
    outputAmps: 2.1,
    consumptionRate: 0.45,
    lengthM: 1.52,
    diameterM: 0.064,
    maxCurrentDensity: 10.8,
    material: 'High-Silicon Cast Iron (14.5% Si)',
  },
  MMO_TUBULAR: {
    id: 'MMO_TUBULAR',
    type: 'MMO',
    label: 'Mixed Metal Oxide Tubular',
    standard: 'NACE TM0108',
    weightKg: 8.5,
    outputAmps: 15.0,
    consumptionRate: 0.001, // Virtually non-consumable
    lengthM: 1.0,
    diameterM: 0.025,
    maxCurrentDensity: 200,
    material: 'Ti/Ir-Ta MMO',
  },
  ZINC_RIBBON: {
    id: 'ZINC_RIBBON',
    type: 'Sacrificial',
    label: 'Zinc Ribbon Anode',
    standard: 'ASTM B418',
    weightKg: 0, // Per linear meter
    outputAmps: 0,
    consumptionRate: 11.2, // kg / A·year
    lengthM: 1, // Per meter unit
    material: 'Zinc (99.99% Zn)',
  },
}

// ─── Cable Specifications ────────────────────────────────────────────────────

export const CABLE_SPECS = {
  // Resistance in Ohm/m at 20°C
  16: {
    sizeMm2: 16,
    resistanceOhmPerM: 1.673e-3,
    label: '16mm² PVDF/HMWPE',
    maxCurrentA: 76,
    application: 'Anode tail cable',
  },
  25: {
    sizeMm2: 25,
    resistanceOhmPerM: 1.053e-3,
    label: '25mm² HMWPE',
    maxCurrentA: 98,
    application: 'Negative secondary',
  },
  35: {
    sizeMm2: 35,
    resistanceOhmPerM: 6.59e-4,
    label: '35mm² HMWPE',
    maxCurrentA: 118,
    application: 'Main positive/negative',
  },
  50: {
    sizeMm2: 50,
    resistanceOhmPerM: 4.95e-4,
    label: '50mm² HMWPE',
    maxCurrentA: 140,
    application: 'Heavy duty main cable',
  },
  70: {
    sizeMm2: 70,
    resistanceOhmPerM: 3.43e-4,
    label: '70mm² HMWPE',
    maxCurrentA: 172,
    application: 'Large TR main cable',
  },
  95: {
    sizeMm2: 95,
    resistanceOhmPerM: 2.54e-4,
    label: '95mm² HMWPE',
    maxCurrentA: 205,
    application: 'Very large TR',
  },
}

// ─── Coating Types ───────────────────────────────────────────────────────────

export const COATING_TYPES = {
  fusion_bonded_epoxy: {
    id: 'fusion_bonded_epoxy',
    label: 'Fusion Bonded Epoxy (FBE)',
    efficiency: 0.98, // New coating
    degradationRate: 0.002, // Per year
    standard: 'AWWA C213',
  },
  three_layer_polyethylene: {
    id: 'three_layer_polyethylene',
    label: '3-Layer Polyethylene (3LPE)',
    efficiency: 0.99,
    degradationRate: 0.001,
    standard: 'DIN 30670',
  },
  coal_tar_enamel: {
    id: 'coal_tar_enamel',
    label: 'Coal Tar Enamel',
    efficiency: 0.95,
    degradationRate: 0.005,
    standard: 'AWWA C203',
  },
  bare: {
    id: 'bare',
    label: 'Bare Steel (Uncoated)',
    efficiency: 0,
    degradationRate: 0,
    standard: '',
  },
}

// ─── Soil Classification ─────────────────────────────────────────────────────

export const SOIL_CLASSIFICATIONS = [
  { label: 'Very Corrosive', minOhmCm: 0, maxOhmCm: 1000, description: 'Saturated saline soils' },
  { label: 'Corrosive', minOhmCm: 1000, maxOhmCm: 2000, description: 'Clay, marsh soils' },
  { label: 'Moderately Corrosive', minOhmCm: 2000, maxOhmCm: 5000, description: 'Sandy clay' },
  { label: 'Mildly Corrosive', minOhmCm: 5000, maxOhmCm: 10000, description: 'Sandy soils' },
  { label: 'Non-Corrosive', minOhmCm: 10000, maxOhmCm: 100000, description: 'Dry sandy / rocky' },
]

export function getSoilClassification(resistivityOhmCm) {
  return (
    SOIL_CLASSIFICATIONS.find(
      (c) => resistivityOhmCm >= c.minOhmCm && resistivityOhmCm < c.maxOhmCm,
    ) || SOIL_CLASSIFICATIONS[SOIL_CLASSIFICATIONS.length - 1]
  )
}

// ─── SAES-X-400 Groundbed Remoteness Distance ───────────────────────────────

// As per SAES-X-400 — Minimum distance from anode bed to nearest buried metallic structure.
// Based on TR rated current (A) and soil resistivity (Ω·cm).
// Source: Excel Cal.(DW) Section 11.3

const REMOTENESS_TABLE = [
  { maxCurrent: 35, resistivities: [
    { maxRho: 500, distance: 20 },
    { maxRho: 1000, distance: 25 },
    { maxRho: 3000, distance: 50 },
    { maxRho: Infinity, distance: 75 },
  ]},
  { maxCurrent: 50, resistivities: [
    { maxRho: 500, distance: 30 },
    { maxRho: 1000, distance: 35 },
    { maxRho: 3000, distance: 75 },
    { maxRho: Infinity, distance: 150 },
  ]},
  { maxCurrent: 100, resistivities: [
    { maxRho: 500, distance: 65 },
    { maxRho: 1000, distance: 75 },
    { maxRho: 3000, distance: 150 },
    { maxRho: Infinity, distance: 250 },
  ]},
  { maxCurrent: 150, resistivities: [
    { maxRho: 500, distance: 100 },
    { maxRho: 1000, distance: 125 },
    { maxRho: 3000, distance: 225 },
    { maxRho: Infinity, distance: 350 },
  ]},
]

/**
 * Calculate the minimum required remoteness distance per SAES-X-400.
 * Returns `null` when current exceeds 150A (no table entry, requires special engineering).
 *
 * @param {number} trRatedCurrentA - TR rated current (A)
 * @param {number} soilResistivityOhmCm - Soil resistivity (Ω·cm)
 * @returns {number | null} Minimum distance in meters, or null if invalid
 */
export function calcRequiredRemotenessM(trRatedCurrentA, soilResistivityOhmCm) {
  if (trRatedCurrentA <= 0 || soilResistivityOhmCm <= 0) return null

  // Find the current row (first that covers this current)
  const row = REMOTENESS_TABLE.find((r) => trRatedCurrentA <= r.maxCurrent)
  if (!row) return null // >150A → Invalid per SAES-X-400

  // Find the resistivity column
  const entry = row.resistivities.find((r) => soilResistivityOhmCm <= r.maxRho)
  return entry ? entry.distance : null
}

// ─── Engineering Thresholds ──────────────────────────────────────────────────

export const THRESHOLDS = {
  SPARE_FACTOR: 1.3, // 30% current spare
  TEMP_CORRECTION_FACTOR: 0.025, // Per °C above 25°C (NACE SP0169)
  BASE_TEMP_C: 25,
  TR_EFFICIENCY: 0.8, // Transformer-rectifier efficiency (80%)
  RECTIFIER_EFFICIENCY: 0.8, // Rectifier stage efficiency (80%)
  CIRCUIT_RESISTANCE_OPERATING: 0.7, // 70% of rated V/I
  CIRCUIT_RESISTANCE_WARNING: 0.9, // 90% of rated V/I
  MIN_REMOTENESS_M: 20, // Minimum groundbed-to-pipeline distance
  HIGH_SOIL_RESISTIVITY: 10000, // Above this → recommend deeper groundbed
  VERY_HIGH_SOIL_RESISTIVITY: 50000,
  COKE_FT_PER_M: 3.28, // Feet per meter (for active length → bag count)
  COKE_ANNULUS_FACTOR: 39.2, // Empirical annulus volume factor (Aramco practice)
  COKE_BAG_LBS: 50, // Pounds per bag of CPC backfill
  COKE_BACKFILL_CONTINGENCY: 1.15, // +15% site waste (Excel match)
  ANODE_UTILIZATION_FACTOR: 0.85, // 85% anode mass utilization (NACE SP0169)
  MIN_DESIGN_LIFE_MARGIN_Y: 3, // Warn if design life within 3yr of target
  TR_STEP_VOLTAGE: 10, // Standard TR voltage increment
  TR_STEP_CURRENT: 10, // Standard TR current increment
}

// ─── BOM Standards Reference ─────────────────────────────────────────────────

export const STANDARDS = {
  TRU: '17-SAMSS-003',
  ANODE: '17-SAMSS-016',
  JUNCTION_BOX: '17-SAMSS-008',
  CABLE: '17-SAMSS-020',
  COKE_BACKFILL: '17-855-011',
  TEST_STATION: '17-SAMSS-007',
}

// ─── Standards Framework ───────────────────────────────────────────────────────
// Re-exported from the standards module for easy access.
// Full config objects in src/standards/

export { STANDARD_OPTIONS, getStandard, getActiveStandard } from '../standards/index.js'
