/**
 * attenuationStoreSlice.js
 *
 * Zustand + Immer slice for the Attenuation Analysis module.
 *
 * INTEGRATION INSTRUCTIONS:
 * ─────────────────────────
 * This file is NOT a standalone store. Merge it into your existing
 * src/store/projectStore.js following the pattern below.
 *
 * Step 1 — Add the import at the top of projectStore.js:
 *
 *   import { runAttenuationAnalysis, validateAttenuationInput } from '../engine/modules/attenuationEngine.js';
 *
 * Step 2 — Add the initial state fields inside your create(...) state object:
 *
 *   // ── Attenuation ──
 *   attenuationInput: null,
 *   attenuationResult: null,
 *   attenuationDirty: false,
 *
 * Step 3 — Add the actions from the ACTIONS section below into your
 *           existing actions object (same level as your other actions).
 *
 * Step 4 — (Optional) Persist attenuation state by adding these keys
 *           to your localStorage partialize config:
 *
 *   partialize: (state) => ({
 *     ...existingKeys,
 *     attenuationInput: state.attenuationInput,
 *     attenuationResult: state.attenuationResult,
 *   })
 */

// ─────────────────────────────────────────────────────────────────────────────
// INITIAL STATE — merge into your create() state object
// ─────────────────────────────────────────────────────────────────────────────

export const attenuationInitialState = {
  attenuationInput: null,
  attenuationResult: null,
  attenuationDirty: false,
};

// ─────────────────────────────────────────────────────────────────────────────
// ACTIONS — merge into your create() actions object
// ─────────────────────────────────────────────────────────────────────────────

export const attenuationActions = (set, get) => ({

  /**
   * Set or update attenuation input parameters.
   * Marks the result dirty (stale) so the UI knows a recalculation is needed.
   *
   * @param {Partial<AttenuationInput>} inputPatch - Partial input to deep-merge
   */
  setAttenuationInput: (inputPatch) => set((state) => {
    if (!state.attenuationInput) {
      state.attenuationInput = inputPatch;
    } else {
      // Deep merge top-level sections (pipe, coating, potentials, stations, profileConfig)
      Object.keys(inputPatch).forEach((key) => {
        if (Array.isArray(inputPatch[key])) {
          state.attenuationInput[key] = inputPatch[key];
        } else if (typeof inputPatch[key] === 'object' && inputPatch[key] !== null) {
          state.attenuationInput[key] = {
            ...state.attenuationInput[key],
            ...inputPatch[key],
          };
        } else {
          state.attenuationInput[key] = inputPatch[key];
        }
      });
    }
    state.attenuationDirty = true;
  }),

  /**
   * Replace the full attenuation input (e.g. loading a saved project).
   *
   * @param {AttenuationInput} input - Complete input object
   */
  replaceAttenuationInput: (input) => set((state) => {
    state.attenuationInput = input;
    state.attenuationResult = null;
    state.attenuationDirty = true;
  }),

  /**
   * Run the attenuation calculation against the current input.
   * Validates first — if invalid, stores the error result without throwing.
   * Engine is synchronous; no loading state needed.
   */
  runAttenuationCalculation: () => set((state) => {
    if (!state.attenuationInput) {
      state.attenuationResult = {
        success: false,
        errors: ['No input provided. Set attenuationInput before running calculation.'],
        warnings: [],
        intermediates: null,
        checkPointAssessment: null,
        profile: null,
        stationReachKm: null,
        summary: null,
      };
      return;
    }
    // runAttenuationAnalysis is imported at the top of projectStore.js
    state.attenuationResult = runAttenuationAnalysis(state.attenuationInput);
    state.attenuationDirty = false;
  }),

  /**
   * Add a CP station to the attenuation input.
   *
   * @param {{ id: string, positionKm: number, label?: string }} station
   */
  addAttenuationStation: (station) => set((state) => {
    if (!state.attenuationInput) return;
    if (!state.attenuationInput.stations) {
      state.attenuationInput.stations = [];
    }
    state.attenuationInput.stations.push(station);
    state.attenuationDirty = true;
  }),

  /**
   * Remove a CP station by id.
   *
   * @param {string|number} stationId
   */
  removeAttenuationStation: (stationId) => set((state) => {
    if (!state.attenuationInput?.stations) return;
    state.attenuationInput.stations = state.attenuationInput.stations.filter(
      (s) => s.id !== stationId
    );
    state.attenuationDirty = true;
  }),

  /**
   * Update a specific station's fields by id.
   *
   * @param {string|number} stationId
   * @param {Partial<CPStation>} patch
   */
  updateAttenuationStation: (stationId, patch) => set((state) => {
    if (!state.attenuationInput?.stations) return;
    const idx = state.attenuationInput.stations.findIndex((s) => s.id === stationId);
    if (idx === -1) return;
    Object.assign(state.attenuationInput.stations[idx], patch);
    state.attenuationDirty = true;
  }),

  /**
   * Clear all attenuation state (input + result).
   */
  clearAttenuation: () => set((state) => {
    state.attenuationInput = null;
    state.attenuationResult = null;
    state.attenuationDirty = false;
  }),

  // ── Selectors (call via get() outside set, or use directly in components) ──

  /**
   * Returns true if the current result is valid and up to date.
   */
  isAttenuationResultFresh: () => {
    const state = get();
    return (
      state.attenuationResult?.success === true &&
      state.attenuationDirty === false
    );
  },

  /**
   * Returns the protection profile array, or empty array if not yet calculated.
   */
  getAttenuationProfile: () => {
    return get().attenuationResult?.profile ?? [];
  },

  /**
   * Returns the design adequacy summary, or null.
   */
  getAttenuationSummary: () => {
    return get().attenuationResult?.summary ?? null;
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// EXAMPLE: How your projectStore.js should look after integration
// ─────────────────────────────────────────────────────────────────────────────

/*
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist } from 'zustand/middleware';
import { runAttenuationAnalysis } from '../engine/modules/attenuationEngine.js'; // ← ADD THIS

export const useProjectStore = create(
  persist(
    immer((set, get) => ({

      // ... your existing state ...

      // ── Attenuation state (ADD THESE) ──────────────────────────
      attenuationInput: null,
      attenuationResult: null,
      attenuationDirty: false,

      // ... your existing actions ...

      // ── Attenuation actions (ADD THESE) ────────────────────────
      setAttenuationInput:        (patch)     => set((state) => { ... }),  // see above
      replaceAttenuationInput:    (input)     => set((state) => { ... }),
      runAttenuationCalculation:  ()          => set((state) => { state.attenuationResult = runAttenuationAnalysis(state.attenuationInput); state.attenuationDirty = false; }),
      addAttenuationStation:      (station)   => set((state) => { ... }),
      removeAttenuationStation:   (id)        => set((state) => { ... }),
      updateAttenuationStation:   (id, patch) => set((state) => { ... }),
      clearAttenuation:           ()          => set((state) => { ... }),
      isAttenuationResultFresh:   ()          => { ... },
      getAttenuationProfile:      ()          => get().attenuationResult?.profile ?? [],
      getAttenuationSummary:      ()          => get().attenuationResult?.summary ?? null,
    })),
    {
      name: 'cp-platform-store',
      partialize: (state) => ({
        // ... your existing partialize keys ...
        attenuationInput:  state.attenuationInput,   // ← ADD
        attenuationResult: state.attenuationResult,  // ← ADD
      }),
    }
  )
);
*/
