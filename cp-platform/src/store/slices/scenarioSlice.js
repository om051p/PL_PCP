import { runScenario as runScenarioEngine } from '../../engine/scenarios/scenarioRunner.js'

/**
 * ZUSTAND SCENARIO SLICE
 * Manages the state and actions for CP What-If Scenario Analysis.
 * Scenarios are persisted at the project level to survive revisions and clones.
 */
export const createScenarioSlice = (set, get) => ({
  saveScenario: (scenario) =>
    set((state) => {
      const proj = state.projects.find((p) => p.id === state.activeProjectId)
      if (!proj) return
      if (!proj.scenarios) proj.scenarios = []

      const existingIdx = proj.scenarios.findIndex((s) => s.id === scenario.id)
      if (existingIdx >= 0) {
        proj.scenarios[existingIdx] = scenario
      } else {
        proj.scenarios.push(scenario)
      }
      proj.updatedAt = new Date().toISOString()
    }),

  deleteScenario: (id) =>
    set((state) => {
      const proj = state.projects.find((p) => p.id === state.activeProjectId)
      if (!proj) return
      if (!proj.scenarios) return
      proj.scenarios = proj.scenarios.filter((s) => s.id !== id)
      proj.updatedAt = new Date().toISOString()
    }),

  runScenario: (scenarioId) =>
    set((state) => {
      const proj = state.projects.find((p) => p.id === state.activeProjectId)
      if (!proj) return
      const station = proj.stations.find((s) => s.id === state.activeStationId)
      if (!station) return
      const scenario = proj.scenarios?.find((s) => s.id === scenarioId)
      if (!scenario) return

      const runResult = runScenarioEngine(station, proj, scenario)
      if (runResult) {
        scenario.result = runResult.result
        scenario.computedAt = runResult.computedAt
      }
    }),

  runAllScenarios: () =>
    set((state) => {
      const proj = state.projects.find((p) => p.id === state.activeProjectId)
      if (!proj) return
      const station = proj.stations.find((s) => s.id === state.activeStationId)
      if (!station) return
      if (!proj.scenarios) return

      for (const scenario of proj.scenarios) {
        if (scenario.baseStationId === station.id) {
          const runResult = runScenarioEngine(station, proj, scenario)
          if (runResult) {
            scenario.result = runResult.result
            scenario.computedAt = runResult.computedAt
          }
        }
      }
    }),

  clearScenarioResults: () =>
    set((state) => {
      const proj = state.projects.find((p) => p.id === state.activeProjectId)
      if (!proj || !proj.scenarios) return
      for (const scenario of proj.scenarios) {
        scenario.result = null
        scenario.computedAt = null
      }
    }),
})
