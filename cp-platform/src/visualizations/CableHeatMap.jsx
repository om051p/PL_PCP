/**
 * CableHeatMap.jsx
 *
 * Horizontal bar visualization showing each cable segment's contribution
 * to total circuit resistance, color-coded by loss severity.
 */

import { useMemo } from 'react'
import { describeCableSegments } from './cableVoltage.js'

const STATUS_COLORS = {
  ok: '#10b981',
  warn: '#f59e0b',
  fail: '#ef4444',
  draft: '#3b82f6',
}

/**
 * @param {object} props
 * @param {object} props.station - Station object with cables, tr, groundbed, lastCalcResult
 */
export function CableHeatMap({ station }) {
  const segments = useMemo(() => describeCableSegments(station), [station])

  if (!segments?.length) return null

  const totalResistance = segments.reduce((sum, s) => sum + (s.resistanceOhm || 0), 0)
  if (totalResistance <= 0) return null

  return (
    <div className="viz-side-section">
      <h3 className="viz-side-section-title">Resistance Heat Map</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {segments.map((seg) => {
          const fraction = totalResistance > 0 ? (seg.resistanceOhm || 0) / totalResistance : 0
          const color = STATUS_COLORS[seg.status] || STATUS_COLORS.draft

          return (
            <div key={seg.id} style={{ fontSize: 11 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                <span style={{ color: 'var(--text-secondary)' }}>{seg.label}</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>
                  {(fraction * 100).toFixed(1)}%
                </span>
              </div>
              <div style={{ height: 6, background: 'var(--border, #27272a)', borderRadius: 3, overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${fraction * 100}%`,
                    background: color,
                    borderRadius: 3,
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
