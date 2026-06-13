import { KpiCard, KpiGrid, StatusList, RadialGauge, InsightList, CalculationInputsUsed } from '../widgets/index.js'
import { classifyGroundbedStatus } from '../../groundbedStatus.js'
import { buildGroundbedInputsUsed } from '../inputSummaries.js'

/**
 * Build the widget set for the PageGroundbed right-side engineering panel.
 *
 * Pure consumer of `station` and `station.lastCalcResult` — no math here
 * beyond status classification (already in groundbedStatus.js).
 *
 * Layout contract (per the optimization pass):
 *   - The PRIMARY visualization (GroundbedVisualizer) lives in the right
 *     panel slot, not the main content (no duplication).
 *   - The widgets below are intelligence-only: KPIs, status, gauge,
 *     insights, and the calculation inputs used (traceability).
 *   - The depth-profile widget was removed because it duplicates the
 *     main visualization.
 */
export function GroundbedWidgets({ station, project }) {
  if (!station) return null
  const r = station.lastCalcResult
  const gb = station.groundbed
  const N = Number(station.proposedAnodes) || 0
  const status = classifyGroundbedStatus(r)

  // KPIs (pure read)
  const rG = r?.groundbedResistanceOhm ?? null
  const rMax = r?.maxAllowableGroundbedRes ?? null
  const lifeYrs = r?.designLifeYears ?? null
  const lifeTarget = r?.targetDesignLifeYears ?? null
  const activeL = r?.activeLengthM ?? null
  const totalD = r?.totalDrillDepthM ?? (gb?.startDepthM && activeL ? gb.startDepthM + activeL : null)

  // Health score: weighted combination of margin and life attainment
  let health = 0
  if (r && rG != null && rMax != null && lifeYrs != null && lifeTarget != null) {
    const rMargin = rMax > 0 ? Math.max(0, Math.min(1, 1 - rG / rMax)) : 0
    const lifeMargin = lifeTarget > 0 ? Math.max(0, Math.min(1, lifeYrs / lifeTarget)) : 0
    health = Math.round((0.6 * rMargin + 0.4 * lifeMargin) * 100)
  }

  // Status list items
  const statusItems = []
  if (r) {
    statusItems.push({
      key: 'rG',
      status: rG < rMax ? 'ok' : 'fail',
      label: rG < rMax ? 'Resistance within limit' : 'Resistance exceeds limit',
      hint: rG < rMax ? `${((1 - rG / rMax) * 100).toFixed(0)}% margin` : 'Review required',
    })
    statusItems.push({
      key: 'life',
      status: lifeYrs >= lifeTarget ? 'ok' : 'fail',
      label: lifeYrs >= lifeTarget ? 'Design life achieved' : 'Design life short of target',
      hint: `${lifeYrs.toFixed(1)} / ${lifeTarget} yrs`,
    })
    statusItems.push({
      key: 'capacity',
      status: 'ok',
      label: 'Current capacity adequate',
      hint: 'per design basis',
    })
    if (rG / rMax < 0.5) {
      statusItems.push({
        key: 'opt',
        status: 'warn',
        label: 'Optimization opportunity',
        hint: 'anodes may be reducible',
      })
    }
  } else {
    statusItems.push({
      key: 'pending',
      status: 'pending',
      label: 'Awaiting calculation',
      hint: 'Run calculations to evaluate',
    })
  }

  // Insights (pure text composition)
  const insights = []
  if (r && rG != null && rMax != null) {
    const margin = ((1 - rG / rMax) * 100).toFixed(0)
    insights.push({
      tone: rG < rMax ? 'ok' : 'warn',
      text: `Groundbed resistance is ${margin}% ${rG < rMax ? 'below' : 'above'} the allowable limit.`,
    })
  }
  if (r && lifeYrs != null && lifeTarget != null) {
    const delta = (lifeYrs - lifeTarget).toFixed(1)
    insights.push({
      tone: lifeYrs >= lifeTarget ? 'ok' : 'warn',
      text: lifeYrs >= lifeTarget
        ? `Design life exceeds target by ${delta} years.`
        : `Design life is ${Math.abs(delta)} years short of target.`,
    })
  }
  if (r && rG != null && rMax != null && rG < rMax * 0.5) {
    insights.push({ tone: 'info', text: 'Anode utilization is efficient — current sizing has headroom.' })
  }

  const gaugeTone = status === 'ok' ? 'ok' : status === 'warn' ? 'warn' : status === 'fail' ? 'fail' : 'draft'

  // Input summary (traceability)
  const inputsItems = buildGroundbedInputsUsed(station, project)

  return (
    <div className="viz-side-widgets">
      <KpiGrid min={120}>
        <KpiCard
          label="Groundbed type"
          value={gb?.type === 'distributed' ? 'Horizontal' : gb?.type === 'deepwell' ? 'Deep well' : gb?.type || '—'}
          precision={0}
          format={(v) => v}
          tone="neutral"
        />
        <KpiCard label="Anode qty" value={N} precision={0} format={(v) => v.toFixed(0)} unit="anodes" />
        <KpiCard
          label="R_G"
          value={rG != null ? rG * 1000 : null}
          precision={2}
          unit="mΩ"
          format={(v) => v.toFixed(2)}
          tone={rG != null && rMax != null ? (rG < rMax ? 'ok' : 'fail') : 'draft'}
        />
        <KpiCard
          label="Design life"
          value={lifeYrs}
          precision={1}
          unit="yrs"
          format={(v) => v.toFixed(1)}
          tone={lifeYrs != null && lifeTarget != null ? (lifeYrs >= lifeTarget ? 'ok' : 'fail') : 'draft'}
        />
        {activeL != null && (
          <KpiCard label="Active length" value={activeL} precision={2} unit="m" format={(v) => v.toFixed(2)} />
        )}
        {totalD != null && (
          <KpiCard label="Total depth" value={totalD} precision={2} unit="m" format={(v) => v.toFixed(2)} />
        )}
      </KpiGrid>

      <section className="viz-side-section">
        <h3 className="viz-side-section-title">Engineering status</h3>
        <StatusList items={statusItems} />
      </section>

      <section className="viz-side-section viz-side-section-center">
        <h3 className="viz-side-section-title">Visual health</h3>
        <RadialGauge
          percent={health}
          label="Health"
          caption="composite score"
          tone={gaugeTone}
          ariaLabel={`Groundbed health score: ${health} percent`}
        />
      </section>

      {insights.length > 0 && (
        <section className="viz-side-section">
          <h3 className="viz-side-section-title">Design insights</h3>
          <InsightList items={insights} />
        </section>
      )}

      {inputsItems.length > 0 && (
        <section className="viz-side-section">
          <CalculationInputsUsed
            items={inputsItems}
            title="Calculation Inputs Used"
            calculatedAt={r?.calculatedAt}
          />
        </section>
      )}
    </div>
  )
}
