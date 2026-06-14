/**
 * PageCableResistance.jsx
 *
 * Anode tail cables, positive/negative main cables, and total cable circuit resistance.
 */

import { useProjectStore } from '../store/projectStore.js'
import StationTabs from '../components/StationTabs.jsx'
import {
  FieldInput,
  SelectField,
  ResultRow,
  SectionCard,
  StandardBadge,
  Grid2,
} from '../components/ui.jsx'
import { CABLE_SPECS, getActiveStandard } from '../constants/index.js'
import {
  CableNetworkVisualizer,
  CableWidgets,
  StatusList,
  InsightList,
  RightSideEngineeringPanel,
  CableHeatMap,
  CableContributionChart,
  CableOptimizationPanel,
} from '../visualizations/index.js'
import { describeCableSegments, classifyCircuitMargin } from '../visualizations/cableVoltage.js'
import { Cable, BarChart3 } from 'lucide-react'
import { TracePanel } from '../components/TracePanel.jsx'
import { analyze } from '../engine/engineeringAdvisor/recommendationEngine.js'
import { useMemo } from 'react'

function CableDiagnosticsInline({ station }) {
  const r = station?.lastCalcResult
  if (!r) return null
  const segments = describeCableSegments(station)
  const items = segments.map((s) => ({
    key: s.id,
    status: s.status,
    label: s.label,
    hint: `${s.voltageDropV != null ? (s.voltageDropV * 1000).toFixed(1) + ' mV' : '—'} · ${s.fractionOfRated != null ? (s.fractionOfRated * 100).toFixed(2) + ' %' : '—'}`,
  }))
  items.push({
    key: 'earth',
    status: r.groundbedResistanceOhm < (r.maxAllowableGroundbedRes || Infinity) ? 'ok' : 'fail',
    label: 'Earth return (R_G)',
    hint: r.groundbedResistanceOhm != null ? `${(r.groundbedResistanceOhm * 1000).toFixed(0)} mΩ` : '—',
  })
  return (
    <section className="viz-side-section">
      <h3 className="viz-side-section-title">Diagnostics</h3>
      <StatusList items={items} ariaLabel="Cable diagnostics" />
    </section>
  )
}

function CableInsightsInline({ station }) {
  const r = station?.lastCalcResult
  if (!r) return null
  const segments = describeCableSegments(station)
  const insights = []
  if (r.totalCableResOhm != null && r.totalCircuitResistanceOhm != null && r.totalCircuitResistanceOhm > 0) {
    const pct = ((r.totalCableResOhm / r.totalCircuitResistanceOhm) * 100).toFixed(0)
    insights.push({ tone: 'info', text: `Cable resistance contributes ${pct}% of total circuit resistance.` })
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
  if (insights.length === 0) return null
  return (
    <section className="viz-side-section">
      <h3 className="viz-side-section-title">Insights</h3>
      <InsightList items={insights} />
    </section>
  )
}

export function PageCableResistance() {
  const station = useProjectStore((s) => s.getActiveStation())
  const updateStation = useProjectStore((s) => s.updateStation)
  const project = useProjectStore((s) => s.getProject())
  const r = station?.lastCalcResult
  const cb = station?.cables
  const N = station?.proposedAnodes
  const std = getActiveStandard(project)

  const combinedInput = useMemo(() => {
    if (!station || !r) return {}
    return {
      ...station,
      ...r,
      targetDesignLifeYears: project?.designBasis?.systemDesignLifeYears || 25,
      sacrificialAnodeCount: station.proposedAnodes,
      calculatedAnodeCount: station.proposedAnodes,
    }
  }, [station, r, project])

  const recommendations = useMemo(() => {
    if (!station || !r) return []
    return analyze(combinedInput).recommendations
  }, [combinedInput, station, r])

  if (!station) return null

  // Cable resistance formulas
  const parallelResFormula = 'R_ac = 1 / Σ(1 / (L_i × r))'
  const cableResFormula = 'R_cable = L × r_ohm_per_m'
  const totalCableFormula = 'R_c = R_ac + R_pc + R_nc_main + R_nc_sec'

  const cableFormulas = [
    {
      name: 'Parallel Anode Tail Resistance',
      equation: parallelResFormula,
      standardRef: 'IEC 60287 / 17-SAMSS-020',
      assumptions: [
        'All anode tail cables have identical conductor specification',
        'Resistance values at 20°C DC',
        'Parallel combination per Kirchhoff current law',
      ],
      units: ['L_i: m', 'r: Ω/m', 'R_ac: Ω'],
      variables: ['L_i (individual tail length)', 'r (resistance per meter)', 'R_ac (equivalent parallel resistance)'],
    },
    {
      name: 'Cable Segment Resistance',
      equation: cableResFormula,
      standardRef: 'IEC 60287 / 17-SAMSS-020',
      assumptions: [
        'Constant cross-section per segment',
        'Temperature effects negligible for buried cable',
      ],
      units: ['L: m', 'r: Ω/m', 'R: Ω'],
      variables: ['L (cable length)', 'r (resistance per meter from cable specs)', 'R (segment resistance)'],
    },
    {
      name: 'Total Cable Circuit Resistance',
      equation: totalCableFormula,
      standardRef: 'Kirchhoff / IEC 60287',
      assumptions: [
        'Series summation of all cable segments',
        'Anode tails in parallel, main cables in series',
      ],
      units: ['R_ac: Ω', 'R_pc: Ω', 'R_nc: Ω'],
      variables: ['R_ac (anode tail parallel)', 'R_pc (positive main)', 'R_nc_main (negative main)', 'R_nc_sec (negative secondary)'],
    },
  ]

  // Build cable breakdown steps
  const cableBreakdownSteps = []
  if (r) {
    const N = station.proposedAnodes
    const activeTails = station.cables.anodeTailLengths.slice(0, N).filter(l => l > 0)
    cableBreakdownSteps.push({ label: 'Number of Active Anodes', symbol: 'N', value: N, unit: 'ea', source: 'Station Configuration' })
    cableBreakdownSteps.push({ label: 'Active Tail Cables', value: activeTails.length, unit: 'ea', source: 'Tail Lengths > 0' })
    cableBreakdownSteps.push({ label: 'Anode Cable Size', symbol: 'A_tail', value: station.cables.anodeCableSizeMm2, unit: 'mm²', source: 'Cable Specification' })
    cableBreakdownSteps.push({ label: 'Tail Resistance per Meter', value: (CABLE_SPECS[station.cables.anodeCableSizeMm2]?.resistanceOhmPerM || 0).toExponential(3), unit: 'Ω/m', source: 'CABLE_SPECS' })
    cableBreakdownSteps.push({ label: 'Parallel Tail Resistance', symbol: 'R_ac', value: r.anodeTailParallelResOhm.toFixed(6), unit: 'Ω', source: 'Calc: 1/Σ(1/R_i)' })
    cableBreakdownSteps.push({ label: 'Positive Main Cable Length', value: station.cables.posMainLengthM, unit: 'm', source: 'Station Configuration' })
    cableBreakdownSteps.push({ label: 'Positive Main Resistance', symbol: 'R_pc', value: r.posMainCableResOhm.toFixed(5), unit: 'Ω', source: 'Calc: L × r' })
    cableBreakdownSteps.push({ label: 'Negative Main Length', value: station.cables.negMainLengthM, unit: 'm', source: 'Station Configuration' })
    cableBreakdownSteps.push({ label: 'Negative Secondary Length', value: station.cables.negSecLengthM, unit: 'm', source: 'Station Configuration' })
  }

  const cableSizeOptions = Object.values(CABLE_SPECS).map((c) => ({
    value: c.sizeMm2,
    label: c.label,
  }))

  return (
    <div className="page">
      <StationTabs />
      <div style={{ marginBottom: 10 }}>
        <StandardBadge project={project} />
      </div>

      {/* Main visualization with side panel */}
      <RightSideEngineeringPanel
        panelTitle="Cable Intelligence"
        panel={
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <CableDiagnosticsInline station={station} />
            <CableInsightsInline station={station} />
            <CableHeatMap station={station} />
            <CableContributionChart station={station} />
            <CableOptimizationPanel station={station} />
          </div>
        }
      >
        {/* Cable Network Visualization */}
        <div className="viz-fullwidth" style={{ marginBottom: 10 }}>
          <div className="viz-fullwidth__header">
            <span className="viz-fullwidth__title">
              <Cable size={14} /> Cable Network
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
              {N} anode{N !== 1 ? 's' : ''} · {station.name}
            </span>
          </div>
          <div className="viz-fullwidth__body" style={{ minHeight: 380, padding: 8 }}>
            <CableNetworkVisualizer station={station} />
          </div>
        </div>

        {/* Bottom: KPIs + Diagnostics side by side */}
        <div className="enterprise-2col">
        {/* Left: Circuit details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SectionCard title="Anode Tail Cables — Positive Circuit" icon={Cable}>
            <div className="input-grid-compact">
              <SelectField
                label="Anode Tail Cable Size"
                value={cb.anodeCableSizeMm2}
                onChange={(v) =>
                  updateStation(station.id, (s) => {
                    s.cables.anodeCableSizeMm2 = parseInt(v)
                  })
                }
                options={cableSizeOptions}
              />
            </div>
            <div className="anode-tail-grid">
              {Array.from({ length: N }, (_, i) => (
                <FieldInput
                  key={i}
                  label={`Anode ${i + 1}`}
                  value={cb.anodeTailLengths[i] || 0}
                  unit="m"
                  min={0}
                  onChange={(v) =>
                    updateStation(station.id, (s) => {
                      s.cables.anodeTailLengths[i] = v
                    })
                  }
                />
              ))}
            </div>
            {r && (
              <ResultRow
                label="Parallel Anode Tail Resistance"
                symbol="R_ac"
                value={r.anodeTailParallelResOhm.toFixed(6)}
                unit="Ω"
                formula="R_ac = 1 / Σ(1 / (L_i × r))"
                highlight
              />
            )}
          </SectionCard>

          <SectionCard title="Positive Main Cable" icon={Cable}>
            <div className="input-grid-compact">
              <FieldInput
                label="Length"
                value={cb.posMainLengthM}
                unit="m"
                min={0}
                onChange={(v) =>
                  updateStation(station.id, (s) => {
                    s.cables.posMainLengthM = v
                  })
                }
              />
              <SelectField
                label="Cable Size"
                value={cb.posMainSizeMm2}
                onChange={(v) =>
                  updateStation(station.id, (s) => {
                    s.cables.posMainSizeMm2 = parseInt(v)
                  })
                }
                options={cableSizeOptions}
              />
            </div>
            {r && (
              <>
                <ResultRow
                  label="R_pc"
                  symbol="R_pc"
                  value={r.posMainCableResOhm.toFixed(5)}
                  unit="Ω"
                />
                <ResultRow
                  label="Total Positive R"
                  value={(r.anodeTailParallelResOhm + r.posMainCableResOhm).toFixed(5)}
                  unit="Ω"
                  highlight
                />
              </>
            )}
          </SectionCard>

          <SectionCard title="Negative Circuit Cables" icon={Cable}>
            <div className="input-grid-compact">
              <FieldInput
                label="Main Negative Length"
                value={cb.negMainLengthM}
                unit="m"
                min={0}
                onChange={(v) =>
                  updateStation(station.id, (s) => {
                    s.cables.negMainLengthM = v
                  })
                }
              />
              <SelectField
                label="Main Negative Size"
                value={cb.negMainSizeMm2}
                onChange={(v) =>
                  updateStation(station.id, (s) => {
                    s.cables.negMainSizeMm2 = parseInt(v)
                  })
                }
                options={cableSizeOptions}
              />
              <FieldInput
                label="Secondary Negative Length"
                value={cb.negSecLengthM}
                unit="m"
                min={0}
                onChange={(v) =>
                  updateStation(station.id, (s) => {
                    s.cables.negSecLengthM = v
                  })
                }
              />
              <SelectField
                label="Secondary Negative Size"
                value={cb.negSecSizeMm2}
                onChange={(v) =>
                  updateStation(station.id, (s) => {
                    s.cables.negSecSizeMm2 = parseInt(v)
                  })
                }
                options={cableSizeOptions}
              />
            </div>
            {r && (
              <ResultRow
                label="Total Negative R"
                value={r.negMainCableResOhm.toFixed(5)}
                unit="Ω"
                highlight
              />
            )}
          </SectionCard>

          {r && (
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                <BarChart3 size={14} style={{ color: 'var(--text-secondary)' }} />
                <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-secondary)' }}>Total Cable Circuit</span>
              </div>
              <ResultRow
                label="R_c = R_ac + R_pc + R_nc"
                symbol="R_c"
                value={r.totalCableResOhm.toFixed(5)}
                unit="Ω"
                highlight
              />
            </div>
          )}
        </div>

        {/* Right: Diagnostics, Health, Insights */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {r && (
            <section className="viz-side-section" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 12 }}>
              <h3 className="viz-side-section-title">Compact KPIs</h3>
              <CableWidgets station={station} compactKpis />
            </section>
          )}
        </div>
      </div>
      </RightSideEngineeringPanel>

      {r && (
        <div style={{ marginTop: 20 }}>
          <TracePanel station={station} recommendations={recommendations} />
        </div>
      )}
    </div>
  )
}

