/**
 * PROJECT STORE
 * Zustand store with Immer for immutable state updates.
 * Multi-project support: manages a collection of projects with an active project context.
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
    designStandard: 'saudiAramco',
    systemDesignLifeYears: 25,
    stations: [makeDefaultStation()],
    revisions: [],
    currentRevision: null,
    archived: false,
    hasCalculationsMismatch: false,
    design_life_target: 25,
    back_emf_v: 2.0,
    structure_resistance_ohm: 0.055,
    ac_input_voltage_v: 480,
    ac_input_phase: 3,
    tr_efficiency_pct: 80,
    tr_power_factor: 0.8,
    coke_contingency_pct: 10,
    min_remoteness_distance_m: 20,
    actual_remoteness_distance_m: 56,
    soil_resistivity_ohm_cm: 361,
    ...overrides,
  }
}

// ─── Migration: convert legacy single-project format to multi-project ────────

function migrateLegacyState(state) {
  // If the state already has a projects array, it's already migrated
  if (Array.isArray(state.projects)) return state

  // Legacy format: has a single `project` object
  if (state.project && typeof state.project === 'object') {
    const project = state.project
    // Ensure the project has an archived field
    if (typeof project.archived !== 'boolean') {
      project.archived = false
    }
    return {
      ...state,
      projects: [project],
      activeProjectId: project.id,
      project: undefined,
    }
  }

  // No project at all — create a fresh one
  const fresh = makeDefaultProject()
  return {
    ...state,
    projects: [fresh],
    activeProjectId: fresh.id,
    project: undefined,
  }
}

// ─── Store ────────────────────────────────────────────────────────────────────

// ─── Export / Import ─────────────────────────────────────────────────────────

const EXPORT_VERSION = 1

/** Validate that an imported object has the minimum required project fields */
function validateImportedProject(data) {
  if (!data || typeof data !== 'object') return { valid: false, error: 'Invalid file format' }
  if (!data.projectNumber || typeof data.projectNumber !== 'string')
    return { valid: false, error: 'Missing or invalid project number' }
  if (!Array.isArray(data.stations))
    return { valid: false, error: 'Missing or invalid stations array' }
  return { valid: true }
}

/** Export a single project as a downloadable JSON file */
export function exportProjectAsJSON(projectId) {
  const state = useProjectStore.getState()
  const project = state.projects.find((p) => p.id === projectId)
  if (!project) return

  const payload = {
    _format: 'cp-designer-project',
    _version: EXPORT_VERSION,
    _exportedAt: new Date().toISOString(),
    project: JSON.parse(JSON.stringify(project)),
  }

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${project.projectNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}.cp-project.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/** Import a project from a .cp-project.json file — returns { success, project?, error? } */
export function parseImportedFile(fileContent) {
  try {
    const data = JSON.parse(fileContent)

    // Handle both wrapped format (with _format header) and raw project JSON
    const project = data._format === 'cp-designer-project' ? data.project : data

    const validation = validateImportedProject(project)
    if (!validation.valid) return { success: false, error: validation.error }

    // Assign a new ID so it never collides with existing projects
    project.id = uuid()
    project.archived = false
    project.updatedAt = new Date().toISOString()

    // Give all stations new IDs to avoid collisions
    project.stations.forEach((st) => {
      st.id = uuid()
    })

    return { success: true, project }
  } catch (e) {
    return { success: false, error: `Failed to parse file: ${e.message}` }
  }
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
          
          const designBasisKeys = [
            'design_life_target',
            'back_emf_v',
            'structure_resistance_ohm',
            'ac_input_voltage_v',
            'ac_input_phase',
            'tr_efficiency_pct',
            'tr_power_factor',
            'coke_contingency_pct',
            'min_remoteness_distance_m',
            'actual_remoteness_distance_m',
            'soil_resistivity_ohm_cm'
          ]
          const hasChanged = Object.keys(fields).some((k) => designBasisKeys.includes(k))
          if (hasChanged) {
            proj.stations.forEach((st) => {
              st.status = 'needs_recalculation'
            })
            proj.hasCalculationsMismatch = true
          }
          
          proj.updatedAt = new Date().toISOString()
        }),

      setNeedsRecalculation: () =>
        set((state) => {
          const proj = state.projects.find((p) => p.id === state.activeProjectId)
          if (!proj) return
          proj.stations.forEach((st) => {
            st.status = 'needs_recalculation'
          })
          proj.hasCalculationsMismatch = true
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
          station.status = newStatus
          station.statusNotes = notes
          station.statusUpdatedAt = new Date().toISOString()
          proj.updatedAt = new Date().toISOString()
        }),

      // ── Revision Actions ───────────────────────────────────────────────────

      createRevision: (description, createdBy = 'Engineer') =>
        set((state) => {
          const proj = state.projects.find((p) => p.id === state.activeProjectId)
          if (!proj) return
          const revNum = `REV-${proj.revisions.length}`
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
    })),
    {
      name: 'cp-platform-project',
      version: 3,
      storage: safeStorage,
      // Migrate legacy single-project format to multi-project
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
