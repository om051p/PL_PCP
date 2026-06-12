import { useState } from 'react'
import { useProjectStore } from '../store/projectStore.js'
import { useAuthStore } from '../store/authStore.js'
import StationTabs from '../components/StationTabs.jsx'
import { BulkGridEditor } from '../components/BulkGridEditor.jsx'
import {
  FieldInput,
  SelectField,
  ResultRow,
  SectionCard,
  InfoBox,
  Divider,
  Grid2,
} from '../components/ui.jsx'
import { getSoilClassification } from '../constants/index.js'
import { Route, Zap, Layers, Plus, Trash2, Edit, TableProperties } from 'lucide-react'

export function PagePipeline() {
  const [activeViewTab, setActiveViewTab] = useState('form') // 'form' or 'bulk'
  const station = useProjectStore((s) => s.getActiveStation())
  const updateStation = useProjectStore((s) => s.updateStation)
  const updateSegment = useProjectStore((s) => s.updateSegment)
  const addSegment = useProjectStore((s) => s.addSegment)
  const removeSegment = useProjectStore((s) => s.removeSegment)
  const project = useProjectStore((s) => s.getProject())
  const user = useAuthStore((s) => s.user)
  const isReviewer = user?.role === 'reviewer' || user?.role === 'viewer'
  const isEngineerOrReviewer = user?.role === 'engineer' || user?.role === 'reviewer' || user?.role === 'viewer'

  if (!station) return null
  const designBasis = project?.designBasis || {}
  const soilResistivity = designBasis.soilResistivityOhmCm !== undefined ? designBasis.soilResistivityOhmCm : station.soilResistivityOhmCm
  const soilClass = getSoilClassification(soilResistivity)

  return (
    <div className="page">
      <StationTabs />

      {/* Sub-tabs switcher */}
      <div className="validation-filter-container" style={{ marginBottom: 20 }}>
        <div className="validation-filter-tabs">
          <button
            className={`validation-filter-tab ${activeViewTab === 'form' ? 'validation-filter-tab--active' : ''}`}
            onClick={() => setActiveViewTab('form')}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Edit size={13} />
            <span>Form Editor</span>
          </button>
          <button
            className={`validation-filter-tab ${activeViewTab === 'bulk' ? 'validation-filter-tab--active' : ''}`}
            onClick={() => setActiveViewTab('bulk')}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <TableProperties size={13} />
            <span>Excel Bulk Ingest</span>
          </button>
        </div>
      </div>

      {activeViewTab === 'bulk' ? (
        <div style={{ marginBottom: 32 }}>
          <BulkGridEditor onComplete={() => setActiveViewTab('form')} />
        </div>
      ) : (
        <>
          {station.pipelineSegments.map((seg, idx) => {
            const odM = (seg.od * 0.0254).toFixed(4)
            const area = (Math.PI * seg.od * 0.0254 * seg.lengthM).toFixed(2)

            return (
              <div key={seg.id} className="segment-group" style={{ marginBottom: 32 }}>
                <Divider
                  label={`Segment ${idx + 1}: ${seg.name}`}
                  action={
                    station.pipelineSegments.length > 1 && !isReviewer && (
                      <button
                        className="btn btn-sm btn-icon-ghost"
                        onClick={() => removeSegment(station.id, seg.id)}
                        title="Remove segment"
                      >
                        <Trash2 size={14} />
                      </button>
                    )
                  }
                />
                <Grid2>
                  <SectionCard title="Pipeline Geometry" icon={Route}>
                    <FieldInput
                      label="Segment Name"
                      value={seg.name}
                      type="text"
                      onChange={(v) => updateSegment(station.id, seg.id, { name: v })}
                    />
                    <Grid2>
                      <FieldInput
                        label="Outside Diameter"
                        value={seg.od}
                        unit="inches"
                        hint={`= ${odM} m`}
                        min={0}
                        step={0.5}
                        onChange={(v) => updateSegment(station.id, seg.id, { od: v })}
                      />
                      <FieldInput
                        label="Wall Thickness"
                        value={seg.wallThk}
                        unit="inches"
                        min={0}
                        step={0.001}
                        onChange={(v) => updateSegment(station.id, seg.id, { wallThk: v })}
                      />
                    </Grid2>
                    <FieldInput
                      label="Section Length"
                      value={seg.lengthM}
                      unit="m"
                      min={0}
                      onChange={(v) => updateSegment(station.id, seg.id, { lengthM: v })}
                    />
                    <div className="calc-preview">
                      <ResultRow label="External Surface Area" symbol="A" value={area} unit="m²" />
                    </div>
                  </SectionCard>

                  <SectionCard title="Operating Conditions" icon={Zap}>
                    <FieldInput
                      label="Operating Temperature"
                      value={seg.opTempC}
                      unit="°C"
                      step={0.1}
                      onChange={(v) => updateSegment(station.id, seg.id, { opTempC: v })}
                    />
                    <FieldInput
                      label="Base Current Density @ 25°C"
                      value={seg.currentDensityBase}
                      unit="mA/m²"
                      min={0}
                      step={0.01}
                      onChange={(v) => updateSegment(station.id, seg.id, { currentDensityBase: v })}
                    />
                    <SelectField
                      label="Coating System"
                      value={seg.coatingType}
                      onChange={(v) => updateSegment(station.id, seg.id, { coatingType: v })}
                      options={[
                        { value: 'fusion_bonded_epoxy', label: 'Fusion Bonded Epoxy (FBE)' },
                        { value: 'three_layer_polyethylene', label: '3-Layer Polyethylene (3LPE)' },
                        { value: 'coal_tar_enamel', label: 'Coal Tar Enamel' },
                        { value: 'bare', label: 'Bare Steel' },
                      ]}
                    />
                  </SectionCard>
                </Grid2>
              </div>
            )
          })}

          {!isReviewer && (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
              <button className="btn btn-secondary" onClick={() => addSegment(station.id)}>
                <Plus size={14} /> Add Pipeline Segment
              </button>
            </div>
          )}
        </>
      )}

      <Grid2>
        <SectionCard title="Soil Conditions" icon={Layers}>
          <FieldInput
            label="Soil Resistivity"
            value={soilResistivity}
            unit="Ω·cm"
            readOnly={true}
            hint="Locked to Central Design Settings"
          />
          <div className="calc-preview">
            <ResultRow label="Soil Classification" value={soilClass.label} />
            <ResultRow label="Description" value={soilClass.description} />
          </div>
          {soilResistivity > 10000 && (
            <InfoBox type="warning">
              High soil resistivity detected. Deepwell groundbed recommended.
            </InfoBox>
          )}
        </SectionCard>

        <SectionCard title="Groundbed Location" icon={Layers}>
          <FieldInput
            label="Actual Groundbed Distance to Pipeline"
            value={designBasis.actualRemotenessDistanceM || 56}
            unit="m"
            readOnly={true}
            hint="Locked to Central Design Settings in Design Basis"
          />
          <FieldInput
            label="Required Minimum Distance"
            value={designBasis.minRemotenessDistanceM || 20}
            unit="m"
            readOnly={true}
            hint="Locked to Central Design Settings in Design Basis"
          />
          {(designBasis.actualRemotenessDistanceM || 56) < (designBasis.minRemotenessDistanceM || 20) && (
            <InfoBox type="error">
              Groundbed is too close to pipeline. Minimum {designBasis.minRemotenessDistanceM || 20}m required.
            </InfoBox>
          )}
        </SectionCard>
      </Grid2>
    </div>
  )
}

