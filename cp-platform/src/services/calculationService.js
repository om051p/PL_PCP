/**
 * CALCULATION SERVICE
 * Pure business logic orchestration — no state, no side effects.
 * Extracted from projectStore.js to separate concerns.
 *
 * Pipeline: validate → calculate → rules → BOM → alternatives
 */

import { runStationCalculations } from '../engine/modules/calculations.js'
import { runRules } from '../engine/rules/rulesEngine.js'
import { generateAlternatives } from '../engine/optimizer/optimizer.js'
import { generateBOM } from '../engine/rules/bomEngine.js'
import { validateStation } from '../engine/modules/validation.js'
import { getActiveStandard } from '../constants/index.js'

/**
 * Run the full calculation pipeline for a station.
 * Returns a result object — never throws.
 *
 * @param {Object} station - Station data (read-only)
 * @param {Object} project - Project data (for standard, design life, status)
 * @returns {{ success: boolean, validationErrors?: string[], result?: Object, insights?: Array, alternatives?: Array, bom?: Array }}
 */
export function runFullCalculation(station, project) {
  // 1. Validate inputs
  const validation = validateStation({
    pipelineSegments: station.pipelineSegments,
    groundbed: station.groundbed,
    anodeSpec: station.anodeSpec,
    proposedAnodes: station.proposedAnodes,
    cables: station.cables,
    tr: station.tr,
    soilResistivityOhmCm: station.soilResistivityOhmCm,
    actualRemotenesM: station.actualRemotenesM,
    requiredRemotenesM: station.requiredRemotenesM,
    designLifeYears: station.designLifeYears,
  })

  if (!validation.valid) {
    return { success: false, validationErrors: validation.errors }
  }

  // 2. Resolve active standard
  const activeStandard = getActiveStandard(project)

  // 3. Run core calculations
  const result = runStationCalculations(station, project.systemDesignLifeYears, activeStandard)

  // 4. Run validation rules + insights
  const { checks, insights, allPassed } = runRules(station, result, activeStandard)

  // 5. Generate alternatives
  const alternatives = generateAlternatives(station, result, project.systemDesignLifeYears, activeStandard)

  // 6. Generate BOM (only if project is beyond draft)
  const bom = project.status !== 'draft'
    ? generateBOM(station, result, activeStandard)
    : []

  // Assemble result
  result.checks = checks
  result.insights = insights
  result.allChecksPassed = allPassed
  result.bom = bom

  return {
    success: true,
    result,
    insights,
    alternatives,
  }
}
