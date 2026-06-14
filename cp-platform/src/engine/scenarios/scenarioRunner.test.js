import { describe, it, expect } from 'vitest'
import { makeScenario } from './ScenarioModel.js'
import { runScenario } from './scenarioRunner.js'
import { makeDefaultStation, makeDefaultProject } from '../../store/factories.js'

describe('Scenario Sizing Runner', () => {
  it('makeScenario initializes overrides and metadata correctly', () => {
    const scenario = makeScenario({
      name: 'High Soil Resistivity',
      overrides: {
        station: { soilResistivityOhmCm: 500 }
      }
    })
    
    expect(scenario.name).toBe('High Soil Resistivity')
    expect(scenario.overrides.station.soilResistivityOhmCm).toBe(500)
    expect(scenario.id).toBeDefined()
  })

  it('runScenario computes output without mutating the baseline station/project objects', () => {
    const station = makeDefaultStation()
    const project = makeDefaultProject()
    
    const baseResistivity = station.soilResistivityOhmCm // Should be 361
    
    const scenario = makeScenario({
      name: 'High Resistivity 1000',
      overrides: {
        station: { soilResistivityOhmCm: 1000 }
      }
    })
    
    const runResult = runScenario(station, project, scenario)
    
    expect(runResult).toBeDefined()
    expect(runResult.scenarioId).toBe(scenario.id)
    
    // Check calculations output
    expect(runResult.result.groundbedResistanceOhm).toBeGreaterThan(0)
    
    // Baseline check: Verify the original station and project inputs were NOT mutated!
    expect(station.soilResistivityOhmCm).toBe(baseResistivity)
    expect(project.designBasis.soilResistivityOhmCm).toBe(361)
  })
})
