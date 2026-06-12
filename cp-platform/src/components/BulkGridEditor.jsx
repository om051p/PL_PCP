import { useState, useMemo } from 'react'
import { useProjectStore } from '../store/projectStore.js'
import { Clipboard, Save, Info, AlertTriangle } from 'lucide-react'
import { v4 as uuid } from 'uuid'
import { InfoBox } from './ui.jsx'

const COATING_MAPPING = {
  'fbe': 'fusion_bonded_epoxy',
  'fusion bonded epoxy': 'fusion_bonded_epoxy',
  'fusion_bonded_epoxy': 'fusion_bonded_epoxy',
  '3lpe': 'three_layer_polyethylene',
  '3-layer polyethylene': 'three_layer_polyethylene',
  'three_layer_polyethylene': 'three_layer_polyethylene',
  'three-layer polyethylene': 'three_layer_polyethylene',
  'cte': 'coal_tar_enamel',
  'coal tar enamel': 'coal_tar_enamel',
  'coal_tar_enamel': 'coal_tar_enamel',
  'bare': 'bare',
  'bare steel': 'bare',
  'none': 'bare',
}

const COATING_LABELS = {
  'fusion_bonded_epoxy': 'Fusion Bonded Epoxy (FBE)',
  'three_layer_polyethylene': '3-Layer Polyethylene (3LPE)',
  'coal_tar_enamel': 'Coal Tar Enamel',
  'bare': 'Bare Steel',
}

export function BulkGridEditor({ onComplete }) {
  const station = useProjectStore((s) => s.getActiveStation())
  const updateStation = useProjectStore((s) => s.updateStation)
  
  const [pasteData, setPasteData] = useState('')

  const { previewRows, errors } = useMemo(() => {
    if (!pasteData.trim()) {
      return { previewRows: [], errors: [] }
    }

    const lines = pasteData.split(/\r?\n/)
    const parsed = []
    const validationErrors = []

    lines.forEach((line, idx) => {
      if (!line.trim()) return

      const cells = line.split(/\t|,/)

      const name = cells[0]?.trim() || `Segment-${idx + 1}`
      const od = parseFloat(cells[1]) || 0
      const wallThk = parseFloat(cells[2]) || 0
      const lengthM = parseFloat(cells[3]) || 0
      const opTempC = parseFloat(cells[4]) || 25
      const cdBase = parseFloat(cells[5]) || 0.1

      const rawCoating = (cells[6]?.trim() || '').toLowerCase()
      const coatingType = COATING_MAPPING[rawCoating] || 'fusion_bonded_epoxy'

      let eff = parseFloat(cells[7])
      if (isNaN(eff)) {
        eff = 0.98
      } else if (eff > 1) {
        eff = eff / 100
      }

      if (od <= 0) validationErrors.push(`Row ${idx + 1}: Outside diameter must be greater than 0`)
      if (lengthM <= 0) validationErrors.push(`Row ${idx + 1}: Length must be greater than 0`)

      parsed.push({
        id: uuid(),
        name,
        od,
        wallThk,
        lengthM,
        opTempC,
        currentDensityBase: cdBase,
        coatingType,
        coatingEfficiency: eff,
      })
    })

    return { previewRows: parsed, errors: validationErrors }
  }, [pasteData])

  const handleApply = () => {
    if (previewRows.length === 0) return
    if (errors.length > 0) {
      if (!window.confirm(`There are validation warnings in the parsed data. Are you sure you want to apply updates anyway?`)) {
        return
      }
    }

    updateStation(station.id, (st) => {
      st.pipelineSegments = previewRows
      st.status = 'input_complete'
      st.lastCalcResult = null
    })

    // Notify the user or complete the tab switch
    if (onComplete) onComplete()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <InfoBox type="info">
        <div style={{ display: 'flex', gap: 8, alignItems: 'start' }}>
          <Info size={16} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <strong>Excel Copy & Paste Grid</strong>
            <p style={{ margin: '4px 0 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
              Copy columns directly from your Excel spreadsheet and paste them below. 
              The spreadsheet should contain columns in the following order:
            </p>
            <code style={{ display: 'block', margin: '8px 0', padding: '6px 10px', background: 'var(--surface-hover)', borderRadius: 4, fontFamily: 'var(--font-mono)', fontSize: 11 }}>
              Segment Name [tab] Outside Diameter (in) [tab] Wall Thickness (in) [tab] Length (m) [tab] Temperature (°C) [tab] Base CD (mA/m²) [tab] Coating System [tab] Efficiency (%)
            </code>
            <p style={{ margin: '4px 0 0 0', fontSize: 11, color: 'var(--text-tertiary)' }}>
              Coating System values will be mapped automatically (e.g., FBE, 3LPE, CTE, Bare).
            </p>
          </div>
        </div>
      </InfoBox>

      {/* Paste Textarea */}
      <div className="field">
        <label className="field-label" htmlFor="bulk-tsv-paste">Paste Tab-Separated Grid Data</label>
        <div style={{ position: 'relative' }}>
          <textarea
            id="bulk-tsv-paste"
            className="field-input"
            style={{ width: '100%', height: '140px', fontFamily: 'var(--font-mono)', fontSize: 12, padding: 12, resize: 'vertical' }}
            placeholder="Paste from Excel here..."
            value={pasteData}
            onChange={(e) => setPasteData(e.target.value)}
          />
          {!pasteData && (
            <div style={{ position: 'absolute', right: 12, bottom: 12, pointerEvents: 'none', opacity: 0.3, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clipboard size={14} /> Paste
            </div>
          )}
        </div>
      </div>

      {/* Warnings & Errors */}
      {errors.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 12, background: 'var(--fail-bg)', border: '1px solid var(--fail)', borderRadius: 6, color: 'var(--fail)', fontSize: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
            <AlertTriangle size={14} /> Formatting and Validation Warnings
          </div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Preview Table */}
      {previewRows.length > 0 && (
        <div className="section-card">
          <div className="section-card-header">
            <span className="section-card-title">Parsed Grid Preview ({previewRows.length} segments)</span>
          </div>
          <div className="section-card-body" style={{ padding: 0, overflowX: 'auto' }}>
            <table className="bom-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr className="bom-row bom-header" style={{ display: 'table-row', borderBottom: '1px solid var(--border)', background: 'var(--surface-hover)' }}>
                  <th style={{ padding: 10, fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Name</th>
                  <th style={{ padding: 10, fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>OD (in)</th>
                  <th style={{ padding: 10, fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Wall (in)</th>
                  <th style={{ padding: 10, fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Length (m)</th>
                  <th style={{ padding: 10, fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Temp (°C)</th>
                  <th style={{ padding: 10, fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>CD (mA/m²)</th>
                  <th style={{ padding: 10, fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Coating Type</th>
                  <th style={{ padding: 10, fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Coating Eff</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, idx) => (
                  <tr key={idx} className="bom-row" style={{ display: 'table-row', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                    <td style={{ padding: 10, fontWeight: 500 }}>{row.name}</td>
                    <td style={{ padding: 10 }}>{row.od}</td>
                    <td style={{ padding: 10 }}>{row.wallThk}</td>
                    <td style={{ padding: 10 }}>{row.lengthM}</td>
                    <td style={{ padding: 10 }}>{row.opTempC}</td>
                    <td style={{ padding: 10 }}>{row.currentDensityBase}</td>
                    <td style={{ padding: 10 }}>{COATING_LABELS[row.coatingType] || row.coatingType}</td>
                    <td style={{ padding: 10 }}>{(row.coatingEfficiency * 100).toFixed(0)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Save action button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
        <button
          className="btn btn-primary"
          onClick={handleApply}
          disabled={previewRows.length === 0}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Save size={14} /> Apply Bulk Updates
        </button>
      </div>
    </div>
  )
}
