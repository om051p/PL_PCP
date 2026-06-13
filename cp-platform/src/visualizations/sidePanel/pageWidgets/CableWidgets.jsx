import { KpiCard, KpiGrid, RadialGauge, InsightList, FlowIndicator, StatusList } from '../widgets/index.js'
import { describeCableSegments, classifyCircuitMargin } from '../../cableVoltage'

/**
 * Build the widget set for the PageCableResistance right-side panel.
 *
 * Pure consumer of station + lastCalcResult — no engineering math.
 */
export function CableWidgets({ station, compactKpis = false }) {
  if (!station) return null
  const r = station.lastCalcResult
  if (!r) {
    return (
      <div className="viz-side-widgets">
        <InsightList items={[{ tone: 'info', text: 'No calculation yet. Run the cable calculation to see live metrics.' }]} />
      </div>
    )
  }
  const tr = station.tr
  const I = Number(tr?.ratedCurrent) || 0
  const V = Number(tr?.ratedVoltage) || 0
  const marginStatus = classifyCircuitMargin(r)
  const segments = describeCableSegments(station)
  const worst = segments.reduce((acc, s) => {
    const order = { draft: 0, ok: 1, warn: 2, fail: 3 }
    return order[s.status] > order[acc] ? s.status : acc
  }, 'draft')

  // Cable diagnostics rows
  const diagnostics = segments.map((s) => ({
    key: s.id,
    status: s.status,
    label: s.label,
    hint: `${s.voltageDropV != null ? (s.voltageDropV * 1000).toFixed(1) + ' mV' : '—'} · ${s.fractionOfRated != null ? (s.fractionOfRated * 100).toFixed(2) + ' %' : '—'}`,
  }))
  diagnostics.push({
    key: 'earth',
    status: r.groundbedResistanceOhm < (r.maxAllowableGroundbedRes || Infinity) ? 'ok' : 'fail',
    label: 'Earth return (R_G)',
    hint: r.groundbedResistanceOhm != null ? `${(r.groundbedResistanceOhm * 1000).toFixed(0)} mΩ` : '—',
  })

  // Cable contribution to total resistance (text insight)
  const insights = []
  if (r.totalCableResOhm != null && r.totalCircuitResistanceOhm != null && r.totalCircuitResistanceOhm > 0) {
    const pct = ((r.totalCableResOhm / r.totalCircuitResistanceOhm) * 100).toFixed(0)
    insights.push({
      tone: 'info',
      text: `Cable resistance contributes ${pct}% of total circuit resistance.`,
    })
  }
  const worstSeg = segments.find((s) => s.status === 'fail')
  if (worstSeg) {
    insights.push({
      tone: 'warn',
      text: `Voltage drop on ${worstSeg.label.toLowerCase()} exceeds the 10% threshold. Consider increasing conductor cross-section.`,
    })
  } else if (segments.some((s) => s.status === 'warn')) {
    insights.push({ tone: 'warn', text: 'Voltage drop is approaching the recommended threshold on at least one cable.' })
  }

  // Composite health score
  const rMargin = r.maxAllowableGroundbedRes != null && r.groundbedResistanceOhm != null && r.maxAllowableGroundbedRes > 0
    ? Math.max(0, Math.min(1, 1 - r.groundbedResistanceOhm / r.maxAllowableGroundbedRes))
    : 0
  const vMargin = r.minTRVoltage != null && V > 0 ? Math.max(0, Math.min(1, 1 - r.minTRVoltage / V)) : 0
  const health = Math.round((0.5 * rMargin + 0.5 * vMargin) * 100)
  const gaugeTone = worst === 'fail' ? 'fail' : worst === 'warn' ? 'warn' : 'ok'

  return (
    <div className={`viz-side-widgets ${compactKpis ? 'is-compact' : ''}`.trim()}>
      {!compactKpis && (
        <KpiGrid min={120}>
          <KpiCard
            label="R_T"
            value={r.totalCircuitResistanceOhm != null ? r.totalCircuitResistanceOhm : null}
            precision={3}
            unit="Ω"
            tone="neutral"
          />
          <KpiCard
            label="V drop"
            value={r.totalCableResOhm != null ? r.totalCableResOhm * I : null}
            precision={2}
            unit="V"
            tone="neutral"
          />
          <KpiCard
            label="Margin"
            value={r.minTRVoltage != null && V > 0 ? (r.minTRVoltage / V) * 100 : null}
            precision={1}
            unit="%"
            format={(v) => v.toFixed(1)}
            tone={marginStatus === 'ok' ? 'ok' : marginStatus === 'warn' ? 'warn' : 'fail'}
          />
          <KpiCard
            label="R_c"
            value={r.totalCableResOhm != null ? r.totalCableResOhm : null}
            precision={4}
            unit="Ω"
            tone="neutral"
          />
        </KpiGrid>
      )}

      {compactKpis && (
        <KpiGrid min={90}>
          <KpiCard label="R_T" value={r.totalCircuitResistanceOhm != null ? r.totalCircuitResistanceOhm : null} precision={3} unit="Ω" tone="neutral" size="sm" />
          <KpiCard label="R_c" value={r.totalCableResOhm != null ? r.totalCableResOhm : null} precision={4} unit="Ω" tone="neutral" size="sm" />
          <KpiCard label="V drop" value={r.totalCableResOhm != null ? r.totalCableResOhm * I : null} precision={2} unit="V" tone="neutral" size="sm" />
          <KpiCard
            label="Margin"
            value={r.minTRVoltage != null && V > 0 ? (r.minTRVoltage / V) * 100 : null}
            precision={1}
            unit="%"
            format={(v) => v.toFixed(1)}
            tone={marginStatus === 'ok' ? 'ok' : marginStatus === 'warn' ? 'warn' : 'fail'}
            size="sm"
          />
        </KpiGrid>
      )}

      {!compactKpis && (
        <>
          <section className="viz-side-section viz-side-section-center">
            <h3 className="viz-side-section-title">Circuit health</h3>
            <RadialGauge
              percent={health}
              label="Health"
              caption="composite score"
              tone={gaugeTone}
              ariaLabel={`Cable circuit health score: ${health} percent`}
            />
          </section>

          <section className="viz-side-section">
            <h3 className="viz-side-section-title">Current flow</h3>
            <FlowIndicator
              nodes={[
                { label: 'TR', tone: 'ok' },
                { label: 'GB', tone: 'neutral' },
                { label: 'Earth', tone: 'neutral' },
                { label: 'Pipe', tone: 'neutral' },
                { label: 'TR', tone: 'ok' },
              ]}
              ariaLabel="Current flow: TR to groundbed to earth to pipeline back to TR"
            />
          </section>

          <section className="viz-side-section">
            <h3 className="viz-side-section-title">Cable diagnostics</h3>
            <StatusList items={diagnostics} ariaLabel="Cable diagnostics" />
          </section>

          {insights.length > 0 && (
            <section className="viz-side-section">
              <h3 className="viz-side-section-title">Insights</h3>
              <InsightList items={insights} />
            </section>
          )}
        </>
      )}
    </div>
  )
}
