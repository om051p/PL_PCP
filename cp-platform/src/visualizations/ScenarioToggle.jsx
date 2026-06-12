/**
 * ScenarioToggle
 *
 * Multi-scenario comparison toggle. Renders a row of pill buttons, each
 * representing a scenario. The active scenario is highlighted. Used by
 * the Attenuation Explorer and other multi-curve visualizations.
 */
export function ScenarioToggle({ scenarios = [], active, onChange, ariaLabel = 'Scenarios' }) {
  if (!scenarios || scenarios.length === 0) return null
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="viz-scenario-toggle">
      {scenarios.map((s) => {
        const isActive = s.id === active
        return (
          <button
            key={s.id}
            type="button"
            role="radio"
            aria-checked={isActive}
            className={`viz-scenario-pill ${isActive ? 'is-active' : ''}`}
            style={isActive && s.color ? { borderColor: s.color, color: s.color } : undefined}
            onClick={() => onChange?.(s.id)}
          >
            {s.color && (
              <span
                aria-hidden="true"
                className="viz-scenario-swatch"
                style={{ background: s.color }}
              />
            )}
            <span className="viz-scenario-label">{s.label}</span>
            {s.sub && <span className="viz-scenario-sub">{s.sub}</span>}
          </button>
        )
      })}
    </div>
  )
}
