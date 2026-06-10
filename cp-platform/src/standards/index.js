/**
 * STANDARDS RESOLVER
 * Single entry point for all engineering standard lookups.
 * Lazy-loads the active standard config and provides:
 *   1. getStandard(id) — returns config object by standard ID
 *   2. getActiveStandard(project) — returns config for the project's selected standard
 *   3. Standard list for UI dropdowns
 *
 * Usage from calculation engine:
 *   import { getActiveStandard } from '../../standards/index.js'
 *   const std = getActiveStandard(stationOrProject)
 *   const spareFactor = std.currentRequirement.spareFactor
 *
 * Architecture rule:
 *   Calculation functions NEVER import THRESHOLDS directly.
 *   They receive config from the active standard via this resolver.
 */

import SAUDI_ARAMCO from './saudiAramco.js'
import NACE_SP0169 from './naceSP0169.js'
import ISO_15589 from './iso15589.js'
import PDO from './pdo.js'
import ADNOC from './adnoc.js'

/**
 * Registry of all available standards.
 * Keyed by standard ID for O(1) lookup.
 */
const STANDARD_REGISTRY = {
  saudiAramco: SAUDI_ARAMCO,
  nace: NACE_SP0169,
  iso15589: ISO_15589,
  pdo: PDO,
  adnoc: ADNOC,
}

/**
 * List of available standard options, suitable for UI dropdowns.
 */
export const STANDARD_OPTIONS = Object.values(STANDARD_REGISTRY).map((s) => ({
  value: s.id,
  label: s.label,
  description: s.description,
}))

/**
 * Resolve a standard configuration by ID.
 * Falls back to Saudi Aramco (the default) if the ID is unknown.
 *
 * @param {string} standardId  - One of: 'saudiAramco', 'nace', 'iso15589', 'pdo', 'adnoc'
 * @returns {object} Full standard configuration object
 */
export function getStandard(standardId) {
  const std = STANDARD_REGISTRY[standardId]
  if (!std) {
    console.warn(`[Standards] Unknown standard "${standardId}". Falling back to Saudi Aramco.`)
    return SAUDI_ARAMCO
  }
  return std
}

/**
 * Get the active standard configuration for a project.
 * Reads the project's `designStandard` field and resolves it.
 *
 * @param {object} project - Project object with optional `designStandard` field
 * @returns {object} Full standard configuration object
 */
export function getActiveStandard(project) {
  if (!project || !project.designStandard) {
    return SAUDI_ARAMCO
  }
  return getStandard(project.designStandard)
}

export default { getStandard, getActiveStandard, STANDARD_OPTIONS }
