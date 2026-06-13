/**
 * SensitivitySweep.jsx
 *
 * Recharts-based one-at-a-time sweep chart. X-axis = input value,
 * Y-axis = output value. Multiple series for different outputs.
 */

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const COLORS = [
  'var(--brand-mid)',
  'var(--pass)',
  'var(--warn)',
  'var(--fail)',
  '#8b5cf6',
  '#06b6d4',
]

export function SensitivitySweep({ data, height = 360, outputIds }) {
  if (!data || !data.data || data.data.length === 0) {
    return (
      <div style={{ padding: 16, color: 'var(--text-tertiary)', fontSize: 11, textAlign: 'center' }}>
        No sweep data.
      </div>
    )
  }

  // Filter outputs to display
  const outputs = (outputIds && outputIds.length > 0)
    ? data.outputs.filter((o) => outputIds.includes(o.id))
    : data.outputs

  // Flatten for recharts
  const chartData = data.data.map((d) => {
    const row = { x: d.x }
    outputs.forEach((o) => { row[o.id] = d.results[o.id] })
    return row
  })

  return (
    <div>
      <div style={{ marginBottom: 6, fontSize: 10.5, color: 'var(--text-tertiary)' }}>
        Sweeping <strong style={{ color: 'var(--text-primary)' }}>{data.input.label}</strong> across
        <strong style={{ color: 'var(--text-primary)' }}> [{data.range[0]}, {data.range[1]}]</strong>
        · {data.samples} samples
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={chartData} margin={{ top: 10, right: 24, bottom: 32, left: 8 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="2 2" />
          <XAxis
            dataKey="x"
            type="number"
            domain={['dataMin', 'dataMax']}
            label={{ value: data.input.label, position: 'insideBottom', offset: -16, fontSize: 10, fill: 'var(--text-tertiary)' }}
            tick={{ fontSize: 9.5, fill: 'var(--text-tertiary)' }}
            stroke="var(--text-tertiary)"
          />
          <YAxis
            tick={{ fontSize: 9.5, fill: 'var(--text-tertiary)' }}
            stroke="var(--text-tertiary)"
            width={60}
          />
          <Tooltip
            contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 11 }}
            labelStyle={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}
          />
          <Legend wrapperStyle={{ fontSize: 10, paddingTop: 6 }} />
          {outputs.map((o, i) => (
            <Line
              key={o.id}
              type="monotone"
              dataKey={o.id}
              name={o.label}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
