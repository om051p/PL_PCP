import { newId } from '../../utils/id.js'
import { makeDefaultStation } from '../factories.js'

export const createStationSlice = (set, get) => ({
  activeStationId: null,

  setActiveStation: (stationId) =>
    set((state) => {
      state.activeStationId = stationId
    }),

  addStation: () =>
    set((state) => {
      const proj = state.projects.find((p) => p.id === state.activeProjectId)
      if (!proj) return
      const n = proj.stations.length + 1
      const newStation = makeDefaultStation({ name: `ICCP Station-${n}` })
      proj.stations.push(newStation)
      state.activeStationId = newStation.id
      proj.updatedAt = new Date().toISOString()
      state.attenuationDirty = true
    }),

  removeStation: (stationId) =>
    set((state) => {
      const proj = state.projects.find((p) => p.id === state.activeProjectId)
      if (!proj) return
      if (proj.stations.length <= 1) return
      proj.stations = proj.stations.filter((s) => s.id !== stationId)
      if (state.activeStationId === stationId) {
        state.activeStationId = proj.stations[0].id
      }
      proj.updatedAt = new Date().toISOString()
      state.attenuationDirty = true
    }),

  updateStation: (stationId, updater) =>
    set((state) => {
      const proj = state.projects.find((p) => p.id === state.activeProjectId)
      if (!proj) return
      const station = proj.stations.find((s) => s.id === stationId)
      if (!station) return
      if (typeof updater === 'function') {
        updater(station)
      } else {
        Object.assign(station, updater)
      }
      // Mark as needing recalculation
      station.lastCalcResult = null
      station.status = station.status === 'draft' ? 'draft' : 'input_complete'
      proj.updatedAt = new Date().toISOString()
      // M7 hardening: any TR / groundbed / pipeline edit invalidates the
      // cached attenuation result. Page will display "recalculation required".
      state.attenuationDirty = true
    }),

  updateSegment: (stationId, segmentId, fields) =>
    set((state) => {
      const proj = state.projects.find((p) => p.id === state.activeProjectId)
      if (!proj) return
      const station = proj.stations.find((s) => s.id === stationId)
      if (!station) return
      const seg = station.pipelineSegments.find((s) => s.id === segmentId)
      if (!seg) return
      Object.assign(seg, fields)
      station.lastCalcResult = null
      proj.updatedAt = new Date().toISOString()
      state.attenuationDirty = true
    }),

  addSegment: (stationId) =>
    set((state) => {
      const proj = state.projects.find((p) => p.id === state.activeProjectId)
      if (!proj) return
      const station = proj.stations.find((s) => s.id === stationId)
      if (!station) return
      const segCount = station.pipelineSegments.length
      const lastSeg = station.pipelineSegments[segCount - 1]
      const newSeg = {
        id: newId(),
        name: `Segment-${segCount + 1}`,
        od: lastSeg?.od ?? 48,
        wallThk: lastSeg?.wallThk ?? 0.875,
        lengthM: lastSeg?.lengthM ?? 292,
        opTempC: lastSeg?.opTempC ?? 57.22,
        currentDensityBase: lastSeg?.currentDensityBase ?? 0.1,
        coatingType: lastSeg?.coatingType ?? 'fusion_bonded_epoxy',
        coatingEfficiency: lastSeg?.coatingEfficiency ?? 0.98,
      }
      station.pipelineSegments.push(newSeg)
      station.lastCalcResult = null
      proj.updatedAt = new Date().toISOString()
      state.attenuationDirty = true
    }),

  removeSegment: (stationId, segmentId) =>
    set((state) => {
      const proj = state.projects.find((p) => p.id === state.activeProjectId)
      if (!proj) return
      const station = proj.stations.find((s) => s.id === stationId)
      if (!station) return
      if (station.pipelineSegments.length <= 1) return
      station.pipelineSegments = station.pipelineSegments.filter((s) => s.id !== segmentId)
      station.lastCalcResult = null
      proj.updatedAt = new Date().toISOString()
      state.attenuationDirty = true
    }),
})
