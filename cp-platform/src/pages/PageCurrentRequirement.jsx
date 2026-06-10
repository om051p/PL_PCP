/**
 * PageCurrentRequirement.jsx
 *
 * Protection current calculation with temperature correction and multi-station summary.
 */

import { useProjectStore } from '../store/projectStore.js'
import {
  ResultRow,
  SectionCard,
  StatCard,
  InfoBox,
  Divider,
  ValidationErrors,
} from '../components/ui.jsx'
import { getActiveStandard } from '../constants/index.js'
import { Zap } from 'lucide-react'

function DesignStandardInfoBox() {
  const project = useProjectStore((s) => s.getProject())
  const std = getActiveStandard(project)
  const tc = std.temperatureCorrection || {}
  const cr = std.currentRequirement || {}
  const spareFactor = cr.spareFactor || 1.3
  const formula = tc.formula || 'i_T = i_base × 1.25^((T − 30) / 10)'
  const method = tc.method === 'linear' ? 'Linear' : 'Exponential'
  return (
    <InfoBox type="info">
      <strong>{std.label}</strong> &nbsp;|&nbsp; {method} temp correction &nbsp;|&nbsp; Spare: +{((spareFactor - 1) * 100).toFixed(0)}% &nbsp;|&nbsp; {formula}
    </InfoBox>
  )
}

export function PageCurrentRequirement() {
  const stations = useProjectStore((s) => s.getProject()?.stations ?? [])
  const calculateStation = useProjectStore((s) => s.calculateStation)
  const project = useProjectStore((s) => s.getProject())
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

      <DesignStandardInfoBox />

      {stations.map((st) => {
        const r = st.lastCalcResult
        const totalLength = st.pipelineSegments.reduce((acc, s) => acc + s.lengthM, 0)
        return (
          <SectionCard
            key={st.id}
            title={st.name}
            icon={Zap}
            action={
              <button className="btn btn-sm" onClick={() => calculateStation(st.id)}>
                Calculate
              </button>
            }
          >
            <ValidationErrors errors={st.validationErrors} />
            {r ? (
              <>
                <ResultRow
                  label="Total Pipeline Length"
                  value={totalLength.toFixed(0)}
                  unit="m"
                  highlight={st.pipelineSegments.length > 1}
                />
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
                  label="Total External Surface Area"
                  symbol="A"
                  value={r.totalSurfaceAreaM2.toFixed(2)}
                  unit="m²"
                  formula="A = Σ(π × D_i × L_i)"
                />
                <ResultRow
                  label="Temp-Corrected Current Density"
                  symbol="i_T"
                  value={r.tempCorrectedCurrentDensity.toFixed(5)}
                  unit="mA/m²"
                  formula={formula}
                />
                <ResultRow
                  label="Required Current"
                  symbol="I_req"
                  value={r.requiredCurrentA.toFixed(5)}
                  unit="A"
                />
                <Divider />
                <ResultRow
                  label={`Design Current (+${sparePct}% spare)`}
                  symbol="I_design"
                  value={r.designCurrentA.toFixed(4)}
                  unit="A"
                  highlight
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
              </>
            ) : (
              <div className="no-result">Click Calculate to run current requirement analysis</div>
            )}
          </SectionCard>
        )
      })}
    </div>
  )
}

