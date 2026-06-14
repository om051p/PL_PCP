/**
 * attenuationSlice.js — M1 Attenuation Stability
 *
 * Fixes:
 *  1. Execution guard — prevents double-calculation on rapid input changes.
 *  2. Dirty-flag stability — persisted across navigation via the store.
 *  3. Input debounce via a shared calculation-in-progress flag.
 *
 * Zero engine changes — calculations.js and attenuationService.js untouched.
 */

import { computeAttenuation } from '../../services/attenuationService.js'

// Module-level guard prevents concurrent/re-entrant calculations
let _calculationInProgress = false

/**
 * M1.1 — Defensive normalization: ensure result arrays are always arrays
 * even if the engine returns null/undefined for errors/warnings/profile.
 * This prevents downstream "X is not iterable" crashes in render code.
 */
function normalizeAttenuationResult(result) {
  if (!result) return result
  return {
    ...result,
    errors: Array.isArray(result.errors) ? result.errors : [],
    warnings: Array.isArray(result.warnings) ? result.warnings : [],
    profile: Array.isArray(result.profile) ? result.profile : [],
  }
}

export const createAttenuationSlice = (set, get) => ({
  attenuationInput: null,
  attenuationResult: null,
  attenuationDirty: false,
  // Tracks whether a calculation is running (for UI spinner feedback)
  attenuationCalculating: false,
  // M7 hardening: state-machine state mirror (EMPTY/INCOMPLETE/READY/CALCULATED/STALE/ERROR).
  // UI consumes `attenuationState` and `attenuationGuidance` for graceful rendering.
  attenuationState: 'EMPTY',
  attenuationGuidance: [],

  setAttenuationInput: (inputPatch) =>
    set((state) => {
      // No-op when input is not yet initialized — callers must use
      // replaceAttenuationInput to seed the full input object.
      if (!state.attenuationInput) return

      Object.keys(inputPatch).forEach((key) => {
        if (Array.isArray(inputPatch[key])) {
          state.attenuationInput[key] = inputPatch[key]
        } else if (typeof inputPatch[key] === 'object' && inputPatch[key] !== null) {
          state.attenuationInput[key] = {
            ...state.attenuationInput[key],
            ...inputPatch[key],
          }
        } else {
          state.attenuationInput[key] = inputPatch[key]
        }
      })
      state.attenuationDirty = true
    }),

  replaceAttenuationInput: (input) =>
    set((state) => {
      state.attenuationInput = input
      state.attenuationResult = null
      state.attenuationDirty = true
      // The page will re-derive state on next render; mark as READY placeholder.
      state.attenuationState = 'READY'
    }),

  /**
   * M7 hardening — mark the cached attenuation result as stale.
   * Called by other slices (station, design) when an upstream asset changes
   * (TR voltage, groundbed, pipeline segment, etc.). The UI then shows
   * "Attenuation requires recalculation" instead of silently using old values.
   */
  markAttenuationStale: () =>
    set((state) => {
      if (!state.attenuationResult) return
      state.attenuationDirty = true
    }),

  syncAttenuationFromStation: () =>
    set((state) => {
      if (!state.attenuationInput) return
      const proj = state.projects.find((p) => p.id === state.activeProjectId) || state.projects[0]
      const activeStation = proj?.stations.find((s) => s.id === state.activeStationId) || proj?.stations[0]
      const firstSegment = activeStation?.pipelineSegments?.[0]
      if (firstSegment) {
        state.attenuationInput.pipe.diameterInches = firstSegment.od
        state.attenuationInput.pipe.wallThicknessInches = firstSegment.wallThk
      }
      const soilRes = proj?.designBasis?.soilResistivityOhmCm ?? activeStation?.soilResistivityOhmCm
      if (soilRes !== undefined) {
        state.attenuationInput.coating.soilResistivityOhmCm = soilRes
      }
    }),

  /**
   * M1 FIX: Guarded calculation runner.
   *
   * - Checks the module-level `_calculationInProgress` flag before proceeding.
   * - Sets `attenuationCalculating: true` in the store so the UI can show a spinner.
   * - Clears the guard in a finally block so it always releases even on errors.
   * - Verifies input is non-null and dirty before computing (prevents stale re-runs).
   */
  runAttenuationCalculation: () => {
    const state = get()

    // Guard 1: Skip if a calculation is already running (prevents race conditions)
    if (_calculationInProgress) {
      console.warn('[AttenuationSlice] Calculation already in progress — skipped.')
      return
    }

    // Guard 2: Skip if nothing changed (not dirty and result exists)
    if (!state.attenuationDirty && state.attenuationResult?.success === true) {
      return
    }

    // Guard 3: Skip if input isn't initialized yet
    if (!state.attenuationInput) {
      return
    }

    _calculationInProgress = true
    set((s) => { s.attenuationCalculating = true })

    try {
      const result = computeAttenuation(state.attenuationInput)
      set((s) => {
        s.attenuationResult = normalizeAttenuationResult(result)
        s.attenuationDirty = false
        s.attenuationCalculating = false
        s.attenuationState = result?.success === true ? 'CALCULATED' : 'ERROR'
      })
    } catch (err) {
      console.error('[AttenuationSlice] Calculation error:', err)
      set((s) => {
        s.attenuationResult = {
          success: false,
          errors: [`Calculation failed: ${err.message}`],
        }
        s.attenuationCalculating = false
        s.attenuationState = 'ERROR'
      })
    } finally {
      _calculationInProgress = false
    }
  },

  addAttenuationStation: (station) =>
    set((state) => {
      if (!state.attenuationInput) return
      if (!state.attenuationInput.stations) {
        state.attenuationInput.stations = []
      }
      state.attenuationInput.stations.push(station)
      state.attenuationDirty = true
    }),

  removeAttenuationStation: (stationId) =>
    set((state) => {
      if (!state.attenuationInput?.stations) return
      state.attenuationInput.stations = state.attenuationInput.stations.filter(
        (s) => s.id !== stationId,
      )
      state.attenuationDirty = true
    }),

  updateAttenuationStation: (stationId, patch) =>
    set((state) => {
      if (!state.attenuationInput?.stations) return
      const idx = state.attenuationInput.stations.findIndex((s) => s.id === stationId)
      if (idx === -1) return
      Object.assign(state.attenuationInput.stations[idx], patch)
      state.attenuationDirty = true
    }),

  clearAttenuation: () =>
    set((state) => {
      state.attenuationInput = null
      state.attenuationResult = null
      state.attenuationDirty = false
      state.attenuationCalculating = false
      state.attenuationState = 'EMPTY'
      state.attenuationGuidance = []
    }),

  /**
   * Returns true only when there is a fresh, successful result and no
   * pending input changes. Use this to gate stale-result UI warnings.
   */
  isAttenuationResultFresh: () => {
    const state = get()
    return (
      state.attenuationResult?.success === true &&
      state.attenuationDirty === false &&
      state.attenuationCalculating === false
    )
  },

  getAttenuationProfile: () => {
    return get().attenuationResult?.profile ?? []
  },

  getAttenuationSummary: () => {
    return get().attenuationResult?.summary ?? null
  },
})
