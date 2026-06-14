/**
 * EngineeringGauge.jsx
 *
 * Small inline gauge showing a value within a range with color-coded status.
 * Used in groundbed indicators, cable status, attenuation risk.
 */

const STATUS_COLORS = {
  pass: '#22c55e',
  warn: '#f59e0b',
  fail: '#ef4444',
  neutral: '#71717a',
}

function getStatus(value, min, max) {
  if (value == null || !Number.isFinite(value)) return 'neutral'
  const ratio = (value - min) / (max - min)
  if (ratio >= 0.7) return 'pass'
  if (ratio >= 0.4) return 'warn'
  return 'fail'
}

/**
 * @param {object} props
 * @param {string} props.label - Gauge label
 * @param {number} props.value - Current value
 * @param {number} props.min - Minimum of range
 * @param {number} props.max - Maximum of range
 * @param {string} [props.unit] - Unit suffix
 * @param {'pass'|'warn'|'fail'|'auto'} [props.status] - Override status
 * @param {number} [props.width=120] - Gauge width in px
 */
export function EngineeringGauge({
  label,
  value,
  min = 0,
  max = 100,
  unit = '',
  status = 'auto',
  width = 120,
}) {
  const resolvedStatus = status === 'auto' ? getStatus(value, min, max) : status
  const color = STATUS_COLORS[resolvedStatus] || STATUS_COLORS.neutral
  const ratio = Math.max(0, Math.min(1, (value - min) / (max - min)))

  return (
    <div style={{ width, fontSize: 11 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
        <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', fontWeight: 600 }}>
          {label}
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color }}>
          {value != null && Number.isFinite(value) ? (typeof value === 'number' ? value.toFixed(1) : value) : '—'}
          {unit && <span style={{ fontSize: 9, color: 'var(--text-tertiary)', marginLeft: 2 }}>{unit}</span>}
        </span>
      </div>
      <div style={{ height: 4, background: 'var(--border, #27272a)', borderRadius: 2, overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${ratio * 100}%`,
            background: color,
            borderRadius: 2,
            transition: 'width 0.3s ease',
          }}
        />
      </div>
    </div>
  )
}

/**
 * GaugeRow — horizontal row of small gauges.
 */
export function GaugeRow({ gauges, gap = 16 }) {
  if (!gauges?.length) return null

  return (
    <div style={{ display: 'flex', gap, flexWrap: 'wrap' }}>
      {gauges.map((g, i) => (
        <EngineeringGauge key={g.label || i} {...g} />
      ))}
    </div>
  )
}
