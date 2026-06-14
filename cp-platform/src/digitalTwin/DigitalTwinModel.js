/**
 * M10–M12 — Digital Twin Foundation
 * DigitalTwinModel.js — Root model linking assets to project stations
 *
 * This is the top-level container for the digital twin.
 * It does NOT hold telemetry — that is M15.
 * It links: project → stations → assets → health scores → risk assessments.
 *
 * PROTECTED: No calculation logic. Pure data model only.
 */

import {
  makeEmptyRegistry,
  registryAddAsset,
} from './assets/assetRegistry.js'
import { makeStationAssets } from './assets/assetFactory.js'
import { computeHealthScore } from './healthScoreEngine.js'
import { computeRiskAssessment } from './riskEngine.js'

/**
 * Create a fresh digital twin model for a project.
 * @returns {DigitalTwinModel}
 */
export function makeDigitalTwinModel() {
  return {
    registry: makeEmptyRegistry(),
    healthScores: {},         // Record<stationId, HealthScoreResult>
    riskAssessments: {},      // Record<stationId, RiskAssessmentResult>
    lastRefreshedAt: null,
  }
}

/**
 * Refresh the digital twin model for the active project.
 * Rebuilds assets from current design data, recomputes health and risk.
 *
 * Called after every calculation to keep the twin in sync.
 *
 * @param {object} project — active project from store
 * @param {DigitalTwinModel} currentModel — existing model (may be empty)
 * @returns {DigitalTwinModel} — new model (immutable)
 */
export function refreshDigitalTwin(project, currentModel = makeDigitalTwinModel()) {
  if (!project?.stations?.length) {
    return { ...makeDigitalTwinModel(), lastRefreshedAt: new Date().toISOString() }
  }

  // Rebuild registry from all stations
  let registry = makeEmptyRegistry()
  const healthScores = {}
  const riskAssessments = {}

  for (const station of project.stations) {
    // Only commission assets if the station has been calculated
    if (station.lastCalcResult) {
      const stationAssets = makeStationAssets(station, project)
      for (const asset of stationAssets) {
        registry = registryAddAsset(registry, asset)
      }
    }

    // Always compute health and risk (even if not calculated — scores will be 0)
    healthScores[station.id] = computeHealthScore(station, project)
    riskAssessments[station.id] = computeRiskAssessment(station, project)
  }

  return {
    registry,
    healthScores,
    riskAssessments,
    lastRefreshedAt: new Date().toISOString(),
  }
}
