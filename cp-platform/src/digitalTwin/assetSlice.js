/**
 * M10–M12 — Digital Twin Zustand Slice
 * assetSlice.js — Manages digital twin state in the project store
 *
 * Integrates: Asset Registry (M10), Health Score Engine (M11), Risk Engine (M12).
 *
 * Actions:
 *   - commissionStationAssets(stationId) — builds assets from station design
 *   - decommissionStationAssets(stationId) — removes all assets for a station
 *   - refreshDigitalTwinForProject() — rebuilds full twin from current project
 *   - updateAssetHealthScore(assetId, score) — update cached health score
 *
 * PROTECTED: No calculation logic. State management only.
 */

import {
  makeEmptyRegistry,
  registryReplaceStationAssets,
  registryRemoveAsset,
  registryAddAsset,
  getAssetsForStation,
} from './assets/assetRegistry.js'
import { makeStationAssets } from './assets/assetFactory.js'
import { computeHealthScore, computeProjectHealthScores } from './healthScoreEngine.js'
import { computeRiskAssessment, computeProjectRiskAssessments } from './riskEngine.js'

export function createAssetSlice(set, get) {
  return {
    // ── State ────────────────────────────────────────────────────────────────
    digitalTwin: {
      registry: makeEmptyRegistry(),
      healthScores: {},     // Record<stationId, HealthScoreResult>
      riskAssessments: {},  // Record<stationId, RiskAssessmentResult>
      lastRefreshedAt: null,
    },

    // ── Actions ──────────────────────────────────────────────────────────────

    /**
     * Commission (create) all assets for a station from its current design data.
     * Replaces any existing assets for that station.
     *
     * @param {string} stationId
     */
    commissionStationAssets: (stationId) => {
      const state = get()
      const project = state.projects.find((p) => p.id === state.activeProjectId)
      if (!project) return

      const station = project.stations.find((s) => s.id === stationId)
      if (!station) return

      const newAssets = makeStationAssets(station, project)
      const healthScore = computeHealthScore(station, project)
      const riskAssessment = computeRiskAssessment(station, project)

      set((s) => {
        const registry = registryReplaceStationAssets(
          s.digitalTwin.registry,
          stationId,
          newAssets,
        )
        return {
          digitalTwin: {
            ...s.digitalTwin,
            registry,
            healthScores: { ...s.digitalTwin.healthScores, [stationId]: healthScore },
            riskAssessments: { ...s.digitalTwin.riskAssessments, [stationId]: riskAssessment },
            lastRefreshedAt: new Date().toISOString(),
          },
        }
      })
    },

    /**
     * Remove all assets for a station.
     *
     * @param {string} stationId
     */
    decommissionStationAssets: (stationId) => {
      set((s) => {
        const existingIds = s.digitalTwin.registry.byStation[stationId] ?? []
        const registry = existingIds.reduce(
          (reg, id) => registryRemoveAsset(reg, id),
          s.digitalTwin.registry,
        )

        const healthScores = { ...s.digitalTwin.healthScores }
        const riskAssessments = { ...s.digitalTwin.riskAssessments }
        delete healthScores[stationId]
        delete riskAssessments[stationId]

        return {
          digitalTwin: {
            ...s.digitalTwin,
            registry,
            healthScores,
            riskAssessments,
            lastRefreshedAt: new Date().toISOString(),
          },
        }
      })
    },

    /**
     * Fully refresh the digital twin for the active project.
     * Rebuilds all assets, health scores, and risk assessments.
     * Called after project-level recalculation.
     */
    refreshDigitalTwinForProject: () => {
      const state = get()
      const project = state.projects.find((p) => p.id === state.activeProjectId)
      if (!project) return

      let registry = makeEmptyRegistry()

      for (const station of project.stations) {
        if (station.lastCalcResult) {
          const stationAssets = makeStationAssets(station, project)
          for (const asset of stationAssets) {
            registry = registryAddAsset(registry, asset)
          }
        }
      }

      const healthScores = computeProjectHealthScores(project)
      const riskAssessments = computeProjectRiskAssessments(project)

      set((s) => ({
        digitalTwin: {
          ...s.digitalTwin,
          registry,
          healthScores,
          riskAssessments,
          lastRefreshedAt: new Date().toISOString(),
        },
      }))
    },

    // ── Selectors (called by components) ─────────────────────────────────────

    /**
     * Get health score for the active station.
     * @returns {HealthScoreResult|null}
     */
    getActiveStationHealth: () => {
      const state = get()
      return state.digitalTwin.healthScores[state.activeStationId] ?? null
    },

    /**
     * Get risk assessment for the active station.
     * @returns {RiskAssessmentResult|null}
     */
    getActiveStationRisk: () => {
      const state = get()
      return state.digitalTwin.riskAssessments[state.activeStationId] ?? null
    },

    /**
     * Get all assets for the active station.
     * @returns {Asset[]}
     */
    getActiveStationAssets: () => {
      const state = get()
      return getAssetsForStation(state.digitalTwin.registry, state.activeStationId)
    },
  }
}
