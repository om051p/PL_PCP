import { newId } from '../../utils/id.js'

/**
 * A scenario is a named set of input overrides applied to a base station.
 * Overrides are applied as a deep merge against the live station + project.
 * The base station is NEVER mutated.
 * 
 * Supports both single-variable overrides and multi-variable named scenarios.
 * 
 * @param {object} overrides - Initial overrides or properties
 * @returns {object} Scenario object
 */
export function makeScenario(overrides = {}) {
  return {
    id: newId(),
    name: '',
    description: '',
    baseStationId: null,
    createdAt: new Date().toISOString(),
    overrides: {
      // station-level overrides (shallow merge)
      station: {},
      // designBasis overrides (shallow merge)
      designBasis: {},
      // groundbed overrides
      groundbed: {},
      // tr overrides
      tr: {},
      ...overrides.overrides,
    },
    result: null,            // computed on demand
    computedAt: null,
    ...overrides,
  }
}
