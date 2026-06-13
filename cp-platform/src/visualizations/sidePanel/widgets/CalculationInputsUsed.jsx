import { ListChecks } from 'lucide-react'

/**
 * CalculationInputsUsed
 *
 * A small "Calculation Inputs Used" section that lists the key
 * inputs that drove the most recent calculation. This is the
 * traceability hook the engineering team asked for: engineers
 * must always be able to see where a result came from.
 *
 * Pure display — all values are pre-computed and passed in.
 * The component just formats them.
 *
 * @param {object} props
 * @param {Array<{label:string,value:string|number,unit?:string,source?:string}>} props.items
 * @param {string} [props.title]
 * @param {string} [props.calculatedAt] - ISO timestamp of the calc
 * @param {string} [props.className]
 */
export function CalculationInputsUsed({
  items = [],
  title = 'Calculation Inputs Used',
  calculatedAt,
  className = '',
}) {
  if (!items || items.length === 0) return null
  return (
    <section className={`viz-inputs-used ${className}`.trim()} aria-label={title}>
      <header className="viz-inputs-used-header">
        <h3 className="viz-inputs-used-title">
          <ListChecks size={14} strokeWidth={2.25} />
          {title}
        </h3>
        {calculatedAt && (
          <span className="viz-inputs-used-time">
            {new Date(calculatedAt).toLocaleString('en-US', {
              year: 'numeric', month: 'short', day: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
          </span>
        )}
      </header>
      <dl className="viz-inputs-used-list">
        {items.map((it, i) => (
          <div key={i} className="viz-inputs-used-row">
            <dt>{it.label}</dt>
            <dd>
              <span className="viz-inputs-used-value">
                {it.value}
                {it.unit && <span className="viz-inputs-used-unit">{it.unit}</span>}
              </span>
              {it.source && <span className="viz-inputs-used-source">{it.source}</span>}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
