/**
 * KPITrendWidget.jsx
 *
 * Recharts-based trend chart for a single KPI over recent calculations.
 * Shows the value over time with pass/warn/fail threshold bands.
 * Used on the Dashboard to replace the static KPI row.
 *
 * Helper `extractTrendData(project, kpiId)` derives a trend array from
 * `project.revisions[].snapshot` so we get historical context per KPI.
 */

import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine, ReferenceArea, CartesianGrid } from 'recharts'

/**
 * Extract a trend data array for a given KPI from a project's revision history.
 * Returns [{ t, value, label }] sorted by `t` ascending. The current project
 * state is appended as the most recent point.
 *
 * @param {object} project - the active project
 * @param {string} kpiId - one of: 'totalStations', 'totalPipelineM', 'groundbedCount', 'trCount', 'validationErrors', 'calculatedStations'
 * @param {number} [max=10] - max number of points
 * @returns {Array<{t: number, value: number, label: string}>}
 */
export function extractTrendData(project, kpiId, max = 10) {
  if (!project) return []
  const compute = (p) => {
    if (!p) return 0
    switch (kpiId) {
      case 'totalStations':
        return p.stations?.length ?? 0
      case 'totalPipelineM': {
        let total = 0
        ;(p.stations || []).forEach((s) => {
          ;(s.pipelineSegments || []).forEach((seg) => {
            total += seg.lengthM || 0
          })
        })
        return total
      }
      case 'groundbedCount':
        return (p.stations || []).filter((s) => s.groundbed).length
      case 'trCount':
        return (p.stations || []).filter((s) => s.tr).length
      case 'validationErrors':
        return (p.stations || []).filter((s) => s.lastCalcResult?.validation?.some((r) => r.severity === 'fail')).length
      case 'calculatedStations':
        return (p.stations || []).filter((s) => s.lastCalcResult).length
      default:
        return 0
    }
  }
  const out = []
  // Append current state
  out.push({ t: Date.now(), value: compute(project), label: 'Current' })
  // Walk revisions newest → oldest
  const revs = (project.revisions || []).slice().reverse()
  for (const r of revs) {
    if (out.length >= max) break
    const v = compute(r.snapshot)
    out.push({ t: new Date(r.createdAt).getTime(), value: v, label: r.revNumber || 'Rev' })
  }
  // Re-sort ascending
  out.sort((a, b) => a.t - b.t)
  return out
}

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
