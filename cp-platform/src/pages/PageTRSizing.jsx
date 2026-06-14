/**
 * PageTRSizing.jsx
 *
 * Transformer-rectifier unit ratings and circuit analysis.
 */

import { useProjectStore } from '../store/projectStore.js'
import StationTabs from '../components/StationTabs.jsx'
import {
  FieldInput,
  ResultRow,
  SectionCard,
  StandardBadge,
  ValidationErrors,
  Divider,
  Grid2,
  ResultKPICard,
} from '../components/ui.jsx'
import { FormulaCard, FormulaCardGroup } from '../components/FormulaCard.jsx'
import { CalculationBreakdown } from '../components/CalculationBreakdown.jsx'
import { FormulaDrawer } from '../components/FormulaDrawer.jsx'
import { getActiveStandard, THRESHOLDS } from '../constants/index.js'
import { Cpu, BarChart3, AlertTriangle } from 'lucide-react'
import { TracePanel } from '../components/TracePanel.jsx'
import { analyze } from '../engine/engineeringAdvisor/recommendationEngine.js'
import { useMemo } from 'react'

export function PageTRSizing() {
  const station = useProjectStore((s) => s.getActiveStation())
  const updateStation = useProjectStore((s) => s.updateStation)
  const calculateStation = useProjectStore((s) => s.calculateStation)
  const project = useProjectStore((s) => s.getProject())
  const r = station?.lastCalcResult
  const tr = station?.tr

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

  const std = getActiveStandard(project)
  const ts = std?.trSizing || {}

  // TR circuit formulas
  const circuitResFormula = 'R_T = R_G + R_c + R_emf + R_s'
  const minVoltageFormula = 'V_min = R_T × I_rated + V_emf'
  const backEMFFormula = 'R_emf = V_emf / I_rated (SAES-X-600 §5.2.5)'
  const dcPowerFormula = 'P_dc = V_rated × I_rated'
  const acInputFormula = 'S_ac = P_dc / (η_tr × η_rect × 1000)'

  const trFormulas = [
    {
      name: 'Total Circuit Resistance',
      equation: circuitResFormula,
      standardRef: 'SAES-X-400 / IEEE 80',
      assumptions: [
        'All resistances in series',
        'Back EMF converted to equivalent resistance',
        'Structure resistance from design basis',
      ],
      units: ['R_G: Ω', 'R_c: Ω', 'R_emf: Ω', 'R_s: Ω'],
      variables: ['R_G (groundbed resistance)', 'R_c (cable resistance)', 'R_emf (back EMF equivalent)', 'R_s (structure resistance)'],
    },
    {
      name: 'Minimum TR Voltage',
      equation: minVoltageFormula,
      standardRef: 'Ohm Law / SAES-X-400',
      assumptions: [
        'DC circuit analysis',
        'Steady-state operating conditions',
        'Back EMF included as offset',
      ],
      units: ['R_T: Ω', 'I_rated: A', 'V_emf: V'],
      variables: ['R_T (total circuit resistance)', 'I_rated (rated DC current)', 'V_emf (back EMF voltage)'],
    },
    {
      name: 'Back EMF Equivalent Resistance',
      equation: backEMFFormula,
      standardRef: 'SAES-X-400 / IEEE 80',
      assumptions: [
        'Factor of 2 accounts for full-wave rectification',
        'Back EMF opposes forward current flow',
      ],
      units: ['V_emf: V', 'I_rated: A', 'R_emf: Ω'],
      variables: ['V_emf (back EMF voltage)', 'I_rated (rated DC current)'],
    },
    {
      name: 'DC Power Rating',
      equation: dcPowerFormula,
      standardRef: 'IEEE 80 / 17-SAMSS-003',
      assumptions: [
        'Rated voltage and current from TR nameplate',
        'DC output power at rated conditions',
      ],
      units: ['V_rated: V DC', 'I_rated: A DC', 'P_dc: W'],
      variables: ['V_rated (rated DC voltage)', 'I_rated (rated DC current)'],
    },
    {
      name: 'AC Input kVA',
      equation: acInputFormula,
      standardRef: 'IEEE 80 / 17-SAMSS-003',
      assumptions: [
        'TR efficiency typically 80%',
        'Rectifier efficiency typically 80%',
        'Combined efficiency: η_tr × η_rect',
      ],
      units: ['P_dc: W', 'η_tr: unitless', 'η_rect: unitless', 'S_ac: kVA'],
      variables: ['P_dc (DC output power)', 'η_tr (TR efficiency)', 'η_rect (rectifier efficiency)'],
    },
  ]

  // Build TR circuit breakdown steps
  const trBreakdownSteps = []
  if (r) {
    trBreakdownSteps.push({ label: 'Groundbed Resistance', symbol: 'R_G', value: r.groundbedResistanceOhm.toFixed(4), unit: 'Ω', source: 'Groundbed Calculation' })
    trBreakdownSteps.push({ label: 'Total Cable Resistance', symbol: 'R_c', value: r.totalCableResOhm.toFixed(4), unit: 'Ω', source: 'Cable Calculation' })
    trBreakdownSteps.push({ label: 'Back EMF Resistance', symbol: 'R_emf', value: r.backEMFResistanceOhm.toFixed(4), unit: 'Ω', source: 'Calc: V_emf/I_rated (SAES-X-600 §5.2.5)' })
    trBreakdownSteps.push({ label: 'Structure Resistance', symbol: 'R_s', value: (project?.designBasis?.structureResistanceOhm || 0).toFixed(4), unit: 'Ω', source: 'Design Basis' })
    trBreakdownSteps.push({ label: 'TR Rated Current', symbol: 'I_rated', value: tr.ratedCurrent, unit: 'A DC', source: 'TR Configuration' })
    trBreakdownSteps.push({ label: 'TR Rated Voltage', symbol: 'V_rated', value: tr.ratedVoltage, unit: 'V DC', source: 'TR Configuration' })
    trBreakdownSteps.push({ label: 'Back EMF Voltage', symbol: 'V_emf', value: project?.designBasis?.backEmfV || tr.backEMF, unit: 'V', source: 'Design Basis' })
  }

  const isStale = station.status === 'needs_recalculation' || (!r && station.pipelineSegments.length > 0)

  return (
    <div className="page">
      <StationTabs />
      <div style={{ marginBottom: 12 }}>
        <StandardBadge project={project} />
      </div>
      {isStale && r && (
        <div className="staleness-banner">
          <AlertTriangle className="staleness-banner-icon" size={15} />
          <span>Design settings have changed. Please click Analyse Circuit to update the transformer-rectifier sizing and voltage drops.</span>
        </div>
      )}
      <ValidationErrors errors={station.validationErrors} />
      <Grid2>
        <SectionCard title="TR Unit Ratings" icon={Cpu}>
          <Grid2>
            <FieldInput
              label="Rated DC Voltage"
              value={tr.ratedVoltage}
              unit="V DC"
              min={0}
              max={100}
              hint="SAES-X-500 §6.8.4: Max 100V DC"
              onChange={(v) =>
                updateStation(station.id, (s) => {
                  s.tr.ratedVoltage = Math.min(100, v)
                })
              }
            />
            <FieldInput
              label="Rated DC Current"
              value={tr.ratedCurrent}
              unit="A DC"
              min={0}
              onChange={(v) =>
                updateStation(station.id, (s) => {
                  s.tr.ratedCurrent = v
                })
              }
            />
          </Grid2>
          <FieldInput
            label="Back EMF"
            value={project.designBasis?.backEmfV}
            unit="V"
            readOnly={true}
            hint="Locked to Central Design Settings in Design Basis"
          />
          <FieldInput
            label="Structure-to-Earth Resistance"
            value={project.designBasis?.structureResistanceOhm}
            unit="Ω"
            readOnly={true}
            hint="Locked to Central Design Settings in Design Basis"
          />
          <button className="btn btn-primary btn-full" onClick={() => calculateStation(station.id)}>
            Analyse Circuit
          </button>
        </SectionCard>

        <SectionCard title="Circuit Analysis" icon={BarChart3}>
          {r ? (
            <>
              <div className="result-kpi-grid">
                <ResultKPICard
                  title="Min TR Voltage"
                  value={r.minTRVoltage.toFixed(2)}
                  unit="V"
                  status="pass"
                  limitText="Required minimum voltage"
                  stale={isStale}
                />
                <ResultKPICard
                  title="TR Adequacy"
                  value={`${tr.ratedVoltage} V`}
                  unit=""
                  status={tr.ratedVoltage >= r.minTRVoltage ? 'pass' : 'fail'}
                  limitText={`Req: >= ${r.minTRVoltage.toFixed(2)} V`}
                  safetyMargin={tr.ratedVoltage >= r.minTRVoltage ? 'PASS' : 'FAIL'}
                  stale={isStale}
                />
                <ResultKPICard
                  title="Total Resistance"
                  value={r.totalCircuitResistanceOhm.toFixed(4)}
                  unit="Ω"
                  status="pass"
                  limitText="R_T total circuit"
                  stale={isStale}
                />
              </div>

              <Divider label="Resistance & Voltage Drops Breakdown" />

              <ResultRow
                label="Groundbed Resistance"
                symbol="R_G"
                value={r.groundbedResistanceOhm.toFixed(4)}
                unit="Ω"
              />
              <ResultRow
                label="Total Cable Resistance"
                symbol="R_c"
                value={r.totalCableResOhm.toFixed(4)}
                unit="Ω"
              />
              <ResultRow
                label="Back EMF Resistance"
                symbol="R_emf"
                value={r.backEMFResistanceOhm.toFixed(4)}
                unit="Ω"
                formula="R_emf = V_emf / I_rated (SAES-X-600 §5.2.5)"
              />
              <ResultRow
                label="Structure Resistance"
                symbol="R_s"
                value={project.designBasis?.structureResistanceOhm?.toFixed(4)}
                unit="Ω"
              />
              <Divider />
              <ResultRow
                label="Total Circuit Resistance"
                symbol="R_T"
                value={r.totalCircuitResistanceOhm.toFixed(4)}
                unit="Ω"
                highlight
              />
              <ResultRow
                label="Minimum TR Voltage"
                symbol="V_min"
                value={r.minTRVoltage.toFixed(2)}
                unit="V"
                formula="V_min = R_T × I_rated + V_emf"
                highlight
              />
              <ResultRow
                label="TR Voltage Adequate?"
                value={
                  tr.ratedVoltage >= r.minTRVoltage
                    ? `✓ ${tr.ratedVoltage}V ≥ ${r.minTRVoltage.toFixed(2)}V`
                    : `✗ ${tr.ratedVoltage}V < ${r.minTRVoltage.toFixed(2)}V`
                }
              />
              <Divider />
              <ResultRow label="DC Power" value={r.dcPowerW.toString()} unit="W" />
              <ResultRow label="AC Input Power" value={r.acInputKVA.toFixed(2)} unit="kVA" />
              <ResultRow
                label={`AC Input Current (${project.designBasis?.acInputVoltageV}V/${project.designBasis?.acInputPhase}Φ)`}
                value={r.acInputCurrentA.toFixed(2)}
                unit="A"
              />
            </>
          ) : (
            <div className="no-result">Configure TR ratings and run circuit analysis</div>
          )}
        </SectionCard>
      </Grid2>

      {r && (
        <div style={{ marginTop: 20 }}>
          <TracePanel station={station} recommendations={recommendations} />
        </div>
      )}
    </div>
  )
}

