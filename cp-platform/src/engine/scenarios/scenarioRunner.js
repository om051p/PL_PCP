import { runStationCalculations } from '../modules/calculations.js'
import { runRules } from '../rules/rulesEngine.js'
import { getActiveStandard } from '../../constants/index.js'

/**
 * Run a scenario override against the calculation engine.
 * Pure function — does not modify the base station or project store.
 * 
 * @param {object} station - Base station data
 * @param {object} project - Base project data
 * @param {object} scenario - Scenario with overrides to apply
 * @returns {object} ScenarioResult containing computed result and validation checks
 */
export function runScenario(station, project, scenario) {
  if (!station || !project || !scenario) return null

  // Deep clone to prevent any state mutation
  const clonedStation = JSON.parse(JSON.stringify(station))
  const clonedProject = JSON.parse(JSON.stringify(project))

  // Apply overrides
  if (scenario.overrides.station) {
    Object.assign(clonedStation, scenario.overrides.station)
  }
  if (scenario.overrides.designBasis && clonedProject.designBasis) {
    Object.assign(clonedProject.designBasis, scenario.overrides.designBasis)
  }
  if (scenario.overrides.groundbed && clonedStation.groundbed) {
    Object.assign(clonedStation.groundbed, scenario.overrides.groundbed)
  }
  if (scenario.overrides.tr && clonedStation.tr) {
    Object.assign(clonedStation.tr, scenario.overrides.tr)
  }

  // Resolve standard
  const activeStandard = getActiveStandard(clonedProject)

  // Run engine calculations (UNCHANGED)
  const result = runStationCalculations(
    clonedStation,
    clonedProject.designBasis?.systemDesignLifeYears ?? 25,
    activeStandard,
    clonedProject
  )

  // Run rules to check compliance status
  const { checks, insights, allPassed } = runRules(clonedStation, result, activeStandard)
  result.checks = checks
  result.insights = insights
  result.allChecksPassed = allPassed

  return {
    scenarioId: scenario.id,
    computedAt: new Date().toISOString(),
    appliedOverrides: scenario.overrides,
    result,
  }
}
