/**
 * PageBOM.jsx
 *
 * Rule-generated Bill of Materials (gated by workflow status).
 */

import { useProjectStore } from '../store/projectStore.js'
import {
  ResultRow,
  SectionCard,
  InfoBox,
} from '../components/ui.jsx'
import { BOM_ALLOWED_STATUSES, getActiveStandard } from '../constants/index.js'
import { generateBOM } from '../engine/rules/bomEngine.js'
import { List, Download } from 'lucide-react'

function generateBOMForDisplay(station, project) {
  if (!station.lastCalcResult) return []
  const std = getActiveStandard(project)
  return generateBOM(station, station.lastCalcResult, std)
}

export function PageBOM() {
  const project = useProjectStore((s) => s.getProject())
  const stations = project.stations
  const projectStatus = project.status

  const canViewBOM =
    BOM_ALLOWED_STATUSES.includes(projectStatus) ||
    stations.some((st) => BOM_ALLOWED_STATUSES.includes(st.status))

  return (
    <div className="page">
      {!canViewBOM && (
        <InfoBox type="warning">
          BOM is only available for stations with status: Approved or Issued for Construction.
          Complete the engineering review and approve the design first.
        </InfoBox>
      )}

      {stations.map((st) => {
        if (
          !BOM_ALLOWED_STATUSES.includes(st.status) &&
          !BOM_ALLOWED_STATUSES.includes(projectStatus)
        )
          return null
        const bom = st.lastCalcResult ? generateBOMForDisplay(st, project) : []

        return (
          <SectionCard
            key={st.id}
            title={`BOM — ${st.name}`}
            icon={List}
            action={
              <button
                className="btn btn-sm"
                onClick={async () => {
                  const { exportBOMToCSV } = await import('../reporting/bomExporter.js')
                  exportBOMToCSV(st.name, bom)
                }}
              >
                <Download size={13} /> Export CSV
              </button>
            }
          >
            <div className="bom-table">
              <div className="bom-row bom-header">
                <div>Tag</div>
                <div>Description</div>
                <div>Standard</div>
                <div>Unit</div>
                <div>Qty</div>
              </div>
              {bom.map((item, i) => (
                <div key={i} className="bom-row">
                  <div>
                    <span className={`tag tag-${item.tag.toLowerCase().replace(/\s+/g, '-')}`}>
                      {item.tag}
                    </span>
                  </div>
                  <div>{item.description}</div>
                  <div className="bom-std">{item.standard || '—'}</div>
                  <div>{item.unit}</div>
                  <div className="bom-qty">{item.quantity}</div>
                </div>
              ))}
            </div>
          </SectionCard>
        )
      })}
    </div>
  )
}

