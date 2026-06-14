/**
 * M10 — Asset Registry (Digital Twin Foundation)
 * assetFactory.js — Creates asset objects from station design data
 *
 * Assets are DESIGN-LINKED — they are created from the station design,
 * not entered manually. The designRef is a frozen snapshot at commissioning time.
 *
 * NO telemetry fields at this stage. Those are M15 stubs only.
 * PROTECTED: No calculation logic. Pure factory/mapping only.
 */

import { AssetType } from './AssetTypes.js'

let _idCounter = 1
function newAssetId() {
  return `asset_${Date.now()}_${_idCounter++}`
}

/**
 * Create a PIPELINE asset from a station and its pipeline segments.
 *
 * @param {object} station — station object from project state
 * @param {object} project — active project
 * @returns {Asset}
 */
export function makePipelineAsset(station, project) {
  const segments = station.pipelineSegments ?? []
  const totalLengthM = segments.reduce((sum, s) => sum + (s.lengthM ?? 0), 0)

  return {
    id: newAssetId(),
    type: AssetType.PIPELINE,
    stationId: station.id,
    projectId: project.id,
    name: `Pipeline — ${station.stationName || station.id}`,
    createdAt: new Date().toISOString(),
    // Frozen snapshot of design data at asset creation time
    designRef: Object.freeze({
      stationId: station.id,
      stationName: station.stationName,
      segmentCount: segments.length,
      totalLengthM,
      operatingTempC: segments[0]?.opTempC ?? null,
      coatingType: segments[0]?.coatingType ?? null,
      designCurrentA: station.lastCalcResult?.totalCurrentRequired ?? null,
      designLifeYears: project?.designBasis?.systemDesignLifeYears ?? null,
      standard: project?.designBasis?.designStandard ?? null,
      capturedAt: new Date().toISOString(),
    }),
    // Telemetry hook — M15 stub (DO NOT populate yet)
    telemetry: null,
    // Health score — computed by M11 healthScoreEngine
    healthScore: null,
  }
}

/**
 * Create a TR_UNIT asset from a station.
 *
 * @param {object} station
 * @param {object} project
 * @returns {Asset}
 */
export function makeTRAsset(station, project) {
  const tr = station.tr ?? {}
  const result = station.lastCalcResult ?? {}

  return {
    id: newAssetId(),
    type: AssetType.TR_UNIT,
    stationId: station.id,
    projectId: project.id,
    name: `TR Unit — ${station.stationName || station.id}`,
    createdAt: new Date().toISOString(),
    designRef: Object.freeze({
      stationId: station.id,
      ratedVoltageV: tr.ratedVoltageV ?? null,
      ratedCurrentA: tr.ratedCurrentA ?? null,
      minRequiredVoltageV: result.trMinVoltage ?? null,
      designCurrentA: result.totalCurrentRequired ?? null,
      voltageMargineRatio: (tr.ratedVoltageV && result.trMinVoltage)
        ? tr.ratedVoltageV / result.trMinVoltage
        : null,
      capturedAt: new Date().toISOString(),
    }),
    telemetry: null,
    healthScore: null,
  }
}

/**
 * Create a GROUNDBED asset from a station.
 *
 * @param {object} station
 * @param {object} project
 * @returns {Asset}
 */
export function makeGroundbedAsset(station, project) {
  const gb = station.groundbed ?? {}
  const result = station.lastCalcResult ?? {}

  return {
    id: newAssetId(),
    type: AssetType.GROUNDBED,
    stationId: station.id,
    projectId: project.id,
    name: `Groundbed — ${station.stationName || station.id}`,
    createdAt: new Date().toISOString(),
    designRef: Object.freeze({
      stationId: station.id,
      anodeCount: gb.anodeCount ?? station.proposedAnodes ?? null,
      anodeType: gb.anodeType ?? null,
      groundbedType: gb.groundbedType ?? null,
      depthM: gb.depthM ?? null,
      resistanceOhm: result.groundbedResistanceOhm ?? null,
      anodeWeightKg: gb.anodeWeightKg ?? null,
      designLifeYears: result.designLifeYears ?? null,
      soilResistivityOhmCm: station.soilResistivityOhmCm ?? null,
      capturedAt: new Date().toISOString(),
    }),
    telemetry: null,
    healthScore: null,
  }
}

/**
 * Create a complete set of assets for a station.
 * Returns all assets that have sufficient design data.
 *
 * @param {object} station
 * @param {object} project
 * @returns {Asset[]}
 */
export function makeStationAssets(station, project) {
  const assets = []

  if (station.pipelineSegments?.length > 0) {
    assets.push(makePipelineAsset(station, project))
  }

  if (station.tr || station.lastCalcResult?.trMinVoltage) {
    assets.push(makeTRAsset(station, project))
  }

  if (station.groundbed || station.lastCalcResult?.groundbedResistanceOhm) {
    assets.push(makeGroundbedAsset(station, project))
  }

  return assets
}
