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
import { Cpu, BarChart3, AlertTriangle } from 'lucide-react'

export function PageTRSizing() {
  const station = useProjectStore((s) => s.getActiveStation())
  const updateStation = useProjectStore((s) => s.updateStation)
  const calculateStation = useProjectStore((s) => s.calculateStation)
  const project = useProjectStore((s) => s.getProject())
  if (!station) return null
  const r = station.lastCalcResult
  const tr = station.tr

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
              onChange={(v) =>
                updateStation(station.id, (s) => {
                  s.tr.ratedVoltage = v
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
                formula="R_emf = 2 × V_emf / I_rated"
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
    </div>
  )
}

