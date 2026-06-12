import { useState, useEffect, useMemo } from 'react'
import { useProjectStore } from '../store/projectStore.js'
import { X, ArrowRight, GitCompare, RefreshCw } from 'lucide-react'

export function RevisionCompareDialog({ isOpen, onClose }) {
  const project = useProjectStore((s) => s.getProject())
  const restoreRevision = useProjectStore((s) => s.restoreRevision)

  const [revIdA, setRevIdA] = useState('')
  const [revIdB, setRevIdB] = useState('')

  const revisions = project?.revisions || []

  // Reset/Set initial selections on open. The state updates are deferred via
  // queueMicrotask to avoid synchronous setState-in-effect cascading renders.
  useEffect(() => {
    if (isOpen && revisions.length > 0) {
      queueMicrotask(() => {
        if (revisions.length >= 2) {
          setRevIdA(revisions[revisions.length - 2].id)
          setRevIdB(revisions[revisions.length - 1].id)
        } else {
          setRevIdA(revisions[0].id)
          setRevIdB('current')
        }
      })
    }
  }, [isOpen, revisions])

  // Compute comparison when selections change (pure derivation)
  const diffResult = useMemo(() => {
    if (!project) return null
    if (!revIdA || !revIdB) return null

    const rA = revIdA === 'current' ? null : revisions.find((x) => x.id === revIdA)
    const snapA = rA ? rA.snapshot : project
    const nameA = rA ? rA.revNumber || 'Revision A' : 'Current Design'

    const rB = revIdB === 'current' ? null : revisions.find((x) => x.id === revIdB)
    const snapB = rB ? rB.snapshot : project
    const nameB = rB ? rB.revNumber || 'Revision B' : 'Current Design'

    if (!snapA || !snapB) return null

    const diffs = {
      nameA,
      nameB,
      basis: [],
      stations: [],
    }

    const basisA = snapA.designBasis || {}
    const basisB = snapB.designBasis || {}
    const allBasisKeys = Array.from(new Set([...Object.keys(basisA), ...Object.keys(basisB)]))

    const basisLabels = {
      designStandard: 'Design Standard',
      systemDesignLifeYears: 'System Design Life (years)',
      backEmfV: 'Back EMF (V)',
      structureResistanceOhm: 'Structure Resistance (Ω)',
      acInputVoltageV: 'AC Input Voltage (V)',
      acInputPhase: 'AC Input Phase',
      trEfficiencyPct: 'TR Efficiency (%)',
      trPowerFactor: 'TR Power Factor',
      cokeContingencyPct: 'Coke Contingency (%)',
      minRemotenessDistanceM: 'Min Remoteness Distance (m)',
      actualRemotenessDistanceM: 'Actual Remoteness Distance (m)',
      soilResistivityOhmCm: 'Soil Resistivity (Ω-cm)',
    }

    allBasisKeys.forEach((key) => {
      if (basisA[key] !== basisB[key]) {
        diffs.basis.push({
          param: basisLabels[key] || key,
          valA: basisA[key] ?? '—',
          valB: basisB[key] ?? '—',
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
          changes: [],
        })
        return
      }

      const changes = []
      if (stA.soilResistivityOhmCm !== stB.soilResistivityOhmCm) {
        changes.push({ param: 'Soil Resistivity (Ω-cm)', valA: stA.soilResistivityOhmCm, valB: stB.soilResistivityOhmCm })
      }
      if (stA.proposedAnodes !== stB.proposedAnodes) {
        changes.push({ param: 'Proposed Anodes', valA: stA.proposedAnodes, valB: stB.proposedAnodes })
      }
      if (stA.tr?.ratedVoltage !== stB.tr?.ratedVoltage) {
        changes.push({ param: 'TR Rated Voltage (V)', valA: stA.tr?.ratedVoltage, valB: stB.tr?.ratedVoltage })
      }
      if (stA.tr?.ratedCurrent !== stB.tr?.ratedCurrent) {
        changes.push({ param: 'TR Rated Current (A)', valA: stA.tr?.ratedCurrent, valB: stB.tr?.ratedCurrent })
      }

      const segsA = stA.pipelineSegments || []
      const segsB = stB.pipelineSegments || []
      const maxSegs = Math.max(segsA.length, segsB.length)

      for (let i = 0; i < maxSegs; i++) {
        const segA = segsA[i]
        const segB = segsB[i]

        if (segA && !segB) {
          changes.push({ param: `Segment ${i + 1}`, valA: segA.name, valB: 'Deleted' })
        } else if (!segA && segB) {
          changes.push({ param: `Segment ${i + 1}`, valA: 'Created', valB: segB.name })
        } else if (segA && segB) {
          if (segA.lengthM !== segB.lengthM) {
            changes.push({ param: `Seg ${i + 1} Length (m)`, valA: segA.lengthM, valB: segB.lengthM })
          }
          if (segA.od !== segB.od) {
            changes.push({ param: `Seg ${i + 1} OD (in)`, valA: segA.od, valB: segB.od })
          }
          if (segA.currentDensityBase !== segB.currentDensityBase) {
            changes.push({ param: `Seg ${i + 1} CD Base (mA/m²)`, valA: segA.currentDensityBase, valB: segB.currentDensityBase })
          }
        }
      }

      if (changes.length > 0) {
        diffs.stations.push({
          name: stA.name,
          status: 'modified',
          changes,
        })
      }
    })

    stationsB.forEach((stB) => {
      const stA = stationsA.find((s) => s.name === stB.name)
      if (!stA) {
        diffs.stations.push({
          name: stB.name,
          status: 'created',
          changes: [],
        })
      }
    })

    return diffs
  }, [revIdA, revIdB, project, revisions])

  if (!isOpen) return null

  const handleRestore = (id) => {
    if (window.confirm(`Are you sure you want to restore the design state to this revision? This will overwrite the current live values.`)) {
      restoreRevision(id)
      onClose()
    }
  }

  return (
    <div className="dialog-overlay" onClick={onClose} style={{ zIndex: 100 }}>
      <div
        className="dialog"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(90vw, 850px)',
          maxWidth: '100%',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '85vh',
          padding: 24,
        }}
      >
        <div className="dialog-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 className="dialog-title" style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
            <GitCompare size={18} color="var(--primary)" />
            Revision Side-by-Side Comparison
          </h3>
          <button className="btn-icon-ghost" onClick={onClose} aria-label="Close dialog">
            <X size={16} />
          </button>
        </div>

        {/* Selection selectors */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div>
            <label className="field-label" htmlFor="compare-rev-a">Source State (A)</label>
            <select
              id="compare-rev-a"
              className="field-input"
              value={revIdA}
              onChange={(e) => setRevIdA(e.target.value)}
            >
              <option value="current">Current Live Design</option>
              {revisions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.revNumber} ({new Date(r.createdAt).toLocaleDateString()}) - {r.description.slice(0, 30)}
                </option>
              ))}
            </select>
            {revIdA !== 'current' && (
              <button
                className="btn btn-sm btn-link"
                onClick={() => handleRestore(revIdA)}
                style={{ marginTop: 6, fontSize: 11, padding: 0 }}
              >
                <RefreshCw size={10} style={{ marginRight: 4 }} /> Restore state A
              </button>
            )}
          </div>

          <div style={{ paddingSelf: 'center', paddingTop: 16 }}>
            <ArrowRight size={16} style={{ color: 'var(--text-tertiary)' }} />
          </div>

          <div>
            <label className="field-label" htmlFor="compare-rev-b">Target State (B)</label>
            <select
              id="compare-rev-b"
              className="field-input"
              value={revIdB}
              onChange={(e) => setRevIdB(e.target.value)}
            >
              <option value="current">Current Live Design</option>
              {revisions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.revNumber} ({new Date(r.createdAt).toLocaleDateString()}) - {r.description.slice(0, 30)}
                </option>
              ))}
            </select>
            {revIdB !== 'current' && (
              <button
                className="btn btn-sm btn-link"
                onClick={() => handleRestore(revIdB)}
                style={{ marginTop: 6, fontSize: 11, padding: 0 }}
              >
                <RefreshCw size={10} style={{ marginRight: 4 }} /> Restore state B
              </button>
            )}
          </div>
        </div>

        {/* Diff Result List */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: 4, minHeight: 250 }}>
          {diffResult ? (
            <>
              {/* Design Basis Diffs */}
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Design Basis Constants
                </h4>
                {diffResult.basis.length > 0 ? (
                  <div className="bom-table">
                    <div className="bom-row bom-header" style={{ gridTemplateColumns: '2fr 1fr 1fr' }}>
                      <div>Parameter</div>
                      <div>{diffResult.nameA}</div>
                      <div>{diffResult.nameB}</div>
                    </div>
                    {diffResult.basis.map((item, idx) => (
                      <div key={idx} className="bom-row" style={{ gridTemplateColumns: '2fr 1fr 1fr', fontSize: 12 }}>
                        <div style={{ fontWeight: 500 }}>{item.param}</div>
                        <div style={{ color: 'var(--text-secondary)' }}>{item.valA}</div>
                        <div style={{ fontWeight: 600, color: 'var(--primary)' }}>{item.valB}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', padding: '8px 12px', background: 'var(--surface-hover)', borderRadius: 6 }}>
                    No changes in design basis constants.
                  </div>
                )}
              </div>

              {/* Station Diffs */}
              <div>
                <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Station & Segment Geometry
                </h4>
                {diffResult.stations.length > 0 ? (
                  diffResult.stations.map((st, sIdx) => (
                    <div key={sIdx} style={{ marginBottom: 16, border: '1px solid var(--border)', borderRadius: 6, padding: 12, background: 'var(--surface)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{st.name}</span>
                        <span className={`tag tag--${st.status === 'deleted' ? 'fail' : st.status === 'created' ? 'pass' : 'warn'}`}>
                          {st.status.toUpperCase()}
                        </span>
                      </div>
                      
                      {st.status === 'modified' && st.changes.length > 0 && (
                        <div className="bom-table" style={{ marginTop: 8 }}>
                          <div className="bom-row bom-header" style={{ gridTemplateColumns: '2fr 1fr 1fr', padding: '6px 8px' }}>
                            <div>Parameter</div>
                            <div>{diffResult.nameA}</div>
                            <div>{diffResult.nameB}</div>
                          </div>
                          {st.changes.map((item, idx) => (
                            <div key={idx} className="bom-row" style={{ gridTemplateColumns: '2fr 1fr 1fr', fontSize: 12, padding: '8px' }}>
                              <div>{item.param}</div>
                              <div style={{ color: 'var(--text-tertiary)' }}>{item.valA}</div>
                              <div style={{ fontWeight: 600, color: 'var(--primary)' }}>{item.valB}</div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {st.status === 'deleted' && (
                        <div style={{ fontSize: 12, color: 'var(--fail)' }}>
                          This station exists in {diffResult.nameA} but was removed in {diffResult.nameB}.
                        </div>
                      )}

                      {st.status === 'created' && (
                        <div style={{ fontSize: 12, color: 'var(--pass)' }}>
                          This station was added in {diffResult.nameB}.
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', padding: '8px 12px', background: 'var(--surface-hover)', borderRadius: 6 }}>
                    No changes in station parameters or segment geometry.
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-tertiary)' }}>
              <span>Please select two design states to compare.</span>
            </div>
          )}
        </div>

        <div className="dialog-actions" style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 16 }}>
          <button className="btn" onClick={onClose} style={{ marginLeft: 'auto' }}>Close</button>
        </div>
      </div>
    </div>
  )
}
