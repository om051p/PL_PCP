/**
 * VizLegend
 *
 * Legend for engineering visualizations. Renders a list of items with a
 * color swatch and label. Designed for dark and light themes.
 */
export function VizLegend({ items = [], title, orientation = 'horizontal', ariaLabel = 'Legend' }) {
  if (!items || items.length === 0) return null
  return (
    <div
      className={`viz-legend viz-legend--${orientation}`}
      role="group"
      aria-label={ariaLabel}
    >
      {title && <div className="viz-legend-title">{title}</div>}
      <ul className="viz-legend-list">
        {items.map((item, i) => (
          <li key={item.id || i} className="viz-legend-item">
            <span
              className="viz-legend-swatch"
              style={{
                background: item.color,
                border: item.border || '1px solid var(--border)',
                borderRadius: 2,
                width: 12,
                height: 12,
                display: 'inline-block',
                flexShrink: 0,
              }}
              aria-hidden="true"
            />
            <span className="viz-legend-label">{item.label}</span>
            {item.sub && <span className="viz-legend-sub">{item.sub}</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}
