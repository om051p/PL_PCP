/**
 * PageGroundbed.jsx
 *
 * Groundbed configuration (deepwell/shallow vertical/distributed),
 * anode specs, calculated results, and engineering insights.
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
import { DESIGN_MODES, ANODE_SPECS } from '../constants/index.js'
import { Layers, BarChart3 } from 'lucide-react'

export function PageGroundbed() {
  const station = useProjectStore((s) => s.getActiveStation())
  const updateStation = useProjectStore((s) => s.updateStation)
  const calculateStation = useProjectStore((s) => s.calculateStation)
  const project = useProjectStore((s) => s.getProject())
  if (!station) return null
  const r = station.lastCalcResult
  const gb = station.groundbed
  const isDeep = gb.type === 'deepwell'

  return (
    <div className="page">
      <StationTabs />
      <div style={{ marginBottom: 12 }}>
        <StandardBadge project={project} />
      </div>
      <ValidationErrors errors={station.validationErrors} />
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
          <button className="btn btn-primary btn-full" onClick={() => calculateStation(station.id)}>
            Run Calculations
          </button>
        </SectionCard>

        <SectionCard title="Calculated Results" icon={BarChart3}>
          {r ? (
            <>
              <ResultRow
                label="Active Column Length"
                symbol="L_a"
                value={r.activeLengthM.toFixed(2)}
                unit="m"
                formula={isDeep ? 'L_a = N × L_anode + (N-1) × spacing' : 'L_a = anode length'}
              />
              {isDeep && (
                <ResultRow
                  label="Total Drilling Depth"
                  value={r.totalDrillDepthM.toFixed(2)}
                  unit="m"
                />
              )}
              <Divider />
              <ResultRow
                label="Groundbed Resistance"
                symbol="R_G"
                value={r.groundbedResistanceOhm.toFixed(4)}
                unit="Ω"
                formula={
                  isDeep
                    ? 'Dwight: R_G = ρ/(2πL) × (ln(8L/d) − 1 + L/4h)'
                    : 'Sunde parallel vertical'
                }
                highlight
              />
              <ResultRow
                label="Max Allowable R_G"
                value={r.maxAllowableGroundbedRes.toFixed(4)}
                unit="Ω"
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
              <ResultRow
                label="Design Life"
                symbol="Y"
                value={r.designLifeYears.toFixed(1)}
                unit="years"
                formula="Y = (N × W) / (C × I)"
                highlight
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
    </div>
  )
}

