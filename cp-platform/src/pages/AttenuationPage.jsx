/**
 * AttenuationPage.jsx
 *
 * Cathodic Protection Pipeline Attenuation Analysis Page — Flagship Layout.
 * M7 hardening: pure downstream consumer of project assets.
 *   - No synthetic stations, no DEFAULT_INPUT.
 *   - Renders state-machine driven UI (EMPTY / INCOMPLETE / READY / CALCULATED / STALE / ERROR).
 *   - Defensive against missing assets — never crashes the page.
 *   - Marks stale when TR / groundbed / pipeline / soil / cable changes.
 */

import { useMemo, useEffect, useState } from 'react'
import { useProjectStore } from '../store/projectStore.js'
import { ResultRow, SectionCard } from '../components/ui.jsx'
import { CalculationInputsUsed, buildAttenuationInputsUsed, RightSideEngineeringPanel } from '../visualizations/index.js'
import { EmptyState } from '../visualizations/EmptyState.jsx'

import { AttenuationExplorer } from '../visualizations/AttenuationExplorer.jsx'
import { SensitivitySliders } from '../visualizations/SensitivitySliders.jsx'
import { CriticalKPDetector } from '../visualizations/CriticalKPDetector.jsx'
import { StationSpacingRecommendation } from '../visualizations/StationSpacingRecommendation.jsx'

import { buildAttenuationInputFromProject } from '../services/attenuationInputBuilder.js'
import {
  resolveAttenuationState,
  ATTENUATION_STATES,
} from '../services/attenuationStateMachine.js'

// ─── Station Table ───────────────────────────────────────────────────────────

function StationsTable({ stations, onAdd, onRemove, onUpdate }) {
  const handleAdd = (id, km, label) => {
    if (!id || km === '' || km == null) return
    const pos = parseFloat(km)
    if (!Number.isFinite(pos)) return
    onAdd({ id, positionKm: pos, label: label || '' })
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
          {(Array.isArray(stations) ? stations : []).map((s, i) => (
            <tr key={s?.id ?? i}>
              <td>{s?.id ?? '—'}</td>
              <td>
                <input
                  type="number"
                  value={Number.isFinite(s?.positionKm) ? s.positionKm : ''}
                  step="0.1"
                  className="field-input"
                  style={{ width: 80 }}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value)
                    if (s?.id && Number.isFinite(v)) {
                      onUpdate(s.id, { positionKm: v })
                    }
                  }}
                />
              </td>
              <td style={{ width: '100%' }}>{s?.label || ''}</td>
              <td>
                {s?.id ? (
                  <button
                    className="btn-icon-ghost"
                    onClick={() => onRemove(s.id)}
                    title="Remove station"
                  >
                    ×
                  </button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <AddStationRow onAdd={handleAdd} />
    </div>
  )
}

function AddStationRow({ onAdd }) {
  // Local form state for adding a station.
  // We avoid React hooks here for compactness — use a self-contained row.
  return (
    <AddStationRowInner onAdd={onAdd} />
  )
}

function AddStationRowInner({ onAdd }) {
  const [id, setId] = useState('')
  const [km, setKm] = useState('')
  const [label, setLabel] = useState('')
  return (
    <div style={{ display: 'flex', gap: 6, marginTop: 10, alignItems: 'center' }}>
      <input
        type="text"
        placeholder="ID"
        value={id}
        className="field-input"
        style={{ width: 70 }}
        onChange={(e) => setId(e.target.value)}
      />
      <input
        type="number"
        placeholder="KM"
        value={km}
        step="0.1"
        className="field-input"
        style={{ width: 80 }}
        onChange={(e) => setKm(e.target.value)}
      />
      <input
        type="text"
        placeholder="Label (optional)"
        value={label}
        className="field-input"
        style={{ flex: 1 }}
        onChange={(e) => setLabel(e.target.value)}
      />
      <button
        className="btn btn-sm"
        onClick={() => {
          if (!id || km === '') return
          onAdd(id, km, label)
          setId('')
          setKm('')
          setLabel('')
        }}
      >
        + Add
      </button>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function AttenuationPage() {
  const {
    attenuationInput: storedAttenuationInput,
    attenuationResult,
    attenuationDirty,
    attenuationCalculating,
    replaceAttenuationInput,
    runAttenuationCalculation,
    addAttenuationStation,
    removeAttenuationStation,
    updateAttenuationStation,
  } = useProjectStore()

  const project = useProjectStore((s) => s.getProject())
  const activeStationId = useProjectStore((s) => s.activeStationId)

  // M7 — derive input from project assets (no synthetic defaults).
  const { input } = useMemo(
    () => buildAttenuationInputFromProject(project, activeStationId),
    [project, activeStationId]
  )

  // If we have a derived input and the stored one differs, push the derived
  // input into the store so the rest of the system (engine, results) sees it.
  useEffect(() => {
    if (input && storedAttenuationInput !== input) {
      replaceAttenuationInput(input)
    }
  }, [input, storedAttenuationInput, replaceAttenuationInput])

  const sm = useMemo(
    () =>
      resolveAttenuationState({
        project,
        attenuationInput: input,
        attenuationResult,
        attenuationDirty,
        attenuationCalculating,
        activeStationId,
      }),
    [project, input, attenuationResult, attenuationDirty, attenuationCalculating, activeStationId]
  )

  // Defensive result fields
  const result = attenuationResult
  const im = result?.intermediates
  const cp = result?.checkPointAssessment
  const summary = result?.summary

  // ── EMPTY / INCOMPLETE rendering — graceful engineering guidance ────────
  if (sm.state === ATTENUATION_STATES.EMPTY || sm.state === ATTENUATION_STATES.INCOMPLETE) {
    return (
      <div className="page">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>Attenuation Analysis</h1>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '2px 0 0' }}>
              Transmission-line cosh model · NACE SP0169 · ISO 15589-1
            </p>
          </div>
        </div>

        <EmptyStateCard guidance={sm.guidance} />
      </div>
    )
  }

  // ── ERROR rendering — surface engineering messages, never throw ────────
  if (sm.state === ATTENUATION_STATES.ERROR) {
    return (
      <div className="page">
        <Header
          isDirty={attenuationDirty}
          attenuationCalculating={attenuationCalculating}
          onRun={runAttenuationCalculation}
        />
        <div className="info-box info-box--error" style={{ marginBottom: 10 }}>
          <div style={{ fontWeight: 500, fontSize: 13 }}>Calculation errors</div>
          {(result?.errors || []).map((e, i) => (
            <div key={i} style={{ fontSize: 13 }}>• {e}</div>
          ))}
        </div>
      </div>
    )
  }

  // ── READY / STALE / CALCULATED rendering — full UI ──────────────────────
  return (
    <div className="page">
      <Header
        isDirty={attenuationDirty || sm.state === ATTENUATION_STATES.STALE}
        attenuationCalculating={attenuationCalculating}
        onRun={runAttenuationCalculation}
        isStale={sm.state === ATTENUATION_STATES.STALE}
      />

      {sm.state === ATTENUATION_STATES.STALE && (
        <div className="info-box info-box--warning" style={{ marginBottom: 10 }}>
          <strong>Attenuation requires recalculation.</strong>
          <div style={{ fontSize: 12 }}>
            One of the upstream project assets (TR, groundbed, pipeline, soil resistivity, cable) has changed. Re-run the calculation to refresh the profile.
          </div>
        </div>
      )}

      {/* Protection Status KPI Row — only when a fresh result exists */}
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
            <span className="kpi-card__value">{Number.isFinite(im?.alpha) ? (im.alpha * 1e5).toFixed(2) : '—'}</span>
            <span className="kpi-card__sub">×10⁻⁵ /m</span>
          </div>
          <div className="kpi-card">
            <span className="kpi-card__label">Stations</span>
            <span className="kpi-card__value">{(input?.stations || []).length}</span>
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
          {(result.warnings || []).map((w, i) => (
            <div key={i}>⚠ {w}</div>
          ))}
        </div>
      )}

      <RightSideEngineeringPanel
        panelTitle="Engineering Intelligence"
        panel={
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {result?.success && result.profile && (
              <CriticalKPDetector
                profile={result.profile}
                minimumMv={input?.potentials?.minimumMv || 850}
              />
            )}

            {result?.success && result.profile && (
              <StationSpacingRecommendation
                profile={result.profile}
                currentStations={input?.stations || []}
                minimumMv={input?.potentials?.minimumMv || 850}
              />
            )}

            {result?.success && (
              <SensitivitySliders
                input={input}
                onPerturbedResult={() => {}}
              />
            )}

            <CalculationInputsUsed
              items={buildAttenuationInputsUsed(input, project)}
              title="Inputs Driving This Analysis"
              calculatedAt={result?.calculatedAt}
            />
          </div>
        }
      >
        <div className="viz-fullwidth" style={{ marginBottom: 10 }}>
          <div className="viz-fullwidth__header">
            <span className="viz-fullwidth__title">Potential Profile Along Pipeline</span>
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
              KM {input?.profileConfig?.startKm ?? '—'} – {input?.profileConfig?.endKm ?? '—'} · Step {input?.profileConfig?.stepKm ?? '—'} km
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
                stations={input?.stations || []}
                project={project}
                height={380}
              />
            )}
          </div>
        </div>

        {result?.success && (
          <div className="enterprise-2col">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <SectionCard title="Key Parameters">
                <ResultRow label="Station reach" value={summary?.stationReachKm?.toFixed(2)} unit="km" />
                <ResultRow label="Current req. (total)" value={im?.currentRequiredTotal_A?.toFixed(1)} unit="A" />
                <ResultRow label="Coating leakage resistivity (RL)" value={im?.coatingLeakageResistance_OhmM?.toFixed(2)} unit="Ω·m" />
                <ResultRow label="Attenuation constant (α)" value={Number.isFinite(im?.alpha) ? (im.alpha * 1e5).toFixed(4) : '—'} unit="×10⁻⁵ /m" />
              </SectionCard>
              <SectionCard title="Check Point Analysis">
                <ResultRow label="Drain point swing (ΔE₀)" value={im?.deltaE0_V?.toFixed(4)} unit="V" />
                <ResultRow label="Required swing at X (ΔE_req)" value={im?.deltaERequired_V?.toFixed(4)} unit="V" />
                <ResultRow label="Calculated swing at X (ΔE_calc)" value={cp?.deltaECalculated_V?.toFixed(4)} unit="V" />
                <ResultRow label="Calculated potential at X" value={cp?.potentialCalculated_mV?.toFixed(1)} unit="mV" highlight />
                <ResultRow
                  label="Criterion at X"
                  value={cp?.criterionMet ? '✓ PASS' : '✗ FAIL'}
                  unit={cp?.criterionMet ? '' : `deficit ${(cp?.deficitVolts * 1000).toFixed(0)} mV`}
                  highlight
                />
              </SectionCard>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {summary?.unprotectedSegments?.length > 0 && (
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
                    stations={input?.stations || []}
                    onAdd={addAttenuationStation}
                    onRemove={removeAttenuationStation}
                    onUpdate={updateAttenuationStation}
                  />
                </div>
              </SectionCard>
            </div>
          </div>
        )}
      </RightSideEngineeringPanel>
    </div>
  )
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function Header({ isDirty, attenuationCalculating, onRun, isStale }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>Attenuation Analysis</h1>
        <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '2px 0 0' }}>
          Transmission-line cosh model · NACE SP0169 · ISO 15589-1
        </p>
      </div>
      <button
        className={`btn ${isDirty ? 'btn-primary' : ''}`}
        onClick={onRun}
        disabled={!isDirty || attenuationCalculating}
        style={{ minWidth: 140 }}
      >
        {attenuationCalculating ? '⏳ Calculating…' : isStale ? '⟳ Recalculate' : isDirty ? '▶ Run calculation' : '✓ Up to date'}
      </button>
    </div>
  )
}

function EmptyStateCard({ guidance }) {
  const items = Array.isArray(guidance) && guidance.length > 0
    ? guidance
    : [
        {
          title: 'Attenuation Analysis Unavailable',
          message: 'No active project is loaded.',
          action: 'Go to Project Setup',
          route: '/project-setup',
        },
      ]
  return (
    <EmptyState
      title="Attenuation Analysis Unavailable"
      description="The attenuation analysis is a downstream consumer of the actual project design. It needs real stations, transformer-rectifier units, groundbeds, and pipeline data to run."
    >
      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'stretch', maxWidth: 720 }}>
        {items.map((g, i) => (
          <ReasonCard key={i} g={g} />
        ))}
      </div>
    </EmptyState>
  )
}

function ReasonCard({ g }) {
  const handleNav = () => {
    if (typeof window !== 'undefined' && g?.route) {
      window.history.pushState({}, '', g.route)
      window.dispatchEvent(new PopStateEvent('popstate'))
    }
  }
  return (
    <div
      className="info-box info-box--warning"
      style={{ textAlign: 'left' }}
    >
      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{g?.title || 'Action required'}</div>
      <div style={{ fontSize: 12, marginBottom: 8 }}>{g?.message || ''}</div>
      {g?.action && g?.route ? (
        <button className="btn btn-sm btn-primary" onClick={handleNav}>
          {g.action}
        </button>
      ) : null}
    </div>
  )
}
