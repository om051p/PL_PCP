/**
 * PageCurrentRequirement.jsx
 *
 * Protection current calculation with temperature correction and multi-station summary.
 * Enhanced with formula transparency, calculation breakdown, and engineering intelligence.
 */

import { useProjectStore } from '../store/projectStore.js'
import {
  ResultRow,
  SectionCard,
  StatCard,
  InfoBox,
  Divider,
  ValidationErrors,
  ResultKPICard,
  StandardBadge,
} from '../components/ui.jsx'
import { FormulaCard, FormulaCardGroup } from '../components/FormulaCard.jsx'
import { CalculationBreakdown } from '../components/CalculationBreakdown.jsx'
import { FormulaDrawer } from '../components/FormulaDrawer.jsx'
import { getActiveStandard } from '../constants/index.js'
import { Zap, AlertTriangle, BookOpen } from 'lucide-react'
import { TracePanel } from '../components/TracePanel.jsx'
import { analyze } from '../engine/engineeringAdvisor/recommendationEngine.js'
import { useMemo } from 'react'

function DesignStandardInfoBox({ project, std, tc, spareFactor, formula }) {
  const method = tc.method === 'linear' ? 'Linear' : 'Exponential'
  return (
    <InfoBox type="info">
      <strong>{std.label}</strong> &nbsp;|&nbsp; {method} temp correction &nbsp;|&nbsp;
      Spare: +{((spareFactor - 1) * 100).toFixed(0)}% &nbsp;|&nbsp; {formula}
    </InfoBox>
  )
}

function StationCurrentRequirementCard({
  st,
  project,
  calculateStation,
  std,
  tc,
  formula,
  sparePct,
  spareFactor,
}) {
  const r = st.lastCalcResult
  const totalLength = st.pipelineSegments.reduce((acc, s) => acc + s.lengthM, 0)
  const isStale = st.status === 'needs_recalculation' || (!r && st.pipelineSegments.length > 0)

  // Extract per-segment data for formula cards
  const seg = r?.perSegmentCurrents?.[0] || {}
  const tempMethod = tc.method === 'linear' ? 'Linear' : 'Exponential'
  const baseTempC = tc.baseTempC || 30

  const combinedInput = useMemo(() => {
    if (!st || !r) return {}
    return {
      ...st,
      ...r,
      targetDesignLifeYears: project?.designBasis?.systemDesignLifeYears || 25,
      sacrificialAnodeCount: st.proposedAnodes,
      calculatedAnodeCount: st.proposedAnodes,
    }
  }, [st, r, project])

  const recommendations = useMemo(() => {
    if (!st || !r) return []
    return analyze(combinedInput).recommendations
  }, [combinedInput, st, r])

  return (
    <FormulaDrawer
      key={st.id}
      drawerTitle="Current Requirement Formulas"
      formulas={[
        {
          name: 'Surface Area',
          equation: 'A = π × D × L',
          standardRef: `${std.label}`,
        },
        {
          name: 'Temp-Corrected Current Density',
          equation: formula,
          standardRef: tempMethod === 'Exponential' ? 'SAES-X-400' : 'NACE SP0169',
        },
        {
          name: 'Required Current',
          equation: 'I_req = Σ(A_i × i_{T,i})',
          standardRef: 'NACE SP0169 §6.2',
        },
        {
          name: 'Design Current',
          equation: `I_design = I_req × ${spareFactor.toFixed(1)}`,
          standardRef: `${std.label} spare factor`,
        },
      ]}
      standards={[
        { label: std.label, version: std.version || '', reference: 'Current Requirement Module' },
        { label: 'NACE SP0169', version: '2013', reference: '§6.2 — Current Requirement' },
        { label: 'ISO 15589', version: '', reference: '§7.3 — Current demand' },
      ]}
      assumptions={[
        `Temperature correction: ${tempMethod} (base ${baseTempC}°C)`,
        `Spare factor: ×${spareFactor.toFixed(1)} (${sparePct}% margin)`,
        'Coating efficiency NOT applied — bare-pipe equivalent per NACE SP0169',
        'Current density corrected for operating temperature',
      ]}
      page="current"
    >
      <SectionCard
        title={st.name}
        icon={Zap}
        action={
          <button className="btn btn-sm" onClick={() => calculateStation(st.id)}>
            Calculate
          </button>
        }
      >
        {isStale && r && (
          <div className="staleness-banner">
            <AlertTriangle className="staleness-banner-icon" size={15} />
            <span>
              Pipeline inputs have changed. Click Calculate to refresh the protection current
              requirements.
            </span>
          </div>
        )}
        <ValidationErrors errors={st.validationErrors} />

        {r ? (
          <>
            {/* ── KPI Cards ──────────────────────────────── */}
            <div className="result-kpi-grid">
              <ResultKPICard
                title="Required Current"
                value={r.requiredCurrentA.toFixed(4)}
                unit="A"
                status="pass"
                limitText="I_req calculation"
                stale={isStale}
              />
              <ResultKPICard
                title="Design Current"
                value={r.designCurrentA.toFixed(4)}
                unit="A"
                status="pass"
                limitText="Safety margin applied"
                safetyMargin={`+${sparePct}%`}
                stale={isStale}
              />
              <ResultKPICard
                title="Proposed Anodes"
                value={st.proposedAnodes.toString()}
                unit="ea"
                status={
                  st.proposedAnodes >= Math.ceil(r.designCurrentA / st.anodeSpec.outputAmps)
                    ? 'pass'
                    : 'fail'
                }
                limitText={`Min: ${Math.ceil(r.designCurrentA / st.anodeSpec.outputAmps)} ea`}
                safetyMargin={
                  st.proposedAnodes >= Math.ceil(r.designCurrentA / st.anodeSpec.outputAmps)
                    ? 'PASS'
                    : 'FAIL'
                }
                stale={isStale}
              />
            </div>

            {/* ── Formula Card Group ──────────────────────── */}
            <Divider label="Formula Analysis" />

            <FormulaCardGroup title="Current Requirement Formulas" standardRef={std.label}>
              <FormulaCard
                name="Surface Area"
                equation="A = π × D × L"
                standardRef={std.label}
                variables={st.pipelineSegments
                  .map((seg) => ({
                    symbol: 'D',
                    name: `Pipe OD (${seg.name})`,
                    value: seg.od,
                    unit: 'inches',
                    source: 'Pipeline Input',
                  }))
                  .concat(
                    st.pipelineSegments.map((seg) => ({
                      symbol: 'L',
                      name: `Segment length (${seg.name})`,
                      value: seg.lengthM,
                      unit: 'm',
                      source: 'Pipeline Input',
                    })),
                  )}
                result={r.totalSurfaceAreaM2.toFixed(2)}
                resultUnit="m²"
                resultSymbol="A"
              />

              <FormulaCard
                name="Temp-Corrected Current Density"
                equation={formula}
                standardRef={tempMethod === 'Exponential' ? 'SAES-X-400' : 'NACE SP0169'}
                variables={[
                  {
                    symbol: 'i_base',
                    name: 'Base current density',
                    value: seg.iTempMam2 || 0,
                    unit: 'mA/m²',
                    source: 'Pipeline Input',
                  },
                  {
                    symbol: 'T',
                    name: 'Operating temperature',
                    value: st.pipelineSegments[0]?.opTempC || 0,
                    unit: '°C',
                    source: 'Pipeline Input',
                  },
                  {
                    symbol: 'baseTempC',
                    name: 'Base temperature',
                    value: baseTempC,
                    unit: '°C',
                    source: `${std.label}`,
                  },
                ]}
                result={r.tempCorrectedCurrentDensity.toFixed(5)}
                resultUnit="mA/m²"
                resultSymbol="i_T"
              />

              <FormulaCard
                name="Design Current"
                equation={`I_design = I_req × ${spareFactor.toFixed(1)}`}
                standardRef={`${std.label}`}
                variables={[
                  {
                    symbol: 'I_req',
                    name: 'Required current',
                    value: r.requiredCurrentA.toFixed(5),
                    unit: 'A',
                    source: 'Current Requirement Calc',
                  },
                  {
                    symbol: 'SF',
                    name: 'Spare factor',
                    value: spareFactor,
                    unit: '',
                    source: `${std.label}`,
                  },
                ]}
                result={r.designCurrentA.toFixed(4)}
                resultUnit="A"
                resultSymbol="I_design"
                status="pass"
                insight={`Design current includes ${sparePct}% spare above required current`}
              />
            </FormulaCardGroup>

            {/* ── Calculation Breakdown ────────────────────── */}
            <Divider label="Step-by-Step Calculation" />
            <CalculationBreakdown
              title="Current Requirement Calculation"
              steps={[
                ...st.pipelineSegments.map((seg) => ({
                  label: `Pipeline segment: ${seg.name}`,
                  value: seg.lengthM,
                  unit: 'm',
                  source: 'Pipeline Input',
                })),
                ...st.pipelineSegments.map((seg) => ({
                  label: `Surface area (${seg.name})`,
                  symbol: 'A',
                  value: (Math.PI * seg.od * 0.0254 * seg.lengthM).toFixed(2),
                  unit: 'm²',
                  formula: 'A = π × D × L',
                  source: 'Surface Area Module',
                })),
                {
                  label: 'Total surface area',
                  symbol: 'ΣA',
                  value: r.totalSurfaceAreaM2.toFixed(2),
                  unit: 'm²',
                  source: 'Surface Area Module',
                },
                {
                  label: 'Temp-corrected current density',
                  symbol: 'i_T',
                  value: r.tempCorrectedCurrentDensity.toFixed(5),
                  unit: 'mA/m²',
                  formula: formula,
                  source: 'Current Density Module',
                },
                {
                  label: 'Required current (I_req)',
                  symbol: 'I_req',
                  value: r.requiredCurrentA.toFixed(5),
                  unit: 'A',
                  formula: 'I_req = Σ(A_i × i_{T,i})',
                  source: 'Current Requirement Module',
                },
              ]}
              finalLabel="Design Current"
              finalSymbol="I_design"
              finalValue={r.designCurrentA.toFixed(4)}
              finalUnit="A"
              finalFormula={`I_design = I_req × ${spareFactor.toFixed(1)}`}
            />

            {/* ── Legacy auxiliary details ─────────────────── */}
            <Divider label="Auxiliary Details" />
            {st.pipelineSegments.length > 1 && (
              <div className="segment-summary-mini">
                {st.pipelineSegments.map((s, i) => (
                  <div key={s.id} className="segment-summary-row">
                    <span>
                      {i + 1}. {s.name}
                    </span>
                    <span>{s.lengthM.toFixed(0)} m</span>
                  </div>
                ))}
              </div>
            )}
            <ResultRow
              label="Total Pipeline Length"
              value={totalLength.toFixed(0)}
              unit="m"
              highlight={st.pipelineSegments.length > 1}
            />
            <ResultRow
              label="Anodes Required (by current)"
              value={Math.ceil(r.designCurrentA / st.anodeSpec.outputAmps).toString()}
              unit="ea."
            />
            <ResultRow
              label="Anodes Required (by TR rating)"
              value={Math.ceil(st.tr.ratedCurrent / st.anodeSpec.outputAmps).toString()}
              unit="ea."
            />
            <ResultRow
              label="Proposed Anode Quantity"
              value={st.proposedAnodes.toString()}
              unit="ea."
              highlight
            />

            <div style={{ marginTop: 20 }}>
              <TracePanel station={st} recommendations={recommendations} />
            </div>
          </>
        ) : (
          <div className="no-result">Click Calculate to run current requirement analysis</div>
        )}
      </SectionCard>
    </FormulaDrawer>
  )
}

export function PageCurrentRequirement() {
  const stations = useProjectStore(
    (s) =>
      s.projects.find((p) => p.id === s.activeProjectId)?.stations ?? s.projects[0]?.stations ?? [],
  )
  const calculateStation = useProjectStore((s) => s.calculateStation)
  const project = useProjectStore(
    (s) => s.projects.find((p) => p.id === s.activeProjectId) || s.projects[0],
  )
  const std = getActiveStandard(project)
  const cr = std.currentRequirement || {}
  const tc = std.temperatureCorrection || {}
  const spareFactor = cr.spareFactor || 1.3
  const sparePct = ((spareFactor - 1) * 100).toFixed(0)
  const formula = tc.formula || 'i_T = i_base × 1.25^((T − 30) / 10)'

  const totalDesignA = stations.reduce(
    (acc, st) => acc + (st.lastCalcResult?.designCurrentA || 0),
    0,
  )

  return (
    <div className="page">
      {/* ── Station summary cards ───────────────────────────────── */}
      <div className="stat-grid">
        {stations.map((st) => (
          <StatCard
            key={st.id}
            label={st.name}
            value={st.lastCalcResult ? st.lastCalcResult.designCurrentA.toFixed(2) : '—'}
            unit={`A (incl. ${sparePct}% spare)`}
          />
        ))}
        <StatCard label="Total System Current" value={totalDesignA.toFixed(2)} unit="A" />
      </div>

      {/* ── Standard + StandardBadge ──────────────────────────────── */}
      <div
        style={{ marginBottom: 12, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}
      >
        <StandardBadge project={project} />
      </div>
      <DesignStandardInfoBox
        project={project}
        std={std}
        tc={tc}
        spareFactor={spareFactor}
        formula={formula}
      />

      {stations.map((st) => (
        <StationCurrentRequirementCard
          key={st.id}
          st={st}
          project={project}
          calculateStation={calculateStation}
          std={std}
          tc={tc}
          formula={formula}
          sparePct={sparePct}
          spareFactor={spareFactor}
        />
      ))}
    </div>
  )
}
