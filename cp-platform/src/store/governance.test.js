import { describe, it, expect, vi, beforeEach } from 'vitest'

let uuidCounter = 0
vi.mock('uuid', () => ({
  v4: vi.fn(() => {
    uuidCounter++
    return `mock-uuid-${String(uuidCounter).padStart(4, '0')}`
  }),
}))

const mockCalcResult = {
  totalSurfaceAreaM2: 1100,
  requiredCurrentA: 0.2,
  designCurrentA: 0.26,
  groundbedResistanceOhm: 0.1,
  activeLengthM: 30,
  totalDrillDepthM: 50,
  anodeTailParallelResOhm: 0.007,
  posMainCableResOhm: 0.11,
  totalCableResOhm: 0.25,
  totalCircuitResistanceOhm: 0.5,
  minTRVoltage: 15,
  designLifeYears: 25,
  targetDesignLifeYears: 25,
  perSegmentCurrents: [],
}

vi.mock('../engine/modules/calculations.js', () => ({
  runStationCalculations: vi.fn(() => ({ ...mockCalcResult })),
}))

vi.mock('../engine/rules/rulesEngine.js', () => ({
  runRules: vi.fn(() => ({
    checks: [{ id: 'BR-001', status: 'pass' }],
    insights: [],
    allPassed: true,
  })),
}))

vi.mock('../engine/optimizer/optimizer.js', () => ({
  generateAlternatives: vi.fn(() => []),
}))

vi.mock('../engine/rules/bomEngine.js', () => ({
  generateBOM: vi.fn(() => []),
}))

const { useProjectStore, makeDefaultProject } = await import('./projectStore.js')

describe('Governance Store Operations', () => {
  beforeEach(() => {
    uuidCounter = 0
    const storeData = {}
    const mockStorage = {
      getItem: vi.fn((key) => storeData[key] ?? null),
      setItem: vi.fn((key, value) => {
        storeData[key] = value
      }),
      removeItem: vi.fn((key) => {
        delete storeData[key]
      }),
    }
    vi.stubGlobal('localStorage', mockStorage)
    
    const defaultProj = makeDefaultProject()
    useProjectStore.setState({
      projects: [defaultProj],
      activeProjectId: defaultProj.id,
      activeStationId: defaultProj.stations[0].id,
      ui: { sidebarCollapsed: false, theme: 'dark' },
    })
  })

  describe('advanceWorkflow transitions', () => {
    it('advances status from draft to engineering_review', () => {
      const store = useProjectStore.getState()
      const stationId = store.getProject().stations[0].id
      
      store.advanceWorkflow(stationId, 'engineering_review', 'Ready for specialist check')
      
      const updatedStation = useProjectStore.getState().getProject().stations[0]
      expect(updatedStation.status).toBe('engineering_review')
      expect(updatedStation.statusNotes).toBe('Ready for specialist check')
      
      // Verify activity log entry
      const log = useProjectStore.getState().getProject().activityLog
      expect(log.length).toBeGreaterThan(0)
      const lastLog = log[log.length - 1]
      expect(lastLog.action).toBe('Submitted for Review')
      expect(lastLog.details).toContain('engineering review')
    })

    it('advances status from review to approved', () => {
      const store = useProjectStore.getState()
      const stationId = store.getProject().stations[0].id
      
      store.advanceWorkflow(stationId, 'approved', 'Meets NACE standard')
      
      const updatedStation = useProjectStore.getState().getProject().stations[0]
      expect(updatedStation.status).toBe('approved')
      expect(updatedStation.statusNotes).toBe('Meets NACE standard')
      
      // Verify activity log entry
      const log = useProjectStore.getState().getProject().activityLog
      expect(log.length).toBeGreaterThan(0)
      const lastLog = log[log.length - 1]
      expect(lastLog.action).toBe('Design Approved')
    })

    it('advances status from approved to issued_for_construction', () => {
      const store = useProjectStore.getState()
      const stationId = store.getProject().stations[0].id
      
      store.advanceWorkflow(stationId, 'issued_for_construction', 'Issued for construction approval')
      
      const updatedStation = useProjectStore.getState().getProject().stations[0]
      expect(updatedStation.status).toBe('issued_for_construction')
      
      // Verify activity log entry
      const log = useProjectStore.getState().getProject().activityLog
      expect(log.length).toBeGreaterThan(0)
      const lastLog = log[log.length - 1]
      expect(lastLog.action).toBe('Design Issued')
    })
  })

  describe('Revision snapshot comparisons and restoration', () => {
    it('creates a revision and preserves data state upon restore', () => {
      const store = useProjectStore.getState()
      
      // Create initial snapshot
      store.createRevision('Baseline Design', 'engineer@company.com')
      
      // Modify a design basis value
      store.updateDesignBasis({ backEmfV: 3.5 })
      expect(useProjectStore.getState().getProject().designBasis.backEmfV).toBe(3.5)
      
      // Restore to baseline
      const baselineRevId = useProjectStore.getState().getProject().revisions[0].id
      store.restoreRevision(baselineRevId)
      
      // Verify value is restored
      expect(useProjectStore.getState().getProject().designBasis.backEmfV).toBe(2.0)
      
      // Verify revision lists and logs are NOT deleted upon restoration
      expect(useProjectStore.getState().getProject().revisions).toHaveLength(1)
      
      const logs = useProjectStore.getState().getProject().activityLog
      expect(logs).toHaveLength(3) // 1. Revision Created, 2. Design Basis Modified, 3. Revision Restored
      expect(logs[logs.length - 1].action).toBe('Revision Restored')
    })

    it('compares two revisions and returns differences', () => {
      const store = useProjectStore.getState()
      
      // Setup state 1
      store.updateDesignBasis({ backEmfV: 2.0 })
      store.createRevision('Rev 1', 'designer@co.com')
      const rev1Id = useProjectStore.getState().getProject().revisions[0].id
      
      // Setup state 2
      store.updateDesignBasis({ backEmfV: 3.0 })
      store.createRevision('Rev 2', 'designer@co.com')
      const rev2Id = useProjectStore.getState().getProject().revisions[1].id
      
      // Run comparison
      const diff = store.compareRevisions(rev1Id, rev2Id)
      expect(diff).not.toBeNull()
      expect(diff.basis).toHaveLength(1)
      expect(diff.basis[0].param).toBe('backEmfV')
      expect(diff.basis[0].valA).toBe(2.0)
      expect(diff.basis[0].valB).toBe(3.0)
    })
  })
})
