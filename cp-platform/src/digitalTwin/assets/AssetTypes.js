/**
 * M10 — Asset Registry (Digital Twin Foundation)
 * AssetTypes.js — Enum of all supported CP asset types
 *
 * PROTECTED: No calculation logic here. Asset types only.
 * Design-linked — assets are created from station design data.
 */

/**
 * Supported asset type identifiers.
 * @readonly
 * @enum {string}
 */
export const AssetType = Object.freeze({
  PIPELINE: 'pipeline',
  TR_UNIT: 'tr_unit',
  GROUNDBED: 'groundbed',
  BOND: 'bond',
  TEST_STATION: 'test_station',
  JUNCTION_BOX: 'junction_box',
})

/**
 * Display metadata for each asset type.
 */
export const ASSET_TYPE_META = {
  [AssetType.PIPELINE]: {
    label: 'Pipeline Segment',
    icon: 'Route',
    color: '#60a5fa',
    description: 'Protected pipeline section with CP current requirement',
  },
  [AssetType.TR_UNIT]: {
    label: 'Transformer-Rectifier',
    icon: 'Cpu',
    color: '#a78bfa',
    description: 'Power supply unit for impressed current CP system',
  },
  [AssetType.GROUNDBED]: {
    label: 'Groundbed',
    icon: 'Layers',
    color: '#34d399',
    description: 'Anode bed providing current distribution to protected structure',
  },
  [AssetType.BOND]: {
    label: 'Bond / Isolation Joint',
    icon: 'GitMerge',
    color: '#fbbf24',
    description: 'Electrical bond or isolation point between structures',
  },
  [AssetType.TEST_STATION]: {
    label: 'Test Station',
    icon: 'TestTube2',
    color: '#f87171',
    description: 'Field monitoring point for potential measurement',
  },
  [AssetType.JUNCTION_BOX]: {
    label: 'Junction Box',
    icon: 'Box',
    color: '#94a3b8',
    description: 'Cable connection and distribution point',
  },
}

/**
 * All asset types as an ordered array for UI iteration.
 */
export const ALL_ASSET_TYPES = Object.values(AssetType)
