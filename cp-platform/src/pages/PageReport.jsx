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
import { FileText, Download, FileSpreadsheet, Layers } from 'lucide-react'

export function PageReport() {
  const project = useProjectStore((s) => s.getProject())
  const stations = project?.stations ?? []
  const createRevision = useProjectStore((s) => s.createRevision)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [xlsxLoading, setXlsxLoading] = useState(false)
  const [revDesc, setRevDesc] = useState('')
  const allCalculated = stations.every((s) => s.lastCalcResult && s.status !== 'needs_recalculation')
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
                  ? 'Calculate all stations first'
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
            ⚠ Central settings are out of sync. Please recalculate all stations to enable exports.
          </div>
        )}
        {!hasMismatch && !allCalculated && (
          <div style={{ fontSize: 11, color: 'var(--warn)', marginTop: 6 }}>
            ⚠ PDF export requires all stations to be calculated first.
          </div>
        )}
      </div>

      <SectionCard title="Project Summary" icon={FileText}>
        <ResultRow label="Project Number" value={project.projectNumber} />
        <ResultRow label="Client" value={project.clientName} />
        <ResultRow label="Project" value={project.projectName} />
        <ResultRow label="ICCP Stations" value={stations.length.toString()} />
        <ResultRow
          label="System Design Life"
          value={project.systemDesignLifeYears.toString()}
          unit="years"
        />
        <ResultRow label="Status" value={(project.status || '').replace(/_/g, ' ').toUpperCase()} />
      </SectionCard>

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

      {project.revisions.length > 0 && (
        <SectionCard title="Revision History" icon={FileText}>
          {project.revisions.map((rev) => (
            <div key={rev.id} className="revision-row">
              <span className="rev-num">{rev.revNumber}</span>
              <span className="rev-desc">{rev.description}</span>
              <span className="rev-date">{new Date(rev.createdAt).toLocaleDateString()}</span>
              <span className="rev-by">{rev.createdBy}</span>
            </div>
          ))}
        </SectionCard>
      )}
    </div>
  )
}

