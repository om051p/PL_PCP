/**
 * AttenuationPage.jsx
 *
 * Cathodic Protection Pipeline Attenuation Analysis Page — Flagship Layout.
 * Enterprise redesign: KPI row, full-width interactive graph, critical locations.
 */

import { useState, useEffect } from 'react'
import { useProjectStore } from '../store/projectStore.js'
import { FieldInput, ResultRow, StatCard, SectionCard, Grid2 } from '../components/ui.jsx'
import { CalculationInputsUsed, buildAttenuationInputsUsed } from '../visualizations/index.js'

import { ProfileChart } from '../components/analytics/ProfileChart.jsx'
import { AttenuationExplorer } from '../visualizations/AttenuationExplorer.jsx'

// ─── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_INPUT = {
  pipe: {
    diameterInches: 30,
    wallThicknessInches: 1.27,
    totalLengthKm: 44,
    maxProtectionLengthKm: 25,
    steelResistivityMicroOhmCm: 18,
  },
  coating: {
    conductivityMicroSiemensPerM2: 300,
    soilResistivityOhmCm: 1000,
    currentDensityMaPerM2: 0.175,
  },
  potentials: {
    naturalMv: 550,
    drainPointMv: 1100,
    minimumMv: 1000,
  },
  stations: [
    { id: 'CP3', positionKm: 44, label: 'CP#3 @ KM 44+635' },
    { id: 'CP4', positionKm: 69, label: 'CP#4 @ KM 69+017' },
    { id: 'CP5', positionKm: 73, label: 'CP#5 @ KM 73+300' },
    { id: 'CP6', positionKm: 82, label: 'CP#6 @ KM 82+520' },
  ],
  profileConfig: { startKm: 44, endKm: 89, stepKm: 1.0 },
}

const STATION_COLORS = ['#1D9E75', '#D85A30', '#7F77DD', '#BA7517', '#3B8BD4', '#E24B4A']

// ─── Station Table ───────────────────────────────────────────────────────────

function StationsTable({ stations, onAdd, onRemove, onUpdate }) {
  const [newStation, setNewStation] = useState({ id: '', positionKm: '', label: '' })

  const handleAdd = () => {
    if (!newStation.id || newStation.positionKm === '') return
    onAdd({ ...newStation, positionKm: parseFloat(newStation.positionKm) })
    setNewStation({ id: '', positionKm: '', label: '' })
  }

  return (
    <div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left' }}>ID</th>
            <th style={{ textAlign: 'left' }}>Position (km)</th>
            <th style={{ textAlign: 'left' }}>Label</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {stations.map((s, i) => (
            <tr key={s.id}>
              <td>
                <span
                  style={{
                    display: 'inline-block',
                    width: 10,
                    height: 10,
                    borderRadius: 2,
                    background: STATION_COLORS[i % STATION_COLORS.length],
                    marginRight: 6,
                  }}
                />
                {s.id}
              </td>
              <td>
                <input
                  type="number"
                  value={s.positionKm}
                  step="0.1"
                  className="field-input"
                  style={{ width: 80 }}
                  onChange={(e) => onUpdate(s.id, { positionKm: parseFloat(e.target.value) })}
                />
              </td>
              <td style={{ width: '100%' }}>
                <input
                  type="text"
                  value={s.label || ''}
                  className="field-input"
                  style={{ width: '100%' }}
                  onChange={(e) => onUpdate(s.id, { label: e.target.value })}
                />
              </td>
              <td>
                <button
                  className="btn-icon-ghost"
                  onClick={() => onRemove(s.id)}
                  title="Remove station"
                >
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: 'flex', gap: 6, marginTop: 10, alignItems: 'center' }}>
        <input
          type="text"
          placeholder="ID"
          value={newStation.id}
          className="field-input"
          style={{ width: 70 }}
          onChange={(e) => setNewStation((s) => ({ ...s, id: e.target.value }))}
        />
        <input
          type="number"
          placeholder="KM"
          value={newStation.positionKm}
          step="0.1"
          className="field-input"
          style={{ width: 80 }}
          onChange={(e) => setNewStation((s) => ({ ...s, positionKm: e.target.value }))}
        />
        <input
          type="text"
          placeholder="Label (optional)"
          value={newStation.label}
          className="field-input"
          style={{ flex: 1 }}
          onChange={(e) => setNewStation((s) => ({ ...s, label: e.target.value }))}
        />
        <button className="btn btn-sm" onClick={handleAdd}>
          + Add
        </button>
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function AttenuationPage() {
  const {
    attenuationInput,
    attenuationResult,
    attenuationDirty,
    setAttenuationInput,
    replaceAttenuationInput,
    runAttenuationCalculation,
    addAttenuationStation,
    removeAttenuationStation,
    updateAttenuationStation,
  } = useProjectStore()

  const project = useProjectStore((s) => s.getProject())
  const activeStation = useProjectStore((s) => s.getActiveStation())
  const firstSegment = activeStation?.pipelineSegments?.[0]

  const diameter = firstSegment ? firstSegment.od : (attenuationInput || DEFAULT_INPUT).pipe.diameterInches
  const wallThickness = firstSegment ? firstSegment.wallThk : (attenuationInput || DEFAULT_INPUT).pipe.wallThicknessInches
  const soilResistivity = project?.designBasis?.soilResistivityOhmCm !== undefined ? project.designBasis.soilResistivityOhmCm : activeStation?.soilResistivityOhmCm || (attenuationInput || DEFAULT_INPUT).coating.soilResistivityOhmCm

  // Seed default input on first mount
  useEffect(() => {
    if (attenuationInput) return
    replaceAttenuationInput(DEFAULT_INPUT)
  }, [attenuationInput, replaceAttenuationInput])

  const input = attenuationInput || DEFAULT_INPUT
  const result = attenuationResult
  const im = result?.intermediates
  const cp = result?.checkPointAssessment
  const summary = result?.summary

  const setPipe = (field, val) =>
    setAttenuationInput({ pipe: { ...input.pipe, [field]: val } })
  const setCoating = (field, val) =>
    setAttenuationInput({ coating: { ...input.coating, [field]: val } })
  const setPot = (field, val) =>
    setAttenuationInput({ potentials: { ...input.potentials, [field]: val } })
  const setProfile = (field, val) =>
    setAttenuationInput({ profileConfig: { ...input.profileConfig, [field]: val } })

  const isDirty = attenuationDirty || !result

  return (
    <div className="page">
      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 500, margin: 0 }}>Attenuation Analysis</h1>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '2px 0 0' }}>
            Transmission-line cosh model · NACE SP0169 · ISO 15589-1
          </p>
        </div>
        <button
          className={`btn ${isDirty ? 'btn-primary' : ''}`}
          onClick={runAttenuationCalculation}
          disabled={!isDirty}
        >
          {isDirty ? '▶ Run calculation' : '✓ Up to date'}
        </button>
      </div>

      {/* Validation errors */}
      {result && !result.success && (
        <div className="info-box info-box--error" style={{ marginBottom: 10 }}>
          <div style={{ fontWeight: 500, fontSize: 13 }}>Calculation errors</div>
          {result.errors.map((e, i) => (
            <div key={i} style={{ fontSize: 13 }}>• {e}</div>
          ))}
        </div>
      )}

      {/* Protection Status KPI Row */}
      {result?.success && summary && (
        <div className="kpi-row" style={{ marginBottom: 10 }}>
          <div className={`kpi-card ${summary.designAdequate ? 'kpi-card--pass' : 'kpi-card--fail'}`}>
            <span className="kpi-card__label">Protection Coverage</span>
            <span className="kpi-card__value">{summary.protectionPercentage?.toFixed(0)}%</span>
            <span className="kpi-card__sub">{summary.protectedPoints}/{summary.totalProfilePoints} points</span>
          </div>
          <div className="kpi-card kpi-card--brand">
            <span className="kpi-card__label">Worst Potential</span>
            <span className="kpi-card__value">{summary.minCombinedPotentialMv?.toFixed(1)}</span>
            <span className="kpi-card__sub">mV (lowest combined)</span>
          </div>
          <div className="kpi-card kpi-card--info">
            <span className="kpi-card__label">Best Potential</span>
            <span className="kpi-card__value">{summary.maxCombinedPotentialMv?.toFixed(1)}</span>
            <span className="kpi-card__sub">mV (highest combined)</span>
          </div>
          <div className="kpi-card">
            <span className="kpi-card__label">Attenuation α</span>
            <span className="kpi-card__value">{(im.alpha * 1e5).toFixed(2)}</span>
            <span className="kpi-card__sub">×10⁻⁵ /m</span>
          </div>
          <div className="kpi-card">
            <span className="kpi-card__label">Stations</span>
            <span className="kpi-card__value">{(input.stations || []).length}</span>
            <span className="kpi-card__sub">CP stations</span>
          </div>
          <div className={`kpi-card ${summary.designAdequate ? 'kpi-card--pass' : 'kpi-card--fail'}`}>
            <span className="kpi-card__label">Design Status</span>
            <span className="kpi-card__value">{summary.designAdequate ? 'Adequate' : 'Gap'}</span>
            <span className="kpi-card__sub">{summary.designAdequate ? 'Full coverage' : 'Gaps found'}</span>
          </div>
        </div>
      )}

      {/* Warnings */}
      {result?.warnings?.length > 0 && (
        <div className="info-box info-box--warning" style={{ marginBottom: 10 }}>
          {result.warnings.map((w, i) => (
            <div key={i}>⚠ {w}</div>
          ))}
        </div>
      )}

      {/* Center: Full-width Interactive Attenuation Graph */}
      <div className="viz-fullwidth" style={{ marginBottom: 10 }}>
        <div className="viz-fullwidth__header">
          <span className="viz-fullwidth__title">Potential Profile Along Pipeline</span>
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
            KM {input.profileConfig.startKm} – {input.profileConfig.endKm} · Step {input.profileConfig.stepKm} km
          </span>
        </div>
        <div className="viz-fullwidth__body" style={{ minHeight: 500, padding: 8 }}>
          {!result?.success || !result.profile?.length ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400, color: 'var(--text-tertiary)', fontSize: 14 }}>
              Run the calculation to view the potential profile.
            </div>
          ) : (
            <AttenuationExplorer
              input={input}
              stations={input.stations || []}
              project={project}
              height={380}
            />
          )}
        </div>
      </div>

      {/* Bottom: Critical Locations & Engineering Info */}
      <div className="enterprise-2col">
        {/* Left: Calculation details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {result?.success && (
            <>
              <SectionCard title="Key Parameters">
                <ResultRow label="Station reach" value={summary.stationReachKm?.toFixed(2)} unit="km" />
                <ResultRow label="Current req. (total)" value={im.currentRequiredTotal_A?.toFixed(1)} unit="A" />
                <ResultRow label="Coating leakage resistivity (RL)" value={im.coatingLeakageResistance_OhmM?.toFixed(2)} unit="Ω·m" />
                <ResultRow label="Attenuation constant (α)" value={(im.alpha * 1e5).toFixed(4)} unit="×10⁻⁵ /m" />
              </SectionCard>
              <SectionCard title="Check Point Analysis">
                <ResultRow label="Drain point swing (ΔE₀)" value={im.deltaE0_V?.toFixed(4)} unit="V" />
                <ResultRow label="Required swing at X (ΔE_req)" value={im.deltaERequired_V?.toFixed(4)} unit="V" />
                <ResultRow label="Calculated swing at X (ΔE_calc)" value={cp.deltaECalculated_V?.toFixed(4)} unit="V" />
                <ResultRow label="Calculated potential at X" value={cp.potentialCalculated_mV?.toFixed(1)} unit="mV" highlight />
                <ResultRow
                  label="Criterion at X"
                  value={cp.criterionMet ? '✓ PASS' : '✗ FAIL'}
                  unit={cp.criterionMet ? '' : `deficit ${(cp.deficitVolts * 1000).toFixed(0)} mV`}
                  highlight
                />
              </SectionCard>
            </>
          )}
          <CalculationInputsUsed
            items={buildAttenuationInputsUsed(input, project)}
            title="Inputs Driving This Analysis"
            calculatedAt={result?.calculatedAt}
          />
        </div>

        {/* Right: Protection Gaps, Warnings, Optimization */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {result?.success && summary?.unprotectedSegments?.length > 0 && (
            <SectionCard title="⚠ Protection Gaps">
              {summary.unprotectedSegments.map((seg, i) => (
                <ResultRow
                  key={i}
                  label={`KM ${seg.startKm} – ${seg.endKm}`}
                  value={(seg.minPotentialV * 1000).toFixed(1)}
                  unit="mV (worst)"
                />
              ))}
            </SectionCard>
          )}

          <SectionCard title="CP Stations">
            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
              <StationsTable
                stations={input.stations || []}
                onAdd={addAttenuationStation}
                onRemove={removeAttenuationStation}
                onUpdate={updateAttenuationStation}
              />
            </div>
          </SectionCard>

          <SectionCard title="Optimization Opportunities">
            {!result?.success ? (
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Run calculation to see optimization opportunities.</p>
            ) : summary?.designAdequate ? (
              <p style={{ fontSize: 12, color: 'var(--pass)' }}>✓ Design meets protection criteria. No gaps detected.</p>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                <p>Consider these optimization strategies:</p>
                <ul style={{ paddingLeft: 16, marginTop: 4 }}>
                  <li>Add intermediate CP stations in gap zones</li>
                  <li>Increase drain point potential</li>
                  <li>Review coating integrity assumptions</li>
                </ul>
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
