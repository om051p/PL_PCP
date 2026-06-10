/**
 * ATTENUATION SERVICE
 * Pure business logic for attenuation analysis.
 * Extracted from projectStore.js to separate concerns.
 */

import { runAttenuationAnalysis } from '../engine/modules/attenuationEngine.js'

/** Sentinel result when no input is provided */
const EMPTY_RESULT = {
  success: false,
  errors: ['No input provided. Set attenuationInput before running calculation.'],
  warnings: [],
  intermediates: null,
  checkPointAssessment: null,
  profile: null,
  stationReachKm: null,
  summary: null,
}

/**
 * Run attenuation analysis on the given input.
 * Returns a result object — never throws.
 *
 * @param {Object|null} input - Attenuation input data
 * @returns {Object} Attenuation result
 */
export function computeAttenuation(input) {
  if (!input) return EMPTY_RESULT
  return runAttenuationAnalysis(input)
}
