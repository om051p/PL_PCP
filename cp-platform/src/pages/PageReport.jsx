/**
 * PageReport.jsx
 *
 * Consolidated engineering design summary with PDF/Excel export and revision management.
 */

import { useState } from 'react'
import { useProjectStore } from '../store/projectStore.js'
import {
  ResultRow,
  SectionCard,
  StandardBadge,
  InfoBox,
  Grid3,
} from '../components/ui.jsx'
import { FileText, Download, FileSpreadsheet, Layers, GitCompare } from 'lucide-react'
import { RevisionCompareDialog } from '../components/RevisionCompareDialog.jsx'

export function PageReport() {
  const project = useProjectStore((s) => s.getProject())
  const activeWorkspace = useProjectStore((s) => s.activeWorkspace)
  const stations = project?.stations ?? []
  const createRevision = useProjectStore((s) => s.createRevision)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [xlsxLoading, setXlsxLoading] = useState(false)
  const [revDesc, setRevDesc] = useState('')
  const [compareOpen, setCompareOpen] = useState(false)
  const tank = project?.tank
  const vessel = project?.vessel
  const tankCalculated = tank ? (tank.lastCalcResult && tank.status !== 'needs_recalculation') : true
  const vesselCalculated = vessel ? (vessel.lastCalcResult && vessel.status !== 'needs_recalculation') : true
  const pipelineCalculated = stations.every((s) => s.lastCalcResult && s.status !== 'needs_recalculation')
  const allCalculated =
    activeWorkspace === 'pipeline' ? pipelineCalculated :
    activeWorkspace === 'tank' ? tankCalculated :
    activeWorkspace === 'vessel' ? vesselCalculated :
    (pipelineCalculated && tankCalculated && vesselCalculated)
  const hasMismatch = project?.hasCalculationsMismatch

  async function handlePDF() {
    setPdfLoading(true)
    try {
      const { downloadEngineeringReport } = await import('../reporting/pdfGenerator.js')
      downloadEngineeringReport(project)
    } finally {
      setTimeout(() => setPdfLoading(false), 1000)
    }
  }

  async function handleExcel() {
    setXlsxLoading(true)
    try {
      const { exportToExcel } = await import('../reporting/excelEngine.js')
      exportToExcel(project)
    } finally {
      setTimeout(() => setXlsxLoading(false), 800)
    }
  }

  return (
    <div className="page">
      <div style={{ marginBottom: 12 }}>
        <StandardBadge project={project} />
      </div>
      {/* Export Actions */}
      <div className="export-bar">
        <div className="export-bar-title">Export Engineering Documents</div>
        <div className="export-bar-actions">
          <button
            className={'btn btn-primary ' + (pdfLoading ? 'btn--loading' : '')}
            onClick={handlePDF}
            disabled={pdfLoading || !allCalculated || hasMismatch}
            title={
              hasMismatch
                ? 'Central settings out of sync. Please recalculate.'
                : !allCalculated
                  ? 'Calculate all modules first'
                  : 'Download PDF engineering report'
            }
          >
            <Download size={14} />
            {pdfLoading ? 'Generating PDF…' : 'Download PDF Report'}
          </button>
          <button
            className={'btn ' + (xlsxLoading ? 'btn--loading' : '')}
            onClick={handleExcel}
            disabled={xlsxLoading || hasMismatch}
            title={hasMismatch ? 'Central settings out of sync. Please recalculate.' : 'Export to Excel'}
          >
            <FileSpreadsheet size={14} />
            {xlsxLoading ? 'Exporting…' : 'Export to Excel'}
          </button>
        </div>
        {hasMismatch && (
          <div style={{ fontSize: 11, color: 'var(--warn, #eab308)', marginTop: 6 }}>
            ⚠ Central settings are out of sync. Please recalculate all modules to enable exports.
          </div>
        )}
        {!hasMismatch && !allCalculated && (
          <div style={{ fontSize: 11, color: 'var(--warn)', marginTop: 6 }}>
            ⚠ PDF export requires all active workspace calculations (Pipeline, Tank, Vessel) to be completed first.
          </div>
        )}
      </div>

      {/* Saudi Aramco Engineering Title Block */}
      <div className="section-card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border)', marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1.2fr', borderBottom: '1px solid var(--border)' }}>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', borderRight: '1px solid var(--border)', background: 'var(--surface-hover)' }}>
            <span style={{ fontSize: 10, letterSpacing: '0.1em', color: 'var(--text-tertiary)' }}>CLIENT</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', textAlign: 'center', marginTop: 4 }}>
              {project.clientName.toUpperCase()}
            </span>
          </div>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'center', borderRight: '1px solid var(--border)' }}>
            <span style={{ fontSize: 10, letterSpacing: '0.1em', color: 'var(--text-tertiary)' }}>DOCUMENT TITLE</span>
            <h2 style={{ fontSize: 15, fontWeight: 750, color: 'var(--text-primary)', margin: '4px 0 0 0' }}>
              PERMANENT CATHODIC PROTECTION DESIGN
            </h2>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              {project.projectName}
            </span>
          </div>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'center', fontSize: 11, gap: 4 }}>
            <div><strong>PROJECT NO:</strong> <span style={{ fontFamily: 'var(--font-mono)' }}>{project.projectNumber}</span></div>
            <div><strong>REVISION:</strong> <span className="tag" style={{ marginLeft: 4 }}>{project.currentRevision || 'A'}</span></div>
            <div><strong>DATE:</strong> {new Date(project.updatedAt || project.createdAt).toLocaleDateString()}</div>
            <div><strong>STATUS:</strong> {(project.status || 'DRAFT').toUpperCase()}</div>
          </div>
        </div>
      </div>

      {stations.map((st) => {
        const r = st.lastCalcResult
        const allPass = r?.allChecksPassed
        return (
          <SectionCard key={st.id} title={st.name} icon={Layers}>
            <div className="report-status-badge">
              <span className={allPass ? 'badge-pass' : 'badge-review'}>
                {!r ? 'NOT CALCULATED' : allPass ? 'ALL CHECKS PASS' : 'REVIEW NEEDED'}
              </span>
            </div>
            {r ? (
              <Grid3>
                <div>
                  <div className="section-label">Pipeline</div>
                  <ResultRow
                    label="Total Length"
                    value={st.pipelineSegments.reduce((acc, s) => acc + s.lengthM, 0).toFixed(0)}
                    unit="m"
                  />
                  {st.pipelineSegments.length > 1 && (
                    <ResultRow label="Segments" value={st.pipelineSegments.length.toString()} />
                  )}
                  <ResultRow
                    label="Surface Area"
                    value={r.totalSurfaceAreaM2.toFixed(2)}
                    unit="m²"
                  />
                </div>
                <div>
                  <div className="section-label">TR Unit</div>
                  <ResultRow
                    label="Rating"
                    value={`${st.tr.ratedVoltage}V / ${st.tr.ratedCurrent}A DC`}
                  />
                  <ResultRow
                    label="Min Voltage Required"
                    value={r.minTRVoltage.toFixed(2)}
                    unit="V"
                  />
                  <ResultRow
                    label="Total Circuit R"
                    value={r.totalCircuitResistanceOhm.toFixed(4)}
                    unit="Ω"
                  />
                  <ResultRow
                    label="AC Input"
                    value={`${r.acInputCurrentA.toFixed(2)}A @ 480V/3Φ`}
                  />
                </div>
                <div>
                  <div className="section-label">Groundbed</div>
                  <ResultRow
                    label="Type"
                    value={st.groundbed.type === 'deepwell' ? 'Deepwell' : 'Shallow Vertical'}
                  />
                  <ResultRow label="Anodes" value={`${st.proposedAnodes} ea.`} />
                  <ResultRow
                    label="Resistance R_G"
                    value={r.groundbedResistanceOhm.toFixed(4)}
                    unit="Ω"
                  />
                  <ResultRow
                    label="Design Life"
                    value={r.designLifeYears.toFixed(1)}
                    unit="years"
                  />
                </div>
              </Grid3>
            ) : (
              <div className="no-result">Station not calculated</div>
            )}
          </SectionCard>
        )
      })}

      {/* Create Revision */}
      <SectionCard title="Create Revision Snapshot" icon={FileText}>
        <InfoBox type="info">
          Creating a revision saves a permanent snapshot of the current design state.
        </InfoBox>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <input
            id="revision-description"
            className="field-input"
            placeholder="Revision description (e.g. Updated soil resistivity)"
            value={revDesc}
            onChange={(e) => setRevDesc(e.target.value)}
            aria-label="Revision description"
            style={{ flex: 1 }}
          />
          <button
            className="btn btn-primary"
            onClick={() => {
              createRevision(revDesc.trim() || `Manual revision ${project.revisions.length}`)
              setRevDesc('')
            }}
          >
            Create REV-{project.revisions.length}
          </button>
        </div>
      </SectionCard>

      <SectionCard
        title="Document Control & Revision History"
        icon={FileText}
        action={
          <button className="btn btn-sm" onClick={() => setCompareOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 4 }} disabled={project.revisions.length < 1}>
            <GitCompare size={12} />
            <span>Compare Revisions</span>
          </button>
        }
      >
        <div className="bom-table">
          <div className="bom-row bom-header" style={{ gridTemplateColumns: '60px 100px 2fr 1.2fr 1.2fr' }}>
            <div>Rev</div>
            <div>Date</div>
            <div>Description of Change</div>
            <div>Prepared By</div>
            <div>Status</div>
          </div>
          {project.revisions.length > 0 ? (
            project.revisions.map((rev) => (
              <div key={rev.id} className="bom-row" style={{ gridTemplateColumns: '60px 100px 2fr 1.2fr 1.2fr', fontSize: 12 }}>
                <div style={{ fontWeight: 600 }}>{rev.revNumber.replace('Revision ', '')}</div>
                <div style={{ color: 'var(--text-tertiary)' }}>{new Date(rev.createdAt).toLocaleDateString()}</div>
                <div>{rev.description}</div>
                <div>{rev.createdBy}</div>
                <div>
                  <span className={`tag tag--${rev.status === 'approved' ? 'pass' : rev.status === 'issued_for_construction' ? 'success' : 'warn'}`}>
                    {(rev.status || 'draft').replace(/_/g, ' ').toUpperCase()}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="bom-row" style={{ gridTemplateColumns: '60px 100px 2fr 1.2fr 1.2fr', fontSize: 12 }}>
              <div style={{ fontWeight: 600 }}>—</div>
              <div style={{ color: 'var(--text-tertiary)' }}>{new Date(project.createdAt).toLocaleDateString()}</div>
              <div>Initial design baseline</div>
              <div>{project.designer || 'Engineer'}</div>
              <div>
                <span className="tag tag--warn">DRAFT</span>
              </div>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Engineering Approval Signatures */}
      <SectionCard title="Design Approval & Verification Signatures" icon={FileText}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginTop: 8 }}>
          <div style={{ border: '1px solid var(--border)', borderRadius: 6, padding: 16, background: 'var(--surface)' }}>
            <span style={{ fontSize: 10, letterSpacing: '0.05em', color: 'var(--text-tertiary)', fontWeight: 600 }}>PREPARED BY (DESIGNER)</span>
            <div style={{ margin: '16px 0', borderBottom: '1px dashed var(--border)', height: 32, display: 'flex', alignItems: 'end', fontSize: 13, color: 'var(--text-secondary)' }}>
              {project.designer || 'CP Engineer'}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-tertiary)' }}>
              <span>ROLE: Designer</span>
              <span>DATE: {new Date(project.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
          
          <div style={{ border: '1px solid var(--border)', borderRadius: 6, padding: 16, background: 'var(--surface)' }}>
            <span style={{ fontSize: 10, letterSpacing: '0.05em', color: 'var(--text-tertiary)', fontWeight: 600 }}>CHECKED BY (CP SPECIALIST)</span>
            <div style={{ margin: '16px 0', borderBottom: '1px dashed var(--border)', height: 32, display: 'flex', alignItems: 'end', fontSize: 13, color: 'var(--text-secondary)' }}>
              {project.status === 'approved' || project.status === 'issued_for_construction' ? 'CP Specialist' : ''}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-tertiary)' }}>
              <span>ROLE: Reviewer</span>
              <span>DATE: {project.status === 'approved' || project.status === 'issued_for_construction' ? new Date(project.updatedAt).toLocaleDateString() : '—'}</span>
            </div>
          </div>

          <div style={{ border: '1px solid var(--border)', borderRadius: 6, padding: 16, background: 'var(--surface)' }}>
            <span style={{ fontSize: 10, letterSpacing: '0.05em', color: 'var(--text-tertiary)', fontWeight: 600 }}>APPROVED BY (CHIEF ENGINEER)</span>
            <div style={{ margin: '16px 0', borderBottom: '1px dashed var(--border)', height: 32, display: 'flex', alignItems: 'end', fontSize: 13, color: 'var(--text-secondary)' }}>
              {project.status === 'issued_for_construction' ? 'Chief CP Engineer' : ''}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-tertiary)' }}>
              <span>ROLE: Approver</span>
              <span>DATE: {project.status === 'issued_for_construction' ? new Date(project.updatedAt).toLocaleDateString() : '—'}</span>
            </div>
          </div>
        </div>
      </SectionCard>

      <RevisionCompareDialog isOpen={compareOpen} onClose={() => setCompareOpen(false)} />
    </div>
  )
}

