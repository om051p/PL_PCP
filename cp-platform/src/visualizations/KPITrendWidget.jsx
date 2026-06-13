/**
 * KPITrendWidget.jsx
 *
 * Recharts-based trend chart for a single KPI over recent calculations.
 * Shows the value over time with pass/warn/fail threshold bands.
 * Used on the Dashboard to replace the static KPI row.
 */

import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine, ReferenceArea, CartesianGrid } from 'recharts'

export function KPITrendWidget({
  data,
  label,
  unit = '',
  thresholds = { pass: null, warn: null },
  currentValue,
  height = 160,
  color = 'var(--brand-mid)',
}) {
  if (!data || data.length === 0) {
    return (
      <div style={{ padding: 12, color: 'var(--text-tertiary)', fontSize: 11, textAlign: 'center' }}>
        No trend data.
      </div>
    )
  }
  const current = currentValue ?? data[data.length - 1]?.value

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', fontWeight: 600 }}>
          {label}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 600, color }}>
          {current?.toFixed(2)} <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{unit}</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="2 2" />
          {thresholds.warn != null && thresholds.pass != null && (
            <>
              <ReferenceArea y1={thresholds.pass} y2={Math.max(thresholds.pass, current ?? 0) * 1.2} fill="var(--pass)" fillOpacity={0.05} />
              <ReferenceArea y1={thresholds.warn} y2={thresholds.pass} fill="var(--warn)" fillOpacity={0.05} />
              <ReferenceArea y1={Math.min(thresholds.warn, current ?? 0) * 0.5} y2={thresholds.warn} fill="var(--fail)" fillOpacity={0.05} />
            </>
          )}
          {thresholds.pass != null && (
            <ReferenceLine y={thresholds.pass} stroke="var(--pass)" strokeDasharray="3 3" strokeWidth={1} />
          )}
          {thresholds.warn != null && (
            <ReferenceLine y={thresholds.warn} stroke="var(--warn)" strokeDasharray="3 3" strokeWidth={1} />
          )}
          <XAxis dataKey="t" hide />
          <YAxis hide domain={['auto', 'auto']} />
          <Tooltip
            contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 11 }}
            labelFormatter={(l) => `t=${l}`}
            formatter={(v) => [`${v.toFixed(2)} ${unit}`, label]}
          />
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
