import { v4 as uuid } from 'uuid'
import { localStorageApi } from '../api/localStorageApi.js'

const EXPORT_VERSION = 1
const STORAGE_KEY = 'cp-platform-project'

/** Validate that an imported object has the minimum required project fields */
function validateImportedProject(data) {
  if (!data || typeof data !== 'object') return { valid: false, error: 'Invalid file format' }
  if (!data.projectNumber || typeof data.projectNumber !== 'string')
    return { valid: false, error: 'Missing or invalid project number' }
  if (!Array.isArray(data.stations))
    return { valid: false, error: 'Missing or invalid stations array' }
  return { valid: true }
}

export const projectRepository = {
  /**
   * Load projects and execute version migration.
   * @param {function} makeDefaultProject - Default project factory fallback
   * @returns {object} Loaded projects state
   */
  loadProjects(makeDefaultProject) {
    const raw = localStorageApi.getJSON(STORAGE_KEY)
    if (!raw) {
      const fresh = makeDefaultProject()
      return {
        projects: [fresh],
        activeProjectId: fresh.id,
        activeStationId: fresh.stations[0]?.id || null,
        activeWorkspace: null,
      }
    }
    return raw
  },

  /**
   * Save active project fields to persistence.
   * @param {object} state - Zustand state to persist
   */
  saveProjects(state) {
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

  /**
   * Export a single project as a JSON download.
   * @param {object} project - The project object to export
   */
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

  /**
   * Parse and validate imported project file contents
   * @param {string} fileContent
   * @returns {{ success: boolean, project?: object, error?: string }}
   */
  parseImportedFile(fileContent) {
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

      // Migrate imported project designBasis if needed
      if (!project.designBasis) {
        project.designBasis = {
          designStandard: project.designStandard || 'saudiAramco',
          systemDesignLifeYears: project.systemDesignLifeYears !== undefined ? project.systemDesignLifeYears : (project.design_life_target || 25),
          backEmfV: project.back_emf_v !== undefined ? project.back_emf_v : 2.0,
          structureResistanceOhm: project.structure_resistance_ohm !== undefined ? project.structure_resistance_ohm : 0.055,
          acInputVoltageV: project.ac_input_voltage_v !== undefined ? project.ac_input_voltage_v : 480,
          acInputPhase: project.ac_input_phase !== undefined ? project.ac_input_phase : 3,
          trEfficiencyPct: project.tr_efficiency_pct !== undefined ? project.tr_efficiency_pct : 80,
          trPowerFactor: project.tr_power_factor !== undefined ? project.tr_power_factor : 0.8,
          cokeContingencyPct: project.coke_contingency_pct !== undefined ? project.coke_contingency_pct : 10,
          minRemotenessDistanceM: project.min_remoteness_distance_m !== undefined ? project.min_remoteness_distance_m : 20,
          actualRemotenessDistanceM: project.actual_remoteness_distance_m !== undefined ? project.actual_remoteness_distance_m : 56,
          soilResistivityOhmCm: project.soil_resistivity_ohm_cm !== undefined ? project.soil_resistivity_ohm_cm : (project.stations?.[0]?.soilResistivityOhmCm || 361),
        }
      }

      return { success: true, project }
    } catch (e) {
      return { success: false, error: `Failed to parse file: ${e.message}` }
    }
  },
}
