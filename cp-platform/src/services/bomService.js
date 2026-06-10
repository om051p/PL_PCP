/**
 * BOM SERVICE
 * Pure business logic for Bill of Materials generation.
 * Extracted from projectStore.js to separate concerns.
 */

import { generateBOM } from '../engine/rules/bomEngine.js'
import { getActiveStandard, BOM_ALLOWED_STATUSES } from '../constants/index.js'

/**
 * Generate BOM for a station with status-based access control.
 * Returns the BOM items, or a locked indicator if the station status doesn't permit BOM generation.
 *
 * @param {Object} station - Station data (must have lastCalcResult)
 * @param {Object} project - Project data (for standard, status)
 * @returns {Array|{ locked: boolean, reason: string }}
 */
export function generateStationBOM(station, project) {
  if (!station?.lastCalcResult) return []

  if (
    !BOM_ALLOWED_STATUSES.includes(project.status) &&
    !BOM_ALLOWED_STATUSES.includes(station.status)
  ) {
    return {
      locked: true,
      reason: `BOM requires station status: Approved or Issued for Construction. Current: ${station.status}`,
    }
  }

  const activeStandard = getActiveStandard(project)
  return generateBOM(station, station.lastCalcResult, activeStandard)
}
