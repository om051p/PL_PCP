/**
 * SensitivityTornado.jsx
 *
 * SVG-based tornado diagram. Shows the rank-ordered impact of perturbing
 * each designBasis input on a chosen output.
 *
 * Each row: a horizontal bar showing the output value when the input is
 * perturbed -X% (left, blue) and +X% (right, amber). The widest row is
 * the most influential input.
 *
 * Read-only visualization — consumes the output of computeTornado().
 */

import { Sigma, TrendingUp, TrendingDown, Minus } from 'lucide-react'

const ROW_HEIGHT = 28
const LABEL_WIDTH = 180
const PADDING = 8
const BAR_HEIGHT = 18

export function SensitivityTornado({ data, width = 720, height = 380, onRowClick }) {
  if (!data || !data.rows || data.rows.length === 0) {
    return (
      <div style={{ padding: 16, color: 'var(--text-tertiary)', fontSize: 11, textAlign: 'center' }}>
        No sensitivity data. Run a calculation first.
      </div>
    )
  }

  const { output, base, rows, perturbationPct } = data
  const usableWidth = width - LABEL_WIDTH - PADDING * 2
  const centerX = LABEL_WIDTH + usableWidth / 2
  const halfWidth = usableWidth / 2 - 4

  // Find max absolute delta for symmetric scaling
  const maxAbsDelta = Math.max(
    ...rows.map((r) => Math.max(Math.abs(r.deltaLowPct || 0), Math.abs(r.deltaHighPct || 0))),
    1
  )

  const totalHeight = rows.length * ROW_HEIGHT + PADDING * 2 + 40 // +40 for header

  return (
    <div style={{ overflow: 'auto' }}>
      <svg width={width} height={totalHeight} role="img" aria-label={`Tornado diagram for ${output.label}`} style={{ display: 'block' }}>
        {/* Header */}
        <text x={LABEL_WIDTH} y={20} fontSize={11} fontWeight={600} fill="var(--text-primary)">
          {output.label} sensitivity
        </text>
        <text x={centerX} y={20} textAnchor="middle" fontSize={10} fill="var(--text-tertiary)" fontFamily="var(--font-mono)">
          base = {base?.toFixed(4)} {output.unit}
        </text>
        <text x={width - PADDING} y={20} textAnchor="end" fontSize={9.5} fill="var(--text-tertiary)" fontFamily="var(--font-mono)">
          ±{perturbationPct}% perturbation
        </text>

        {/* Center line (base) */}
        <line
          x1={centerX} x2={centerX}
          y1={PADDING + 28} y2={totalHeight - PADDING}
          stroke="var(--text-tertiary)" strokeWidth={1} strokeDasharray="2 2"
        />

        {/* Axis labels */}
        <text x={LABEL_WIDTH} y={PADDING + 38} fontSize={9} fill="var(--text-tertiary)">
          −{perturbationPct}%
        </text>
        <text x={centerX} y={PADDING + 38} textAnchor="middle" fontSize={9} fill="var(--text-tertiary)">
          0
        </text>
        <text x={LABEL_WIDTH + usableWidth} y={PADDING + 38} textAnchor="end" fontSize={9} fill="var(--text-tertiary)">
          +{perturbationPct}%
        </text>

        {/* Rows */}
        {rows.map((row, i) => {
          const y = PADDING + 50 + i * ROW_HEIGHT
          const lowPct = row.deltaLowPct || 0
          const highPct = row.deltaHighPct || 0
          const lowW = (Math.abs(lowPct) / maxAbsDelta) * halfWidth
          const highW = (Math.abs(highPct) / maxAbsDelta) * halfWidth

          const lowColor = lowPct < 0 ? 'var(--pass)' : 'var(--fail)'
          const highColor = highPct < 0 ? 'var(--pass)' : 'var(--fail)'

          return (
            <g key={row.id} style={{ cursor: onRowClick ? 'pointer' : 'default' }} onClick={() => onRowClick?.(row)}>
              {/* Label */}
              <text x={LABEL_WIDTH - 6} y={y + BAR_HEIGHT / 2 + 3} textAnchor="end" fontSize={10.5} fill="var(--text-primary)" fontFamily="var(--font-mono)">
                {truncate(row.id, 24)}
              </text>
              {/* Low bar (left) */}
              {lowPct !== 0 && (
                <rect
                  x={centerX - lowW} y={y}
                  width={lowW} height={BAR_HEIGHT}
                  fill={lowColor} fillOpacity={0.7}
                  rx={2}
                />
              )}
              {/* High bar (right) */}
              {highPct !== 0 && (
                <rect
                  x={centerX} y={y}
                  width={highW} height={BAR_HEIGHT}
                  fill={highColor} fillOpacity={0.7}
                  rx={2}
                />
              )}
              {/* Delta labels */}
              <text x={centerX - lowW - 4} y={y + BAR_HEIGHT / 2 + 3} textAnchor="end" fontSize={9.5} fill="var(--text-secondary)" fontFamily="var(--font-mono)">
                {formatPct(lowPct)}
              </text>
              <text x={centerX + highW + 4} y={y + BAR_HEIGHT / 2 + 3} fontSize={9.5} fill="var(--text-secondary)" fontFamily="var(--font-mono)">
                {formatPct(highPct)}
              </text>
            </g>
          )
        })}
      </svg>

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 10, color: 'var(--text-tertiary)', padding: '4px 8px' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 12, height: 12, background: 'var(--pass)', opacity: 0.7, borderRadius: 2 }} />
          output decreases
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 12, height: 12, background: 'var(--fail)', opacity: 0.7, borderRadius: 2 }} />
          output increases
        </span>
        <span style={{ marginLeft: 'auto', fontStyle: 'italic' }}>Top row = most influential input</span>
      </div>
    </div>
  )
}

function formatPct(p) {
  if (p === 0) return '0%'
  const sign = p > 0 ? '+' : ''
  return `${sign}${p.toFixed(2)}%`
}

function truncate(s, n) {
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}
