/**
 * ATTENUATION SERVICE
 * Pure business logic for attenuation analysis.
 * Extracted from projectStore.js to separate concerns.
 *
 * M7 hardening — never throws. Validation layer is added on top of the
 * engine so partial / invalid inputs return engineering messages instead
 * of crashing the page.
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
 * Sentinel result for structurally invalid inputs (not arrays, missing
 * pipe/coating/potentials). Keeps the page responsive instead of crashing.
 */
function invalidInputResult(reason) {
  return {
    success: false,
    errors: [reason],
    warnings: [],
    intermediates: null,
    checkPointAssessment: null,
    profile: null,
    stationReachKm: null,
    summary: null,
  }
}

/**
 * Pre-flight structural validation. Catches "Cannot read properties of
 * undefined (reading 'km')" class errors before they reach the engine.
 */
function preflightValidation(input) {
  if (!input || typeof input !== 'object') {
    return invalidInputResult('Attenuation input is missing or invalid.')
  }
  if (!input.pipe || typeof input.pipe !== 'object') {
    return invalidInputResult('Pipe geometry is missing.')
  }
  if (!input.coating || typeof input.coating !== 'object') {
    return invalidInputResult('Coating parameters are missing.')
  }
  if (!input.potentials || typeof input.potentials !== 'object') {
    return invalidInputResult('Potential parameters are missing.')
  }
  if (!Array.isArray(input.stations)) {
    return invalidInputResult('Station list is not an array.')
  }
  if (input.stations.length === 0) {
    return invalidInputResult('No stations are defined. Add a station in Project Setup.')
  }
  for (let i = 0; i < input.stations.length; i++) {
    const s = input.stations[i]
    if (!s || typeof s !== 'object') {
      return invalidInputResult(`Station at index ${i} is not an object.`)
    }
    if (typeof s.positionKm !== 'number' || !Number.isFinite(s.positionKm)) {
      return invalidInputResult(`Station "${s.id ?? i}" has no valid chainage (km).`)
    }
  }
  return null
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

  const preflight = preflightValidation(input)
  if (preflight) return preflight

  try {
    return runAttenuationAnalysis(input)
  } catch (err) {
    console.error('[AttenuationService] Engine threw unexpectedly:', err)
    return invalidInputResult(`Calculation failed: ${err?.message || 'unknown error'}`)
  }
}
