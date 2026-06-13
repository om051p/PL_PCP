import { useState, useMemo } from 'react'
import { useProjectStore } from '../store/projectStore.js'
import { useAuthStore } from '../store/authStore.js'
import {
  CheckRow,
  InsightCard,
  SectionCard,
  StandardBadge,
  InfoBox,
  WorkflowStepper,
} from '../components/ui.jsx'
import { ProtectionHeatMap, buildHeatMapMatrix } from '../visualizations/ProtectionHeatMap.jsx'
import { runStationCalculations } from '../engine/modules/calculations.js'

export function PageValidation() {
  const project = useProjectStore((s) => s.getProject())
  const user = useAuthStore((s) => s.user)
  const role = user?.role || 'engineer'
  const stations = project?.stations ?? []
  const calculateStation = useProjectStore((s) => s.calculateStation)
  const advanceWorkflow = useProjectStore((s) => s.advanceWorkflow)
  const createRevision = useProjectStore((s) => s.createRevision)

  const [activeTab, setActiveTab] = useState('all') // 'all', 'calculations', 'standards', 'issues', 'spatial'
  const [searchQuery, setSearchQuery] = useState('')
  const [unlockingStationId, setUnlockingStationId] = useState(null)
  const [unlockJustification, setUnlockJustification] = useState('')
  const [showUnlockModal, setShowUnlockModal] = useState(false)

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <StandardBadge project={project} />
      </div>
      <div className="validation-filter-container">
        <div className="validation-filter-tabs">
          <button
            className={`validation-filter-tab ${activeTab === 'all' ? 'validation-filter-tab--active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All Checks
          </button>
          <button
            className={`validation-filter-tab ${activeTab === 'calculations' ? 'validation-filter-tab--active' : ''}`}
            onClick={() => setActiveTab('calculations')}
          >
            Calculations
          </button>
          <button
            className={`validation-filter-tab ${activeTab === 'standards' ? 'validation-filter-tab--active' : ''}`}
            onClick={() => setActiveTab('standards')}
          >
            Standards Compliance
          </button>
          <button
            className={`validation-filter-tab ${activeTab === 'issues' ? 'validation-filter-tab--active' : ''}`}
            onClick={() => setActiveTab('issues')}
          >
            Warnings & Fails
          </button>
          <button
            className={`validation-filter-tab ${activeTab === 'spatial' ? 'validation-filter-tab--active' : ''}`}
            onClick={() => setActiveTab('spatial')}
          >
            Spatial View
          </button>
        </div>
        <input
          type="text"
          className="field-input validation-search-input"
          placeholder="Search rules (e.g. resistance)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {activeTab === 'spatial' ? (
        <SpatialView stations={stations} project={project} />
      ) : (
        <>
      {stations.map((st) => {
        const r = st.lastCalcResult
        const allPass = r?.allChecksPassed
        const failCount = r?.checks?.filter((c) => c.status === 'fail').length || 0
        const warnCount = r?.checks?.filter((c) => c.status === 'warning').length || 0

        const filteredChecks = (r?.checks || []).filter((check) => {
          // Tab filters
          if (activeTab === 'issues') {
            if (check.status !== 'fail' && check.status !== 'warning') return false
          } else if (activeTab === 'standards') {
            const labelLower = check.label.toLowerCase()
            const isStd = labelLower.includes('standard') || labelLower.includes('nace') || labelLower.includes('iso') || labelLower.includes('saes') || labelLower.includes('limit') || labelLower.includes('criteria')
            if (!isStd) return false
          } else if (activeTab === 'calculations') {
            const labelLower = check.label.toLowerCase()
            const isCalc = labelLower.includes('resistance') || labelLower.includes('adequacy') || labelLower.includes('current') || labelLower.includes('voltage') || labelLower.includes('life') || labelLower.includes('power')
            if (!isCalc) return false
          }

          // Search query filter
          if (searchQuery) {
            const query = searchQuery.toLowerCase()
            const matchesLabel = check.label.toLowerCase().includes(query)
            const matchesVal = check.computed?.toLowerCase().includes(query)
            return matchesLabel || matchesVal
          }

          return true
        })

        return (
          <div key={st.id} style={{ marginBottom: 24 }}>
            <div className="validation-header">
              <div>
                <div className="validation-station-name">{st.name}</div>
                <div className="validation-summary">
                  {!r
                    ? 'Not calculated'
                    : allPass
                      ? `✓ All checks pass`
                      : `${failCount} fail${failCount !== 1 ? 's' : ''}, ${warnCount} warning${warnCount !== 1 ? 's' : ''}`}
                </div>
              </div>
              <div className="validation-actions" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {st.status !== 'approved' && st.status !== 'issued_for_construction' && (
                  <button className="btn btn-sm" onClick={() => calculateStation(st.id)}>
                    Recalculate
                  </button>
                )}
                
                {/* Submit for Review */}
                {(st.status === 'draft' || st.status === 'input_complete' || st.status === 'calculated' || st.status === 'needs_recalculation') && 
                 (role === 'engineer' || role === 'manager' || role === 'admin') && (
                  <button className="btn btn-sm btn-outline" onClick={() => advanceWorkflow(st.id, 'engineering_review')}>
                    Submit for Review
                  </button>
                )}

                {/* Approve Design */}
                {(st.status === 'engineering_review' || (st.status !== 'approved' && st.status !== 'issued_for_construction' && allPass)) && 
                 (role === 'reviewer' || role === 'manager' || role === 'admin') && (
                  <button
                    className="btn btn-sm btn-primary"
                    disabled={!allPass || st.status === 'needs_recalculation'}
                    onClick={() => {
                      advanceWorkflow(st.id, 'approved', 'Design approved')
                      createRevision(`${st.name} Approved Snapshot`, user?.email || 'Approver')
                    }}
                    title={!allPass ? 'All validation checks must pass to approve' : ''}
                  >
                    Approve Design
                  </button>
                )}

                {/* Request Changes / Reject */}
                {st.status === 'engineering_review' && 
                 (role === 'reviewer' || role === 'manager' || role === 'admin') && (
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => {
                      const notes = window.prompt('Enter reason for requesting changes:')
                      if (notes !== null) {
                        advanceWorkflow(st.id, 'draft', notes || 'Changes requested')
                      }
                    }}
                  >
                    Request Changes
                  </button>
                )}

                {/* Issue for Construction */}
                {st.status === 'approved' && 
                 (role === 'manager' || role === 'admin') && (
                  <button
                    className="btn btn-sm btn-success"
                    onClick={() => {
                      advanceWorkflow(st.id, 'issued_for_construction', 'Issued for Construction')
                      createRevision(`${st.name} Issued for Construction Snapshot`, user?.email || 'Manager')
                    }}
                  >
                    Issue for Construction
                  </button>
                )}

                {/* Unlock Design for editing */}
                {(st.status === 'approved' || st.status === 'issued_for_construction') && 
                 (role === 'engineer' || role === 'manager' || role === 'admin') && (
                  <button
                    className="btn btn-sm btn-warning"
                    onClick={() => {
                      setUnlockingStationId(st.id)
                      setUnlockJustification('')
                      setShowUnlockModal(true)
                    }}
                  >
                    Unlock Design
                  </button>
                )}
              </div>
            </div>

            {!r && (
              <InfoBox type="info">
                Click Recalculate to run engineering checks for this station.
              </InfoBox>
            )}

            {r && (
              <>
                <WorkflowStepper currentStatus={st.status} />
                <div style={{ marginTop: 12 }}>
                  {filteredChecks.length > 0 ? (
                    filteredChecks.map((check) => (
                      <CheckRow key={check.id} check={check} />
                    ))
                  ) : (
                    <div className="no-result" style={{ padding: '16px 0', fontSize: 12.5 }}>
                      No matching validation rules found for the selected filter.
                    </div>
                  )}
                </div>
                {r.insights.length > 0 && activeTab === 'all' && (
                  <div style={{ marginTop: 12 }}>
                    <div className="section-label">Engineering Insights</div>
                    {r.insights.map((ins, i) => (
                      <InsightCard key={i} insight={ins} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      )}

      {/* Unlock Confirmation Dialog */}
      {showUnlockModal && (
        <div className="dialog-overlay" onClick={() => setShowUnlockModal(false)} style={{ zIndex: 100 }}>
          <div className="dialog" onClick={(e) => e.stopPropagation()} style={{ width: 400 }}>
            <h3 className="dialog-title">
              Unlock Design Calculations
            </h3>
            <p className="dialog-message" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Unlocking the design will revert its status back to <strong>Draft</strong> and allow parameter editing.
              This action requires a written justification which will be logged in the immutable project audit trail.
            </p>
            <div className="field" style={{ margin: '12px 0' }}>
              <label className="field-label" htmlFor="unlock-justification-input">Written Justification</label>
              <textarea
                id="unlock-justification-input"
                className="field-input"
                style={{ width: '100%', height: '80px', padding: '8px', fontSize: 13, resize: 'none' }}
                placeholder="Describe why calculations need to be reopened (e.g. Updated NACE resistivity surveys)..."
                value={unlockJustification}
                onChange={(e) => setUnlockJustification(e.target.value)}
              />
            </div>
            <div className="dialog-actions">
              <button className="btn" onClick={() => setShowUnlockModal(false)}>Cancel</button>
              <button
                className="btn btn-warning"
                disabled={!unlockJustification.trim()}
                onClick={() => {
                  advanceWorkflow(unlockingStationId, 'draft', unlockJustification.trim())
                  setShowUnlockModal(false)
                  setUnlockingStationId(null)
                }}
              >
                Confirm Unlock
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  )
}

/**
 * Spatial view: ProtectionHeatMap (stations × scenarios)
 * Evaluates each (station, scenario) pair and shows the pass ratio.
 */
function SpatialView({ stations, project }) {
  const scenarios = useMemo(() => [
    { id: 'existing', label: 'Existing', factor: 1.0 },
    { id: 'plus20', label: '+20%', factor: 1.2 },
    { id: 'minus20', label: '−20%', factor: 0.8 },
    { id: 'half', label: '½ anodes', factor: 0.5, anodes: true },
  ], [])

  const data = useMemo(() => {
    const stationsLite = stations.map((st) => ({ id: st.id, name: st.name || st.id }))
    if (stationsLite.length === 0) return { stations: [], scenarios, matrix: [] }

    const evaluate = (station, scenario) => {
      const s = stations.find((x) => x.id === station.id)
      if (!s) return 0
      try {
        let sc = { ...s }
        if (scenario.anodes && s.proposedAnodes) {
          sc.proposedAnodes = Math.max(1, Math.floor(s.proposedAnodes * scenario.factor))
        } else if (s.tr?.ratedCurrent) {
          sc = { ...s, tr: { ...s.tr, ratedCurrent: s.tr.ratedCurrent * scenario.factor } }
        }
        const r = runStationCalculations(sc, sc.designLifeYears || 25, null, project)
        if (!r) return 0
        // Pass ratio: 1.0 = all pass; 0.0 = critical failures
        const checks = r.checks || []
        if (checks.length === 0) return 0
        const failed = checks.filter((c) => c.status === 'fail').length
        return Math.max(0, 1 - failed / checks.length)
      } catch {
        return 0
      }
    }

    return buildHeatMapMatrix(stationsLite, scenarios, evaluate)
  }, [stations, project, scenarios])

  return (
    <SectionCard
      title="Protection Heat Map"
      sub="Stations × Scenarios — each cell shows the pass ratio (1.0 = all checks pass)"
    >
      <ProtectionHeatMap data={data} threshold={{ pass: 1.0, warn: 0.7 }} height={320} />
    </SectionCard>
  )
}

