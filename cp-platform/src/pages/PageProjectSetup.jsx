/**
 * PageProjectSetup.jsx
 *
 * Client information, system configuration, and ICCP station management.
 */

import { useState, useCallback } from 'react'
import { useProjectStore } from '../store/projectStore.js'
import {
  FieldInput,
  SelectField,
  SectionCard,
  WorkflowStepper,
  StatusBadge,
  ConfirmDialog,
  Grid2,
} from '../components/ui.jsx'
import { ANODE_SPECS, STANDARD_OPTIONS } from '../constants/index.js'
import { Building2, Cpu, Layers, Plus, Trash2 } from 'lucide-react'

export function PageProjectSetup() {
  const project = useProjectStore((s) => s.getProject())
  const updateProject = useProjectStore((s) => s.updateProject)
  const stations = project?.stations ?? []
  const updateStation = useProjectStore((s) => s.updateStation)
  const removeStation = useProjectStore((s) => s.removeStation)
  const addStation = useProjectStore((s) => s.addStation)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  const handleDeleteStation = useCallback(() => {
    if (confirmDeleteId) {
      removeStation(confirmDeleteId)
      setConfirmDeleteId(null)
    }
  }, [confirmDeleteId, removeStation])

  return (
    <div className="page">
      <Grid2>
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
            value={project.designStandard}
            onChange={(v) => updateProject({ designStandard: v })}
            options={STANDARD_OPTIONS}
            hint="Select engineering standard for protection criteria, formulas, and thresholds"
          />
          <SelectField
            label="System Design Life Target"
            value={project.systemDesignLifeYears}
            onChange={(v) => updateProject({ systemDesignLifeYears: parseInt(v) })}
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
      </Grid2>

      <SectionCard
        title="ICCP Stations"
        icon={Layers}
        action={
          <button className="btn btn-sm" onClick={addStation}>
            <Plus size={14} /> Add Station
          </button>
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
              {stations.length > 1 && (
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

