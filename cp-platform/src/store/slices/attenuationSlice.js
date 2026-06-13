import { computeAttenuation } from '../../services/attenuationService.js'

export const createAttenuationSlice = (set, get) => ({
  attenuationInput: null,
  attenuationResult: null,
  attenuationDirty: false,

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

  runAttenuationCalculation: () =>
    set((state) => {
      state.attenuationResult = computeAttenuation(state.attenuationInput)
      state.attenuationDirty = false
    }),

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
    }),

  isAttenuationResultFresh: () => {
    const state = get()
    return state.attenuationResult?.success === true && state.attenuationDirty === false
  },

  getAttenuationProfile: () => {
    return get().attenuationResult?.profile ?? []
  },

  getAttenuationSummary: () => {
    return get().attenuationResult?.summary ?? null
  },
})
