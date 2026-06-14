/**
 * OptimizationSuggestion.jsx
 *
 * Side panel widget showing "Current config vs Suggested" with expected improvements.
 * Used in Cable, Groundbed, and Attenuation optimization panels.
 */

export function OptimizationSuggestion({
  title = 'Optimization',
  current,
  suggested,
  improvements = [],
}) {
  if (!current || !suggested) return null

  return (
    <div className="viz-side-section">
      <h3 className="viz-side-section-title">{title}</h3>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 11 }}>
        <div>
          <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', fontWeight: 600, marginBottom: 2 }}>
            Current
          </div>
          {current.map((item, i) => (
            <div key={i} style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {item.label}: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{item.value}</span>
            </div>
          ))}
        </div>
        <div>
          <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', fontWeight: 600, marginBottom: 2 }}>
            Suggested
          </div>
          {suggested.map((item, i) => (
            <div key={i} style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {item.label}: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--pass, #22c55e)' }}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {improvements.length > 0 && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', fontWeight: 600, marginBottom: 4 }}>
            Expected Improvement
          </div>
          {improvements.map((imp, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, lineHeight: 1.8, color: 'var(--text-secondary)' }}>
              <span>{imp.label}</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: imp.positive ? 'var(--pass, #22c55e)' : 'var(--fail, #ef4444)' }}>
                {imp.delta}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
