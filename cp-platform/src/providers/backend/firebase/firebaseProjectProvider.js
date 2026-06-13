/**
 * LOCAL STORAGE PROJECT PROVIDER
 *
 * Implements ProjectProvider contract using localStorageApi.
 * Currently the only project storage backend (remote sync is future work).
 *
 * @implements {import('../contracts/projectProvider.js').ProjectProvider}
 */

import { v4 as uuid } from 'uuid'
import { localStorageApi } from '../../../api/localStorageApi.js'

const STORAGE_KEY = 'cp-platform-project'
const EXPORT_VERSION = 1

function validateImportedProject(data) {
  if (!data || typeof data !== 'object') return { valid: false, error: 'Invalid file format' }
  if (!data.projectNumber || typeof data.projectNumber !== 'string')
    return { valid: false, error: 'Missing or invalid project number' }
  if (!Array.isArray(data.stations))
    return { valid: false, error: 'Missing or invalid stations array' }
  return { valid: true }
}

export const localStorageProjectProvider = {
  providerId: 'local-storage',

  loadState() {
    const raw = localStorageApi.getJSON(STORAGE_KEY)
    if (!raw) {
      // Return a sentinel so the store can initialize defaults
      return { _empty: true }
    }
    return raw
  },

  saveState(state) {
    const payload = {
      projects: state.projects,
      activeProjectId: state.activeProjectId,
      activeStationId: state.activeStationId,
      attenuationInput: state.attenuationInput,
      attenuationResult: state.attenuationResult,
      activeWorkspace: state.activeWorkspace,
    }
    localStorageApi.setJSON(STORAGE_KEY, payload)
  },

  parseImport(fileContent) {
    try {
      const data = JSON.parse(fileContent)
      const project = data._format === 'cp-designer-project' ? data.project : data
      const validation = validateImportedProject(project)
      if (!validation.valid) return { success: false, error: validation.error }

      project.id = uuid()
      project.archived = false
      project.updatedAt = new Date().toISOString()
      project.stations.forEach((st) => { st.id = uuid() })

      if (!project.designBasis) {
        project.designBasis = {
          designStandard: project.designStandard || 'saudiAramco',
          systemDesignLifeYears: project.systemDesignLifeYears || project.design_life_target || 25,
          backEmfV: project.back_emf_v ?? 2.0,
          structureResistanceOhm: project.structure_resistance_ohm ?? 0.055,
          acInputVoltageV: project.ac_input_voltage_v ?? 480,
          acInputPhase: project.ac_input_phase ?? 3,
          trEfficiencyPct: project.tr_efficiency_pct ?? 80,
          trPowerFactor: project.tr_power_factor ?? 0.8,
          cokeContingencyPct: project.coke_contingency_pct ?? 10,
          minRemotenessDistanceM: project.min_remoteness_distance_m ?? 20,
          actualRemotenessDistanceM: project.actual_remoteness_distance_m ?? 56,
          soilResistivityOhmCm: project.soil_resistivity_ohm_cm ?? project.stations?.[0]?.soilResistivityOhmCm ?? 361,
        }
      }

      return { success: true, project }
    } catch (e) {
      return { success: false, error: `Failed to parse file: ${e.message}` }
    }
  },

  exportProject(project) {
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
  },
}
