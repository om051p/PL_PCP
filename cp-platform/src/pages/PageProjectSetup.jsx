/**
 * PageProjectSetup.jsx
 *
 * Client information, system configuration, and ICCP station management.
 */

import { useState, useCallback } from 'react'
import { useProjectStore } from '../store/projectStore.js'
import { useAuthStore } from '../store/authStore.js'
import {
  FieldInput,
  SelectField,
  SectionCard,
  WorkflowStepper,
  StatusBadge,
  ConfirmDialog,
  Grid2,
  Grid3,
} from '../components/ui.jsx'
import { ANODE_SPECS, STANDARD_OPTIONS } from '../constants/index.js'
import { Building2, Cpu, Layers, Plus, Trash2, Settings } from 'lucide-react'

export function PageProjectSetup() {
  const project = useProjectStore((s) => s.getProject())
  const updateProject = useProjectStore((s) => s.updateProject)
  const updateDesignBasis = useProjectStore((s) => s.updateDesignBasis)
  const stations = project?.stations ?? []
  const updateStation = useProjectStore((s) => s.updateStation)
  const removeStation = useProjectStore((s) => s.removeStation)
  const addStation = useProjectStore((s) => s.addStation)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  const user = useAuthStore((s) => s.user)
  const isReviewer = user?.role === 'reviewer' || user?.role === 'viewer'
  const isEngineerOrReviewer = user?.role === 'engineer' || user?.role === 'reviewer' || user?.role === 'viewer'

  const handleDeleteStation = useCallback(() => {
    if (confirmDeleteId) {
      removeStation(confirmDeleteId)
      setConfirmDeleteId(null)
    }
  }, [confirmDeleteId, removeStation])

  const designBasis = project?.designBasis || {}

  return (
    <div className="page">
      <Grid3>
        <SectionCard title="Client Information" icon={Building2}>
          <FieldInput
            label="Project Number"
            value={project.projectNumber}
            type="text"
            onChange={(v) => updateProject({ projectNumber: v })}
          />
          <FieldInput
            label="Client Name"
            value={project.clientName}
            type="text"
            onChange={(v) => updateProject({ clientName: v })}
          />
          <FieldInput
            label="End Client"
            value={project.endClient}
            type="text"
            onChange={(v) => updateProject({ endClient: v })}
          />
          <FieldInput
            label="Project Name"
            value={project.projectName}
            type="text"
            onChange={(v) => updateProject({ projectName: v })}
          />
          <FieldInput
            label="Designer"
            value={project.designer}
            type="text"
            onChange={(v) => updateProject({ designer: v })}
          />
        </SectionCard>

        <SectionCard title="System Configuration" icon={Cpu}>
          <SelectField
            label="Design Standard"
            value={designBasis.designStandard || 'saudiAramco'}
            onChange={(v) => updateDesignBasis({ designStandard: v })}
            options={STANDARD_OPTIONS}
            hint="Select engineering standard for protection criteria, formulas, and thresholds"
          />
          <SelectField
            label="System Design Life Target"
            value={designBasis.systemDesignLifeYears || 25}
            onChange={(v) => updateDesignBasis({ systemDesignLifeYears: parseInt(v) || 25 })}
            options={[15, 20, 25, 30, 35, 40].map((y) => ({ value: y, label: `${y} years` }))}
          />
          <SelectField
            label="Default Anode Type"
            value={stations[0]?.anodeSpec?.id || 'HSCI_TA4'}
            onChange={(v) => {
              const spec = ANODE_SPECS[v]
              stations.forEach((st) =>
                updateStation(st.id, (s) => {
                  s.anodeSpec = { ...spec }
                }),
              )
            }}
            options={Object.values(ANODE_SPECS).map((a) => ({ value: a.id, label: a.label }))}
          />
          <div className="field">
            <label className="field-label">Project Status</label>
            <div style={{ marginTop: 6 }}>
              <WorkflowStepper currentStatus={project.status} />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Central Design Settings" icon={Settings}>
          <FieldInput
            label="Design Life Target"
            value={designBasis.systemDesignLifeYears || 25}
            type="number"
            unit="yrs"
            readOnly={true}
            hint="Locked to System Configuration"
          />
          <FieldInput
            label="Design Soil Resistivity"
            value={designBasis.soilResistivityOhmCm || 361}
            type="number"
            unit="Ω·cm"
            onChange={(v) => updateDesignBasis({ soilResistivityOhmCm: parseInt(v) || 361 })}
          />
          <FieldInput
            label="Back EMF Voltage"
            value={designBasis.backEmfV || 2.0}
            type="number"
            step={0.1}
            unit="V"
            onChange={(v) => updateDesignBasis({ backEmfV: parseFloat(v) || 2.0 })}
          />
          <FieldInput
            label="Structure to Earth Resistance"
            value={designBasis.structureResistanceOhm || 0.055}
            type="number"
            step={0.005}
            unit="Ω"
            onChange={(v) => updateDesignBasis({ structureResistanceOhm: parseFloat(v) || 0.055 })}
          />
          <FieldInput
            label="AC Input Voltage"
            value={designBasis.acInputVoltageV || 480}
            type="number"
            unit="V"
            onChange={(v) => updateDesignBasis({ acInputVoltageV: parseInt(v) || 480 })}
          />
          <SelectField
            label="AC Input Phase"
            value={designBasis.acInputPhase || 3}
            onChange={(v) => updateDesignBasis({ acInputPhase: parseInt(v) || 3 })}
            options={[
              { value: 1, label: '1-Phase' },
              { value: 3, label: '3-Phase' },
            ]}
          />
          <FieldInput
            label="TR Efficiency"
            value={designBasis.trEfficiencyPct || 80}
            type="number"
            unit="%"
            min={1}
            max={100}
            onChange={(v) => updateDesignBasis({ trEfficiencyPct: parseInt(v) || 80 })}
          />
          <FieldInput
            label="TR Power Factor"
            value={designBasis.trPowerFactor || 0.8}
            type="number"
            step={0.05}
            min={0.1}
            max={1.0}
            onChange={(v) => updateDesignBasis({ trPowerFactor: parseFloat(v) || 0.8 })}
          />
          <FieldInput
            label="Coke Contingency"
            value={designBasis.cokeContingencyPct || 10}
            type="number"
            unit="%"
            onChange={(v) => updateDesignBasis({ cokeContingencyPct: parseInt(v) || 10 })}
          />
          <FieldInput
            label="Groundbed Remoteness Threshold"
            value={designBasis.minRemotenessDistanceM || 20}
            type="number"
            unit="m"
            onChange={(v) => updateDesignBasis({ minRemotenessDistanceM: parseFloat(v) || 20 })}
          />
          <FieldInput
            label="Actual Nearest Structure Distance"
            value={designBasis.actualRemotenessDistanceM || 56}
            type="number"
            unit="m"
            onChange={(v) => updateDesignBasis({ actualRemotenessDistanceM: parseFloat(v) || 56 })}
          />
        </SectionCard>
      </Grid3>

      <SectionCard
        title="ICCP Stations"
        icon={Layers}
        action={
          !isReviewer && (
            <button className="btn btn-sm" onClick={addStation}>
              <Plus size={14} /> Add Station
            </button>
          )
        }
      >
        <div className="stations-list">
          {stations.map((st, i) => (
            <div key={st.id} className="station-row">
              <div className="station-row-num">{i + 1}</div>
              <FieldInput
                label=""
                ariaLabel={`Station ${i + 1} name`}
                value={st.name}
                type="text"
                onChange={(v) =>
                  updateStation(st.id, (s) => {
                    s.name = v
                  })
                }
                className="station-name-input"
              />
              <FieldInput
                label=""
                ariaLabel={`Station ${i + 1} location`}
                value={st.location}
                type="text"
                onChange={(v) =>
                  updateStation(st.id, (s) => {
                    s.location = v
                  })
                }
                className="station-loc-input"
              />
              <StatusBadge status={st.status} />
              {stations.length > 1 && !isEngineerOrReviewer && (
                <button
                  className="btn-icon-ghost"
                  onClick={() => setConfirmDeleteId(st.id)}
                  title="Delete station"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      </SectionCard>

      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Delete Station"
        message="Are you sure you want to delete this station? All calculations and data for this station will be permanently removed. This action cannot be undone."
        confirmLabel="Delete Station"
        onConfirm={handleDeleteStation}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  )
}

