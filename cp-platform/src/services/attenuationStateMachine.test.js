/**
 * attenuationStateMachine.test.js
 *
 * State machine contract:
 *   EMPTY         — no project
 *   INCOMPLETE    — required assets missing
 *   READY         — input derived, no result
 *   CALCULATED    — fresh, successful result
 *   STALE         — result exists but upstream changed
 *   ERROR         — last calculation failed
 */

import { describe, it, expect } from 'vitest'

import {
  resolveAttenuationState,
  ATTENUATION_STATES,
} from './attenuationStateMachine.js'

// ─── Fixtures ──────────────────────────────────────────────────────────────

function mkProject(stations = [], designBasis = {}) {
  return {
    id: 'p-1',
    stations,
    designBasis: { soilResistivityOhmCm: 1000, ...designBasis },
  }
}

function mkStation(id, overrides = {}) {
  return {
    id,
    name: id,
    location: 'KM 00+000',
    pipelineSegments: [{ id: 's', od: 48, wallThk: 0.875, lengthM: 44000 }],
    groundbed: { type: 'deepwell' },
    tr: { ratedVoltage: 30, ratedCurrent: 25 },
    soilResistivityOhmCm: 1000,
    ...overrides,
  }
}

const VALID_INPUT = {
  pipe: { diameterInches: 48, wallThicknessInches: 0.875, totalLengthKm: 44, maxProtectionLengthKm: 22, steelResistivityMicroOhmCm: 18 },
  coating: { conductivityMicroSiemensPerM2: 300, soilResistivityOhmCm: 1000, currentDensityMaPerM2: 0.175 },
  potentials: { naturalMv: 550, drainPointMv: 1100, minimumMv: 850 },
  stations: [{ id: 'CP1', positionKm: 0 }],
  profileConfig: { startKm: 0, endKm: 50, stepKm: 1 },
}

const FRESH_RESULT = { success: true, profile: [], summary: {} }

describe('resolveAttenuationState', () => {
  it('returns EMPTY for null project', () => {
    const s = resolveAttenuationState({ project: null })
    expect(s.state).toBe(ATTENUATION_STATES.EMPTY)
    expect(s.canShowVisualization).toBe(false)
    expect(s.guidance.length).toBeGreaterThan(0)
  })

  it('returns INCOMPLETE when input is null and project has no stations', () => {
    const s = resolveAttenuationState({ project: mkProject([]) })
    expect(s.state).toBe(ATTENUATION_STATES.INCOMPLETE)
    expect(s.canRunCalculation).toBe(false)
  })

  it('returns INCOMPLETE with NO_TR guidance when stations lack TRs', () => {
    const stations = [mkStation('CP1', { tr: null })]
    const s = resolveAttenuationState({ project: mkProject(stations) })
    expect(s.state).toBe(ATTENUATION_STATES.INCOMPLETE)
    const reasons = s.guidance.map((g) => g.reason)
    expect(reasons).toContain('NO_TR')
  })

  it('returns READY when input is present, no result, not dirty', () => {
    const s = resolveAttenuationState({
      project: mkProject([mkStation('CP1')]),
      attenuationInput: VALID_INPUT,
      attenuationResult: null,
      attenuationDirty: false,
    })
    expect(s.state).toBe(ATTENUATION_STATES.READY)
    expect(s.canRunCalculation).toBe(true)
    expect(s.canShowVisualization).toBe(false)
    expect(s.showStaleBanner).toBe(false)
  })

  it('returns CALCULATED with fresh successful result', () => {
    const s = resolveAttenuationState({
      project: mkProject([mkStation('CP1')]),
      attenuationInput: VALID_INPUT,
      attenuationResult: FRESH_RESULT,
      attenuationDirty: false,
      attenuationCalculating: false,
    })
    expect(s.state).toBe(ATTENUATION_STATES.CALCULATED)
    expect(s.canShowVisualization).toBe(true)
    expect(s.showStaleBanner).toBe(false)
  })

  it('returns STALE when result exists but dirty flag is true', () => {
    const s = resolveAttenuationState({
      project: mkProject([mkStation('CP1')]),
      attenuationInput: VALID_INPUT,
      attenuationResult: FRESH_RESULT,
      attenuationDirty: true,
    })
    expect(s.state).toBe(ATTENUATION_STATES.STALE)
    expect(s.showStaleBanner).toBe(true)
    expect(s.canRunCalculation).toBe(true)
  })

  it('returns ERROR when last result failed', () => {
    const s = resolveAttenuationState({
      project: mkProject([mkStation('CP1')]),
      attenuationInput: VALID_INPUT,
      attenuationResult: { success: false, errors: ['boom'] },
      attenuationDirty: false,
    })
    expect(s.state).toBe(ATTENUATION_STATES.ERROR)
  })

  it('STALE shows stale banner without losing visualization', () => {
    const s = resolveAttenuationState({
      project: mkProject([mkStation('CP1')]),
      attenuationInput: VALID_INPUT,
      attenuationResult: FRESH_RESULT,
      attenuationDirty: true,
    })
    expect(s.showStaleBanner).toBe(true)
    expect(s.canShowVisualization).toBe(true)
  })
})
