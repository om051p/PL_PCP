import { Layers, FlaskConical } from 'lucide-react'

/**
 * SoilResistivitySection
 *
 * A left-side section that shows the soil resistivity values driving
 * the groundbed / TR / cable calculations. Engineers need immediate
 * traceability of where the resistivity number came from.
 *
 * Pure display — the values are pre-computed and passed in. This
 * component does no math.
 *
 * @param {object} props
 * @param {number} props.designResistivityOhmCm - The value used in calculations
 * @param {Array<{label:string,resistivityOhmCm:number,thicknessM?:number,depthFromM?:number,depthToM?:number}>} [props.layers]
 * @param {number} [props.averageResistivityOhmCm] - If pre-averaged
 * @param {string} [props.source] - e.g. "Wenner 4-pin survey", "User input", "Imported", "Standard default"
 * @param {string} [props.standard] - e.g. "Saudi Aramco DES-104"
 * @param {string} [props.className]
 */
export function SoilResistivitySection({
  designResistivityOhmCm,
  layers = [],
  averageResistivityOhmCm,
  source,
  standard,
  className = '',
}) {
  return (
    <section className={`viz-soil-resistivity ${className}`.trim()} aria-label="Soil resistivity">
      <header className="viz-soil-resistivity-header">
        <h3 className="viz-soil-resistivity-title">
          <Layers size={14} strokeWidth={2.25} />
          Soil Resistivity
        </h3>
      </header>

      <dl className="viz-soil-resistivity-list">
        <div className="viz-soil-resistivity-row is-primary">
          <dt>Design resistivity</dt>
          <dd>
            <span className="viz-soil-resistivity-value">
              {designResistivityOhmCm != null ? designResistivityOhmCm.toLocaleString() : '—'}
            </span>
            <span className="viz-soil-resistivity-unit">Ω·cm</span>
          </dd>
        </div>
        {averageResistivityOhmCm != null && averageResistivityOhmCm !== designResistivityOhmCm && (
          <div className="viz-soil-resistivity-row">
            <dt>Average resistivity</dt>
            <dd>
              <span className="viz-soil-resistivity-value">{averageResistivityOhmCm.toLocaleString()}</span>
              <span className="viz-soil-resistivity-unit">Ω·cm</span>
            </dd>
          </div>
        )}
        {layers.length > 0 && (
          <div className="viz-soil-resistivity-layers">
            <div className="viz-soil-resistivity-layers-label">Layer resistivity</div>
            <table className="viz-soil-resistivity-table">
              <thead>
                <tr>
                  <th>Layer</th>
                  <th>ρ (Ω·cm)</th>
                  <th>Depth (m)</th>
                </tr>
              </thead>
              <tbody>
                {layers.map((l, i) => (
                  <tr key={i}>
                    <td>{l.label || `Layer ${i + 1}`}</td>
                    <td className="viz-soil-resistivity-mono">{l.resistivityOhmCm?.toLocaleString() ?? '—'}</td>
                    <td className="viz-soil-resistivity-mono">
                      {l.depthFromM != null && l.depthToM != null
                        ? `${l.depthFromM} – ${l.depthToM}`
                        : l.thicknessM != null
                          ? `${l.thicknessM} m`
                          : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="viz-soil-resistivity-row is-meta">
          <dt>Source of value</dt>
          <dd>
            <FlaskConical size={12} strokeWidth={2.25} />
            <span>{source || 'Standard default'}</span>
          </dd>
        </div>
        {standard && (
          <div className="viz-soil-resistivity-row is-meta">
            <dt>Standard</dt>
            <dd>{standard}</dd>
          </div>
        )}
      </dl>
    </section>
  )
}
