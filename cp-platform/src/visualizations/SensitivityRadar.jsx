/**
 * SensitivityRadar.jsx
 *
 * Recharts-based radar/spider chart for scenario comparison.
 * Each axis is an output, each scenario is a colored polygon.
 *
 * Values are normalized as % deviation from the first scenario's value
 * so all axes share a comparable scale.
 */

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend, Tooltip, ResponsiveContainer } from 'recharts'

const COLORS = ['var(--brand-mid)', 'var(--pass)', 'var(--warn)', 'var(--fail)', '#8b5cf6', '#06b6d4']

export function SensitivityRadar({ data, height = 360 }) {
  if (!data || !data.scenarios || data.scenarios.length === 0) {
    return (
      <div style={{ padding: 16, color: 'var(--text-tertiary)', fontSize: 11, textAlign: 'center' }}>
        No scenario data.
      </div>
    )
  }

  // Normalize each output against the first scenario's value
  // Each output axis = (scenario_value - baseline) / baseline * 100  (%)
  const baseline = data.scenarios[0].results
  const outputs = data.outputs

  const chartData = outputs.map((o) => {
    const base = baseline[o.id] || 1
    const row = { output: shortLabel(o.label) }
    data.scenarios.forEach((sc) => {
      const v = sc.results[o.id] || 0
      row[sc.name] = base !== 0 ? ((v - base) / base) * 100 : 0
    })
    return row
  })

  return (
    <div>
      <div style={{ marginBottom: 6, fontSize: 10.5, color: 'var(--text-tertiary)' }}>
        Scenario comparison — values are % deviation from <strong style={{ color: 'var(--text-primary)' }}>{data.scenarios[0].name}</strong>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <RadarChart data={chartData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
          <PolarGrid stroke="var(--border)" />
          <PolarAngleAxis dataKey="output" tick={{ fontSize: 9.5, fill: 'var(--text-tertiary)' }} />
          <PolarRadiusAxis
            angle={90}
            domain={['auto', 'auto']}
            tick={{ fontSize: 9, fill: 'var(--text-tertiary)' }}
            stroke="var(--text-tertiary)"
            tickFormatter={(v) => `${v > 0 ? '+' : ''}${v.toFixed(0)}%`}
          />
          {data.scenarios.map((sc, i) => (
            <Radar
              key={sc.name}
              name={sc.name}
              dataKey={sc.name}
              stroke={COLORS[i % COLORS.length]}
              fill={COLORS[i % COLORS.length]}
              fillOpacity={0.2}
              strokeWidth={2}
            />
          ))}
          <Legend wrapperStyle={{ fontSize: 10, paddingTop: 6 }} />
          <Tooltip
            contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 11 }}
            formatter={(v) => `${v > 0 ? '+' : ''}${v.toFixed(2)}%`}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}

function shortLabel(label) {
  // Strip units and short versions like "(R_G)" for axis labels
  return label
    .replace(/\s*\([^)]*\)\s*/g, '')
    .replace('Resistance', 'R')
    .replace('Voltage', 'V')
    .replace('Design Life', 'Life')
    .replace('Required Current', 'I_req')
    .replace('Total Circuit', 'R_T')
    .replace('Min TR', 'V_min')
    .replace('Coke Bags', 'Coke')
    .slice(0, 16)
}
