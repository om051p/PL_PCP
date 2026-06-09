/**
 * PAGE COMPONENTS
 * All engineering pages as clean React components.
 * Each page reads from the store and dispatches actions.
 * No calculation logic here — only presentation.
 */

import { useProjectStore } from '../store/projectStore.js'
import {
  FieldInput, SelectField, ResultRow, CheckRow, InsightCard,
  StatCard, SectionCard, WorkflowStepper, InfoBox, Divider, Grid2, Grid3, StatusBadge
} from '../components/ui.jsx'
import {
  DESIGN_MODES, ANODE_SPECS, CABLE_SPECS, WORKFLOW_STATUSES,
  WORKFLOW_STATUS_MAP, BOM_ALLOWED_STATUSES, getSoilClassification
} from '../constants/index.js'
import { generateBOM } from '../engine/rules/bomEngine.js'
import { downloadEngineeringReport } from '../reporting/pdfGenerator.js'
import { exportToExcel, importFromExcel } from '../reporting/excelEngine.js'
import {
  Building2, Route, Zap, Layers, Cable, Cpu,
  ClipboardCheck, List, FileText, Activity, Plus, Trash2,
  ChevronDown, ChevronRight, CheckCircle2, XCircle, AlertTriangle,
  TrendingUp, Download, BarChart3, FileSpreadsheet, Upload
} from 'lucide-react'
import { useState, useRef } from 'react'

// ─── Station Tabs ─────────────────────────────────────────────────────────────

function StationTabs() {
  const stations = useProjectStore(s => s.project.stations)
  const activeId = useProjectStore(s => s.activeStationId) || stations[0]?.id
  const setActive = useProjectStore(s => s.setActiveStation)
  const addStation = useProjectStore(s => s.addStation)

  return (
    <div className="station-tabs">
      {stations.map(st => (
        <button
          key={st.id}
          className={`station-tab ${st.id === activeId ? 'station-tab--active' : ''}`}
          onClick={() => setActive(st.id)}
        >
          <span>{st.name.split('@')[0].trim().split('-').slice(0, 3).join('-')}</span>
          {st.lastCalcResult && (
            <span className={`tab-dot ${st.lastCalcResult.allChecksPassed ? 'tab-dot--pass' : 'tab-dot--fail'}`} />
          )}
        </button>
      ))}
      <button className="station-tab station-tab--add" onClick={addStation} title="Add station">
        <Plus size={14} />
      </button>
    </div>
  )
}

// ─── PAGE: Project Setup ──────────────────────────────────────────────────────

export function PageProjectSetup() {
  const project = useProjectStore(s => s.project)
  const updateProject = useProjectStore(s => s.updateProject)
  const stations = useProjectStore(s => s.project.stations)
  const updateStation = useProjectStore(s => s.updateStation)
  const removeStation = useProjectStore(s => s.removeStation)
  const addStation = useProjectStore(s => s.addStation)

  return (
    <div className="page">
      <Grid2>
        <SectionCard title="Client Information" icon={Building2}>
          <FieldInput label="Project Number" value={project.projectNumber} type="text"
            onChange={v => updateProject({ projectNumber: v })} />
          <FieldInput label="Client Name" value={project.clientName} type="text"
            onChange={v => updateProject({ clientName: v })} />
          <FieldInput label="End Client" value={project.endClient} type="text"
            onChange={v => updateProject({ endClient: v })} />
          <FieldInput label="Project Name" value={project.projectName} type="text"
            onChange={v => updateProject({ projectName: v })} />
          <FieldInput label="Designer" value={project.designer} type="text"
            onChange={v => updateProject({ designer: v })} />
        </SectionCard>

        <SectionCard title="System Configuration" icon={Cpu}>
          <SelectField
            label="System Design Life Target"
            value={project.systemDesignLifeYears}
            onChange={v => updateProject({ systemDesignLifeYears: parseInt(v) })}
            options={[15, 20, 25, 30, 35, 40].map(y => ({ value: y, label: `${y} years` }))}
          />
          <SelectField
            label="Default Anode Type"
            value={stations[0]?.anodeSpec?.id || 'HSCI_TA4'}
            onChange={v => {
              const spec = ANODE_SPECS[v]
              stations.forEach(st => updateStation(st.id, s => { s.anodeSpec = { ...spec } }))
            }}
            options={Object.values(ANODE_SPECS).map(a => ({ value: a.id, label: a.label }))}
          />
          <div className="field">
            <label className="field-label">Project Status</label>
            <div style={{ marginTop: 6 }}>
              <WorkflowStepper currentStatus={project.status} />
            </div>
          </div>
        </SectionCard>
      </Grid2>

      <SectionCard title="ICCP Stations" icon={Layers}
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
                label="" value={st.name} type="text"
                onChange={v => updateStation(st.id, s => { s.name = v })}
                className="station-name-input"
              />
              <FieldInput
                label="" value={st.location} type="text"
                onChange={v => updateStation(st.id, s => { s.location = v })}
                className="station-loc-input"
              />
              <StatusBadge status={st.status} />
              {stations.length > 1 && (
                <button className="btn-icon-ghost" onClick={() => removeStation(st.id)}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}

// ─── PAGE: Pipeline Parameters ────────────────────────────────────────────────

export function PagePipeline() {
  const station = useProjectStore(s => s.getActiveStation())
  const updateStation = useProjectStore(s => s.updateStation)
  const updateSegment = useProjectStore(s => s.updateSegment)

  if (!station) return null
  const seg = station.pipelineSegments[0]
  const odM = (seg.od * 0.0254).toFixed(4)
  const area = (Math.PI * seg.od * 0.0254 * seg.lengthM).toFixed(2)
  const soilClass = getSoilClassification(station.soilResistivityOhmCm)

  return (
    <div className="page">
      <StationTabs />
      <Grid2>
        <SectionCard title="Pipeline Geometry" icon={Route}>
          <FieldInput label="Outside Diameter" value={seg.od} unit="inches"
            hint={`= ${odM} m`} step={0.5}
            onChange={v => updateSegment(station.id, seg.id, { od: v })} />
          <FieldInput label="Wall Thickness" value={seg.wallThk} unit="inches" step={0.001}
            onChange={v => updateSegment(station.id, seg.id, { wallThk: v })} />
          <Grid2>
            <FieldInput label="Section Length" value={seg.lengthM} unit="m"
              onChange={v => updateSegment(station.id, seg.id, { lengthM: v })} />
          </Grid2>
          <div className="calc-preview">
            <ResultRow label="External Surface Area" symbol="A" value={area} unit="m²" />
          </div>
        </SectionCard>

        <SectionCard title="Operating Conditions" icon={Zap}>
          <FieldInput label="Operating Temperature" value={seg.opTempC} unit="°C" step={0.1}
            onChange={v => updateSegment(station.id, seg.id, { opTempC: v })} />
          <FieldInput label="Base Current Density @ 25°C" value={seg.currentDensityBase} unit="mA/m²" step={0.01}
            onChange={v => updateSegment(station.id, seg.id, { currentDensityBase: v })} />
          <SelectField label="Coating System"
            value={seg.coatingType}
            onChange={v => updateSegment(station.id, seg.id, { coatingType: v })}
            options={[
              { value: 'fusion_bonded_epoxy', label: 'Fusion Bonded Epoxy (FBE)' },
              { value: 'three_layer_polyethylene', label: '3-Layer Polyethylene (3LPE)' },
              { value: 'coal_tar_enamel', label: 'Coal Tar Enamel' },
              { value: 'bare', label: 'Bare Steel' },
            ]}
          />
        </SectionCard>
      </Grid2>

      <Grid2>
        <SectionCard title="Soil Conditions" icon={Layers}>
          <FieldInput label="Soil Resistivity (at anode depth)" value={station.soilResistivityOhmCm} unit="Ω·cm"
            onChange={v => updateStation(station.id, s => { s.soilResistivityOhmCm = v })} />
          <div className="calc-preview">
            <ResultRow label="Soil Classification" value={soilClass.label} />
            <ResultRow label="Description" value={soilClass.description} />
          </div>
          {station.soilResistivityOhmCm > 10000 && (
            <InfoBox type="warning">
              High soil resistivity detected. Deepwell groundbed recommended.
            </InfoBox>
          )}
        </SectionCard>

        <SectionCard title="Groundbed Location" icon={Layers}>
          <FieldInput label="Actual Groundbed Distance to Pipeline" value={station.actualRemotenesM} unit="m"
            onChange={v => updateStation(station.id, s => { s.actualRemotenesM = v })} />
          <FieldInput label="Required Minimum Distance" value={station.requiredRemotenesM} unit="m"
            onChange={v => updateStation(station.id, s => { s.requiredRemotenesM = v })} />
          {station.actualRemotenesM < station.requiredRemotenesM && (
            <InfoBox type="error">
              Groundbed is too close to pipeline. Minimum {station.requiredRemotenesM}m required.
            </InfoBox>
          )}
        </SectionCard>
      </Grid2>
    </div>
  )
}

// ─── PAGE: Current Requirement ────────────────────────────────────────────────

export function PageCurrentRequirement() {
  const stations = useProjectStore(s => s.project.stations)
  const calculateStation = useProjectStore(s => s.calculateStation)

  const totalDesignA = stations.reduce((acc, st) =>
    acc + (st.lastCalcResult?.designCurrentA || 0), 0)

  return (
    <div className="page">
      <div className="stat-grid">
        {stations.map(st => (
          <StatCard
            key={st.id}
            label={st.name.split('@')[0].trim()}
            value={st.lastCalcResult ? st.lastCalcResult.designCurrentA.toFixed(2) : '—'}
            unit="A (incl. 30% spare)"
          />
        ))}
        <StatCard label="Total System Current" value={totalDesignA.toFixed(2)} unit="A" />
      </div>

      <InfoBox type="info">
        I = A × i_T × 1.30 &nbsp;|&nbsp; i_T = i_base × [1 + (T − 25) × 0.025] &nbsp;(NACE SP0169)
      </InfoBox>

      {stations.map(st => {
        const r = st.lastCalcResult
        const seg = st.pipelineSegments[0]
        return (
          <SectionCard key={st.id} title={st.name} icon={Zap}
            action={
              <button className="btn btn-sm" onClick={() => calculateStation(st.id)}>
                Calculate
              </button>
            }
          >
            {r ? (
              <>
                <ResultRow label="Pipeline Length" value={seg.lengthM.toFixed(0)} unit="m" />
                <ResultRow label="External Surface Area" symbol="A" value={r.totalSurfaceAreaM2.toFixed(2)} unit="m²"
                  formula="A = π × D × L" />
                <ResultRow label="Temp-Corrected Current Density" symbol="i_T" value={r.tempCorrectedCurrentDensity.toFixed(5)} unit="mA/m²"
                  formula="i_T = i_base × [1 + (T − 25) × 0.025]" />
                <ResultRow label="Required Current" symbol="I_req" value={r.requiredCurrentA.toFixed(5)} unit="A" />
                <Divider />
                <ResultRow label="Design Current (+30% spare)" symbol="I_design" value={r.designCurrentA.toFixed(4)} unit="A" highlight />
                <ResultRow label="Anodes Required (by current)" value={Math.ceil(r.designCurrentA / st.anodeSpec.outputAmps).toString()} unit="ea." />
                <ResultRow label="Anodes Required (by TR rating)" value={Math.ceil(st.tr.ratedCurrent / st.anodeSpec.outputAmps).toString()} unit="ea." />
                <ResultRow label="Proposed Anode Quantity" value={st.proposedAnodes.toString()} unit="ea." highlight />
              </>
            ) : (
              <div className="no-result">Click Calculate to run current requirement analysis</div>
            )}
          </SectionCard>
        )
      })}
    </div>
  )
}

// ─── PAGE: Groundbed Design ───────────────────────────────────────────────────

export function PageGroundbed() {
  const station = useProjectStore(s => s.getActiveStation())
  const updateStation = useProjectStore(s => s.updateStation)
  const calculateStation = useProjectStore(s => s.calculateStation)
  if (!station) return null
  const r = station.lastCalcResult
  const gb = station.groundbed
  const isDeep = gb.type === 'deepwell'

  return (
    <div className="page">
      <StationTabs />
      <Grid2>
        <SectionCard title="Groundbed Configuration" icon={Layers}>
          <SelectField label="Groundbed Type" value={gb.type}
            onChange={v => updateStation(station.id, s => { s.groundbed.type = v; s.groundbed.numHoles = v === 'deepwell' ? 1 : station.proposedAnodes })}
            options={Object.values(DESIGN_MODES).filter(m => m.available).map(m => ({ value: m.id, label: m.label }))}
          />
          <SelectField label="Anode Specification" value={station.anodeSpec.id}
            onChange={v => updateStation(station.id, s => { s.anodeSpec = { ...ANODE_SPECS[v] } })}
            options={Object.values(ANODE_SPECS).filter(a => a.type !== 'Sacrificial').map(a => ({ value: a.id, label: a.label }))}
          />
          <Grid2>
            <FieldInput label="Depth to Active Zone" value={gb.startDepthM} unit="m" step={0.5}
              onChange={v => updateStation(station.id, s => { s.groundbed.startDepthM = v })} />
            <FieldInput label="Borehole Diameter" value={gb.boreholeDiaM} unit="m" step={0.01}
              onChange={v => updateStation(station.id, s => { s.groundbed.boreholeDiaM = v })} />
          </Grid2>
          <Grid2>
            <FieldInput label="Anode Length" value={gb.anodeLengthM} unit="m" step={0.01}
              onChange={v => updateStation(station.id, s => { s.groundbed.anodeLengthM = v })} />
            <FieldInput label="Anode Spacing (end-end)" value={gb.anodeSpacingM} unit="m" step={0.1}
              onChange={v => updateStation(station.id, s => { s.groundbed.anodeSpacingM = v })} />
          </Grid2>
          {isDeep && (
            <Grid2>
              <FieldInput label="Coke Cover Above Top Anode" value={gb.cokeCoverM} unit="m" step={0.1}
                onChange={v => updateStation(station.id, s => { s.groundbed.cokeCoverM = v })} />
              <FieldInput label="Bottom Cement Plug" value={gb.cementPlugM} unit="m" step={0.1}
                onChange={v => updateStation(station.id, s => { s.groundbed.cementPlugM = v })} />
            </Grid2>
          )}
          <FieldInput label="Number of Anodes (Proposed)" value={station.proposedAnodes}
            onChange={v => updateStation(station.id, s => { s.proposedAnodes = Math.max(1, v) })} />
          <button className="btn btn-primary btn-full" onClick={() => calculateStation(station.id)}>
            Run Calculations
          </button>
        </SectionCard>

        <SectionCard title="Calculated Results" icon={BarChart3}>
          {r ? (
            <>
              <ResultRow label="Active Column Length" symbol="L_a" value={r.activeLengthM.toFixed(2)} unit="m"
                formula={isDeep ? "L_a = N × L_anode + (N-1) × spacing" : "L_a = anode length"} />
              {isDeep && <ResultRow label="Total Drilling Depth" value={r.totalDrillDepthM.toFixed(2)} unit="m" />}
              <Divider />
              <ResultRow label="Groundbed Resistance" symbol="R_G" value={r.groundbedResistanceOhm.toFixed(4)} unit="Ω"
                formula={isDeep ? "Dwight: R_G = ρ/(2πL) × (ln(8L/d) − 1 + L/4h)" : "Sunde parallel vertical"}
                highlight />
              <ResultRow label="Max Allowable R_G" value={r.maxAllowableGroundbedRes.toFixed(4)} unit="Ω" />
              <ResultRow label="R_G Status" value={r.groundbedResistanceOhm < r.maxAllowableGroundbedRes ? '✓ Within limit' : '✗ Exceeds limit'} />
              <Divider />
              <ResultRow label="Design Life" symbol="Y" value={r.designLifeYears.toFixed(1)} unit="years"
                formula="Y = (N × W) / (C × I)" highlight />
              <ResultRow label="Target Design Life" value={r.targetDesignLifeYears.toString()} unit="years" />
              <ResultRow label="Coke Bags (est.)" value={Math.ceil(Math.PI * Math.pow(gb.boreholeDiaM / 2, 2) * r.activeLengthM * 700 / 25 * 1.10).toString()} unit="bags" />
            </>
          ) : (
            <div className="no-result">Run calculations to see groundbed resistance and design life</div>
          )}
        </SectionCard>
      </Grid2>

      {station.insights.filter(i => i.calculationRef === 'Groundbed Resistance' || i.calculationRef === 'Soil Analysis' || i.calculationRef === 'Design Life').map((ins, i) => (
        <InsightCard key={i} insight={ins} />
      ))}
    </div>
  )
}

// ─── PAGE: Cable Resistance ───────────────────────────────────────────────────

export function PageCableResistance() {
  const station = useProjectStore(s => s.getActiveStation())
  const updateStation = useProjectStore(s => s.updateStation)
  const calculateStation = useProjectStore(s => s.calculateStation)
  if (!station) return null
  const r = station.lastCalcResult
  const cb = station.cables
  const N = station.proposedAnodes
  const cableSizeOptions = Object.values(CABLE_SPECS).map(c => ({ value: c.sizeMm2, label: c.label }))

  return (
    <div className="page">
      <StationTabs />

      <SectionCard title="Anode Tail Cables — Positive Circuit" icon={Cable}>
        <Grid2>
          <SelectField label="Anode Tail Cable Size" value={cb.anodeCableSizeMm2}
            onChange={v => updateStation(station.id, s => { s.cables.anodeCableSizeMm2 = parseInt(v) })}
            options={cableSizeOptions} />
        </Grid2>
        <div className="anode-tail-grid">
          {Array.from({ length: N }, (_, i) => (
            <FieldInput key={i}
              label={`Anode ${i + 1}`}
              value={cb.anodeTailLengths[i] || 0}
              unit="m"
              onChange={v => updateStation(station.id, s => { s.cables.anodeTailLengths[i] = v })}
            />
          ))}
        </div>
        {r && <ResultRow label="Parallel Anode Tail Resistance" symbol="R_ac" value={r.anodeTailParallelResOhm.toFixed(6)} unit="Ω"
          formula="R_ac = 1 / Σ(1 / (L_i × r))" highlight />}
      </SectionCard>

      <Grid2>
        <SectionCard title="Positive Main Cable" icon={Cable}>
          <FieldInput label="Length" value={cb.posMainLengthM} unit="m"
            onChange={v => updateStation(station.id, s => { s.cables.posMainLengthM = v })} />
          <SelectField label="Cable Size" value={cb.posMainSizeMm2}
            onChange={v => updateStation(station.id, s => { s.cables.posMainSizeMm2 = parseInt(v) })}
            options={cableSizeOptions} />
          {r && <ResultRow label="R_pc" symbol="R_pc" value={r.posMainCableResOhm.toFixed(5)} unit="Ω" />}
          {r && <ResultRow label="Total Positive R" value={(r.anodeTailParallelResOhm + r.posMainCableResOhm).toFixed(5)} unit="Ω" highlight />}
        </SectionCard>

        <SectionCard title="Negative Circuit Cables" icon={Cable}>
          <FieldInput label="Main Negative Length" value={cb.negMainLengthM} unit="m"
            onChange={v => updateStation(station.id, s => { s.cables.negMainLengthM = v })} />
          <SelectField label="Main Negative Size" value={cb.negMainSizeMm2}
            onChange={v => updateStation(station.id, s => { s.cables.negMainSizeMm2 = parseInt(v) })}
            options={cableSizeOptions} />
          <FieldInput label="Secondary Negative Length" value={cb.negSecLengthM} unit="m"
            onChange={v => updateStation(station.id, s => { s.cables.negSecLengthM = v })} />
          <SelectField label="Secondary Negative Size" value={cb.negSecSizeMm2}
            onChange={v => updateStation(station.id, s => { s.cables.negSecSizeMm2 = parseInt(v) })}
            options={cableSizeOptions} />
          {r && <ResultRow label="Total Negative R" value={r.negMainCableResOhm.toFixed(5)} unit="Ω" highlight />}
        </SectionCard>
      </Grid2>

      {r && (
        <SectionCard title="Total Cable Circuit Resistance" icon={BarChart3}>
          <ResultRow label="R_c = R_ac + R_pc + R_nc" symbol="R_c" value={r.totalCableResOhm.toFixed(5)} unit="Ω" highlight />
        </SectionCard>
      )}
    </div>
  )
}

// ─── PAGE: TR Sizing ──────────────────────────────────────────────────────────

export function PageTRSizing() {
  const station = useProjectStore(s => s.getActiveStation())
  const updateStation = useProjectStore(s => s.updateStation)
  const calculateStation = useProjectStore(s => s.calculateStation)
  if (!station) return null
  const r = station.lastCalcResult
  const tr = station.tr

  return (
    <div className="page">
      <StationTabs />
      <Grid2>
        <SectionCard title="TR Unit Ratings" icon={Cpu}>
          <Grid2>
            <FieldInput label="Rated DC Voltage" value={tr.ratedVoltage} unit="V DC"
              onChange={v => updateStation(station.id, s => { s.tr.ratedVoltage = v })} />
            <FieldInput label="Rated DC Current" value={tr.ratedCurrent} unit="A DC"
              onChange={v => updateStation(station.id, s => { s.tr.ratedCurrent = v })} />
          </Grid2>
          <FieldInput label="Back EMF" value={tr.backEMF} unit="V" step={0.5}
            onChange={v => updateStation(station.id, s => { s.tr.backEMF = v })} />
          <FieldInput label="Structure-to-Earth Resistance" value={tr.structureResistance} unit="Ω" step={0.001}
            onChange={v => updateStation(station.id, s => { s.tr.structureResistance = v })} />
          <button className="btn btn-primary btn-full" onClick={() => calculateStation(station.id)}>
            Analyse Circuit
          </button>
        </SectionCard>

        <SectionCard title="Circuit Analysis" icon={BarChart3}>
          {r ? (
            <>
              <ResultRow label="Groundbed Resistance" symbol="R_G" value={r.groundbedResistanceOhm.toFixed(4)} unit="Ω" />
              <ResultRow label="Total Cable Resistance" symbol="R_c" value={r.totalCableResOhm.toFixed(4)} unit="Ω" />
              <ResultRow label="Back EMF Resistance" symbol="R_emf" value={r.backEMFResistanceOhm.toFixed(4)} unit="Ω"
                formula="R_emf = 2 × V_emf / I_rated" />
              <ResultRow label="Structure Resistance" symbol="R_s" value={tr.structureResistance.toFixed(4)} unit="Ω" />
              <Divider />
              <ResultRow label="Total Circuit Resistance" symbol="R_T" value={r.totalCircuitResistanceOhm.toFixed(4)} unit="Ω" highlight />
              <ResultRow label="Minimum TR Voltage" symbol="V_min" value={r.minTRVoltage.toFixed(2)} unit="V"
                formula="V_min = R_T × I_rated + V_emf" highlight />
              <ResultRow
                label="TR Voltage Adequate?"
                value={tr.ratedVoltage >= r.minTRVoltage ? `✓ ${tr.ratedVoltage}V ≥ ${r.minTRVoltage.toFixed(2)}V` : `✗ ${tr.ratedVoltage}V < ${r.minTRVoltage.toFixed(2)}V`}
              />
              <Divider />
              <ResultRow label="DC Power" value={r.dcPowerW.toString()} unit="W" />
              <ResultRow label="AC Input Power" value={r.acInputKVA.toFixed(2)} unit="kVA" />
              <ResultRow label="AC Input Current (480V/3Φ)" value={r.acInputCurrentA.toFixed(2)} unit="A" />
            </>
          ) : (
            <div className="no-result">Configure TR ratings and run circuit analysis</div>
          )}
        </SectionCard>
      </Grid2>
    </div>
  )
}

// ─── PAGE: Validation ─────────────────────────────────────────────────────────

export function PageValidation() {
  const stations = useProjectStore(s => s.project.stations)
  const calculateStation = useProjectStore(s => s.calculateStation)
  const advanceWorkflow = useProjectStore(s => s.advanceWorkflow)
  const createRevision = useProjectStore(s => s.createRevision)

  return (
    <div className="page">
      {stations.map(st => {
        const r = st.lastCalcResult
        const allPass = r?.allChecksPassed
        const failCount = r?.checks?.filter(c => c.status === 'fail').length || 0
        const warnCount = r?.checks?.filter(c => c.status === 'warning').length || 0

        return (
          <div key={st.id} style={{ marginBottom: 24 }}>
            <div className="validation-header">
              <div>
                <div className="validation-station-name">{st.name}</div>
                <div className="validation-summary">
                  {!r ? 'Not calculated' :
                    allPass ? `✓ All checks pass` :
                      `${failCount} fail${failCount !== 1 ? 's' : ''}, ${warnCount} warning${warnCount !== 1 ? 's' : ''}`}
                </div>
              </div>
              <div className="validation-actions">
                <button className="btn btn-sm" onClick={() => calculateStation(st.id)}>
                  Recalculate
                </button>
                {r && allPass && (
                  <button className="btn btn-sm btn-primary"
                    onClick={() => { advanceWorkflow(st.id, 'approved'); createRevision(`${st.name} approved`) }}>
                    Approve
                  </button>
                )}
              </div>
            </div>

            {!r && (
              <InfoBox type="info">Click Recalculate to run engineering checks for this station.</InfoBox>
            )}

            {r && (
              <>
                <WorkflowStepper currentStatus={st.status} />
                <div style={{ marginTop: 12 }}>
                  {r.checks.map(check => <CheckRow key={check.id} check={check} />)}
                </div>
                {r.insights.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <div className="section-label">Engineering Insights</div>
                    {r.insights.map((ins, i) => <InsightCard key={i} insight={ins} />)}
                  </div>
                )}
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── PAGE: Design Optimizer ───────────────────────────────────────────────────

export function PageOptimizer() {
  const station = useProjectStore(s => s.getActiveStation())
  const updateStation = useProjectStore(s => s.updateStation)
  const calculateStation = useProjectStore(s => s.calculateStation)
  const [selectedAlt, setSelectedAlt] = useState(null)
  if (!station) return null

  const alts = station.alternatives || []

  function applyAlternative(alt) {
    if (alt.isCurrentDesign) return
    if (alt.parameters.proposedAnodes) {
      updateStation(station.id, s => { s.proposedAnodes = alt.parameters.proposedAnodes })
    }
    if (alt.parameters.trVoltage) {
      updateStation(station.id, s => { s.tr.ratedVoltage = alt.parameters.trVoltage })
    }
    if (alt.parameters.trCurrent) {
      updateStation(station.id, s => { s.tr.ratedCurrent = alt.parameters.trCurrent })
    }
    calculateStation(station.id)
    setSelectedAlt(null)
  }

  return (
    <div className="page">
      <StationTabs />
      <InfoBox type="info">
        The optimizer evaluates multiple design variants automatically. Select an alternative to apply it.
      </InfoBox>

      {alts.length === 0 && (
        <div className="no-result" style={{ padding: 24 }}>
          Run calculations first to generate design alternatives.
          <button className="btn btn-sm btn-primary" style={{ marginTop: 12 }} onClick={() => calculateStation(station.id)}>
            Calculate Station
          </button>
        </div>
      )}

      <div className="alt-grid">
        {alts.map(alt => {
          const r = alt.result
          const allPass = r?.allChecksPassed
          const isSelected = selectedAlt === alt.id

          return (
            <div
              key={alt.id}
              className={`alt-card ${alt.isCurrentDesign ? 'alt-card--current' : ''} ${isSelected ? 'alt-card--selected' : ''} ${allPass ? 'alt-card--pass' : 'alt-card--fail'}`}
              onClick={() => setSelectedAlt(isSelected ? null : alt.id)}
            >
              <div className="alt-card-header">
                <span className="alt-label">{alt.label}</span>
                {alt.isCurrentDesign && <span className="alt-badge">Current</span>}
                {allPass ? <CheckCircle2 size={16} color="var(--pass)" /> : <XCircle size={16} color="var(--fail)" />}
              </div>

              {r && (
                <div className="alt-stats">
                  <div className="alt-stat"><span>Design Life</span><strong>{r.designLifeYears?.toFixed(1)}y</strong></div>
                  <div className="alt-stat"><span>R_G</span><strong>{r.groundbedResistanceOhm?.toFixed(4)}Ω</strong></div>
                  <div className="alt-stat"><span>V_min</span><strong>{r.minTRVoltage?.toFixed(1)}V</strong></div>
                </div>
              )}

              {isSelected && (
                <div className="alt-details">
                  <div style={{ marginBottom: 8 }}>
                    <div className="section-label">Advantages</div>
                    {alt.advantages.map((a, i) => <div key={i} className="alt-advantage">✓ {a}</div>)}
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <div className="section-label">Disadvantages</div>
                    {alt.disadvantages.map((d, i) => <div key={i} className="alt-disadvantage">− {d}</div>)}
                  </div>
                  {!alt.isCurrentDesign && (
                    <button className="btn btn-primary btn-full" onClick={() => applyAlternative(alt)}>
                      Apply This Design
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── PAGE: Bill of Materials ──────────────────────────────────────────────────

export function PageBOM() {
  const stations = useProjectStore(s => s.project.stations)
  const getBOM = useProjectStore(s => s.getBOMForStation)
  const projectStatus = useProjectStore(s => s.project.status)

  const canViewBOM = BOM_ALLOWED_STATUSES.includes(projectStatus) ||
    stations.some(st => BOM_ALLOWED_STATUSES.includes(st.status))

  return (
    <div className="page">
      {!canViewBOM && (
        <InfoBox type="warning">
          BOM is only available for stations with status: Approved or Issued for Construction.
          Complete the engineering review and approve the design first.
        </InfoBox>
      )}

      {stations.map(st => {
        if (!BOM_ALLOWED_STATUSES.includes(st.status) && !BOM_ALLOWED_STATUSES.includes(projectStatus)) return null
        const bom = st.lastCalcResult ? generateBOMForDisplay(st) : []

        return (
          <SectionCard key={st.id} title={`BOM — ${st.name}`} icon={List}
            action={<button className="btn btn-sm"><Download size={13} /> Export CSV</button>}
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
                  <div><span className={`tag tag-${item.tag.toLowerCase().replace(/\s+/g, '-')}`}>{item.tag}</span></div>
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

function generateBOMForDisplay(station) {
  if (!station.lastCalcResult) return []
  // generateBOM already imported at top
  return generateBOM(station, station.lastCalcResult)
}

// ─── PAGE: Summary Report ─────────────────────────────────────────────────────

export function PageReport() {
  const project = useProjectStore(s => s.project)
  const stations = useProjectStore(s => s.project.stations)
  const createRevision = useProjectStore(s => s.createRevision)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [xlsxLoading, setXlsxLoading] = useState(false)
  const [revDesc, setRevDesc] = useState('')
  const allCalculated = stations.every(s => s.lastCalcResult)

  async function handlePDF() {
    setPdfLoading(true)
    try {
      downloadEngineeringReport(project)
    } finally {
      setTimeout(() => setPdfLoading(false), 1000)
    }
  }

  function handleExcel() {
    setXlsxLoading(true)
    try {
      exportToExcel(project)
    } finally {
      setTimeout(() => setXlsxLoading(false), 800)
    }
  }

  return (
    <div className="page">
      {/* Export Actions */}
      <div className="export-bar">
        <div className="export-bar-title">Export Engineering Documents</div>
        <div className="export-bar-actions">
          <button
            className={"btn btn-primary " + (pdfLoading ? "btn--loading" : "")}
            onClick={handlePDF}
            disabled={pdfLoading || !allCalculated}
            title={!allCalculated ? "Calculate all stations first" : "Download PDF engineering report"}
          >
            <Download size={14} />
            {pdfLoading ? "Generating PDF…" : "Download PDF Report"}
          </button>
          <button
            className={"btn " + (xlsxLoading ? "btn--loading" : "")}
            onClick={handleExcel}
            disabled={xlsxLoading}
          >
            <FileSpreadsheet size={14} />
            {xlsxLoading ? "Exporting…" : "Export to Excel"}
          </button>
        </div>
        {!allCalculated && (
          <div style={{fontSize:11,color:'var(--warn)',marginTop:6}}>
            ⚠ PDF export requires all stations to be calculated first.
          </div>
        )}
      </div>

      <SectionCard title="Project Summary" icon={FileText}>
        <ResultRow label="Project Number" value={project.projectNumber} />
        <ResultRow label="Client" value={project.clientName} />
        <ResultRow label="Project" value={project.projectName} />
        <ResultRow label="ICCP Stations" value={stations.length.toString()} />
        <ResultRow label="System Design Life" value={project.systemDesignLifeYears.toString()} unit="years" />
        <ResultRow label="Status" value={(project.status || '').replace(/_/g, ' ').toUpperCase()} />
      </SectionCard>

      {stations.map(st => {
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
              <Grid2>
                <div>
                  <div className="section-label">TR Unit</div>
                  <ResultRow label="Rating" value={`${st.tr.ratedVoltage}V / ${st.tr.ratedCurrent}A DC`} />
                  <ResultRow label="Min Voltage Required" value={r.minTRVoltage.toFixed(2)} unit="V" />
                  <ResultRow label="Total Circuit R" value={r.totalCircuitResistanceOhm.toFixed(4)} unit="Ω" />
                  <ResultRow label="AC Input" value={`${r.acInputCurrentA.toFixed(2)}A @ 480V/3Φ`} />
                </div>
                <div>
                  <div className="section-label">Groundbed</div>
                  <ResultRow label="Type" value={st.groundbed.type === 'deepwell' ? 'Deepwell' : 'Shallow Vertical'} />
                  <ResultRow label="Anodes" value={`${st.proposedAnodes} ea.`} />
                  <ResultRow label="Resistance R_G" value={r.groundbedResistanceOhm.toFixed(4)} unit="Ω" />
                  <ResultRow label="Design Life" value={r.designLifeYears.toFixed(1)} unit="years" />
                </div>
              </Grid2>
            ) : (
              <div className="no-result">Station not calculated</div>
            )}
          </SectionCard>
        )
      })}

      {/* Create Revision */}
      <SectionCard title="Create Revision Snapshot" icon={FileText}>
        <InfoBox type="info">Creating a revision saves a permanent snapshot of the current design state.</InfoBox>
        <div style={{display:'flex',gap:8,marginTop:8}}>
          <input
            className="field-input"
            placeholder="Revision description (e.g. Updated soil resistivity)"
            value={revDesc}
            onChange={e => setRevDesc(e.target.value)}
            style={{flex:1}}
          />
          <button className="btn btn-primary" onClick={() => { if(revDesc.trim()){createRevision(revDesc);setRevDesc('')}}}>
            Create REV-{project.revisions.length}
          </button>
        </div>
      </SectionCard>

      {project.revisions.length > 0 && (
        <SectionCard title="Revision History" icon={FileText}>
          {project.revisions.map(rev => (
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

// ─── PAGE: Import (Excel) ─────────────────────────────────────────────────────

export function PageImport() {
  const newProject = useProjectStore(s => s.newProject)
  const updateProject = useProjectStore(s => s.updateProject)
  const fileRef = useRef(null)
  const [status, setStatus] = useState(null)  // null | 'loading' | {errors, count}
  const [dragOver, setDragOver] = useState(false)

  async function handleFile(file) {
    if (!file) return
    setStatus('loading')
    try {
      const { project, errors } = await importFromExcel(file)
      // Merge into store
      updateProject({
        projectNumber:          project.projectNumber,
        projectName:            project.projectName,
        clientName:             project.clientName,
        endClient:              project.endClient,
        designer:               project.designer,
        systemDesignLifeYears:  project.systemDesignLifeYears,
        stations:               project.stations,
      })
      setStatus({ errors, count: project.stations.length })
    } catch (e) {
      setStatus({ errors: [`Import failed: ${e.message}`], count: 0 })
    }
  }

  return (
    <div className="page">
      <SectionCard title="Import from Excel" icon={Upload}>
        <InfoBox type="info">
          Supported formats: CP Designer export (.xlsx) · Generic PCP workbook (.xlsx / .xls)
        </InfoBox>

        <div
          className={`drop-zone ${dragOver ? 'drop-zone--over' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]) }}
          onClick={() => fileRef.current?.click()}
        >
          <FileSpreadsheet size={32} style={{ color: 'var(--brand-mid)', marginBottom: 8 }} />
          <div style={{ fontWeight: 500, marginBottom: 4 }}>Drop Excel file here or click to browse</div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>.xlsx or .xls · Max 10MB</div>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            style={{ display: 'none' }}
            onChange={e => handleFile(e.target.files[0])}
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
                <span>{status.count} station(s) imported successfully. Go to Project Setup to verify.</span>
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
