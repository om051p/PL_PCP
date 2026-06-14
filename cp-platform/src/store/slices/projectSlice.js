import { newId } from '../../utils/id.js'
import { makeDefaultProject } from '../factories.js'
import { useAuthStore } from '../authStore.js'

export function logActivityHelper(proj, action, moduleName, details) {
  if (!proj) return
  if (!proj.activityLog) proj.activityLog = []
  
  const user = useAuthStore.getState().user
  const userEmail = user?.email || user?.displayName || 'Engineer'
  
  proj.activityLog.push({
    id: newId(),
    timestamp: new Date().toISOString(),
    user: userEmail,
    action,
    module: moduleName,
    details,
  })
}

export const createProjectSlice = (set, get) => ({
  projects: [], // Will be seeded at root initialization
  activeProjectId: null,
  activeWorkspace: null,

  getProject: () => {
    const { projects, activeProjectId } = get()
    return projects.find((p) => p.id === activeProjectId) || projects[0]
  },

  logActivity: (action, moduleName, details) =>
    set((state) => {
      const proj = state.projects.find((p) => p.id === state.activeProjectId)
      if (!proj) return
      logActivityHelper(proj, action, moduleName, details)
      proj.updatedAt = new Date().toISOString()
    }),

  importProject: (project) =>
    set((state) => {
      state.projects.push(project)
      state.activeProjectId = project.id
      state.activeStationId = project.stations[0]?.id || null
      state.attenuationInput = null
      state.attenuationResult = null
      state.attenuationDirty = false
    }),

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

  duplicateProject: (projectId) =>
    set((state) => {
      const source = state.projects.find((p) => p.id === projectId)
      if (!source) return
      const now = new Date().toISOString()
      const duplicate = JSON.parse(JSON.stringify(source))
      duplicate.id = newId()
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
        st.id = newId()
        st.lastCalcResult = null
        st.insights = []
        st.alternatives = []
      })
      state.projects.push(duplicate)
      state.activeProjectId = duplicate.id
      state.activeStationId = duplicate.stations[0]?.id || null
      logActivityHelper(duplicate, 'Project Duplicated', 'Workspace', `Duplicated from project ${source.projectNumber}`)
    }),

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

  unarchiveProject: (projectId) =>
    set((state) => {
      const proj = state.projects.find((p) => p.id === projectId)
      if (!proj) return
      proj.archived = false
      proj.updatedAt = new Date().toISOString()
    }),

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

  updateProject: (fields) =>
    set((state) => {
      const proj = state.projects.find((p) => p.id === state.activeProjectId)
      if (!proj) return
      Object.assign(proj, fields)
      proj.updatedAt = new Date().toISOString()
      logActivityHelper(proj, 'Project Modified', 'Workspace', `Updated fields: ${Object.keys(fields).join(', ')}`)
    }),
})
