/**
 * PageGroundbed.jsx
 *
 * Groundbed configuration (deepwell/shallow vertical/distributed),
 * anode specs, calculated results, and engineering insights.
 * Enhanced with formula transparency cards, calculation breakdowns,
 * and engineering formula drawer.
 */

import { useProjectStore } from '../store/projectStore.js'
import StationTabs from '../components/StationTabs.jsx'
import {
  FieldInput,
  SelectField,
  ResultRow,
  InsightCard,
  SectionCard,
  StandardBadge,
  ValidationErrors,
  Divider,
  Grid2,
} from '../components/ui.jsx'
import { FormulaCard, FormulaCardGroup } from '../components/FormulaCard.jsx'
import { CalculationBreakdown } from '../components/CalculationBreakdown.jsx'
import { FormulaDrawer } from '../components/FormulaDrawer.jsx'
import { TracePanel } from '../components/TracePanel.jsx'
import { analyze } from '../engine/engineeringAdvisor/recommendationEngine.js'
import { useMemo } from 'react'
import { DESIGN_MODES, ANODE_SPECS, getActiveStandard } from '../constants/index.js'
import { Layers, BarChart3 } from 'lucide-react'
import { RightSideEngineeringPanel, GroundbedGaugeRow, GroundbedOptimizationPanel } from '../visualizations/index.js'

export function PageGroundbed() {
  const station = useProjectStore((s) => s.getActiveStation())
  const updateStation = useProjectStore((s) => s.updateStation)
  const calculateStation = useProjectStore((s) => s.calculateStation)
  const project = useProjectStore((s) => s.getProject())
  const r = station?.lastCalcResult
  const gb = station?.groundbed
  const isDeep = gb?.type === 'deepwell'
  const std = getActiveStandard(project)

  // Build formula drawer formulas
  const dwightFormula = 'R_G = ρ/(2πL) × (ln(8L/d) − 1 + L/(4h))'
  const sundeFormula = 'R_G = (R_single / N) × F_spacing'
  const designLifeFormula = 'Y = (N × W × U_f) / (C × I)'
  const cokeFormula = 'N_bags = CEILING(L_active × ftPerM × annulusFactor / bagLbs)'

  const groundbedFormulas = [
    {
      name: 'Dwight Groundbed Resistance',
      equation: dwightFormula,
      standardRef: 'Dwight (1936) / SAES-X-400',
      assumptions: [
        'Uniform soil resistivity throughout active zone',
        'Vertical cylindrical electrode in semi-infinite medium',
        'Neglects surface effects for deep installations',
      ],
      units: ['ρ: Ω·cm (converted to Ω·m internally)', 'L: m', 'd: m', 'h: m'],
      variables: ['ρ (soil resistivity)', 'L (active column length)', 'd (borehole diameter)', 'h (depth to midpoint)'],
    },
    {
      name: 'Sunde Parallel Groundbed',
      equation: sundeFormula,
      standardRef: 'Sunde (1968) / NACE SP0169',
      assumptions: [
        'Shallow vertical anodes in parallel',
        'Mutual interference accounted via spacing factor',
        'Equal anode lengths and uniform spacing',
      ],
      units: ['ρ: Ω·cm', 'L: m', 'd: m', 'N: count', 'S: m'],
      variables: ['ρ (soil resistivity)', 'L (anode length)', 'd (borehole diameter)', 'N (anode count)', 'S (spacing)'],
    },
    {
      name: 'Anode Design Life',
      equation: designLifeFormula,
      standardRef: 'NACE SP0169 \u00a76.2 / 17-SAMSS-016',
      assumptions: [
        'Uniform current distribution among anodes',
        'Constant consumption rate over design life',
        '85% anode utilization factor (U_f)',
      ],
      units: ['N: ea', 'W: kg', 'U_f: unitless', 'C: kg/(A·yr)', 'I: A'],
      variables: ['N (anode count)', 'W (anode weight)', 'U_f (utilization factor)', 'C (consumption rate)', 'I (TR rated current)'],
    },
    {
      name: 'Coke Backfill Requirement',
      equation: cokeFormula,
      standardRef: '17-SAMSS-016 / SAES-X-400',
      assumptions: [
        'Annulus volume based on borehole geometry',
        '50 lb bags of CPC backfill',
        '+15% site waste contingency',
      ],
      units: ['L_active: m', 'ftPerM: 3.28', 'annulusFactor: 39.2', 'bagLbs: 50'],
      variables: ['L_active', 'ftPerM', 'annulusFactor', 'bagLbs'],
    },
  ]

  // Build calculation breakdown for groundbed resistance
  const gbBreakdownSteps = []
  if (r) {
    const soilRes = project?.designBasis?.soilResistivityOhmCm ?? station.soilResistivityOhmCm
    gbBreakdownSteps.push({ label: 'Input Resistivity', symbol: 'ρ', value: soilRes, unit: 'Ω·cm', source: 'Soil Resistivity Module' })
    gbBreakdownSteps.push({ label: 'Anode Count', symbol: 'N', value: station.proposedAnodes, unit: 'ea', source: 'Station Configuration' })
    gbBreakdownSteps.push({ label: 'Active Length', symbol: 'L_a', value: r.activeLengthM.toFixed(2), unit: 'm', source: isDeep ? 'Calc: N × L + (N-1) × S' : 'Anode length' })
    if (isDeep) {
      gbBreakdownSteps.push({ label: 'Borehole Diameter', symbol: 'd', value: gb.boreholeDiaM, unit: 'm', source: 'Groundbed Config' })
      gbBreakdownSteps.push({ label: 'Depth to Midpoint', symbol: 'h', value: (gb.startDepthM + r.activeLengthM / 2).toFixed(2), unit: 'm', source: 'Calc: startDepth + L_a/2' })
    }
    if (!isDeep) {
      gbBreakdownSteps.push({ label: 'Anode Spacing', symbol: 'S', value: (gb.anodeLengthM + gb.anodeSpacingM).toFixed(2), unit: 'm', source: 'Calc: L + spacing end-end' })
    }
  }

  // Build design life breakdown steps
  const dlBreakdownSteps = []
  if (r) {
    dlBreakdownSteps.push({ label: 'Proposed Anodes', symbol: 'N', value: station.proposedAnodes, unit: 'ea', source: 'Station Configuration' })
    dlBreakdownSteps.push({ label: 'Anode Weight', symbol: 'W', value: station.anodeSpec.weightKg, unit: 'kg', source: station.anodeSpec.standard || 'Anode Spec' })
    dlBreakdownSteps.push({ label: 'Consumption Rate', symbol: 'C', value: station.anodeSpec.consumptionRate, unit: 'kg/(A·yr)', source: station.anodeSpec.standard || 'Anode Spec' })
    dlBreakdownSteps.push({ label: 'TR Rated Current', symbol: 'I', value: station.tr.ratedCurrent, unit: 'A', source: 'TR Configuration' })
    dlBreakdownSteps.push({ label: 'Utilization Factor', symbol: 'U_f', value: 0.85, unit: 'unitless', source: 'NACE SP0169' })
  }

  const combinedInput = useMemo(() => {
    if (!station) return {}
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

  return (
    <div className="page">
      <StationTabs />
      <div style={{ marginBottom: 12 }}>
        <StandardBadge project={project} />
      </div>
      <ValidationErrors errors={station.validationErrors} />

      <FormulaDrawer
        pageTitle="Groundbed Design Formulas"
        formulas={groundbedFormulas}
        panelPosition="right"
      >
      <RightSideEngineeringPanel
        panelTitle="Groundbed Intelligence"
        panel={
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {r && <GroundbedGaugeRow result={r} groundbed={gb} project={project} />}
            {r && <GroundbedOptimizationPanel groundbed={gb} result={r} project={project} />}
          </div>
        }
      >

        <Grid2>
          <SectionCard title="Groundbed Configuration" icon={Layers}>
            <SelectField
              label="Groundbed Type"
              value={gb.type}
              onChange={(v) =>
                updateStation(station.id, (s) => {
                  s.groundbed.type = v
                  s.groundbed.numHoles = v === 'deepwell' ? 1 : station.proposedAnodes
                })
              }
              options={Object.values(DESIGN_MODES)
                .filter((m) => m.available)
                .map((m) => ({ value: m.id, label: m.label }))}
            />
            <SelectField
              label="Anode Specification"
              value={station.anodeSpec.id}
              onChange={(v) =>
                updateStation(station.id, (s) => {
                  s.anodeSpec = { ...ANODE_SPECS[v] }
                })
              }
              options={Object.values(ANODE_SPECS)
                .filter((a) => a.type !== 'Sacrificial')
                .map((a) => ({ value: a.id, label: a.label }))}
            />
            <Grid2>
              <FieldInput
                label="Depth to Active Zone"
                value={gb.startDepthM}
                unit="m"
                min={0}
                step={0.5}
                onChange={(v) =>
                  updateStation(station.id, (s) => {
                     s.groundbed.startDepthM = v
                  })
                }
              />
              <FieldInput
                label="Borehole Diameter"
                value={gb.boreholeDiaM}
                unit="m"
                min={0}
                step={0.01}
                onChange={(v) =>
                  updateStation(station.id, (s) => {
                    s.groundbed.boreholeDiaM = v
                  })
                }
              />
            </Grid2>
            <Grid2>
              <FieldInput
                label="Anode Length"
                value={gb.anodeLengthM}
                unit="m"
                min={0}
                step={0.01}
                onChange={(v) =>
                  updateStation(station.id, (s) => {
                    s.groundbed.anodeLengthM = v
                  })
                }
              />
              <FieldInput
                label="Anode Spacing (end-end)"
                value={gb.anodeSpacingM}
                unit="m"
                min={0}
                step={0.1}
                onChange={(v) =>
                  updateStation(station.id, (s) => {
                    s.groundbed.anodeSpacingM = v
                  })
                }
              />
            </Grid2>
            {isDeep && (
              <Grid2>
                <FieldInput
                  label="Coke Cover Above Top Anode"
                  value={gb.cokeCoverM}
                  unit="m"
                  min={0}
                  step={0.1}
                  onChange={(v) =>
                    updateStation(station.id, (s) => {
                      s.groundbed.cokeCoverM = v
                    })
                  }
                />
                <FieldInput
                  label="Bottom Cement Plug"
                  value={gb.cementPlugM}
                  unit="m"
                  min={0}
                  step={0.1}
                  onChange={(v) =>
                    updateStation(station.id, (s) => {
                      s.groundbed.cementPlugM = v
                    })
                  }
                />
              </Grid2>
            )}
            <FieldInput
              label="Number of Anodes (Proposed)"
              value={station.proposedAnodes}
              min={0}
              onChange={(v) =>
                updateStation(station.id, (s) => {
                  s.proposedAnodes = Math.max(1, v)
                })
              }
            />
            <Grid2>
              <FieldInput
                label="Design Life Target"
                value={project.designBasis?.systemDesignLifeYears || 25}
                unit="yrs"
                readOnly={true}
                hint="Locked to Central Design Settings"
              />
              <FieldInput
                label="Soil Resistivity"
                value={project.designBasis?.soilResistivityOhmCm || station.soilResistivityOhmCm}
                unit="Ω·cm"
                readOnly={true}
                hint="Locked to Central Design Settings"
              />
            </Grid2>
            <button className="btn btn-primary btn-full" onClick={() => calculateStation(station.id)}>
              Run Calculations
            </button>
          </SectionCard>

          <SectionCard title="Calculated Results" icon={BarChart3}>
            {r ? (
              <>
                {/* ── Formula Card: Groundbed Resistance ── */}
                <FormulaCardGroup
                  title="Groundbed Resistance"
                  standardRef={isDeep ? 'Dwight (1936) / SAES-X-400' : 'Sunde (1968) / NACE SP0169'}
                >
                  <FormulaCard
                    name={isDeep ? 'Deepwell Groundbed Resistance' : 'Shallow Vertical Groundbed Resistance'}
                    equation={isDeep ? dwightFormula : sundeFormula}
                    standardRef={isDeep ? 'Dwight (1936) / SAES-X-400' : 'Sunde (1968) / NACE SP0169'}
                    result={r.groundbedResistanceOhm.toFixed(4)}
                    resultUnit={'Ω'}
                    resultSymbol="R_G"
                    status={r.groundbedResistanceOhm < (r.maxAllowableGroundbedRes || Infinity) ? 'pass' : 'fail'}
                    insight={
                      r.groundbedResistanceOhm < (r.maxAllowableGroundbedRes || Infinity)
                        ? `Groundbed resistance is ${(((r.maxAllowableGroundbedRes || 0) - r.groundbedResistanceOhm) / (r.maxAllowableGroundbedRes || 1) * 100).toFixed(0)}% below maximum allowable.`
                        : `Groundbed resistance exceeds maximum allowable by ${((r.groundbedResistanceOhm - (r.maxAllowableGroundbedRes || 0)) / (r.maxAllowableGroundbedRes || 1) * 100).toFixed(0)}%.`
                    }
                    variables={[
                      { symbol: 'ρ', name: 'Soil Resistivity', value: project?.designBasis?.soilResistivityOhmCm ?? station.soilResistivityOhmCm, unit: 'Ω·cm', source: 'Design Basis' },
                      { symbol: 'L', name: 'Active Length', value: r.activeLengthM.toFixed(2), unit: 'm', source: 'Calculated' },
                      ...(isDeep ? [
                        { symbol: 'd', name: 'Borehole Dia.', value: gb.boreholeDiaM, unit: 'm', source: 'Groundbed Config' },
                        { symbol: 'h', name: 'Depth to Midpoint', value: (gb.startDepthM + r.activeLengthM / 2).toFixed(2), unit: 'm', source: 'Calculated' },
                      ] : [
                        { symbol: 'N', name: 'Anode Count', value: station.proposedAnodes, unit: 'ea', source: 'Station Config' },
                        { symbol: 'S', name: 'Anode Spacing', value: (gb.anodeLengthM + gb.anodeSpacingM).toFixed(2), unit: 'm', source: 'Calculated' },
                      ]),
                    ]}
                  />
                </FormulaCardGroup>

                {/* ── Calculation Breakdown: Groundbed Resistance ── */}
                <CalculationBreakdown
                  title="Groundbed Resistance Calculation"
                  steps={gbBreakdownSteps}
                  finalLabel="Groundbed Resistance"
                  finalValue={r.groundbedResistanceOhm.toFixed(4)}
                  finalUnit={'Ω'}
                  finalSymbol="R_G"
                  finalFormula={isDeep ? dwightFormula : sundeFormula}
                />

                <ResultRow
                  label="Max Allowable R_G"
                  value={r.maxAllowableGroundbedRes.toFixed(4)}
                  unit={'Ω'}
                />
                <ResultRow
                  label="R_G Status"
                  value={
                    r.groundbedResistanceOhm < r.maxAllowableGroundbedRes
                      ? '✓ Within limit'
                      : '✗ Exceeds limit'
                  }
                />
                <Divider />

                {/* ── Formula Card: Design Life ── */}
                <FormulaCardGroup
                  title="Anode Design Life"
                  standardRef="NACE SP0169 \u00a76.2 / 17-SAMSS-016"
                >
                  <FormulaCard
                    name="Anode Bed Design Life"
                    equation={designLifeFormula}
                    standardRef="NACE SP0169 \u00a76.2"
                    result={r.designLifeYears.toFixed(1)}
                    resultUnit="years"
                    resultSymbol="Y"
                    status={r.designLifeYears >= r.targetDesignLifeYears ? 'pass' : 'fail'}
                    insight={
                      r.designLifeYears >= r.targetDesignLifeYears
                        ? `Design life exceeds target by ${(r.designLifeYears - r.targetDesignLifeYears).toFixed(1)} years.`
                        : `Design life is ${(r.targetDesignLifeYears - r.designLifeYears).toFixed(1)} years below target.`
                    }
                    variables={[
                      { symbol: 'N', name: 'Proposed Anodes', value: station.proposedAnodes, unit: 'ea', source: 'Station Config' },
                      { symbol: 'W', name: 'Anode Weight', value: station.anodeSpec.weightKg, unit: 'kg', source: station.anodeSpec.standard || 'Anode Spec' },
                      { symbol: 'C', name: 'Consumption Rate', value: station.anodeSpec.consumptionRate, unit: 'kg/(A·yr)', source: station.anodeSpec.standard || 'Anode Spec' },
                      { symbol: 'I', name: 'TR Rated Current', value: station.tr.ratedCurrent, unit: 'A', source: 'TR Configuration' },
                      { symbol: 'U_f', name: 'Utilization Factor', value: 0.85, unit: 'unitless', source: 'NACE SP0169' },
                    ]}
                  />
                </FormulaCardGroup>

                {/* ── Calculation Breakdown: Design Life ── */}
                <CalculationBreakdown
                  title="Design Life Calculation"
                  steps={dlBreakdownSteps}
                  finalLabel="Design Life"
                  finalValue={r.designLifeYears.toFixed(1)}
                  finalUnit="years"
                  finalSymbol="Y"
                  finalFormula={designLifeFormula}
                />

                <ResultRow
                  label="Target Design Life"
                  value={r.targetDesignLifeYears.toString()}
                  unit="years"
                />
                <ResultRow
                  label="Coke Bags (est.)"
                  value={r.cokeBagsWithContingency.toString()}
                  unit="bags"
                />
              </>
            ) : (
              <div className="no-result">
                Run calculations to see groundbed resistance and design life
              </div>
            )}
          </SectionCard>
        </Grid2>
      </RightSideEngineeringPanel>
      </FormulaDrawer>

      {station.insights
        .filter(
          (i) =>
            i.calculationRef === 'Groundbed Resistance' ||
            i.calculationRef === 'Soil Analysis' ||
            i.calculationRef === 'Design Life',
        )
        .map((ins, i) => (
          <InsightCard key={i} insight={ins} />
        ))}

      {r && (
        <div style={{ marginTop: 20 }}>
          <TracePanel station={station} recommendations={recommendations} />
        </div>
      )}
    </div>
  )
}
