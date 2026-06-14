/**
 * attenuationInputBuilder.js
 *
 * Downstream engineering consumer — derives the AttenuationInput
 * structure used by the attenuation engine from the actual project assets
 * (stations, TR units, groundbeds, pipeline segments, design basis).
 *
 * Architecture contract:
 *   - No synthetic stations, no synthetic TRs, no synthetic groundbeds.
 *   - If engineer adds 1 station / 1 TR / 1 groundbed, attenuation uses
 *     exactly those assets. If engineer adds 3, attenuation uses exactly
 *     those three.
 *   - If any required asset is missing, the builder returns a `validation`
 *     payload with engineering guidance instead of fabricating defaults.
 *   - Pure function: no React, no Zustand, no side effects.
 *   - The engine (attenuationEngine.js) is untouched. This module only
 *     builds its input.
 */

import { ATTENUATION_CONSTANTS } from '../engine/modules/attenuationEngine.js'

// ─────────────────────────────────────────────────────────────────────────────
// Reasons — stable identifiers used by the UI state machine
// ─────────────────────────────────────────────────────────────────────────────

export const ATTENUATION_REASONS = Object.freeze({
  NO_PROJECT: 'NO_PROJECT',
  NO_STATIONS: 'NO_STATIONS',
  NO_PIPELINE: 'NO_PIPELINE',
  NO_TR: 'NO_TR',
  NO_GROUNDBED: 'NO_GROUNDBED',
  MISSING_STATION_CHAINAGE: 'MISSING_STATION_CHAINAGE',
  MISSING_SOIL_RESISTIVITY: 'MISSING_SOIL_RESISTIVITY',
  MISSING_TR_VOLTAGE: 'MISSING_TR_VOLTAGE',
  READY: 'READY',
})

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parses a chainage string like "KM 44+635" or "KM 00+000" into a km value.
 * Returns null if it cannot be parsed. Defensive against bad input.
 *
 * @param {string|number|null|undefined} location
 * @returns {number|null}
 */
export function parseChainageKm(location) {
  if (location == null) return null
  if (typeof location === 'number' && Number.isFinite(location)) return location
  if (typeof location !== 'string') return null

  // Match forms like "KM 44+635", "km 44+635", "44+635", "44.5", "44"
  const trimmed = location.trim()
  if (trimmed === '') return null

  // Plus-sign form: km+metres
  const plusMatch = trimmed.match(/^km?\s*(\d+(?:\.\d+)?)\s*\+\s*(\d+(?:\.\d+)?)$/i)
  if (plusMatch) {
    const km = parseFloat(plusMatch[1])
    const metres = parseFloat(plusMatch[2])
    if (Number.isFinite(km) && Number.isFinite(metres)) {
      return km + metres / 1000
    }
  }

  // Plain decimal km (with or without "KM" prefix)
  const decimalMatch = trimmed.match(/^(?:km?\s*)?(\d+(?:\.\d+)?)$/i)
  if (decimalMatch) {
    const v = parseFloat(decimalMatch[1])
    return Number.isFinite(v) ? v : null
  }

  return null
}

/**
 * Returns a defensive copy of the station array — never undefined.
 * @param {object|null|undefined} project
 */
function safeStations(project) {
  if (!project || !Array.isArray(project.stations)) return []
  return project.stations.filter((s) => s && typeof s === 'object')
}

/**
 * Returns the design basis or an empty object — never undefined.
 */
function safeDesignBasis(project) {
  return (project && project.designBasis) || {}
}

/**
 * Returns the active station, falling back to the first station.
 */
function resolveActiveStation(project, activeStationId) {
  const stations = safeStations(project)
  if (stations.length === 0) return null
  if (activeStationId) {
    const explicit = stations.find((s) => s.id === activeStationId)
    if (explicit) return explicit
  }
  return stations[0]
}

/**
 * Sum of all pipeline segment lengths (m) across all stations.
 * Defensive against missing/short segment arrays.
 */
function totalPipelineLengthM(stations) {
  let total = 0
  for (const s of stations) {
    if (!s || !Array.isArray(s.pipelineSegments)) continue
    for (const seg of s.pipelineSegments) {
      if (seg && Number.isFinite(seg.lengthM)) total += seg.lengthM
    }
  }
  return total
}

/**
 * Pick the first station that has a non-empty pipelineSegments array.
 * Returns null if none.
 */
function firstStationWithPipeline(stations) {
  for (const s of stations) {
    if (s && Array.isArray(s.pipelineSegments) && s.pipelineSegments.length > 0) {
      return s
    }
  }
  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} AttenuationGuidance
 * @property {string}  reason    stable id (ATTENUATION_REASONS.*)
 * @property {string}  title     short heading shown to the engineer
 * @property {string}  message   longer engineering explanation
 * @property {string}  action    label of a deep-link button
 * @property {string}  route     internal navigation target
 */

/**
 * Returns the engineer-facing guidance for a given reason code.
 */
export function guidanceForReason(reason) {
  switch (reason) {
    case ATTENUATION_REASONS.NO_PROJECT:
      return {
        reason,
        title: 'No active project',
        message: 'Create or open a project before running the attenuation analysis.',
        action: 'Go to Project Setup',
        route: '/project-setup',
      }
    case ATTENUATION_REASONS.NO_STATIONS:
      return {
        reason,
        title: 'No stations defined',
        message:
          'Attenuation requires at least one CP station. Add a station in Project Setup or the Stations page.',
        action: 'Go to Project Setup',
        route: '/project-setup',
      }
    case ATTENUATION_REASONS.NO_PIPELINE:
      return {
        reason,
        title: 'No pipeline defined',
        message:
          'The active station has no pipeline segments. Add a pipeline segment with diameter, wall thickness, and length.',
        action: 'Go to Project Setup',
        route: '/project-setup',
      }
    case ATTENUATION_REASONS.NO_TR:
      return {
        reason,
        title: 'No TR units exist',
        message:
          'Attenuation is driven by the TR drain point voltage. Create a TR unit in TR Sizing.',
        action: 'Go to TR Sizing',
        route: '/tr-sizing',
      }
    case ATTENUATION_REASONS.NO_GROUNDBED:
      return {
        reason,
        title: 'No groundbed defined',
        message:
          'Attenuation requires a groundbed for every station. Define a groundbed in Groundbed Sizing.',
        action: 'Go to Groundbed Sizing',
        route: '/groundbed',
      }
    case ATTENUATION_REASONS.MISSING_STATION_CHAINAGE:
      return {
        reason,
        title: 'Station chainage missing',
        message:
          'At least one station does not have a parsable KM location (e.g. "KM 44+635"). Set the chainage in the station location field.',
        action: 'Go to Project Setup',
        route: '/project-setup',
      }
    case ATTENUATION_REASONS.MISSING_SOIL_RESISTIVITY:
      return {
        reason,
        title: 'Soil resistivity missing',
        message:
          'Soil resistivity is required for the leakage resistance term. Set it in Design Basis or Soil Resistivity.',
        action: 'Go to Soil Resistivity',
        route: '/soil-resistivity',
      }
    case ATTENUATION_REASONS.MISSING_TR_VOLTAGE:
      return {
        reason,
        title: 'TR rated voltage missing',
        message:
          'The TR drain-point voltage is required. Set the TR rated voltage in TR Sizing.',
        action: 'Go to TR Sizing',
        route: '/tr-sizing',
      }
    default:
      return {
        reason: 'UNKNOWN',
        title: 'Attenuation unavailable',
        message: 'The attenuation analysis is not available in the current state.',
        action: 'Go to Dashboard',
        route: '/',
      }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Builder
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build an AttenuationInput from the actual project assets.
 *
 * Returns:
 *   {
 *     input:      { pipe, coating, potentials, stations, profileConfig } | null,
 *     validation: { isReady: boolean, reasons: string[], guidance: Guidance[] }
 *   }
 *
 * Never throws. Defensive against missing/partial project state.
 *
 * @param {object|null} project
 * @param {string|null} [activeStationId]
 * @returns {{ input: object|null, validation: object }}
 */
export function buildAttenuationInputFromProject(project, activeStationId = null) {
  if (!project || typeof project !== 'object') {
    return {
      input: null,
      validation: {
        isReady: false,
        reasons: [ATTENUATION_REASONS.NO_PROJECT],
        guidance: [guidanceForReason(ATTENUATION_REASONS.NO_PROJECT)],
      },
    }
  }

  const stations = safeStations(project)
  const designBasis = safeDesignBasis(project)
  const reasons = []

  if (stations.length === 0) {
    reasons.push(ATTENUATION_REASONS.NO_STATIONS)
  }

  // Station-level checks (TR, groundbed, chainage)
  const stationsMissingTR = []
  const stationsMissingGroundbed = []
  const stationsMissingChainage = []
  const stationsMissingPipeline = []
  for (const s of stations) {
    if (!s.tr) stationsMissingTR.push(s.id)
    if (!s.groundbed) stationsMissingGroundbed.push(s.id)
    if (parseChainageKm(s.location) == null) stationsMissingChainage.push(s.id)
    if (!Array.isArray(s.pipelineSegments) || s.pipelineSegments.length === 0) {
      stationsMissingPipeline.push(s.id)
    }
  }

  // If at least one station has a TR, treat that as the "TR exists" condition;
  // otherwise the design has no TRs.
  if (stations.length > 0 && stationsMissingTR.length === stations.length) {
    reasons.push(ATTENUATION_REASONS.NO_TR)
  }
  if (stations.length > 0 && stationsMissingGroundbed.length === stations.length) {
    reasons.push(ATTENUATION_REASONS.NO_GROUNDBED)
  }
  if (stations.length > 0 && stationsMissingChainage.length > 0) {
    reasons.push(ATTENUATION_REASONS.MISSING_STATION_CHAINAGE)
  }
  if (stations.length > 0 && stationsMissingPipeline.length === stations.length) {
    reasons.push(ATTENUATION_REASONS.NO_PIPELINE)
  }

  // Pipe geometry — derived from the first station that has pipeline segments.
  const pipeStation = firstStationWithPipeline(stations)
  if (pipeStation) {
    const seg = pipeStation.pipelineSegments[0]
    if (!Number.isFinite(seg?.od) || seg.od <= 0) {
      // Treat as missing pipeline
      reasons.push(ATTENUATION_REASONS.NO_PIPELINE)
    }
    if (!Number.isFinite(seg?.wallThk) || seg.wallThk <= 0) {
      reasons.push(ATTENUATION_REASONS.NO_PIPELINE)
    }
  }

  // Soil resistivity — design basis wins, else active station.
  const activeStation = resolveActiveStation(project, activeStationId)
  const soilResistivityOhmCm =
    Number.isFinite(designBasis.soilResistivityOhmCm) && designBasis.soilResistivityOhmCm > 0
      ? designBasis.soilResistivityOhmCm
      : Number.isFinite(activeStation?.soilResistivityOhmCm) && activeStation.soilResistivityOhmCm > 0
        ? activeStation.soilResistivityOhmCm
        : null
  if (soilResistivityOhmCm == null) {
    reasons.push(ATTENUATION_REASONS.MISSING_SOIL_RESISTIVITY)
  }

  // TR drain-point voltage — derived from station.tr.ratedVoltage
  const trStation = stations.find((s) => s?.tr && Number.isFinite(s.tr.ratedVoltage) && s.tr.ratedVoltage > 0)
  const trVoltageV = trStation?.tr?.ratedVoltage
  if (trVoltageV == null) {
    reasons.push(ATTENUATION_REASONS.MISSING_TR_VOLTAGE)
  }

  if (reasons.length > 0) {
    return {
      input: null,
      validation: {
        isReady: false,
        reasons,
        guidance: reasons.map(guidanceForReason),
      },
    }
  }

  // ── Build the actual input ───────────────────────────────────────────────
  const seg = pipeStation.pipelineSegments[0]
  const totalLengthKm = totalPipelineLengthM(stations) / 1000
  // Use the longest station-to-station span as the protection length target.
  // Fall back to half the total length if no multi-station geometry yet.
  const stationPositions = stations
    .map((s) => parseChainageKm(s.location))
    .filter((v) => Number.isFinite(v))
    .sort((a, b) => a - b)
  const spanKm =
    stationPositions.length >= 2
      ? stationPositions[stationPositions.length - 1] - stationPositions[0]
      : totalLengthKm / 2

  // Build attenuation station list from real project stations.
  const attenuationStations = stations.map((s) => ({
    id: s.id,
    positionKm: parseChainageKm(s.location),
    label: s.name,
  }))

  // Profile config
  const minKm = Math.min(...attenuationStations.map((s) => s.positionKm))
  const maxKm = Math.max(...attenuationStations.map((s) => s.positionKm))
  const startKm = minKm - 5
  const endKm = Math.max(maxKm + 5, minKm + totalLengthKm)

  // Drain-point potential — TR rated voltage (V) × 1000 → mV. This is the
  // value the TR drives the pipeline to. Cap the drain-point at the TR
  // rated voltage; if the design basis overrides it, prefer that.
  const drainPointMv =
    Number.isFinite(designBasis.drainPointMv) && designBasis.drainPointMv > 0
      ? designBasis.drainPointMv
      : trVoltageV * 1000

  const input = {
    pipe: {
      diameterInches: seg.od,
      wallThicknessInches: seg.wallThk,
      totalLengthKm,
      maxProtectionLengthKm: spanKm,
      steelResistivityMicroOhmCm:
        Number.isFinite(designBasis.steelResistivityMicroOhmCm) && designBasis.steelResistivityMicroOhmCm > 0
          ? designBasis.steelResistivityMicroOhmCm
          : ATTENUATION_CONSTANTS.DEFAULT_STEEL_RESISTIVITY,
    },
    coating: {
      conductivityMicroSiemensPerM2:
        Number.isFinite(designBasis.coatingConductivityMicroSiemensPerM2) && designBasis.coatingConductivityMicroSiemensPerM2 > 0
          ? designBasis.coatingConductivityMicroSiemensPerM2
          : ATTENUATION_CONSTANTS.DEFAULT_COATING_G_FBE_AGED,
      soilResistivityOhmCm,
      currentDensityMaPerM2:
        Number.isFinite(designBasis.coatingCurrentDensityMaPerM2) && designBasis.coatingCurrentDensityMaPerM2 > 0
          ? designBasis.coatingCurrentDensityMaPerM2
          : 0.175,
    },
    potentials: {
      naturalMv:
        Number.isFinite(designBasis.naturalPotentialMv) && designBasis.naturalPotentialMv > 0
          ? designBasis.naturalPotentialMv
          : 550,
      drainPointMv,
      minimumMv:
        Number.isFinite(designBasis.minimumProtectionMv) && designBasis.minimumProtectionMv > 0
          ? designBasis.minimumProtectionMv
          : ATTENUATION_CONSTANTS.NACE_MIN_PROTECTION_MV,
    },
    stations: attenuationStations,
    profileConfig: { startKm, endKm, stepKm: 1.0 },
  }

  return {
    input,
    validation: {
      isReady: true,
      reasons: [ATTENUATION_REASONS.READY],
      guidance: [],
    },
  }
}
