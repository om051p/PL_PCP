import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { localStorageApi } from '../api/localStorageApi.js'
import { projectRepository } from '../repositories/projectRepository.js'
import { useAuthStore } from './authStore.js'

const customStorage = {
  getItem: (name) => localStorageApi.getItem(name),
  setItem: (name, value) => localStorageApi.setItem(name, value),
  removeItem: (name) => localStorageApi.removeItem(name),
}

// Synchronous theme detection — prevents flash of light mode before React hydration
function getInitialTheme() {
  try {
    const stored = localStorageApi.getItem('cp-designer-theme')
    if (stored === 'dark' || stored === 'light') return stored
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

import { v4 as uuid } from 'uuid'
import { ANODE_SPECS } from '../constants/index.js'
import { runFullCalculation } from '../services/calculationService.js'
import { generateStationBOM } from '../services/bomService.js'
import { computeAttenuation } from '../services/attenuationService.js'

// ─── Default Factory Functions ────────────────────────────────────────────────

export function makeDefaultStation(overrides = {}) {
  const id = uuid()
  return {
    id,
    name: 'ICCP Station-1',
    location: 'KM 00+000',
    designMode: 'deepwell',
    pipelineSegments: [
      {
        id: uuid(),
        name: '48" Gas Sales Pipeline',
        od: 48,
        wallThk: 0.875,
        lengthM: 292,
        opTempC: 57.22,
        currentDensityBase: 0.1,
        coatingType: 'fusion_bonded_epoxy',
        coatingEfficiency: 0.98,
      },
    ],
    groundbed: {
      type: 'deepwell',
      startDepthM: 15,
      anodeLengthM: 2.13,
      inactiveLenM: 1.5,
      anodeSpacingM: 1.5,
      boreholeDiaM: 0.25,
      numHoles: 1,
      cokeCoverM: 2.5,
      cementPlugM: 0.5,
    },
    anodeSpec: { ...ANODE_SPECS.HSCI_TA4 },
    proposedAnodes: 9,
    cables: {
      anodeTailLengths: [25, 30, 35, 40, 45, 50, 55, 60, 65, ...Array(41).fill(0)],
      anodeCableSizeMm2: 16,
      posMainLengthM: 180,
      posMainSizeMm2: 35,
      negMainLengthM: 100,
      negMainSizeMm2: 35,
      negSecLengthM: 60,
      negSecSizeMm2: 25,
    },
    tr: {
      ratedVoltage: 30,
      ratedCurrent: 25,
      backEMF: 2,
      structureResistance: 0.055,
    },
    soilResistivityOhmCm: 361,
    actualRemotenesM: 56,
    requiredRemotenesM: 20,
    designLifeYears: 25,
    status: 'draft',
    lastCalcResult: null,
    insights: [],
    alternatives: [],
    ...overrides,
  }
}

export function makeDefaultProject(overrides = {}) {
  const now = new Date().toISOString()
  return {
    id: uuid(),
    projectNumber: 'ECP25-0292',
    clientName: 'Client Name',
    endClient: '-',
    projectName: 'PERMANENT CATHODIC PROTECTION DESIGN',
    designer: '',
    createdAt: now,
    updatedAt: now,
    status: 'draft',
    stations: [makeDefaultStation()],
    revisions: [],
    currentRevision: null,
    activityLog: [],
    archived: false,
    hasCalculationsMismatch: false,
    designBasis: {
      designStandard: 'saudiAramco',
      systemDesignLifeYears: 25,
      backEmfV: 2.0,
      structureResistanceOhm: 0.055,
      acInputVoltageV: 480,
      acInputPhase: 3,
      trEfficiencyPct: 80,
      trPowerFactor: 0.8,
      cokeContingencyPct: 10,
      minRemotenessDistanceM: 20,
      actualRemotenessDistanceM: 56,
      soilResistivityOhmCm: 361,
      soilResistivitySource: 'standard',
      soilResistivityLayers: [],
      soilResistivitySurvey: [],
    },
    tank: {
      diameter: 30,
      currentDensity: 15,
      anodeSpacing: 1.5,
      layoutType: 'concentric',
      anodeRating: 17,
      status: 'draft',
      lastCalcResult: null,
    },
    vessel: {
      length: 8.0,
      diameter: 2.4,
      currentDensity: 30,
      anodeType: 'al_zn_in',
      anodeQty: 6,
      electrolyteResistivity: 80,
      drivingVoltageMode: 'polarized',
      status: 'draft',
      lastCalcResult: null,
    },
    ...overrides,
  }
}

// ─── Migration: convert legacy single-project format to multi-project ────────

function migrateLegacyState(state, version) {
  let newState = { ...state }

  // 1. Single-project to multi-project migration
  if (!Array.isArray(newState.projects)) {
    if (newState.project && typeof newState.project === 'object') {
      const p = newState.project
      p.archived = p.archived || false
      newState.projects = [p]
      newState.activeProjectId = p.id
      newState.project = undefined
    } else {
      const fresh = makeDefaultProject()
      newState.projects = [fresh]
      newState.activeProjectId = fresh.id
      newState.project = undefined
    }
  }

  // 2. Flat fields to nested designBasis migration
  newState.projects = newState.projects.map((p) => {
    if (!p.designBasis) {
      p.designBasis = {
        designStandard: p.designStandard || 'saudiAramco',
        systemDesignLifeYears: p.systemDesignLifeYears !== undefined ? p.systemDesignLifeYears : (p.design_life_target || 25),
        backEmfV: p.back_emf_v !== undefined ? p.back_emf_v : 2.0,
        structureResistanceOhm: p.structure_resistance_ohm !== undefined ? p.structure_resistance_ohm : 0.055,
        acInputVoltageV: p.ac_input_voltage_v !== undefined ? p.ac_input_voltage_v : 480,
        acInputPhase: p.ac_input_phase !== undefined ? p.ac_input_phase : 3,
        trEfficiencyPct: p.tr_efficiency_pct !== undefined ? p.tr_efficiency_pct : 80,
        trPowerFactor: p.tr_power_factor !== undefined ? p.tr_power_factor : 0.8,
        cokeContingencyPct: p.coke_contingency_pct !== undefined ? p.coke_contingency_pct : 10,
        minRemotenessDistanceM: p.min_remoteness_distance_m !== undefined ? p.min_remoteness_distance_m : 20,
        actualRemotenessDistanceM: p.actual_remoteness_distance_m !== undefined ? p.actual_remoteness_distance_m : 56,
        soilResistivityOhmCm: p.soil_resistivity_ohm_cm !== undefined ? p.soil_resistivity_ohm_cm : (p.stations?.[0]?.soilResistivityOhmCm || 361),
      }
    }
    if (!p.tank) {
      p.tank = {
        diameter: 30,
        currentDensity: 15,
        anodeSpacing: 1.5,
        layoutType: 'concentric',
        anodeRating: 17,
        status: 'draft',
        lastCalcResult: null,
      }
    }
    if (!p.vessel) {
      p.vessel = {
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
    return p
  })

  return newState
}

// ─── Store ────────────────────────────────────────────────────────────────────

// ─── Export / Import ─────────────────────────────────────────────────────────

/** Export a single project as a downloadable JSON file */
export function exportProjectAsJSON(projectId) {
  const state = useProjectStore.getState()
  const project = state.projects.find((p) => p.id === projectId)
  projectRepository.exportProject(project)
}

/** Import a project from a .cp-project.json file — returns { success, project?, error? } */
export function parseImportedFile(fileContent) {
  return projectRepository.parseImportedFile(fileContent)
}

function logActivityHelper(proj, action, moduleName, details) {
  if (!proj) return
  if (!proj.activityLog) proj.activityLog = []
  
  const user = useAuthStore.getState().user
  const userEmail = user?.email || user?.displayName || 'Engineer'
  
  proj.activityLog.push({
    id: uuid(),
    timestamp: new Date().toISOString(),
    user: userEmail,
    action,
    module: moduleName,
    details,
  })
}

export const useProjectStore = create(
  persist(
    immer((set, get) => ({
      // ── State (multi-project) ─────────────────────────────────────────────
      projects: [makeDefaultProject()],
      activeProjectId: null,
      activeStationId: null,
      activeWorkspace: null,
      ui: {
        sidebarCollapsed: false,
        calculatingStationId: null,
        theme: getInitialTheme(),
      },


      // ── Attenuation (per-project, stored in active project context) ──
      attenuationInput: null,
      attenuationResult: null,
      attenuationDirty: false,

      // ── Computed: current project ─────────────────────────────────────────

      /** Returns the currently active project object */
      getProject: () => {
        const { projects, activeProjectId } = get()
        return projects.find((p) => p.id === activeProjectId) || projects[0]
      },

      logActivity: (action, moduleName, details) =>
        set((state) => {
          const proj = state.projects.find((p) => p.id === state.activeProjectId)
          if (!proj) return
          if (!proj.activityLog) proj.activityLog = []
          
          const user = useAuthStore.getState().user
          const userEmail = user?.email || user?.displayName || 'Engineer'
          
          proj.activityLog.push({
            id: uuid(),
            timestamp: new Date().toISOString(),
            user: userEmail,
            action,
            module: moduleName,
            details,
          })
          proj.updatedAt = new Date().toISOString()
        }),

      /** Import a validated project into the store and switch to it */
      importProject: (project) =>
        set((state) => {
          state.projects.push(project)
          state.activeProjectId = project.id
          state.activeStationId = project.stations[0]?.id || null
          state.attenuationInput = null
          state.attenuationResult = null
          state.attenuationDirty = false
        }),

      // ── Project Management Actions ────────────────────────────────────────

      /** Switch to a different project */
      switchProject: (projectId) =>
        set((state) => {
          const target = state.projects.find((p) => p.id === projectId)
          if (!target) return
          state.activeProjectId = projectId
          state.activeStationId = target.stations[0]?.id || null
          state.attenuationInput = null
          state.attenuationResult = null
          state.attenuationDirty = false
        }),

      /** Create a new project and switch to it */
      createProject: (overrides = {}) =>
        set((state) => {
          const newProj = makeDefaultProject(overrides)
          state.projects.push(newProj)
          state.activeProjectId = newProj.id
          state.activeStationId = newProj.stations[0].id
          state.attenuationInput = null
          state.attenuationResult = null
          state.attenuationDirty = false
          logActivityHelper(newProj, 'Project Created', 'Workspace', `Created new project ${newProj.projectNumber}`)
        }),

      /** Duplicate the current project (or any project by id) */
      duplicateProject: (projectId) =>
        set((state) => {
          const source = state.projects.find((p) => p.id === projectId)
          if (!source) return
          const now = new Date().toISOString()
          const duplicate = JSON.parse(JSON.stringify(source))
          duplicate.id = uuid()
          duplicate.projectNumber = `${source.projectNumber} (Copy)`
          duplicate.projectName = `${source.projectName} — Copy`
          duplicate.createdAt = now
          duplicate.updatedAt = now
          duplicate.revisions = []
          duplicate.currentRevision = null
          duplicate.activityLog = []
          duplicate.archived = false
          // Give stations new IDs
          duplicate.stations.forEach((st) => {
            st.id = uuid()
            st.lastCalcResult = null
            st.insights = []
            st.alternatives = []
          })
          state.projects.push(duplicate)
          state.activeProjectId = duplicate.id
          state.activeStationId = duplicate.stations[0]?.id || null
          logActivityHelper(duplicate, 'Project Duplicated', 'Workspace', `Duplicated from project ${source.projectNumber}`)
        }),

      /** Archive a project (soft-delete) */
      archiveProject: (projectId) =>
        set((state) => {
          const proj = state.projects.find((p) => p.id === projectId)
          if (!proj) return
          proj.archived = true
          proj.updatedAt = new Date().toISOString()
          // If we archived the active project, switch to the first non-archived one
          if (state.activeProjectId === projectId) {
            const next = state.projects.find((p) => !p.archived && p.id !== projectId)
            if (next) {
              state.activeProjectId = next.id
              state.activeStationId = next.stations[0]?.id || null
            }
          }
        }),

      /** Unarchive a project */
      unarchiveProject: (projectId) =>
        set((state) => {
          const proj = state.projects.find((p) => p.id === projectId)
          if (!proj) return
          proj.archived = false
          proj.updatedAt = new Date().toISOString()
        }),

      /** Permanently delete a project */
      deleteProject: (projectId) =>
        set((state) => {
          if (state.projects.length <= 1) return // Must keep at least one
          state.projects = state.projects.filter((p) => p.id !== projectId)
          if (state.activeProjectId === projectId) {
            const next = state.projects.find((p) => !p.archived) || state.projects[0]
            state.activeProjectId = next.id
            state.activeStationId = next.stations[0]?.id || null
          }
        }),

      /** Convenience: create a new project with default values */
      newProject: () =>
        set((state) => {
          const proj = makeDefaultProject()
          state.projects.push(proj)
          state.activeProjectId = proj.id
          state.activeStationId = proj.stations[0].id
          state.attenuationInput = null
          state.attenuationResult = null
          state.attenuationDirty = false
        }),

      // ── Project Data Actions (operate on active project) ──────────────────

      updateProject: (fields) =>
        set((state) => {
          const proj = state.projects.find((p) => p.id === state.activeProjectId)
          if (!proj) return
          Object.assign(proj, fields)
          proj.updatedAt = new Date().toISOString()
          logActivityHelper(proj, 'Project Modified', 'Workspace', `Updated fields: ${Object.keys(fields).join(', ')}`)
        }),

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

      // ── Station Actions ────────────────────────────────────────────────────

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
            id: uuid(),
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
        }),

      // ── Calculation Actions ────────────────────────────────────────────────

      calculateStation: (stationId) => {
        const proj = get().getProject()
        if (!proj) return
        const station = proj.stations.find((s) => s.id === stationId)
        if (!station) return

        // Set loading indicator
        set((state) => { state.ui.calculatingStationId = stationId })

        try {
          // Delegate to calculation service (pure business logic)
          const calcResult = runFullCalculation(station, proj)
          console.log("CALC RESULT:", JSON.stringify(calcResult, null, 2))

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
            
            const allCalc = p.stations.every((s) => s.status === 'calculated')
            if (allCalc) {
              p.hasCalculationsMismatch = false
            }
            p.updatedAt = new Date().toISOString()
            logActivityHelper(p, 'Calculation Run', 'Calculations', `Calculated station ${st.name}: Req=${st.lastCalcResult.requiredCurrentA.toFixed(2)}A, Design=${st.lastCalcResult.designCurrentA.toFixed(2)}A`)
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

      getBOMForStation: (stationId) => {
        const proj = get().getProject()
        if (!proj) return []
        const station = proj.stations.find((s) => s.id === stationId)
        return generateStationBOM(station, proj)
      },

      // ── Workflow Actions ───────────────────────────────────────────────────

      advanceWorkflow: (stationId, newStatus, notes = '') =>
        set((state) => {
          const proj = state.projects.find((p) => p.id === state.activeProjectId)
          if (!proj) return
          const station = proj.stations.find((s) => s.id === stationId)
          if (!station) return
          const oldStatus = station.status
          station.status = newStatus
          station.statusNotes = notes
          station.statusUpdatedAt = new Date().toISOString()
          proj.updatedAt = new Date().toISOString()
          
          let actionLabel = 'Workflow Changed'
          if (newStatus === 'approved') actionLabel = 'Design Approved'
          else if (newStatus === 'issued_for_construction') actionLabel = 'Design Issued'
          else if (newStatus === 'engineering_review') actionLabel = 'Submitted for Review'
          else if (oldStatus === 'approved' || oldStatus === 'issued_for_construction') actionLabel = 'Design Unlocked'
          
          logActivityHelper(proj, actionLabel, 'Validation', `Status changed for station ${station.name} from ${oldStatus.replace(/_/g, ' ')} to ${newStatus.replace(/_/g, ' ')}${notes ? ' (Notes/Justification: ' + notes + ')' : ''}`)
        }),

      // ── Revision Actions ───────────────────────────────────────────────────

      createRevision: (description, createdBy = 'Engineer') =>
        set((state) => {
          const proj = state.projects.find((p) => p.id === state.activeProjectId)
          if (!proj) return
          const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
          const revNum = `Revision ${letters[proj.revisions.length] || String(proj.revisions.length)}`
          const revision = {
            id: uuid(),
            revNumber: revNum,
            description,
            createdAt: new Date().toISOString(),
            createdBy,
            status: proj.status,
            snapshot: JSON.parse(JSON.stringify(proj)),
          }
          proj.revisions.push(revision)
          proj.currentRevision = revNum
          proj.updatedAt = new Date().toISOString()
          logActivityHelper(proj, 'Revision Created', 'Document Control', `Created new revision: ${revNum} - ${description}`)
        }),

      restoreRevision: (revisionId) =>
        set((state) => {
          const proj = state.projects.find((p) => p.id === state.activeProjectId)
          if (!proj) return
          const rev = proj.revisions.find((r) => r.id === revisionId)
          if (!rev) return
          
          const targetSnapshot = JSON.parse(JSON.stringify(rev.snapshot))
          const tempRevisions = [...proj.revisions]
          const tempHistory = [...proj.activityLog]
          
          Object.assign(proj, targetSnapshot)
          
          proj.revisions = tempRevisions
          proj.activityLog = tempHistory
          
          proj.updatedAt = new Date().toISOString()
          logActivityHelper(proj, 'Revision Restored', 'Document Control', `Restored design to state of ${rev.revNumber}`)
        }),

      // ── UI Actions ─────────────────────────────────────────────────────────

      setSidebarCollapsed: (v) =>
        set((state) => {
          state.ui.sidebarCollapsed = v
        }),

      setTheme: (theme) =>
        set((state) => {
          state.ui.theme = theme
        }),

      toggleTheme: () =>
        set((state) => {
          state.ui.theme = state.ui.theme === 'light' ? 'dark' : 'light'
        }),

      setActiveWorkspace: (workspace) =>
        set((state) => {
          state.activeWorkspace = workspace
        }),

      // ── Attenuation Actions ─────────────────────────────────────────────────

      setAttenuationInput: (inputPatch) =>
        set((state) => {
          if (!state.attenuationInput) {
            state.attenuationInput = inputPatch
          } else {
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
          }
          state.attenuationDirty = true
        }),

      replaceAttenuationInput: (input) =>
        set((state) => {
          state.attenuationInput = input
          state.attenuationResult = null
          state.attenuationDirty = true
        }),

      runAttenuationCalculation: () =>
        set((state) => {
          if (state.attenuationInput) {
            const proj = state.projects.find((p) => p.id === state.activeProjectId) || state.projects[0]
            const activeStation = proj?.stations.find((s) => s.id === state.activeStationId) || proj?.stations[0]
            const firstSegment = activeStation?.pipelineSegments?.[0]
            if (firstSegment) {
              state.attenuationInput.pipe.diameterInches = firstSegment.od
              state.attenuationInput.pipe.wallThicknessInches = firstSegment.wallThk
            }
            const soilRes = proj?.soil_resistivity_ohm_cm !== undefined ? proj.soil_resistivity_ohm_cm : activeStation?.soilResistivityOhmCm
            if (soilRes !== undefined) {
              state.attenuationInput.coating.soilResistivityOhmCm = soilRes
            }
          }
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

      // ── Selectors (derived state) ──────────────────────────────────────────

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

      compareRevisions: (revIdA, revIdB) => {
        const proj = get().getProject()
        if (!proj) return null
        const revA = proj.revisions.find((r) => r.id === revIdA)
        const revB = proj.revisions.find((r) => r.id === revIdB)
        if (!revA || !revB) return null
        
        const diffs = {
          basis: [],
          stations: [],
        }
        
        const snapA = revA.snapshot
        const snapB = revB.snapshot
        
        const basisA = snapA.designBasis || {}
        const basisB = snapB.designBasis || {}
        
        const allBasisKeys = Array.from(new Set([...Object.keys(basisA), ...Object.keys(basisB)]))
        allBasisKeys.forEach((key) => {
          if (basisA[key] !== basisB[key]) {
            diffs.basis.push({
              param: key,
              valA: basisA[key],
              valB: basisB[key],
            })
          }
        })
        
        const stationsA = snapA.stations || []
        const stationsB = snapB.stations || []
        
        stationsA.forEach((stA) => {
          const stB = stationsB.find((s) => s.name === stA.name)
          if (!stB) {
            diffs.stations.push({
              name: stA.name,
              status: 'deleted',
              changes: []
            })
            return
          }
          
          const changes = []
          if (stA.soilResistivityOhmCm !== stB.soilResistivityOhmCm) {
            changes.push({ param: 'Soil Resistivity', valA: stA.soilResistivityOhmCm, valB: stB.soilResistivityOhmCm })
          }
          if (stA.proposedAnodes !== stB.proposedAnodes) {
            changes.push({ param: 'Proposed Anodes', valA: stA.proposedAnodes, valB: stB.proposedAnodes })
          }
          if (stA.tr?.ratedVoltage !== stB.tr?.ratedVoltage) {
            changes.push({ param: 'TR Rated Voltage', valA: stA.tr?.ratedVoltage, valB: stB.tr?.ratedVoltage })
          }
          if (stA.tr?.ratedCurrent !== stB.tr?.ratedCurrent) {
            changes.push({ param: 'TR Rated Current', valA: stA.tr?.ratedCurrent, valB: stB.tr?.ratedCurrent })
          }
          
          const segsA = stA.pipelineSegments || []
          const segsB = stB.pipelineSegments || []
          
          segsA.forEach((segA, i) => {
            const segB = segsB[i]
            if (!segB) return
            if (segA.lengthM !== segB.lengthM) {
              changes.push({ param: `Seg ${i+1} Length`, valA: segA.lengthM, valB: segB.lengthM })
            }
            if (segA.od !== segB.od) {
              changes.push({ param: `Seg ${i+1} Diameter`, valA: segA.od, valB: segB.od })
            }
            if (segA.currentDensityBase !== segB.currentDensityBase) {
              changes.push({ param: `Seg ${i+1} CD Base`, valA: segA.currentDensityBase, valB: segB.currentDensityBase })
            }
          })
          
          if (changes.length > 0) {
            diffs.stations.push({
              name: stA.name,
              status: 'modified',
              changes,
            })
          }
        })
        
        return diffs
      },
    })),
    {
      name: 'cp-platform-project',
      version: 6,
      storage: createJSONStorage(() => customStorage),
      // Migrate legacy formats to version 5 with nested designBasis, tank, and vessel
      migrate: migrateLegacyState,
      // Only persist project data, not transient UI state
      partialize: (state) => ({
        projects: state.projects,
        activeProjectId: state.activeProjectId,
        activeStationId: state.activeStationId,
        attenuationInput: state.attenuationInput,
        attenuationResult: state.attenuationResult,
        activeWorkspace: state.activeWorkspace,
      }),
    },
  ),
)
