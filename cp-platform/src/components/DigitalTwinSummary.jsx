/**
 * DigitalTwinSummary.jsx
 *
 * V5 Phase 2 — Dashboard Row 4. Reads the digitalTwin slice and renders:
 *   - Assets Registered (total)
 *   - Healthy / Warning / Critical counts
 *   - Project Health % (average)
 *   - Predicted Anode Life (min design life across stations)
 *
 * Auto-refreshes the digital twin for the current project on mount/project-change.
 * No engineering formula changes — purely a consumer of the existing slice.
 */
import { useEffect, useMemo } from 'react'
import { useProjectStore } from '../store/projectStore.js'
import { Cpu } from 'lucide-react'

export function DigitalTwinSummary({ project }) {
  const refreshDigitalTwin = useProjectStore((s) => s.refreshDigitalTwinForProject)
  const digitalTwin = useProjectStore((s) => s.digitalTwin)
  const stations = project?.stations || []

  // Auto-refresh digital twin data for the current project
  useEffect(() => {
    if (project && typeof refreshDigitalTwin === 'function') {
      try { refreshDigitalTwin() } catch { /* silent — slice is read-only if not yet initialized */ }
    }
  }, [project?.id, refreshDigitalTwin])

  const summary = useMemo(() => {
    if (!digitalTwin) {
      return { totalAssets: 0, healthy: 0, warning: 0, critical: 0, projectHealth: null, predictedAnodeLife: null }
    }
    const { registry, healthScores } = digitalTwin
    const byStation = registry?.byStation || {}
    let totalAssets = 0
    Object.values(byStation).forEach((ids) => {
      if (Array.isArray(ids)) totalAssets += ids.length
    })

    let healthy = 0
    let warning = 0
    let critical = 0
    const healthValues = []
    Object.values(healthScores || {}).forEach((h) => {
      if (!h || typeof h.score !== 'number') return
      healthValues.push(h.score)
      if (h.score >= 75) healthy++
      else if (h.score >= 50) warning++
      else critical++
    })
    const projectHealth = healthValues.length > 0
      ? Math.round(healthValues.reduce((s, v) => s + v, 0) / healthValues.length)
      : null

    // Predicted anode life = min design life across stations (worst case)
    const lives = stations
      .map((s) => s.lastCalcResult?.designLifeYears)
      .filter((v) => typeof v === 'number' && v > 0)
    const predictedAnodeLife = lives.length > 0 ? Math.min(...lives) : null

    return { totalAssets, healthy, warning, critical, projectHealth, predictedAnodeLife }
  }, [digitalTwin, stations])

  if (!summary || summary.totalAssets === 0) {
    return (
      <div className="section-card" style={{ marginTop: 12 }}>
        <div className="section-card-header">
          <span className="section-card-title">
            <Cpu size={14} /> Digital Twin
          </span>
          <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>0 assets registered</span>
        </div>
        <div className="section-card-body" style={{ fontSize: 12, color: 'var(--text-tertiary)', padding: 8 }}>
          No digital twin data yet. Run a station calculation to populate the asset registry.
        </div>
      </div>
    )
  }

  const healthTone = summary.projectHealth == null ? 'info'
    : summary.projectHealth >= 75 ? 'pass'
    : summary.projectHealth >= 50 ? 'warn' : 'fail'

  return (
    <div className="section-card" style={{ marginTop: 12 }}>
      <div className="section-card-header">
        <span className="section-card-title">
          <Cpu size={14} /> Digital Twin
        </span>
        <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
          {summary.totalAssets} assets registered
        </span>
      </div>
      <div
        className="section-card-body"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}
      >
        <div className="kpi-card kpi-card--pass">
          <span className="kpi-card__label">Healthy Assets</span>
          <span className="kpi-card__value">{summary.healthy}</span>
          <span className="kpi-card__sub">score ≥ 75</span>
        </div>
        <div className="kpi-card kpi-card--warn">
          <span className="kpi-card__label">Warning Assets</span>
          <span className="kpi-card__value">{summary.warning}</span>
          <span className="kpi-card__sub">score 50–74</span>
        </div>
        <div className="kpi-card kpi-card--fail">
          <span className="kpi-card__label">Critical Assets</span>
          <span className="kpi-card__value">{summary.critical}</span>
          <span className="kpi-card__sub">score &lt; 50</span>
        </div>
        <div className={`kpi-card kpi-card--${healthTone}`}>
          <span className="kpi-card__label">Project Health</span>
          <span className="kpi-card__value">
            {summary.projectHealth == null ? '—' : `${summary.projectHealth}%`}
          </span>
          <span className="kpi-card__sub">avg across stations</span>
        </div>
        <div className="kpi-card kpi-card--info">
          <span className="kpi-card__label">Predicted Anode Life</span>
          <span className="kpi-card__value">
            {summary.predictedAnodeLife == null ? '—' : `${summary.predictedAnodeLife.toFixed(1)}`}
          </span>
          <span className="kpi-card__sub">years (worst station)</span>
        </div>
      </div>
    </div>
  )
}

export default DigitalTwinSummary
