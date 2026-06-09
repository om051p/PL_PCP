/**
 * PROJECT STORE
 * Zustand store with Immer for immutable state updates.
 * Single source of truth for all project and station data.
 * Handles: project CRUD, station CRUD, calculations, workflow, revisions.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

const inMemoryMap = new Map()
const safeStorage = {
  getItem: (name) => {
    try {
      return localStorage.getItem(name)
    } catch {
      return inMemoryMap.get(name) ?? null
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value)
    } catch {
      inMemoryMap.set(name, value)
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name)
    } catch {
      inMemoryMap.delete(name)
    }
  },
}
// Synchronous theme detection — prevents flash of light mode before React hydration
function getInitialTheme() {
  try {
    const stored = localStorage.getItem('cp-designer-theme')
    if (stored === 'dark' || stored === 'light') return stored
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

import { v4 as uuid } from 'uuid'
import { runStationCalculations } from '../engine/modules/calculations.js'
import { runRules } from '../engine/rules/rulesEngine.js'
import { generateAlternatives } from '../engine/optimizer/optimizer.js'
import { generateBOM } from '../engine/rules/bomEngine.js'
import { ANODE_SPECS, BOM_ALLOWED_STATUSES, getActiveStandard } from '../constants/index.js'
import { validateStation } from '../engine/modules/validation.js'

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

export function makeDefaultProject() {
  return {
    id: uuid(),
    projectNumber: 'ECP25-0292',
    clientName: 'Client Name',
    endClient: '-',
    projectName: 'PERMANENT CATHODIC PROTECTION DESIGN',
    designer: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'draft',
    designStandard: 'saudiAramco',
    systemDesignLifeYears: 25,
    stations: [makeDefaultStation()],
    revisions: [],
    currentRevision: null,
  }
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useProjectStore = create(
  persist(
    immer((set, get) => ({
      // ── State ──────────────────────────────────────────────────────────────
      project: makeDefaultProject(),
      activeStationId: null,
      ui: {
        sidebarCollapsed: false,
        calculatingStationId: null,
        theme: getInitialTheme(),
      },

      // ── Project Actions ────────────────────────────────────────────────────

      updateProject: (fields) =>
        set((state) => {
          Object.assign(state.project, fields)
          state.project.updatedAt = new Date().toISOString()
        }),

      newProject: () =>
        set((state) => {
          state.project = makeDefaultProject()
          state.activeStationId = state.project.stations[0].id
        }),

      // ── Station Actions ────────────────────────────────────────────────────

      setActiveStation: (stationId) =>
        set((state) => {
          state.activeStationId = stationId
        }),

      addStation: () =>
        set((state) => {
          const n = state.project.stations.length + 1
          const newStation = makeDefaultStation({ name: `ICCP Station-${n}` })
          state.project.stations.push(newStation)
          state.activeStationId = newStation.id
          state.project.updatedAt = new Date().toISOString()
        }),

      removeStation: (stationId) =>
        set((state) => {
          if (state.project.stations.length <= 1) return
          state.project.stations = state.project.stations.filter((s) => s.id !== stationId)
          if (state.activeStationId === stationId) {
            state.activeStationId = state.project.stations[0].id
          }
          state.project.updatedAt = new Date().toISOString()
        }),

      updateStation: (stationId, updater) =>
        set((state) => {
          const station = state.project.stations.find((s) => s.id === stationId)
          if (!station) return
          if (typeof updater === 'function') {
            updater(station)
          } else {
            Object.assign(station, updater)
          }
          // Mark as needing recalculation
          station.lastCalcResult = null
          station.status = station.status === 'draft' ? 'draft' : 'input_complete'
          state.project.updatedAt = new Date().toISOString()
        }),

      updateSegment: (stationId, segmentId, fields) =>
        set((state) => {
          const station = state.project.stations.find((s) => s.id === stationId)
          if (!station) return
          const seg = station.pipelineSegments.find((s) => s.id === segmentId)
          if (!seg) return
          Object.assign(seg, fields)
          station.lastCalcResult = null
          state.project.updatedAt = new Date().toISOString()
        }),

      addSegment: (stationId) =>
        set((state) => {
          const station = state.project.stations.find((s) => s.id === stationId)
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
          state.project.updatedAt = new Date().toISOString()
        }),

      removeSegment: (stationId, segmentId) =>
        set((state) => {
          const station = state.project.stations.find((s) => s.id === stationId)
          if (!station) return
          if (station.pipelineSegments.length <= 1) return
          station.pipelineSegments = station.pipelineSegments.filter((s) => s.id !== segmentId)
          station.lastCalcResult = null
          state.project.updatedAt = new Date().toISOString()
        }),

      // ── Calculation Actions ────────────────────────────────────────────────

      calculateStation: (stationId) =>
        set((state) => {
          const station = state.project.stations.find((s) => s.id === stationId)
          if (!station) return

          // Validate inputs before running calculations
          const validation = validateStation({
            pipelineSegments: station.pipelineSegments,
            groundbed: station.groundbed,
            anodeSpec: station.anodeSpec,
            proposedAnodes: station.proposedAnodes,
            cables: station.cables,
            tr: station.tr,
            soilResistivityOhmCm: station.soilResistivityOhmCm,
            actualRemotenesM: station.actualRemotenesM,
            requiredRemotenesM: station.requiredRemotenesM,
            designLifeYears: station.designLifeYears,
          })

          if (!validation.valid) {
            station.validationErrors = validation.errors
            station.lastCalcResult = null
            station.status = station.status === 'draft' ? 'draft' : 'input_complete'
            state.ui.calculatingStationId = null
            state.project.updatedAt = new Date().toISOString()
            return
          }

          // Clear any previous validation errors
          station.validationErrors = null
          state.ui.calculatingStationId = stationId

          try {
            const activeStandard = getActiveStandard(state.project)
            const result = runStationCalculations(station, state.project.systemDesignLifeYears, activeStandard)
            const { checks, insights, allPassed } = runRules(station, result, activeStandard)
            const bom = state.project.status !== 'draft' ? generateBOM(station, result, activeStandard) : []
            const alternatives = generateAlternatives(
              station,
              result,
              state.project.systemDesignLifeYears,
              activeStandard,
            )

            result.checks = checks
            result.insights = insights
            result.allChecksPassed = allPassed
            result.bom = bom

            station.lastCalcResult = result
            station.insights = insights
            station.alternatives = alternatives
            station.status = 'calculated'
          } finally {
            state.ui.calculatingStationId = null
          }

          state.project.updatedAt = new Date().toISOString()
        }),

      calculateAllStations: () => {
        const { project } = get()
        project.stations.forEach((s) => {
          get().calculateStation(s.id)
        })
      },

      getBOMForStation: (stationId) => {
        const { project } = get()
        const station = project.stations.find((s) => s.id === stationId)
        if (!station?.lastCalcResult) return []
        if (
          !BOM_ALLOWED_STATUSES.includes(project.status) &&
          !BOM_ALLOWED_STATUSES.includes(station.status)
        ) {
          return {
            locked: true,
            reason: `BOM requires station status: Approved or Issued for Construction. Current: ${station.status}`,
          }
        }
        return generateBOM(station, station.lastCalcResult)
      },

      // ── Workflow Actions ───────────────────────────────────────────────────

      advanceWorkflow: (stationId, newStatus, notes = '') =>
        set((state) => {
          const station = state.project.stations.find((s) => s.id === stationId)
          if (!station) return
          station.status = newStatus
          station.statusNotes = notes
          station.statusUpdatedAt = new Date().toISOString()
          state.project.updatedAt = new Date().toISOString()
        }),

      // ── Revision Actions ───────────────────────────────────────────────────

      createRevision: (description, createdBy = 'Engineer') =>
        set((state) => {
          const revNum = `REV-${state.project.revisions.length}`
          const revision = {
            id: uuid(),
            revNumber: revNum,
            description,
            createdAt: new Date().toISOString(),
            createdBy,
            status: state.project.status,
            snapshot: JSON.parse(JSON.stringify(state.project)),
          }
          state.project.revisions.push(revision)
          state.project.currentRevision = revNum
          state.project.updatedAt = new Date().toISOString()
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

      // ── Selectors (derived state) ──────────────────────────────────────────

      getActiveStation: () => {
        const { project, activeStationId } = get()
        return project.stations.find((s) => s.id === activeStationId) || project.stations[0]
      },

      getTotalValidationFailCount: () => {
        const { project } = get()
        return project.stations.reduce((acc, s) => {
          if (!s.lastCalcResult) return acc
          return acc + (s.lastCalcResult.checks || []).filter((c) => c.status === 'fail').length
        }, 0)
      },

      getAllStationsCalculated: () => {
        const { project } = get()
        return project.stations.every((s) => s.lastCalcResult !== null)
      },
    })),
    {
      name: 'cp-platform-project',
      version: 1,
      storage: safeStorage,
      // Only persist project data, not transient UI state
      partialize: (state) => ({ project: state.project, activeStationId: state.activeStationId }),
    },
  ),
)
