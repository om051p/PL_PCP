/**
 * AttenuationPage.jsx
 *
 * Cathodic Protection Pipeline Attenuation Analysis Page.
 * Uses shared UI components from src/components/ui.jsx
 * and CSS classes from src/index.css for consistent styling.
 */

import { useState, useEffect } from 'react'
import { useProjectStore } from '../store/projectStore.js'
import { FieldInput, ResultRow, StatCard, SectionCard, Grid2 } from '../components/ui.jsx'

// ─── Recharts (already installed in cp-platform) ────────────────────────────
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'

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

const TABS = [
  ['inputs', 'Inputs'],
  ['results', 'Calculated values'],
  ['profile', 'Potential profile'],
]

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

// ─── Profile Chart ───────────────────────────────────────────────────────────

function ProfileChart({ profile, stations, minimumMv, naturalMv }) {
  // Transform profile data for recharts
  const chartData = profile.map((p) => {
    const point = { km: p.km, combined: parseFloat(p.combinedPotentialMv.toFixed(1)) }
    stations.forEach((s, i) => {
      point[s.id] = parseFloat((p.perStation[i]?.potentialV * 1000).toFixed(1))
    })
    return point
  })

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div style={{
        background: 'var(--card, #fff)',
        border: '1px solid var(--border, #e5e7eb)',
        borderRadius: 6,
        padding: '8px 12px',
        fontSize: 12,
        boxShadow: 'var(--shadow, 0 1px 3px rgba(0,0,0,.1))',
      }}>
        <div style={{ fontWeight: 500, marginBottom: 4 }}>KM {label}</div>
        {payload.map((entry) => (
          <div key={entry.dataKey} style={{ color: entry.color }}>
            {entry.name}: {entry.value} mV
          </div>
        ))}
      </div>
    )
  }

  return (
    <div>
      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 10, fontSize: 12 }}>
        <span>
          <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: '#3B8BD4', marginRight: 4 }} />
          Combined
        </span>
        {stations.map((s, i) => (
          <span key={s.id}>
            <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: STATION_COLORS[i % STATION_COLORS.length], marginRight: 4 }} />
            {s.label || s.id}
          </span>
        ))}
        <span>
          <span style={{ display: 'inline-block', width: 10, height: 3, background: 'var(--fail, #E24B4A)', marginRight: 4, verticalAlign: 'middle' }} />
          Min criterion
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 10, height: 3, background: 'var(--text-tertiary, #888780)', marginRight: 4, verticalAlign: 'middle' }} />
          Natural
        </span>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
          <XAxis
            dataKey="km"
            label={{ value: 'Pipeline chainage (km)', position: 'insideBottom', offset: -5, style: { fontSize: 11 } }}
            tick={{ fontSize: 11 }}
          />
          <YAxis
            domain={[400, 'auto']}
            label={{ value: 'Potential (mV vs Cu/CuSO₄)', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 11 } }}
            tick={{ fontSize: 11 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={minimumMv} stroke="var(--fail, #E24B4A)" strokeDasharray="4 3" strokeWidth={1.5} />
          <ReferenceLine y={naturalMv} stroke="var(--text-tertiary, #888780)" strokeDasharray="2 4" strokeWidth={1} />
          <Line type="monotone" dataKey="combined" stroke="#3B8BD4" strokeWidth={2.5} dot={false} name="Combined" />
          {stations.map((s, i) => (
            <Line
              key={s.id}
              type="monotone"
              dataKey={s.id}
              stroke={STATION_COLORS[i % STATION_COLORS.length]}
              strokeWidth={1.5}
              strokeDasharray="5 4"
              dot={false}
              name={s.label || s.id}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      {/* Coverage bar */}
      <div style={{ marginTop: 10 }}>
        <div className="section-label" style={{ marginBottom: 4 }}>
          Protection coverage per km
        </div>
        <div style={{ display: 'flex', gap: 1, height: 8, borderRadius: 4, overflow: 'hidden' }}>
          {profile.map((p) => (
            <div
              key={p.km}
              title={`KM ${p.km}: ${p.combinedPotentialMv.toFixed(0)} mV`}
              style={{
                flex: 1,
                background: p.isProtected
                  ? 'var(--brand-mid, #3B8BD4)'
                  : 'var(--fail, #E24B4A)',
              }}
            />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 2 }}>
          <span>KM {profile[0]?.km}</span>
          <span>KM {profile[profile.length - 1]?.km}</span>
        </div>
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

  const [activeTab, setActiveTab] = useState('inputs')
  const project = useProjectStore((s) => s.getProject())
  const activeStation = useProjectStore((s) => s.getActiveStation())
  const firstSegment = activeStation?.pipelineSegments?.[0]

  const diameter = firstSegment ? firstSegment.od : (attenuationInput || DEFAULT_INPUT).pipe.diameterInches
  const wallThickness = firstSegment ? firstSegment.wallThk : (attenuationInput || DEFAULT_INPUT).pipe.wallThicknessInches
  const soilResistivity = project?.soil_resistivity_ohm_cm !== undefined ? project.soil_resistivity_ohm_cm : activeStation?.soilResistivityOhmCm || (attenuationInput || DEFAULT_INPUT).coating.soilResistivityOhmCm

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 500, margin: 0 }}>Attenuation Analysis</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
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
        <div className="info-box info-box--error" style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 500, fontSize: 13 }}>Calculation errors</div>
          {result.errors.map((e, i) => (
            <div key={i} style={{ fontSize: 13 }}>• {e}</div>
          ))}
        </div>
      )}

      {/* Warnings */}
      {result?.warnings?.length > 0 && (
        <div className="info-box info-box--warning" style={{ marginBottom: 16 }}>
          {result.warnings.map((w, i) => (
            <div key={i}>⚠ {w}</div>
          ))}
        </div>
      )}

      {/* Summary stat cards */}
      {result?.success && summary && (
        <div className="stat-grid">
          <StatCard
            label="Attenuation constant α"
            value={(im.alpha * 1e5).toFixed(2)}
            unit="×10⁻⁵ /m"
          />
          <StatCard
            label="Station reach"
            value={summary.stationReachKm?.toFixed(1)}
            unit="km"
          />
          <StatCard
            label="Current req. (total)"
            value={im.currentRequiredTotal_A?.toFixed(1)}
            unit="A"
          />
          <StatCard
            label="Protection coverage"
            value={summary.protectionPercentage?.toFixed(0)}
            unit="%"
            color={summary.designAdequate ? 'var(--pass)' : 'var(--fail)'}
          />
          <StatCard
            label="Design status"
            value={summary.designAdequate ? 'Adequate' : 'Gap found'}
            color={summary.designAdequate ? 'var(--pass)' : 'var(--fail)'}
          />
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {TABS.map(([id, label]) => (
          <button
            key={id}
            className={`btn ${activeTab === id ? 'btn-primary' : ''}`}
            onClick={() => setActiveTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── TAB: INPUTS ────────────────────────────────────────────────────── */}
      {activeTab === 'inputs' && (
        <Grid2>
          <SectionCard title="Pipe geometry & material">
            <FieldInput
              label="Outside diameter"
              value={diameter}
              unit="inches"
              readOnly={true}
              hint="Locked to Pipeline Page (Segment 1)"
            />
            <FieldInput
              label="Wall thickness"
              value={wallThickness}
              unit="inches"
              readOnly={true}
              hint="Locked to Pipeline Page (Segment 1)"
            />
            <FieldInput
              label="Total pipe length"
              value={input.pipe.totalLengthKm}
              unit="km"
              step="1"
              min={0.1}
              onChange={(v) => setPipe('totalLengthKm', v)}
            />
            <FieldInput
              label="Max protection length (L_X)"
              value={input.pipe.maxProtectionLengthKm}
              unit="km"
              step="1"
              min={0.1}
              hint="distance to check point X"
              onChange={(v) => setPipe('maxProtectionLengthKm', v)}
            />
            <FieldInput
              label="Steel resistivity"
              value={input.pipe.steelResistivityMicroOhmCm}
              unit="µΩ·cm"
              step="0.5"
              min={1}
              hint="18 for carbon steel"
              onChange={(v) => setPipe('steelResistivityMicroOhmCm', v)}
            />
          </SectionCard>

          <SectionCard title="Coating & soil">
            <FieldInput
              label="Coating conductivity (g)"
              value={input.coating.conductivityMicroSiemensPerM2}
              unit="µS/m²"
              step="10"
              min={1}
              hint="at 1000 Ω·cm reference"
              onChange={(v) => setCoating('conductivityMicroSiemensPerM2', v)}
            />
            <FieldInput
              label="Soil resistivity (ρ)"
              value={soilResistivity}
              unit="Ω·cm"
              readOnly={true}
              hint="Locked to Central Design Settings"
            />
            <FieldInput
              label="Design current density"
              value={input.coating.currentDensityMaPerM2}
              unit="mA/m²"
              step="0.01"
              min={0.001}
              onChange={(v) => setCoating('currentDensityMaPerM2', v)}
            />
          </SectionCard>

          <SectionCard title="Electrochemical potentials">
            <FieldInput
              label="Natural potential"
              value={input.potentials.naturalMv}
              unit="mV"
              step="10"
              min={1}
              hint="free corrosion (vs Cu/CuSO₄)"
              onChange={(v) => setPot('naturalMv', v)}
            />
            <FieldInput
              label="Drain point potential"
              value={input.potentials.drainPointMv}
              unit="mV"
              step="10"
              min={1}
              hint="on-potential at TR"
              onChange={(v) => setPot('drainPointMv', v)}
            />
            <FieldInput
              label="Minimum protection criterion"
              value={input.potentials.minimumMv}
              unit="mV"
              step="10"
              min={1}
              hint="NACE: 850 mV"
              onChange={(v) => setPot('minimumMv', v)}
            />
          </SectionCard>

          <SectionCard title="Profile range">
            <FieldInput
              label="Start km"
              value={input.profileConfig?.startKm ?? 44}
              unit="km"
              step="1"
              onChange={(v) => setProfile('startKm', v)}
            />
            <FieldInput
              label="End km"
              value={input.profileConfig?.endKm ?? 89}
              unit="km"
              step="1"
              onChange={(v) => setProfile('endKm', v)}
            />
            <FieldInput
              label="Step size"
              value={input.profileConfig?.stepKm ?? 1}
              unit="km"
              step="0.25"
              min={0.1}
              onChange={(v) => setProfile('stepKm', v)}
            />
          </SectionCard>

          <div style={{ gridColumn: '1 / -1' }}>
            <SectionCard title="CP stations">
              <StationsTable
                stations={input.stations || []}
                onAdd={addAttenuationStation}
                onRemove={removeAttenuationStation}
                onUpdate={updateAttenuationStation}
              />
            </SectionCard>
          </div>
        </Grid2>
      )}

      {/* ── TAB: RESULTS ───────────────────────────────────────────────────── */}
      {activeTab === 'results' && (
        <Grid2>
          {!result?.success ? (
            <div className="no-result" style={{ gridColumn: '1/-1' }}>
              Run the calculation to see results.
            </div>
          ) : (
            <>
              <SectionCard title="Pipe & surface geometry">
                <ResultRow
                  label="Steel cross-section area (Ax)"
                  value={(im.pipeSteelAreaM2 * 1e4).toFixed(4)}
                  unit="cm²"
                />
                <ResultRow
                  label="Unit surface area (A1)"
                  value={im.unitSurfaceAreaM2PerM.toFixed(4)}
                  unit="m²/m"
                />
                <ResultRow
                  label="Surface area to X"
                  value={im.surfaceAreaToX_M2.toFixed(0)}
                  unit="m²"
                />
                <ResultRow
                  label="Surface area total"
                  value={im.surfaceAreaTotal_M2.toFixed(0)}
                  unit="m²"
                />
              </SectionCard>

              <SectionCard title="Current requirements">
                <ResultRow
                  label="Current required to X"
                  value={im.currentRequiredToX_A.toFixed(3)}
                  unit="A"
                />
                <ResultRow
                  label="Current required total"
                  value={im.currentRequiredTotal_A.toFixed(3)}
                  unit="A"
                />
              </SectionCard>

              <SectionCard title="Electrical properties">
                <ResultRow
                  label="Unit pipe resistance (RS)"
                  value={(im.unitPipeResistance_OhmPerM * 1e6).toFixed(4)}
                  unit="µΩ/m"
                />
                <ResultRow
                  label="Coating leakage resistivity (RL)"
                  value={im.coatingLeakageResistance_OhmM.toFixed(2)}
                  unit="Ω·m"
                />
                <ResultRow
                  label="Attenuation constant (α)"
                  value={(im.alpha * 1e5).toFixed(4)}
                  unit="×10⁻⁵ /m"
                />
              </SectionCard>

              <SectionCard title="Potential parameters">
                <ResultRow
                  label="Drain point swing (ΔE₀)"
                  value={im.deltaE0_V.toFixed(4)}
                  unit="V"
                />
                <ResultRow
                  label="Required swing at X (ΔE_req)"
                  value={im.deltaERequired_V.toFixed(4)}
                  unit="V"
                />
                <ResultRow
                  label="Calculated swing at X (ΔE_calc)"
                  value={cp.deltaECalculated_V.toFixed(4)}
                  unit="V"
                />
                <ResultRow
                  label="Calculated potential at X"
                  value={cp.potentialCalculated_mV.toFixed(1)}
                  unit="mV"
                  highlight
                />
                <ResultRow
                  label="Criterion at X (single station)"
                  value={cp.criterionMet ? '✓ PASS' : '✗ FAIL'}
                  unit={cp.criterionMet ? '' : `deficit ${(cp.deficitVolts * 1000).toFixed(0)} mV`}
                  highlight
                />
              </SectionCard>

              <SectionCard title="Design adequacy">
                <ResultRow
                  label="Station reach (single station)"
                  value={summary.stationReachKm?.toFixed(2)}
                  unit="km"
                />
                <ResultRow
                  label="Protected points"
                  value={`${summary.protectedPoints} / ${summary.totalProfilePoints}`}
                />
                <ResultRow
                  label="Protection coverage"
                  value={summary.protectionPercentage.toFixed(1)}
                  unit="%"
                />
                <ResultRow
                  label="Min combined potential"
                  value={summary.minCombinedPotentialMv.toFixed(1)}
                  unit="mV"
                />
                <ResultRow
                  label="Max combined potential"
                  value={summary.maxCombinedPotentialMv.toFixed(1)}
                  unit="mV"
                />
                <ResultRow
                  label="Design adequate"
                  value={summary.designAdequate ? '✓ YES — full coverage' : '✗ NO — gaps exist'}
                  highlight
                />
              </SectionCard>

              {summary.unprotectedSegments?.length > 0 && (
                <div style={{ gridColumn: '1/-1' }}>
                  <SectionCard title="Unprotected segments">
                    {summary.unprotectedSegments.map((seg, i) => (
                      <ResultRow
                        key={i}
                        label={`Segment ${i + 1}: KM ${seg.startKm} – ${seg.endKm}`}
                        value={(seg.minPotentialV * 1000).toFixed(1)}
                        unit="mV (worst case)"
                      />
                    ))}
                  </SectionCard>
                </div>
              )}
            </>
          )}
        </Grid2>
      )}

      {/* ── TAB: PROFILE ───────────────────────────────────────────────────── */}
      {activeTab === 'profile' && (
        <SectionCard title="Potential profile along pipeline">
          {!result?.success || !result.profile?.length ? (
            <div className="no-result">
              Run the calculation to view the potential profile.
            </div>
          ) : (
            <ProfileChart
              profile={result.profile}
              stations={input.stations || []}
              minimumMv={input.potentials.minimumMv}
              naturalMv={input.potentials.naturalMv}
            />
          )}
        </SectionCard>
      )}
    </div>
  )
}
