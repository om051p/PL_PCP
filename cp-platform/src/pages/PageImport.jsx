/**
 * PageImport.jsx
 *
 * Excel import with drag-drop, parsing, and error handling.
 */

import { useState, useRef } from 'react'
import { useProjectStore } from '../store/projectStore.js'
import { useAuthStore } from '../store/authStore.js'
import {
  ResultRow,
  SectionCard,
  InfoBox,
  CheckRow,
} from '../components/ui.jsx'
import { CheckCircle2, AlertTriangle, Upload, FileSpreadsheet, FileText } from 'lucide-react'

export function PageImport() {
  const updateProject = useProjectStore((s) => s.updateProject)
  const fileRef = useRef(null)
  const [status, setStatus] = useState(null) // null | 'loading' | {errors, count}
  const [dragOver, setDragOver] = useState(false)
  const user = useAuthStore((s) => s.user)
  const isReviewer = user?.role === 'reviewer' || user?.role === 'viewer'

  async function handleFile(file) {
    if (!file || isReviewer) return
    setStatus('loading')
    try {
      const { importFromExcel } = await import('../reporting/excelEngine.js')
      const { project, errors } = await importFromExcel(file)
      // Merge into store
      updateProject({
        projectNumber: project.projectNumber,
        projectName: project.projectName,
        clientName: project.clientName,
        endClient: project.endClient,
        designer: project.designer,
        systemDesignLifeYears: project.systemDesignLifeYears,
        stations: project.stations,
      })
      setStatus({ errors, count: project.stations.length })
    } catch (e) {
      setStatus({ errors: [`Import failed: ${e.message}`], count: 0 })
    }
  }

  return (
    <div className="page">
      <SectionCard title="Import from Excel" icon={Upload}>
        {isReviewer ? (
          <InfoBox type="warning">
            Excel Import is disabled for Reviewer and Viewer roles.
          </InfoBox>
        ) : (
          <InfoBox type="info">
            Supported formats: CP Designer export (.xlsx) · Generic PCP workbook (.xlsx / .xls)
          </InfoBox>
        )}

        <div
          className={`drop-zone ${dragOver ? 'drop-zone--over' : ''}`}
          onDragOver={(e) => {
            if (isReviewer) return
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            if (isReviewer) return
            e.preventDefault()
            setDragOver(false)
            handleFile(e.dataTransfer.files[0])
          }}
          onClick={() => {
            if (isReviewer) return
            fileRef.current?.click()
          }}
          style={{
            cursor: isReviewer ? 'not-allowed' : 'pointer',
            opacity: isReviewer ? 0.6 : 1,
          }}
        >
          <FileSpreadsheet size={32} style={{ color: 'var(--brand-mid)', marginBottom: 8 }} />
          <div style={{ fontWeight: 500, marginBottom: 4 }}>
            {isReviewer ? 'Excel Import Disabled' : 'Drop Excel file here or click to browse'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
            .xlsx or .xls · Max 10MB
          </div>
          <input
            ref={fileRef}
            id="excel-import-file"
            type="file"
            accept=".xlsx,.xls"
            style={{ display: 'none' }}
            onChange={(e) => handleFile(e.target.files[0])}
            aria-label="Choose Excel file to import"
            disabled={isReviewer}
          />
        </div>

        {status === 'loading' && (
          <div className="import-loading">
            <div className="spinner" /> Parsing workbook…
          </div>
        )}

        {status && status !== 'loading' && (
          <div style={{ marginTop: 16 }}>
            {status.count > 0 && (
              <div className="check-row check-row--pass">
                <CheckCircle2 size={16} />
                <span>
                  {status.count} station(s) imported successfully. Go to Project Setup to verify.
                </span>
              </div>
            )}
            {status.errors.map((err, i) => (
              <div key={i} className="check-row check-row--warning">
                <AlertTriangle size={16} />
                <span>{err}</span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="What gets imported" icon={FileText}>
        <ResultRow label="Project number, name, client" value="✓ Mapped automatically" />
        <ResultRow label="Pipeline geometry (OD, length, temperature)" value="✓ Mapped" />
        <ResultRow label="Soil resistivity" value="✓ Mapped" />
        <ResultRow label="Groundbed configuration" value="✓ Mapped" />
        <ResultRow label="TR ratings" value="✓ Mapped" />
        <ResultRow label="Anode specifications" value="✓ Mapped" />
        <ResultRow label="Cable lengths" value="⚠ Defaults applied — verify in Cable page" />
        <ResultRow label="Calculated results" value="✗ Recalculate after import" />
      </SectionCard>
    </div>
  )
}

