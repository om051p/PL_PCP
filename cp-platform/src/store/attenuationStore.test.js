/**
 * attenuationStore.test.js
 *
 * Unit tests for the attenuation slice of projectStore.
 *
 * M1 coverage:
 *   - Dirty flag lifecycle
 *   - replaceAttenuationInput / setAttenuationInput (partial merge)
 *   - syncAttenuationFromStation extracts from active station (no formula)
 *   - runAttenuationCalculation: pure computation, no input mutation
 *   - addAttenuationStation / removeAttenuationStation / updateAttenuationStation
 *   - Null-safe: all actions are no-ops when attenuationInput is null
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── UUID mock ────────────────────────────────────────────────────────────────
let uuidCounter = 0
vi.mock('uuid', () => ({
  v4: vi.fn(() => {
    uuidCounter++
    return `mock-uuid-${String(uuidCounter).padStart(4, '0')}`
  }),
}))

// ── Engine mocks (keep calculations.js / rulesEngine.js untouched) ───────────
vi.mock('../engine/modules/calculations.js', () => ({
  runStationCalculations: vi.fn(() => ({ totalSurfaceAreaM2: 1, requiredCurrentA: 0.2 })),
}))
vi.mock('../engine/rules/rulesEngine.js', () => ({
  runRules: vi.fn(() => ({ checks: [], insights: [], allPassed: true })),
}))
vi.mock('../engine/optimizer/optimizer.js', () => ({
  generateAlternatives: vi.fn(() => []),
}))
vi.mock('../engine/rules/bomEngine.js', () => ({
  generateBOM: vi.fn(() => []),
}))

// ── Attenuation engine mock — returns a known successful result ───────────────
const MOCK_ATTENUATION_RESULT = {
  success: true,
  errors: [],
  warnings: [],
  intermediates: { alpha: 0.000012, pipeSteelAreaM2: 0.001 },
  checkPointAssessment: { criterionMet: true },
  profile: [{ km: 0, combinedPotentialV: 1.1, isProtected: true }],
  stationReachKm: 30.5,
  summary: { designAdequate: true, protectionPercentage: 100 },
}

vi.mock('../engine/modules/attenuationEngine.js', () => ({
  runAttenuationAnalysis: vi.fn(() => MOCK_ATTENUATION_RESULT),
}))

// ── Import store (after mocks are set) ───────────────────────────────────────
const { useProjectStore, makeDefaultProject } = await import('./projectStore.js')

// ── Minimal valid attenuation input ─────────────────────────────────────────
const MINIMAL_INPUT = {
  pipe: {
    diameterInches: 30,
    wallThicknessInches: 1.27,
    totalLengthKm: 44,
    maxProtectionLengthKm: 25,
    steelResistivityMicroOhmCm: 18,
  },
  coating: {
    conductivityMicroSiemensPerM2: 300,
    soilResistivityOhmCm: 1000,
    currentDensityMaPerM2: 0.175,
  },
  potentials: { naturalMv: 550, drainPointMv: 1100, minimumMv: 1000 },
  stations: [{ id: 'CP1', positionKm: 0, label: 'CP#1' }],
  profileConfig: { startKm: 0, endKm: 50, stepKm: 1.0 },
}

// ── Test setup ───────────────────────────────────────────────────────────────
describe('attenuationStore — M1 stability', () => {
  beforeEach(() => {
    uuidCounter = 0
    const storeData = {}
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((k) => storeData[k] ?? null),
      setItem: vi.fn((k, v) => { storeData[k] = v }),
      removeItem: vi.fn((k) => { delete storeData[k] }),
    })
    const defaultProj = makeDefaultProject()
    useProjectStore.setState({
      projects: [defaultProj],
      activeProjectId: defaultProj.id,
      activeStationId: defaultProj.stations[0].id,
      attenuationInput: null,
      attenuationResult: null,
      attenuationDirty: false,
      ui: { sidebarCollapsed: false, calculatingStationId: null },
    })
  })

  // ── replaceAttenuationInput ─────────────────────────────────────────────

  describe('replaceAttenuationInput', () => {
    it('sets attenuationInput to the given object', () => {
      useProjectStore.getState().replaceAttenuationInput(MINIMAL_INPUT)
      expect(useProjectStore.getState().attenuationInput).toMatchObject({ pipe: { diameterInches: 30 } })
    })

    it('marks attenuationDirty = true', () => {
      useProjectStore.getState().replaceAttenuationInput(MINIMAL_INPUT)
      expect(useProjectStore.getState().attenuationDirty).toBe(true)
    })

    it('does not lose profileConfig', () => {
      useProjectStore.getState().replaceAttenuationInput(MINIMAL_INPUT)
      expect(useProjectStore.getState().attenuationInput.profileConfig).toMatchObject({ startKm: 0 })
    })
  })

  // ── setAttenuationInput (partial merge) ───────────────────────────────────

  describe('setAttenuationInput', () => {
    beforeEach(() => useProjectStore.getState().replaceAttenuationInput(MINIMAL_INPUT))

    it('merges a pipe sub-object without losing other pipe fields', () => {
      useProjectStore.getState().setAttenuationInput({ pipe: { diameterInches: 48 } })
      const { pipe } = useProjectStore.getState().attenuationInput
      expect(pipe.diameterInches).toBe(48)
      // Other pipe fields should survive
      expect(pipe.totalLengthKm).toBe(44)
    })

    it('marks attenuationDirty = true on any input change', () => {
      useProjectStore.setState({ attenuationDirty: false }) // reset
      useProjectStore.getState().setAttenuationInput({ pipe: { diameterInches: 48 } })
      expect(useProjectStore.getState().attenuationDirty).toBe(true)
    })

    it('merges potentials without losing other potential fields', () => {
      useProjectStore.getState().setAttenuationInput({ potentials: { drainPointMv: 1200 } })
      const { potentials } = useProjectStore.getState().attenuationInput
      expect(potentials.drainPointMv).toBe(1200)
      expect(potentials.naturalMv).toBe(550)   // survived
      expect(potentials.minimumMv).toBe(1000)  // survived
    })

    it('replaces stations array entirely when provided', () => {
      const newStations = [
        { id: 'A', positionKm: 5, label: 'A' },
        { id: 'B', positionKm: 15, label: 'B' },
      ]
      useProjectStore.getState().setAttenuationInput({ stations: newStations })
      expect(useProjectStore.getState().attenuationInput.stations).toHaveLength(2)
    })

    it('is no-op when attenuationInput is null', () => {
      useProjectStore.setState({ attenuationInput: null })
      expect(() =>
        useProjectStore.getState().setAttenuationInput({ pipe: { diameterInches: 48 } })
      ).not.toThrow()
      expect(useProjectStore.getState().attenuationInput).toBeNull()
    })
  })

  // ── syncAttenuationFromStation ─────────────────────────────────────────────

  describe('syncAttenuationFromStation', () => {
    beforeEach(() => useProjectStore.getState().replaceAttenuationInput(MINIMAL_INPUT))

    it('syncs diameter from the active station first segment', () => {
      // Override active station first segment OD
      const store = useProjectStore.getState()
      const stationId = store.getProject().stations[0].id
      store.updateStation(stationId, (s) => {
        s.pipelineSegments[0].od = 48
        s.pipelineSegments[0].wallThk = 0.75
      })
      useProjectStore.getState().syncAttenuationFromStation()
      const { pipe } = useProjectStore.getState().attenuationInput
      expect(pipe.diameterInches).toBe(48)
      expect(pipe.wallThicknessInches).toBe(0.75)
    })

    it('syncs soil resistivity from designBasis when available', () => {
      useProjectStore.getState().updateDesignBasis({ soilResistivityOhmCm: 750 })
      useProjectStore.getState().syncAttenuationFromStation()
      expect(useProjectStore.getState().attenuationInput.coating.soilResistivityOhmCm).toBe(750)
    })

    it('is a no-op when attenuationInput is null', () => {
      useProjectStore.setState({ attenuationInput: null })
      expect(() => useProjectStore.getState().syncAttenuationFromStation()).not.toThrow()
    })

    it('does NOT set attenuationDirty to true (sync is internal, not user-driven)', () => {
      useProjectStore.setState({ attenuationDirty: false })
      useProjectStore.getState().syncAttenuationFromStation()
      // sync should not mark dirty — it's a pre-calculation preparation
      // (If this fails, the store marks sync as a user change which is wrong)
      expect(useProjectStore.getState().attenuationDirty).toBe(false)
    })
  })

  // ── runAttenuationCalculation ─────────────────────────────────────────────

  describe('runAttenuationCalculation', () => {
    beforeEach(() => useProjectStore.getState().replaceAttenuationInput(MINIMAL_INPUT))

    it('sets attenuationResult with a successful result', () => {
      useProjectStore.getState().runAttenuationCalculation()
      const result = useProjectStore.getState().attenuationResult
      expect(result).not.toBeNull()
      expect(result.success).toBe(true)
    })

    it('clears attenuationDirty after run', () => {
      expect(useProjectStore.getState().attenuationDirty).toBe(true) // set by replaceAttenuationInput
      useProjectStore.getState().runAttenuationCalculation()
      expect(useProjectStore.getState().attenuationDirty).toBe(false)
    })

    it('does NOT mutate attenuationInput.pipe.diameterInches', () => {
      const beforeDiameter = useProjectStore.getState().attenuationInput.pipe.diameterInches
      useProjectStore.getState().runAttenuationCalculation()
      const afterDiameter = useProjectStore.getState().attenuationInput.pipe.diameterInches
      // M1 fix: runAttenuationCalculation must not silently change user inputs
      expect(afterDiameter).toBe(beforeDiameter)
    })

    it('stores engine result intact (intermediates present)', () => {
      useProjectStore.getState().runAttenuationCalculation()
      const result = useProjectStore.getState().attenuationResult
      expect(result.intermediates).toBeTruthy()
      expect(result.intermediates.alpha).toBeCloseTo(0.000012)
    })

    it('handles null attenuationInput gracefully', () => {
      useProjectStore.setState({ attenuationInput: null })
      expect(() => useProjectStore.getState().runAttenuationCalculation()).not.toThrow()
    })
  })

  // ── addAttenuationStation ─────────────────────────────────────────────────

  describe('addAttenuationStation', () => {
    beforeEach(() => useProjectStore.getState().replaceAttenuationInput(MINIMAL_INPUT))

    it('adds a station to the stations array', () => {
      const before = useProjectStore.getState().attenuationInput.stations.length
      useProjectStore.getState().addAttenuationStation({ id: 'CP2', positionKm: 20, label: 'CP#2' })
      expect(useProjectStore.getState().attenuationInput.stations).toHaveLength(before + 1)
    })

    it('marks attenuationDirty = true', () => {
      useProjectStore.setState({ attenuationDirty: false })
      useProjectStore.getState().addAttenuationStation({ id: 'X', positionKm: 50 })
      expect(useProjectStore.getState().attenuationDirty).toBe(true)
    })
  })

  // ── removeAttenuationStation ──────────────────────────────────────────────

  describe('removeAttenuationStation', () => {
    beforeEach(() => {
      useProjectStore.getState().replaceAttenuationInput({
        ...MINIMAL_INPUT,
        stations: [
          { id: 'CP1', positionKm: 0 },
          { id: 'CP2', positionKm: 10 },
        ],
      })
    })

    it('removes the station by id', () => {
      useProjectStore.getState().removeAttenuationStation('CP1')
      const ids = useProjectStore.getState().attenuationInput.stations.map((s) => s.id)
      expect(ids).not.toContain('CP1')
    })

    it('marks attenuationDirty = true', () => {
      useProjectStore.setState({ attenuationDirty: false })
      useProjectStore.getState().removeAttenuationStation('CP2')
      expect(useProjectStore.getState().attenuationDirty).toBe(true)
    })

    it('is a no-op for unknown station id', () => {
      const before = useProjectStore.getState().attenuationInput.stations.length
      useProjectStore.getState().removeAttenuationStation('does-not-exist')
      expect(useProjectStore.getState().attenuationInput.stations).toHaveLength(before)
    })
  })

  // ── updateAttenuationStation ──────────────────────────────────────────────

  describe('updateAttenuationStation', () => {
    beforeEach(() => useProjectStore.getState().replaceAttenuationInput(MINIMAL_INPUT))

    it('updates positionKm on a station', () => {
      useProjectStore.getState().updateAttenuationStation('CP1', { positionKm: 99 })
      const station = useProjectStore.getState().attenuationInput.stations.find((s) => s.id === 'CP1')
      expect(station.positionKm).toBe(99)
    })

    it('marks attenuationDirty = true', () => {
      useProjectStore.setState({ attenuationDirty: false })
      useProjectStore.getState().updateAttenuationStation('CP1', { positionKm: 99 })
      expect(useProjectStore.getState().attenuationDirty).toBe(true)
    })

    it('is a no-op for unknown station id', () => {
      expect(() =>
        useProjectStore.getState().updateAttenuationStation('does-not-exist', { positionKm: 5 })
      ).not.toThrow()
    })
  })

  // ── Dirty flag lifecycle (integration) ────────────────────────────────────

  describe('dirty flag lifecycle', () => {
    it('starts false, goes true on input, goes false after calculation', () => {
      expect(useProjectStore.getState().attenuationDirty).toBe(false)

      useProjectStore.getState().replaceAttenuationInput(MINIMAL_INPUT)
      expect(useProjectStore.getState().attenuationDirty).toBe(true)

      useProjectStore.getState().runAttenuationCalculation()
      expect(useProjectStore.getState().attenuationDirty).toBe(false)
    })

    it('goes true again after any subsequent input change post-calculation', () => {
      useProjectStore.getState().replaceAttenuationInput(MINIMAL_INPUT)
      useProjectStore.getState().runAttenuationCalculation()
      expect(useProjectStore.getState().attenuationDirty).toBe(false)

      useProjectStore.getState().setAttenuationInput({ pipe: { diameterInches: 48 } })
      expect(useProjectStore.getState().attenuationDirty).toBe(true)
    })
  })
})
