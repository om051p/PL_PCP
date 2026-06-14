import { describe, it, expect } from 'vitest'
import { captureInputAudit } from './inputAuditEngine.js'
import { buildTraceRecord } from './calculationTraceEngine.js'
import { makeDefaultStation, makeDefaultProject } from '../../store/factories.js'
import { runStationCalculations } from '../modules/calculations.js'

describe('Engineering Traceability Layer', () => {
  it('captureInputAudit freezes inputs and returns a deep snapshot', () => {
    const station = makeDefaultStation()
    const project = makeDefaultProject()
    
    const audit = captureInputAudit(station, project)
    
    expect(audit).toBeDefined()
    expect(audit.stationId).toBe(station.id)
    expect(Object.isFrozen(audit)).toBe(true)
    expect(Object.isFrozen(audit.inputs)).toBe(true)
    expect(Object.isFrozen(audit.inputs.groundbed)).toBe(true)
    expect(Object.isFrozen(audit.inputs.segments)).toBe(true)
  })

  it('buildTraceRecord maps calculation results to steps and variables', () => {
    const station = makeDefaultStation()
    const project = makeDefaultProject()
    
    const audit = captureInputAudit(station, project)
    const rawResult = runStationCalculations(station, project.systemDesignLifeYears, null, project)
    
    const trace = buildTraceRecord(station, project, rawResult, audit)
    
    expect(trace).toBeDefined()
    expect(trace.stationId).toBe(station.id)
    expect(trace.steps.length).toBeGreaterThan(0)
    
    // Check Surface Area step
    const saStep = trace.steps.find(s => s.stepId === 'SURFACE_AREA')
    expect(saStep).toBeDefined()
    expect(saStep.formula.id).toBe('SURFACE_AREA')
    expect(saStep.summary.output.value).toBeCloseTo(rawResult.totalSurfaceAreaM2, 4)
    expect(saStep.detail.substitution).toContain('A_')
    
    // Check Groundbed Resistance step
    const gbStep = trace.steps.find(s => s.stepId === 'GROUNDBED_RESISTANCE')
    expect(gbStep).toBeDefined()
    expect(gbStep.formulaId).toBe('DWIGHT_DEEPWELL')
    expect(gbStep.summary.output.value).toBeCloseTo(rawResult.groundbedResistanceOhm, 4)
    expect(gbStep.detail.substitution).toContain('Rg =')
    
    // Check TR circuit step
    const trStep = trace.steps.find(s => s.stepId === 'TR_CIRCUIT_ANALYSIS')
    expect(trStep).toBeDefined()
    expect(trStep.summary.output.value).toBeCloseTo(rawResult.minTRVoltage, 2)
    expect(trStep.detail.substitution).toContain('V_min =')
  })
})
