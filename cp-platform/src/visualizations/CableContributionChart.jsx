/**
 * CableContributionChart.jsx
 *
 * Donut chart showing percentage breakdown of cable resistance contributions.
 */

import { useMemo } from 'react'
import { describeCableSegments } from './cableVoltage.js'

const SEGMENT_COLORS = {
  positiveMain: '#10b981',
  negativeMain: '#3b82f6',
  anodeTail: '#a855f7',
  earthReturn: '#f59e0b',
}

/**
 * @param {object} props
 * @param {object} props.station - Station object
 */
export function CableContributionChart({ station }) {
  const segments = useMemo(() => describeCableSegments(station), [station])

  if (!segments?.length) return null

  const totalResistance = segments.reduce((sum, s) => sum + (s.resistanceOhm || 0), 0)
  if (totalResistance <= 0) return null

  // Build donut segments
  let cumulativePercent = 0
  const donutSegments = segments
    .filter((s) => s.resistanceOhm > 0)
    .map((s) => {
      const percent = (s.resistanceOhm / totalResistance) * 100
      const start = cumulativePercent
      cumulativePercent += percent
      return {
        ...s,
        percent,
        startAngle: (start / 100) * 360 - 90,
        endAngle: (cumulativePercent / 100) * 360 - 90,
        color: SEGMENT_COLORS[s.id] || '#71717a',
      }
    })

  return (
    <div className="viz-side-section">
      <h3 className="viz-side-section-title">Resistance Contribution</h3>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* SVG Donut */}
        <svg width={100} height={100} viewBox="0 0 100 100">
          {donutSegments.map((seg) => {
            const radius = 35
            const cx = 50
            const cy = 50
            const startRad = (seg.startAngle * Math.PI) / 180
            const endRad = (seg.endAngle * Math.PI) / 180
            const x1 = cx + radius * Math.cos(startRad)
            const y1 = cy + radius * Math.sin(startRad)
            const x2 = cx + radius * Math.cos(endRad)
            const y2 = cy + radius * Math.sin(endRad)
            const largeArc = seg.percent > 50 ? 1 : 0

            return (
              <path
                key={seg.id}
                d={`M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`}
                fill={seg.color}
                opacity={0.85}
              />
            )
          })}
          {/* Center hole */}
          <circle cx={50} cy={50} r={20} fill="var(--card, #18181b)" />
          <text x={50} y={48} textAnchor="middle" fontSize={8} fill="var(--text-tertiary)" fontWeight={600}>
            TOTAL
          </text>
          <text x={50} y={58} textAnchor="middle" fontSize={9} fill="var(--text-primary)" fontFamily="var(--font-mono)" fontWeight={700}>
            {totalResistance < 0.001
              ? `${(totalResistance * 1000).toFixed(1)}mΩ`
              : `${totalResistance.toFixed(4)}Ω`}
          </text>
        </svg>

        {/* Legend */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11 }}>
          {donutSegments.map((seg) => (
            <div key={seg.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: seg.color, flexShrink: 0 }} />
              <span style={{ color: 'var(--text-secondary)', flex: 1 }}>{seg.label}</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontWeight: 600 }}>
                {seg.percent.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
