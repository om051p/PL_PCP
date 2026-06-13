import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { localStorageApi } from '../api/localStorageApi.js'
import { projectRepository } from '../repositories/projectRepository.js'

import { makeDefaultStation, makeDefaultProject, defaultDashboardV3Flag, defaultIntelligenceV2Flag, defaultLearningV2Flag } from './factories.js'
import { createProjectSlice } from './slices/projectSlice.js'
import { createStationSlice } from './slices/stationSlice.js'
import { createDesignSlice } from './slices/designSlice.js'
import { createCalculationSlice } from './slices/calculationSlice.js'
import { createWorkflowSlice } from './slices/workflowSlice.js'
import { createAttenuationSlice } from './slices/attenuationSlice.js'
import { createUiSlice } from './slices/uiSlice.js'

export { makeDefaultStation, makeDefaultProject, defaultDashboardV3Flag, defaultIntelligenceV2Flag, defaultLearningV2Flag }

const customStorage = {
  getItem: (name) => localStorageApi.getItem(name),
  setItem: (name, value) => localStorageApi.setItem(name, value),
  removeItem: (name) => localStorageApi.removeItem(name),
}

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
    // Phase 6 migration: add dashboardV3Enabled flag.
    // Legacy projects (created before PHASE_6_RELEASE_DATE) default to false (opt-in).
    if (p.dashboardV3Enabled === undefined) {
      p.dashboardV3Enabled = defaultDashboardV3Flag(p.createdAt)
    }
    // Phase 7 migration: add intelligenceV2Enabled flag.
    // Legacy projects (created before PHASE_7_RELEASE_DATE) default to false (opt-in).
    if (p.intelligenceV2Enabled === undefined) {
      p.intelligenceV2Enabled = defaultIntelligenceV2Flag(p.createdAt)
    }
    // Phase 8 migration: add learningV2Enabled flag.
    // Legacy projects (created before PHASE_8_RELEASE_DATE) default to false (opt-in).
    if (p.learningV2Enabled === undefined) {
      p.learningV2Enabled = defaultLearningV2Flag(p.createdAt)
    }
    return p
  })

  return newState
}

export const useProjectStore = create(
  persist(
    immer((set, get) => ({
      ...createProjectSlice(set, get),
      ...createStationSlice(set, get),
      ...createDesignSlice(set, get),
      ...createCalculationSlice(set, get),
      ...createWorkflowSlice(set, get),
      ...createAttenuationSlice(set, get),
      ...createUiSlice(set, get),
      
      // Override empty projects from slice with default seeded project
      projects: [makeDefaultProject()],
    })),
    {
      name: 'cp-platform-project',
      version: 6,
      storage: createJSONStorage(() => customStorage),
      migrate: migrateLegacyState,
      partialize: (state) => ({
        projects: state.projects,
        activeProjectId: state.activeProjectId,
        activeStationId: state.activeStationId,
        attenuationInput: state.attenuationInput,
        attenuationResult: state.attenuationResult,
        activeWorkspace: state.activeWorkspace,
      }),
    }
  )
)

export function exportProjectAsJSON(projectId) {
  const state = useProjectStore.getState()
  const project = state.projects.find((p) => p.id === projectId)
  projectRepository.exportProject(project)
}

export function parseImportedFile(fileContent) {
  return projectRepository.parseImportedFile(fileContent)
}
