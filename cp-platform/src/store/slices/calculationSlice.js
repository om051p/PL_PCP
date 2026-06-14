import { runFullCalculation } from '../../services/calculationService.js'
import { generateStationBOM } from '../../services/bomService.js'
import { logActivityHelper } from './projectSlice.js'
import { collectFromCalculation } from '../feedbackCollector.js'
import { cacheCalculation } from '../../offline/calculationCache.js'

export const createCalculationSlice = (set, get) => ({
  calculateStation: (stationId) => {
    const proj = get().getProject()
    if (!proj) return
    const station = proj.stations.find((s) => s.id === stationId)
    if (!station) return

    // Set loading indicator
    set((state) => { state.ui.calculatingStationId = stationId })

    try {
      // Snapshot input fields before calc for P8 input_change tracking
      const before = {
        soilResistivityOhmCm: station.soilResistivityOhmCm,
        pipelineSegments: station.pipelineSegments?.length,
        proposedAnodes: station.proposedAnodes,
        trRatedVoltage: station.tr?.ratedVoltage,
        trRatedCurrent: station.tr?.ratedCurrent,
      }

      // Delegate to calculation service (pure business logic)
      const calcResult = runFullCalculation(station, proj)

      // Update state with results
      set((state) => {
        const p = state.projects.find((pp) => pp.id === state.activeProjectId)
        if (!p) return
        const st = p.stations.find((s) => s.id === stationId)
        if (!st) return

        if (!calcResult.success) {
          st.validationErrors = calcResult.validationErrors
          st.lastCalcResult = null
          st.status = st.status === 'draft' ? 'draft' : 'input_complete'
          p.updatedAt = new Date().toISOString()
          logActivityHelper(p, 'Calculation Run Failed', 'Calculations', `Failed calculation on station ${st.name}`)
          return
        }

        st.validationErrors = null
        st.lastCalcResult = calcResult.result
        st.insights = calcResult.insights
        st.alternatives = calcResult.alternatives
        st.status = 'calculated'

        // Cache the calculation result asynchronously
        cacheCalculation(stationId, calcResult.result).catch((err) => {
          console.warn('[CalculationCache] Failed to cache calculation in IndexedDB:', err.message)
        })
        
        const allCalc = p.stations.every((s) => s.status === 'calculated')
        if (allCalc) {
          p.hasCalculationsMismatch = false
        }
        p.updatedAt = new Date().toISOString()
        logActivityHelper(p, 'Calculation Run', 'Calculations', `Calculated station ${st.name}: Req=${st.lastCalcResult.requiredCurrentA.toFixed(2)}A, Design=${st.lastCalcResult.designCurrentA.toFixed(2)}A`)

        // P8: Collect calc_run + input_change decisions for the learning foundation
        const after = {
          soilResistivityOhmCm: st.soilResistivityOhmCm,
          pipelineSegments: st.pipelineSegments?.length,
          proposedAnodes: st.proposedAnodes,
          trRatedVoltage: st.tr?.ratedVoltage,
          trRatedCurrent: st.tr?.ratedCurrent,
        }
        collectFromCalculation(p, st, before, after)
      })
    } finally {
      set((state) => { state.ui.calculatingStationId = null })
    }
  },

  calculateAllStations: () => {
    const proj = get().getProject()
    if (!proj) return
    proj.stations.forEach((s) => {
      get().calculateStation(s.id)
    })
    get().runTankCalculations()
    get().runVesselCalculations()
    set((state) => {
      const p = state.projects.find((pp) => pp.id === state.activeProjectId)
      if (p) {
        p.hasCalculationsMismatch = false
      }
    })
  },

  runTankCalculations: () =>
    set((state) => {
      const proj = state.projects.find((p) => p.id === state.activeProjectId)
      if (!proj || !proj.tank) return
      
      const { diameter, currentDensity, anodeSpacing, layoutType, anodeRating } = proj.tank
      const designLife = proj.designBasis.systemDesignLifeYears
      const soilResistivity = proj.designBasis.soilResistivityOhmCm

      const radius = diameter / 2
      const bottomArea = Math.PI * Math.pow(radius, 2)
      const reqCurrent = (bottomArea * currentDensity) / 1000
      const designCurrent = reqCurrent * 1.3

      let geomLength = 0
      const rings = []
      const gridLines = []

      if (layoutType === 'concentric') {
        const numRings = Math.floor(radius / anodeSpacing)
        for (let i = 1; i <= numRings; i++) {
          const ringRadius = i * anodeSpacing
          const circ = 2 * Math.PI * ringRadius
          geomLength += circ
          rings.push(ringRadius)
        }
      } else {
        const numLines = Math.floor(radius / anodeSpacing)
        geomLength += diameter
        gridLines.push(0)
        for (let i = 1; i <= numLines; i++) {
          const dist = i * anodeSpacing
          const chordLength = 2 * Math.sqrt(Math.pow(radius, 2) - Math.pow(dist, 2))
          geomLength += chordLength * 2
          gridLines.push(dist)
          gridLines.push(-dist)
        }
      }

      const weightKgPerM = anodeRating === 34 ? 0.045 : 0.03
      const minLengthForCurrent = designCurrent / (anodeRating / 1000)
      const finalLength = Math.max(geomLength, minLengthForCurrent)
      const totalAnodeWeight = finalLength * weightKgPerM
      const operatingCurrentDensity = finalLength > 0 ? (designCurrent / finalLength) * 1000 : 0

      const ribbonDiaApprox = 0.008
      const r = ribbonDiaApprox / 2 // 0.004 m
      const W = diameter // grid width (tank diameter)
      const depthOfBurial = 0.1 // 10 cm default depth of burial
      const soilResistivityOhmM = soilResistivity / 100
      const resistance = finalLength > 0 && W > 0 && depthOfBurial > 0
        ? (soilResistivityOhmM / (2 * Math.PI * finalLength)) * (Math.log((4 * finalLength) / r) + (finalLength / W) * Math.log(W / depthOfBurial) - 1)
        : 0

      const dcVoltage = designCurrent * resistance + 2.0
      const powerW = designCurrent * dcVoltage

      proj.tank.lastCalcResult = {
        bottomArea,
        reqCurrent,
        designCurrent,
        geomLength,
        rings,
        gridLines,
        minLengthForCurrent,
        finalLength,
        totalAnodeWeight,
        operatingCurrentDensity,
        resistance,
        dcVoltage,
        powerW,
      }
      proj.tank.status = 'calculated'

      const allStationsCalculated = proj.stations.every((s) => s.status === 'calculated')
      const vesselCalculated = proj.vessel ? proj.vessel.status === 'calculated' : true
      if (allStationsCalculated && vesselCalculated) {
        proj.hasCalculationsMismatch = false
      }
      proj.updatedAt = new Date().toISOString()
    }),

  runVesselCalculations: () =>
    set((state) => {
      const proj = state.projects.find((p) => p.id === state.activeProjectId)
      if (!proj || !proj.vessel) return

      const { length, diameter, currentDensity, anodeType, anodeQty, electrolyteResistivity, drivingVoltageMode = 'polarized' } = proj.vessel
      
      const ANODE_SPECS = {
        al_zn_in: { weightKg: 4.5, lengthMm: 300, radiusMm: 45, consumptionRate: 3.4, drivingVoltageV: drivingVoltageMode === 'bare' ? 0.45 : 0.25, utilizationFactor: 0.85 },
        zinc_high_pure: { weightKg: 6.0, lengthMm: 400, radiusMm: 35, consumptionRate: 11.8, drivingVoltageV: drivingVoltageMode === 'bare' ? 0.45 : 0.25, utilizationFactor: 0.85 },
        magnesium_h1: { weightKg: 4.0, lengthMm: 350, radiusMm: 50, consumptionRate: 17.7, drivingVoltageV: drivingVoltageMode === 'bare' ? 0.90 : 0.70, utilizationFactor: 0.50 },
      }
      const spec = ANODE_SPECS[anodeType] || ANODE_SPECS.al_zn_in

      const cylinderArea = Math.PI * diameter * length
      const headsArea = 2 * Math.PI * Math.pow(diameter / 2, 2)
      const totalArea = cylinderArea + headsArea

      const reqCurrent = (totalArea * currentDensity) / 1000
      const designCurrent = reqCurrent * 1.3

      const anodeLenM = spec.lengthMm / 1000
      const anodeRadM = spec.radiusMm / 1000
      const resistivityOhmM = electrolyteResistivity / 100
      
      const fBoundary = 1.25 // Vessel boundary proximity safety factor
      const anodeResistance = anodeLenM > 0
        ? (resistivityOhmM / (2 * Math.PI * anodeLenM)) * (Math.log((4 * anodeLenM) / anodeRadM) - 1) * fBoundary
        : 0

      const outputCurrentPerAnode = spec.drivingVoltageV / anodeResistance
      const totalOutputCapacity = outputCurrentPerAnode * anodeQty

      const expectedLife = designCurrent > 0
        ? (anodeQty * spec.weightKg * spec.utilizationFactor) / (designCurrent * spec.consumptionRate)
        : 0

      proj.vessel.lastCalcResult = {
        totalArea,
        reqCurrent,
        designCurrent,
        anodeResistance,
        outputCurrentPerAnode,
        totalOutputCapacity,
        expectedLife,
      }
      proj.vessel.status = 'calculated'

      const allStationsCalculated = proj.stations.every((s) => s.status === 'calculated')
      const tankCalculated = proj.tank ? proj.tank.status === 'calculated' : true
      if (allStationsCalculated && tankCalculated) {
        proj.hasCalculationsMismatch = false
      }
      proj.updatedAt = new Date().toISOString()
    }),

  getBOMForStation: (stationId) => {
    const proj = get().getProject()
    if (!proj) return []
    const station = proj.stations.find((s) => s.id === stationId)
    return generateStationBOM(station, proj)
  },

  getActiveStation: () => {
    const proj = get().getProject()
    if (!proj) return null
    return proj.stations.find((s) => s.id === get().activeStationId) || proj.stations[0]
  },

  getTotalValidationFailCount: () => {
    const proj = get().getProject()
    if (!proj) return 0
    return proj.stations.reduce((acc, s) => {
      if (!s.lastCalcResult) return acc
      return acc + (s.lastCalcResult.checks || []).filter((c) => c.status === 'fail').length
    }, 0)
  },

  getAllStationsCalculated: () => {
    const proj = get().getProject()
    if (!proj) return false
    return proj.stations.every((s) => s.lastCalcResult !== null)
  },
})
