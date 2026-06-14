/**
 * CorrosivityGauge.jsx
 *
 * Horizontal scale showing soil corrosivity level: Low / Medium / High / Extreme
 */

const CORROSIVITY_LEVELS = [
  { label: 'Low', color: '#22c55e', max: 1000 },
  { label: 'Medium', color: '#f59e0b', max: 3000 },
  { label: 'High', color: '#ef4444', max: 10000 },
  { label: 'Extreme', color: '#dc2626', max: Infinity },
]

function getCorrosivityLevel(resistivityOhmCm) {
  if (resistivityOhmCm < 1000) return 0
  if (resistivityOhmCm < 3000) return 1
  if (resistivityOhmCm < 10000) return 2
  return 3
}

/**
 * @param {object} props
 * @param {number} props.resistivityOhmCm - Design soil resistivity
 * @param {number} [props.width=200]
 */
export function CorrosivityGauge({ resistivityOhmCm, width = 200 }) {
  const level = getCorrosivityLevel(resistivityOhmCm)
  const config = CORROSIVITY_LEVELS[level]
  const ratio = Math.min(1, resistivityOhmCm / 10000)

  return (
    <div className="viz-side-section">
      <h3 className="viz-side-section-title">Corrosivity Level</h3>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
        {/* Scale bar */}
        <div style={{ flex: 1, position: 'relative' }}>
          <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden' }}>
            {CORROSIVITY_LEVELS.map((lvl, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  background: lvl.color,
                  opacity: i === level ? 1 : 0.3,
                }}
              />
            ))}
          </div>
          {/* Needle */}
          <div
            style={{
              position: 'absolute',
              top: -2,
              left: `${ratio * 100}%`,
              width: 2,
              height: 12,
              background: 'var(--text-primary)',
              borderRadius: 1,
              transform: 'translateX(-1px)',
            }}
          />
        </div>

        {/* Current level */}
        <div style={{ minWidth: 60, textAlign: 'right' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: config.color }}>
            {config.label}
          </div>
          <div style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>
            {resistivityOhmCm} Ω·cm
          </div>
        </div>
      </div>

      {/* Scale labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, color: 'var(--text-tertiary)', marginTop: 2 }}>
        {CORROSIVITY_LEVELS.map((lvl, i) => (
          <span key={i} style={{ color: i === level ? lvl.color : undefined }}>{lvl.label}</span>
        ))}
      </div>
    </div>
  )
}
