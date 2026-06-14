/**
 * StationSpacingRecommendation.jsx
 *
 * Side panel widget showing current vs recommended station spacing.
 */

import { useMemo } from 'react'
import { recommendSpacing } from '../engine/modules/stationSpacing.js'
import { MapPin, Plus, ArrowRight } from 'lucide-react'

export function StationSpacingRecommendation({ profile, currentStations, minimumMv = 850 }) {
  const rec = useMemo(
    () => recommendSpacing(profile, currentStations, minimumMv),
    [profile, currentStations, minimumMv]
  )

  if (!rec || rec.currentStationCount === 0) return null

  // M7 defensive: clamp non-finite numbers so we never render "NaN km".
  const fmtKm = (v) => (Number.isFinite(v) ? v.toFixed(1) : '—')
  const currentSpacing = Number.isFinite(rec.currentSpacingKm) ? rec.currentSpacingKm : 0
  const recommendedSpacing = Number.isFinite(rec.recommendedSpacingKm) ? rec.recommendedSpacingKm : 0

  return (
    <div className="viz-side-section">
      <h3 className="viz-side-section-title">Station Spacing</h3>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, fontSize: 11, alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', fontWeight: 600, marginBottom: 2 }}>
            Current
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>
            {fmtKm(currentSpacing)} km avg
          </div>
          <div style={{ color: 'var(--text-tertiary)', fontSize: 10 }}>
            {rec.currentStationCount} stations
          </div>
        </div>
        <ArrowRight size={14} style={{ color: 'var(--text-tertiary)' }} />
        <div>
          <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', fontWeight: 600, marginBottom: 2 }}>
            Recommended
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--pass)' }}>
            {fmtKm(recommendedSpacing)} km max
          </div>
          <div style={{ color: 'var(--text-tertiary)', fontSize: 10 }}>
            {rec.recommendedStationCount} stations
          </div>
        </div>
      </div>

      {rec.additionalStations.length > 0 && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', fontWeight: 600, marginBottom: 4 }}>
            <Plus size={10} style={{ verticalAlign: -1, marginRight: 2 }} />
            Suggested Additional Stations
          </div>
          {(Array.isArray(rec.additionalStations) ? rec.additionalStations : []).map((s, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, lineHeight: 1.8, color: 'var(--text-secondary)' }}>
              <span style={{ fontFamily: 'var(--font-mono)' }}>KM {fmtKm(s?.positionKm)}</span>
              <span style={{ color: 'var(--text-tertiary)' }}>{s?.reason ?? ''}</span>
            </div>
          ))}
        </div>
      )}

      {rec.expectedImprovement && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', fontWeight: 600, marginBottom: 2 }}>
            Expected Improvement
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
            Protection: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--pass)', fontWeight: 600 }}>
              {rec.expectedImprovement.currentProtectedPct.toFixed(0)}% → {Math.min(100, rec.expectedImprovement.currentProtectedPct + rec.expectedImprovement.expectedProtectedPctIncrease).toFixed(0)}%
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
