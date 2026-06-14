import { describe, it, expect, beforeEach } from 'vitest'
import { useProjectStore } from './projectStore.js'
import { makeScenario } from '../engine/scenarios/ScenarioModel.js'

describe('Zustand Scenario Slice', () => {
  beforeEach(() => {
    // Reset store state
    useProjectStore.setState({
      projects: [
        {
          id: 'p-1',
          projectNumber: 'ECP-99',
          projectName: 'Test Proj',
          createdAt: new Date().toISOString(),
          status: 'draft',
          stations: [
            {
              id: 's-1',
              name: 'Station 1',
              soilResistivityOhmCm: 361,
              proposedAnodes: 9,
              pipelineSegments: [
                {
                  id: 'seg-1',
                  name: 'Segment 1',
                  od: 48,
                  lengthM: 100,
                  opTempC: 50,
                  currentDensityBase: 0.1,
                  coatingEfficiency: 0.98
                }
              ],
              groundbed: {
                type: 'deepwell',
                startDepthM: 15,
                anodeLengthM: 2.13,
                anodeSpacingM: 1.5,
                boreholeDiaM: 0.25
              },
              anodeSpec: {
                weightKg: 20,
                consumptionRate: 0.001
              },
              cables: {
                anodeTailLengths: [15],
                anodeCableSizeMm2: 16,
                posMainLengthM: 100,
                posMainSizeMm2: 35,
                negMainLengthM: 50,
                negMainSizeMm2: 35,
                negSecLengthM: 10,
                negSecSizeMm2: 25
              },
              tr: {
                ratedVoltage: 30,
                ratedCurrent: 25,
                backEMF: 2,
                structureResistance: 0.055
              }
            }
          ],
          scenarios: []
        }
      ],
      activeProjectId: 'p-1',
      activeStationId: 's-1'
    })
  })

  it('saves and deletes a scenario in the active project', () => {
    const store = useProjectStore.getState()
    const scenario = makeScenario({
      id: 'sc-100',
      name: 'High Resistivity Override',
      baseStationId: 's-1',
      overrides: {
        station: { soilResistivityOhmCm: 1000 }
      }
    })

    store.saveScenario(scenario)
    
    let currentProj = useProjectStore.getState().getProject()
    expect(currentProj.scenarios).toHaveLength(1)
    expect(currentProj.scenarios[0].name).toBe('High Resistivity Override')

    // Delete
    useProjectStore.getState().deleteScenario('sc-100')
    currentProj = useProjectStore.getState().getProject()
    expect(currentProj.scenarios).toHaveLength(0)
  })

  it('runs a specific scenario and saves the calculated result', () => {
    const store = useProjectStore.getState()
    const scenario = makeScenario({
      id: 'sc-101',
      name: 'Double Resistivity',
      baseStationId: 's-1',
      overrides: {
        station: { soilResistivityOhmCm: 722 }
      }
    })

    store.saveScenario(scenario)
    store.runScenario('sc-101')

    const currentProj = useProjectStore.getState().getProject()
    const updatedScenario = currentProj.scenarios[0]
    expect(updatedScenario.result).toBeDefined()
    expect(updatedScenario.result.groundbedResistanceOhm).toBeGreaterThan(0)
    expect(updatedScenario.computedAt).toBeDefined()
  })

  it('runs all scenarios and clears scenario results', () => {
    const store = useProjectStore.getState()
    const scenario1 = makeScenario({
      id: 'sc-201',
      name: 'Scen 1',
      baseStationId: 's-1',
      overrides: { station: { soilResistivityOhmCm: 500 } }
    })
    const scenario2 = makeScenario({
      id: 'sc-202',
      name: 'Scen 2',
      baseStationId: 's-1',
      overrides: { station: { soilResistivityOhmCm: 800 } }
    })

    store.saveScenario(scenario1)
    store.saveScenario(scenario2)
    store.runAllScenarios()

    let currentProj = useProjectStore.getState().getProject()
    expect(currentProj.scenarios[0].result).toBeDefined()
    expect(currentProj.scenarios[1].result).toBeDefined()

    // Clear
    store.clearScenarioResults()
    currentProj = useProjectStore.getState().getProject()
    expect(currentProj.scenarios[0].result).toBeNull()
    expect(currentProj.scenarios[1].result).toBeNull()
  })
})
