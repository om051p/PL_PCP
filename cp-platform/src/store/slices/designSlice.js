import { logActivityHelper } from './projectSlice.js'

export const createDesignSlice = (set, get) => ({
  updateDesignBasis: (fields) =>
    set((state) => {
      const proj = state.projects.find((p) => p.id === state.activeProjectId)
      if (!proj) return
      if (!proj.designBasis) {
        proj.designBasis = {}
      }
      Object.assign(proj.designBasis, fields)
      
      proj.stations.forEach((st) => {
        st.status = 'needs_recalculation'
      })
      if (proj.tank) {
        proj.tank.status = 'needs_recalculation'
      }
      if (proj.vessel) {
        proj.vessel.status = 'needs_recalculation'
      }
      proj.hasCalculationsMismatch = true
      proj.updatedAt = new Date().toISOString()
      logActivityHelper(proj, 'Design Basis Modified', 'Design Basis', `Updated design basis constants: ${Object.keys(fields).join(', ')}`)
    }),

  setNeedsRecalculation: () =>
    set((state) => {
      const proj = state.projects.find((p) => p.id === state.activeProjectId)
      if (!proj) return
      proj.stations.forEach((st) => {
        st.status = 'needs_recalculation'
      })
      if (proj.tank) {
        proj.tank.status = 'needs_recalculation'
      }
      if (proj.vessel) {
        proj.vessel.status = 'needs_recalculation'
      }
      proj.hasCalculationsMismatch = true
      proj.updatedAt = new Date().toISOString()
    }),

  updateTankParameters: (fields) =>
    set((state) => {
      const proj = state.projects.find((p) => p.id === state.activeProjectId)
      if (!proj) return
      if (!proj.tank) {
        proj.tank = {
          diameter: 30,
          currentDensity: 15,
          anodeSpacing: 1.5,
          layoutType: 'concentric',
          anodeRating: 17,
          status: 'draft',
          lastCalcResult: null,
        }
      }
      Object.assign(proj.tank, fields)
      proj.tank.status = 'needs_recalculation'
      proj.hasCalculationsMismatch = true
      proj.updatedAt = new Date().toISOString()
    }),

  updateVesselParameters: (fields) =>
    set((state) => {
      const proj = state.projects.find((p) => p.id === state.activeProjectId)
      if (!proj) return
      if (!proj.vessel) {
        proj.vessel = {
          length: 8.0,
          diameter: 2.4,
          currentDensity: 30,
          anodeType: 'al_zn_in',
          anodeQty: 6,
          electrolyteResistivity: 80,
          drivingVoltageMode: 'polarized',
          status: 'draft',
          lastCalcResult: null,
        }
      }
      Object.assign(proj.vessel, fields)
      proj.vessel.status = 'needs_recalculation'
      proj.hasCalculationsMismatch = true
      proj.updatedAt = new Date().toISOString()
    }),
})
