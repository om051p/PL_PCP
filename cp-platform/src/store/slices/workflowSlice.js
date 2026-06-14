import { newId } from '../../utils/id.js'
import { useAuthStore } from '../authStore.js'
import { logActivityHelper } from './projectSlice.js'

export const createWorkflowSlice = (set, get) => ({
  advanceWorkflow: (stationId, newStatus, notes = '') => {
    // Capture context for the toast notification (outside set())
    const state = get()
    const proj = state.projects.find((p) => p.id === state.activeProjectId)
    const station = proj?.stations.find((s) => s.id === stationId)
    const oldStatus = station?.status
    set((state) => {
      const proj2 = state.projects.find((p) => p.id === state.activeProjectId)
      if (!proj2) return
      const stn = proj2.stations.find((s) => s.id === stationId)
      if (!stn) return
      stn.status = newStatus
      stn.statusNotes = notes
      stn.statusUpdatedAt = new Date().toISOString()
      proj2.updatedAt = new Date().toISOString()

      let actionLabel = 'Workflow Changed'
      if (newStatus === 'approved') actionLabel = 'Design Approved'
      else if (newStatus === 'issued_for_construction') actionLabel = 'Design Issued'
      else if (newStatus === 'engineering_review') actionLabel = 'Submitted for Review'
      else if (oldStatus === 'approved' || oldStatus === 'issued_for_construction') actionLabel = 'Design Unlocked'

      logActivityHelper(proj2, actionLabel, 'Validation', `Status changed for station ${stn.name} from ${oldStatus.replace(/_/g, ' ')} to ${newStatus.replace(/_/g, ' ')}${notes ? ' (Notes/Justification: ' + notes + ')' : ''}`)
    })

    // Emit toast notification (post-set, outside immer)
    if (station) {
      try {
        const user = useAuthStore.getState().user
        if (typeof window !== 'undefined' && window.__raxaToast) {
          const t = window.__raxaToast
          if (newStatus === 'approved') {
            t.success('Design approved', `${station.name} is now ready for construction`)
          } else if (newStatus === 'issued_for_construction') {
            t.success('Design issued', `${station.name} has been issued for construction`)
          } else if (newStatus === 'engineering_review') {
            t.info('Submitted for review', `${station.name} is now in engineering review`)
          } else if (newStatus === 'rejected') {
            t.warning('Design rejected', `${station.name} was rejected${notes ? ` — ${notes}` : ''}`)
          } else if (oldStatus === 'approved' || oldStatus === 'issued_for_construction') {
            t.warning('Design unlocked', `${station.name} was re-opened for editing`)
          } else {
            t.info('Status updated', `${station.name}: ${oldStatus} → ${newStatus}`)
          }
        }
      } catch (_) { /* toast not available — graceful */ }
    }
  },

  createRevision: (description, createdBy = 'Engineer') =>
    set((state) => {
      const proj = state.projects.find((p) => p.id === state.activeProjectId)
      if (!proj) return
      const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
      const revNum = `Revision ${letters[proj.revisions.length] || String(proj.revisions.length)}`
      const revision = {
        id: newId(),
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
      const valA = basisA[key]
      const valB = basisB[key]
      const isDiff = typeof valA === 'object' && valA !== null && typeof valB === 'object' && valB !== null
        ? JSON.stringify(valA) !== JSON.stringify(valB)
        : valA !== valB
      if (isDiff) {
        diffs.basis.push({
          param: key,
          valA,
          valB,
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
})
