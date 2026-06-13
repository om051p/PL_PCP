/**
 * ProtectionHeatMap.jsx
 *
 * 2D grid: rows = stations, columns = scenarios. Each cell shows protection
 * status (green/amber/red) at that station under that scenario. Hover for
 * details. Read-only visualization for the Validation page.
 */

import { useState } from 'react'

const STATUS_COLORS = {
  pass: { bg: 'var(--pass)', label: 'Pass' },
  warn: { bg: 'var(--warn)', label: 'Warn' },
  fail: { bg: 'var(--fail)', label: 'Fail' },
}

function classify(value, threshold) {
  if (value == null) return 'fail'
  if (value >= threshold.pass) return 'pass'
  if (value >= threshold.warn) return 'warn'
  return 'fail'
}

export function ProtectionHeatMap({ data, threshold = { pass: 1.0, warn: 0.95 }, height = 320 }) {
  const [hover, setHover] = useState(null)
  if (!data || !data.stations || !data.scenarios) {
    return (
      <div style={{ padding: 16, color: 'var(--text-tertiary)', fontSize: 11, textAlign: 'center' }}>
        No heat map data.
      </div>
    )
  }

  const { stations, scenarios, matrix } = data
  const cellW = Math.max(60, 100 / scenarios.length) // heuristic

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: 10.5, color: 'var(--text-tertiary)' }}>
        <span>Stations × Scenarios — cell color shows protection ratio (0..1+)</span>
      </div>
      <div style={{ position: 'relative', overflow: 'auto' }}>
        <table style={{ borderCollapse: 'separate', borderSpacing: 2, fontSize: 10.5 }}>
          <thead>
            <tr>
              <th style={{ width: 140, textAlign: 'left', padding: '4px 6px', fontWeight: 600, color: 'var(--text-tertiary)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Station
              </th>
              {scenarios.map((s) => (
                <th key={s.id} style={{ minWidth: cellW, padding: '4px 6px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }} title={s.label}>
                  {s.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stations.map((st, i) => (
              <tr key={st.id}>
                <td style={{ padding: '4px 6px', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', borderRight: '1px solid var(--border)' }}>
                  {st.name}
                </td>
                {scenarios.map((sc, j) => {
                  const value = matrix[i]?.[j]
                  const status = classify(value, threshold)
                  const color = STATUS_COLORS[status]
                  return (
                    <td
                      key={sc.id}
                      onMouseEnter={() => setHover({ i, j, value, station: st.name, scenario: sc.label })}
                      onMouseLeave={() => setHover(null)}
                      style={{
                        background: color.bg,
                        opacity: 0.6 + (Math.min(1, value || 0) * 0.4),
                        padding: '6px 4px',
                        textAlign: 'center',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 600,
                        color: 'white',
                        fontSize: 11,
                        borderRadius: 2,
                        cursor: 'pointer',
                        minWidth: cellW,
                      }}
                      title={`${st.name} · ${sc.label}: ${(value ?? 0).toFixed(2)}`}
                    >
                      {value != null ? value.toFixed(2) : '—'}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Hover detail */}
      {hover && (
        <div style={{
          marginTop: 8, padding: '6px 10px', background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)',
          fontSize: 11, display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <span><strong style={{ color: 'var(--text-tertiary)' }}>Station:</strong> {hover.station}</span>
          <span><strong style={{ color: 'var(--text-tertiary)' }}>Scenario:</strong> {hover.scenario}</span>
          <span><strong style={{ color: 'var(--text-tertiary)' }}>Ratio:</strong> {hover.value != null ? hover.value.toFixed(3) : 'N/A'}</span>
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 10, color: 'var(--text-tertiary)', marginTop: 6 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 12, height: 12, background: 'var(--pass)', opacity: 0.8, borderRadius: 2 }} />
          Pass (≥ {threshold.pass})
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 12, height: 12, background: 'var(--warn)', opacity: 0.8, borderRadius: 2 }} />
          Warn (≥ {threshold.warn})
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 12, height: 12, background: 'var(--fail)', opacity: 0.8, borderRadius: 2 }} />
          Fail (&lt; {threshold.warn})
        </span>
      </div>
    </div>
  )
}

/**
 * Helper to build the matrix from station/scenario data.
 * Each cell is a value in [0, 1+]: 1.0 = meets criterion; >1 = exceeds.
 */
export function buildHeatMapMatrix(stations, scenarios, evaluate) {
  const matrix = stations.map((st) =>
    scenarios.map((sc) => evaluate(st, sc))
  )
  return { stations, scenarios, matrix }
}
