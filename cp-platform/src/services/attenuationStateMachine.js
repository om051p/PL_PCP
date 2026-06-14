/**
 * attenuationStateMachine.js
 *
 * Pure state machine for the Attenuation page UI.
 *
 * States:
 *   EMPTY         — no project at all
 *   INCOMPLETE    — project exists but required assets are missing
 *   READY         — inputs derived, no result yet
 *   CALCULATED    — fresh, successful result on screen
 *   STALE         — result exists, but upstream project changed
 *   ERROR         — last calculation failed
 *
 * Pure function. No React, no Zustand, no side effects.
 */

import { guidanceForReason, ATTENUATION_REASONS } from './attenuationInputBuilder.js'

export const ATTENUATION_STATES = Object.freeze({
  EMPTY: 'EMPTY',
  INCOMPLETE: 'INCOMPLETE',
  READY: 'READY',
  CALCULATED: 'CALCULATED',
  STALE: 'STALE',
  ERROR: 'ERROR',
})

/**
 * @param {object} args
 * @param {object|null} args.project
 * @param {object|null} args.attenuationInput     (derived)
 * @param {object|null} args.attenuationResult
 * @param {boolean}     args.attenuationDirty
 * @param {boolean}     args.attenuationCalculating
 * @param {string|null} args.activeStationId
 * @returns {{
 *   state: string,
 *   reasonCodes: string[],
 *   guidance: object[],
 *   canRunCalculation: boolean,
 *   canShowVisualization: boolean,
 *   showStaleBanner: boolean
 * }}
 */
export function resolveAttenuationState({
  project,
  attenuationInput,
  attenuationResult,
  attenuationDirty,
  attenuationCalculating,
  activeStationId,
}) {
  // No project at all → EMPTY
  if (!project) {
    return {
      state: ATTENUATION_STATES.EMPTY,
      reasonCodes: [ATTENUATION_REASONS.NO_PROJECT],
      guidance: [guidanceForReason(ATTENUATION_REASONS.NO_PROJECT)],
      canRunCalculation: false,
      canShowVisualization: false,
      showStaleBanner: false,
    }
  }

  // Missing required assets → INCOMPLETE
  if (!attenuationInput) {
    // We weren't given a pre-built input; reconstruct guidance directly.
    const reasons = []
    if (!Array.isArray(project.stations) || project.stations.length === 0) {
      reasons.push(ATTENUATION_REASONS.NO_STATIONS)
    } else {
      const hasTR = project.stations.some((s) => s?.tr)
      if (!hasTR) reasons.push(ATTENUATION_REASONS.NO_TR)
      const hasGroundbed = project.stations.some((s) => s?.groundbed)
      if (!hasGroundbed) reasons.push(ATTENUATION_REASONS.NO_GROUNDBED)
      const hasPipeline = project.stations.some(
        (s) => Array.isArray(s?.pipelineSegments) && s.pipelineSegments.length > 0
      )
      if (!hasPipeline) reasons.push(ATTENUATION_REASONS.NO_PIPELINE)
    }
    return {
      state: ATTENUATION_STATES.INCOMPLETE,
      reasonCodes: reasons,
      guidance: reasons.map(guidanceForReason),
      canRunCalculation: false,
      canShowVisualization: false,
      showStaleBanner: false,
    }
  }

  // If the last result errored, surface ERROR
  if (attenuationResult && attenuationResult.success === false) {
    return {
      state: ATTENUATION_STATES.ERROR,
      reasonCodes: [],
      guidance: [],
      canRunCalculation: true,
      canShowVisualization: false,
      showStaleBanner: false,
    }
  }

  const hasFreshResult =
    attenuationResult?.success === true &&
    attenuationDirty === false &&
    attenuationCalculating === false

  if (hasFreshResult) {
    return {
      state: ATTENUATION_STATES.CALCULATED,
      reasonCodes: [],
      guidance: [],
      canRunCalculation: false,
      canShowVisualization: true,
      showStaleBanner: false,
    }
  }

  // Has input, no result, or stale result
  if (attenuationResult?.success === true && attenuationDirty === true) {
    return {
      state: ATTENUATION_STATES.STALE,
      reasonCodes: [],
      guidance: [],
      canRunCalculation: true,
      canShowVisualization: true,
      showStaleBanner: true,
    }
  }

  return {
    state: ATTENUATION_STATES.READY,
    reasonCodes: [],
    guidance: [],
    canRunCalculation: true,
    canShowVisualization: false,
    showStaleBanner: false,
  }
}
