/**
 * AttenuationExplorer.jsx
 *
 * Flagship visualization for the Attenuation Analysis page.
 * Adds cursor inspector + scenario toggle + sensitivity tornado
 * on top of the existing ProfileChart.
 *
 * Features:
 *   - Live cursor crosshair on mousemove with value panel
 *   - dV/dx local gradient display
 *   - Keyboard navigation: ←/→ step, Home/End jump
 *   - Scenario toggle: existing / +20% / -20% / alternate groundbed
 *   - Sensitivity tornado (R_G vs V_min) in side panel
 *
 * Read-only — consumes runAttenuationAnalysis output, no engine changes.
 */

import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import {
  LineChart, Line, XAxis, YAxis, ReferenceLine, ReferenceArea,
  ResponsiveContainer, Tooltip, CartesianGrid,
} from 'recharts'
import { ChevronLeft, ChevronRight, Home, Crosshair, TrendingUp, TrendingDown, Activity } from 'lucide-react'
import { runAttenuationAnalysis } from '../engine/modules/attenuationEngine.js'
import { computeTornado } from '../engine/sensitivity/index.js'
import { SensitivityTornado } from './SensitivityTornado.jsx'
import { RiskZoneBands } from './shared/RiskZoneBackground.jsx'
import { findCriticalKPs } from '../engine/modules/criticalKPs.js'

const STATION_COLORS = ['#1D9E75', '#D85A30', '#7F77DD', '#BA7517', '#3B8BD4', '#E24B4A']
const SCENARIO_COLORS = {
  existing: '#3B8BD4',
  plus20: '#1D9E75',
  minus20: '#D85A30',
  alternate: '#7F77DD',
}

/**
 * Build a scenario by perturbing the drainPointMv of each station.
 * @param {object} input - the base attenuation input
 * @param {'existing'|'plus20'|'minus20'|'alternate'} scenario
 * @returns the same input with station current scaled
 */
function buildScenarioInput(input, scenario) {
  if (scenario === 'existing') return input
  if (!input || !Array.isArray(input.stations)) return input
  const factor = scenario === 'plus20' ? 1.2 : scenario === 'minus20' ? 0.8 : 1.0
  return {
    ...input,
    stations: input.stations.map((s) => ({
      ...s,
      // M7 defensive: currentA may be undefined when scenario perturb is
      // applied to a derived (project-sourced) input. Fall back to 0 so
      // the engine never sees NaN.
      currentA: Number.isFinite(s?.currentA) ? s.currentA * factor : 0,
    })),
  }
}

export function AttenuationExplorer({ input, stations, project, height = 380 }) {
  const [scenario, setScenario] = useState('existing')
  const [cursorIdx, setCursorIdx] = useState(null)
  const chartRef = useRef(null)

  // Run scenarios — current / +20% / -20% / alternate
  const scenarios = useMemo(() => {
    const labels = ['existing', 'plus20', 'minus20']
    const result = {}
    labels.forEach((s) => {
      const scenarioInput = buildScenarioInput(input, s)
      const r = runAttenuationAnalysis(scenarioInput)
      if (r.success) result[s] = r
    })
    // Alternate = same as existing (placeholder for future: different groundbed layout)
    result.alternate = result.existing
    return result
  }, [input])

  // Primary series: the active scenario
  const activeResult = scenarios[scenario]
  // M7 defensive: guard against non-array profile from engine
  const profile = Array.isArray(activeResult?.profile) ? activeResult.profile : []
  const minimumMv = input?.potentials?.minimumMv ?? 850
  const naturalMv = input?.potentials?.naturalMv ?? -550

  // Flatten for chart
  const chartData = useMemo(() => {
    if (!Array.isArray(profile) || profile.length === 0) return []
    return profile.map((p) => ({
      km: p.km,
      combined: parseFloat(p.combinedPotentialMv.toFixed(1)),
      isProtected: p.isProtected,
      // Overlay other scenarios
      ...Object.fromEntries(
        Object.entries(scenarios || {})
          .filter(([k]) => k !== scenario)
          .map(([k, r]) => {
            const overlay = r?.profile?.find?.((q) => q.km === p.km)
            return [k, overlay?.combinedPotentialMv != null ? overlay.combinedPotentialMv.toFixed(1) : null]
          })
      ),
    }))
  }, [profile, scenario, scenarios])

  // Cursor: current point
  const cursorPoint = cursorIdx != null ? chartData[cursorIdx] : null

  // Keyboard navigation
  const handleKey = useCallback((e) => {
    if (cursorIdx == null) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        setCursorIdx(Math.floor(chartData.length / 2))
        e.preventDefault()
      }
      return
    }
    if (e.key === 'ArrowRight') {
      setCursorIdx((i) => Math.min(chartData.length - 1, (i ?? 0) + 1))
      e.preventDefault()
    } else if (e.key === 'ArrowLeft') {
      setCursorIdx((i) => Math.max(0, (i ?? 0) - 1))
      e.preventDefault()
    } else if (e.key === 'Home') {
      setCursorIdx(0)
      e.preventDefault()
    } else if (e.key === 'End') {
      setCursorIdx(chartData.length - 1)
      e.preventDefault()
    }
  }, [cursorIdx, chartData.length])

  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])

  // Mouse handler — use onMouseMove on chart
  const handleMouseMove = useCallback((e) => {
    if (!e || !e.activeLabel) return
    const idx = chartData.findIndex((d) => d.km === Number(e.activeLabel))
    if (idx >= 0) setCursorIdx(idx)
  }, [chartData])

  // Compute dV/dx at cursor (mV/km)
  const localGradient = useMemo(() => {
    if (cursorIdx == null || cursorIdx < 1 || cursorIdx >= chartData.length) return null
    const a = chartData[cursorIdx - 1]
    const b = chartData[cursorIdx]
    const dx = b.km - a.km
    if (dx === 0) return null
    const dV = b.combined - a.combined
    return dV / dx // mV/km
  }, [cursorIdx, chartData])

  // Sensitivity tornado for this station (requires full station object with tr, groundbed, etc.)
  const station = stations?.[0] // primary station
  const tornadoData = useMemo(() => {
    if (!station?.tr || !project) return null
    return computeTornado(station, station.designLifeYears || 25, project, 'minTRVoltage', undefined, 10)
  }, [station, project])

  // Critical KP detection
  const criticalKPs = useMemo(() => findCriticalKPs(profile, minimumMv), [profile, minimumMv])

  // Chart max for risk zones
  const chartMax = useMemo(() => {
    if (chartData.length === 0) return minimumMv + 300
    return Math.max(...chartData.map((d) => d.combined), minimumMv + 100)
  }, [chartData, minimumMv])

  if (!input) {
    return <div style={{ padding: 16, color: 'var(--text-tertiary)', fontSize: 11 }}>No attenuation input.</div>
  }
  if (!Array.isArray(stations) || stations.length === 0) {
    return (
      <div style={{ padding: 16, color: 'var(--text-tertiary)', fontSize: 11 }}>
        No CP stations to display. Add a station in Project Setup.
      </div>
    )
  }

  return (
    <div>
      {/* Scenario toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', fontWeight: 600 }}>Scenario</span>
        {[
          { id: 'existing', label: 'Existing', Icon: Crosshair },
          { id: 'plus20', label: '+20% current', Icon: TrendingUp },
          { id: 'minus20', label: '−20% current', Icon: TrendingDown },
          { id: 'alternate', label: 'Alternate', Icon: Activity },
        ].map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setScenario(id)}
            className={scenario === id ? 'btn-tab-active' : 'btn-tab'}
            style={{
              padding: '4px 10px', fontSize: 11, borderRadius: 4,
              border: '1px solid ' + (scenario === id ? 'var(--brand-mid)' : 'var(--border)'),
              background: scenario === id ? SCENARIO_COLORS[id] : 'var(--surface)',
              color: scenario === id ? 'white' : 'var(--text-primary)',
              cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4,
            }}
          >
            <Icon size={11} /> {label}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-tertiary)' }}>
          ← / → to step · Home / End to jump
        </span>
      </div>

      {/* Main chart */}
      <div ref={chartRef} tabIndex={0} style={{ outline: 'none' }}>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 30, bottom: 8, left: 8 }}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setCursorIdx(null)}
          >
            <CartesianGrid stroke="var(--border)" strokeDasharray="2 2" />
            <XAxis
              dataKey="km"
              type="number"
              domain={['dataMin', 'dataMax']}
              tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
              stroke="var(--text-tertiary)"
              label={{ value: 'Pipeline chainage (km)', position: 'insideBottom', offset: -2, fontSize: 10, fill: 'var(--text-tertiary)' }}
            />
            <YAxis
              domain={['auto', 'auto']}
              tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
              stroke="var(--text-tertiary)"
              label={{ value: 'Potential (mV)', angle: -90, position: 'insideLeft', fontSize: 10, fill: 'var(--text-tertiary)' }}
              width={50}
            />
            <Tooltip
              contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 11 }}
              labelStyle={{ fontFamily: 'var(--font-mono)' }}
            />
            {/* Risk zone background bands */}
            <RiskZoneBands
              protectedMin={minimumMv}
              warningMin={minimumMv - 100}
              criticalMin={minimumMv - 200}
              chartMax={chartMax}
            />
            <ReferenceLine y={minimumMv} stroke="var(--fail)" strokeDasharray="4 3" strokeWidth={1.5} label={{ value: 'NACE −850 mV', position: 'right', fontSize: 9, fill: 'var(--fail)' }} />
            <ReferenceLine y={naturalMv} stroke="var(--text-tertiary)" strokeDasharray="2 4" strokeWidth={1} label={{ value: 'Natural', position: 'right', fontSize: 9, fill: 'var(--text-tertiary)' }} />

            {/* Critical KP markers */}
            {criticalKPs.minProtectionPoint && (
              <ReferenceLine
                x={criticalKPs.minProtectionPoint.km}
                stroke="var(--fail)"
                strokeDasharray="3 3"
                strokeWidth={1}
                label={{ value: '▼ Min', position: 'top', fontSize: 9, fill: 'var(--fail)' }}
              />
            )}
            {criticalKPs.maxAttenuationPoint && (
              <ReferenceLine
                x={criticalKPs.maxAttenuationPoint.km}
                stroke="var(--warn)"
                strokeDasharray="3 3"
                strokeWidth={1}
                label={{ value: '▼ Max Atten', position: 'top', fontSize: 9, fill: 'var(--warn)' }}
              />
            )}

            {/* Other-scenario overlays (lighter) */}
            {Object.entries(scenarios || {}).filter(([k]) => k !== scenario).map(([k]) => (
              <Line
                key={k}
                type="monotone"
                dataKey={k}
                stroke={SCENARIO_COLORS[k]}
                strokeWidth={1}
                strokeOpacity={0.4}
                strokeDasharray="3 3"
                dot={false}
                name={k}
              />
            ))}

            {/* Active scenario (bold) */}
            <Line
              type="monotone"
              dataKey="combined"
              stroke={SCENARIO_COLORS[scenario]}
              strokeWidth={2.5}
              dot={false}
              name={scenario}
            />

            {/* Cursor crosshair */}
            {cursorPoint && (
              <ReferenceLine x={cursorPoint.km} stroke="var(--brand-mid)" strokeWidth={1} strokeDasharray="2 2" />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Cursor inspector */}
      {cursorPoint && (
        <div style={{
          marginTop: 8, padding: '8px 10px', background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8, fontSize: 11,
        }}>
          <Kpi label="Chainage" value={`${cursorPoint.km.toFixed(2)} km`} />
          <Kpi label="Potential" value={`${cursorPoint.combined.toFixed(0)} mV`} accent={cursorPoint.isProtected ? 'var(--pass)' : 'var(--fail)'} />
          <Kpi
            label="Status"
            value={cursorPoint.isProtected ? 'PROTECTED' : 'UNPROTECTED'}
            accent={cursorPoint.isProtected ? 'var(--pass)' : 'var(--fail)'}
          />
          {localGradient != null && (
            <Kpi
              label="dV/dx"
              value={`${localGradient.toFixed(1)} mV/km`}
              accent={Math.abs(localGradient) > 50 ? 'var(--warn)' : 'var(--text-primary)'}
            />
          )}
          <Kpi label="Idx" value={`${cursorIdx + 1} / ${chartData.length}`} />
        </div>
      )}

      {/* Sensitivity tornado in side panel */}
      {tornadoData && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', fontWeight: 600, marginBottom: 6 }}>
            Sensitivity of V_min (this station)
          </div>
          <SensitivityTornado data={tornadoData} width={760} height={280} />
        </div>
      )}
    </div>
  )
}

function Kpi({ label, value, accent }) {
  return (
    <div>
      <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', fontWeight: 600 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: accent || 'var(--text-primary)', marginTop: 1 }}>{value}</div>
    </div>
  )
}
