import { describe, it, expect } from 'vitest'
import { evaluateNewRules } from './newAdvisorRules.js'

describe('New Advisory Rules Sizing & Proximity', () => {
  it('triggers multi-station proximity interference warning when actual < required remoteness', () => {
    const result = evaluateNewRules({
      actualRemotenesM: 15,
      requiredRemotenesM: 20
    })
    
    const rec = result.find(r => r.id === 'warning.station_proximity')
    expect(rec).toBeDefined()
    expect(rec.priority).toBe('high')
    expect(rec.traceStepId).toBe('GROUNDBED_RESISTANCE')
  })

  it('does not trigger proximity warning when actual >= required remoteness', () => {
    const result = evaluateNewRules({
      actualRemotenesM: 25,
      requiredRemotenesM: 20
    })
    
    const rec = result.find(r => r.id === 'warning.station_proximity')
    expect(rec).toBeUndefined()
  })

  it('triggers TR voltage near capacity when voltage utilization > 90%', () => {
    const result = evaluateNewRules({
      minTRVoltage: 28,
      trRatedVoltage: 30
    })
    
    const rec = result.find(r => r.id === 'warning.tr_voltage_near_capacity')
    expect(rec).toBeDefined()
    expect(rec.priority).toBe('critical')
    expect(rec.traceStepId).toBe('TR_CIRCUIT_ANALYSIS')
  })

  it('triggers TR voltage underutilized when voltage utilization < 30%', () => {
    const result = evaluateNewRules({
      minTRVoltage: 8,
      trRatedVoltage: 30
    })
    
    const rec = result.find(r => r.id === 'warning.tr_voltage_underutilized')
    expect(rec).toBeDefined()
    expect(rec.priority).toBe('low')
    expect(rec.traceStepId).toBe('TR_CIRCUIT_ANALYSIS')
  })

  it('triggers TR current near capacity when current utilization > 90%', () => {
    const result = evaluateNewRules({
      designCurrentA: 23,
      trRatedCurrent: 25
    })
    
    const rec = result.find(r => r.id === 'warning.tr_current_near_capacity')
    expect(rec).toBeDefined()
    expect(rec.priority).toBe('critical')
  })

  it('triggers anode design life gap warning when design life < target design life', () => {
    const result = evaluateNewRules({
      designLifeYears: 18,
      targetDesignLifeYears: 25
    })
    
    const rec = result.find(r => r.id === 'warning.anode_life_gap')
    expect(rec).toBeDefined()
    expect(rec.priority).toBe('high')
    expect(rec.traceStepId).toBe('DESIGN_LIFE')
  })

  it('triggers coating/soil resistivity mismatch warning under aggressive soil and low-efficiency coating', () => {
    const result = evaluateNewRules({
      soilResistivityOhmCm: 800,
      segments: [
        { name: 'Seg A', coatingEfficiency: 0.95 }
      ]
    })
    
    const rec = result.find(r => r.id === 'warning.coating_soil_mismatch')
    expect(rec).toBeDefined()
    expect(rec.priority).toBe('medium')
    expect(rec.traceStepId).toBe('CURRENT_REQUIREMENT')
  })
})
