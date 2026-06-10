/**
 * PageValidation.jsx
 *
 * Engineering validation checks, insights, and workflow advancement.
 */

import { useProjectStore } from '../store/projectStore.js'
import {
  CheckRow,
  InsightCard,
  SectionCard,
  StandardBadge,
  InfoBox,
  WorkflowStepper,
} from '../components/ui.jsx'

export function PageValidation() {
  const project = useProjectStore((s) => s.getProject())
  const stations = project?.stations ?? []
  const calculateStation = useProjectStore((s) => s.calculateStation)
  const advanceWorkflow = useProjectStore((s) => s.advanceWorkflow)
  const createRevision = useProjectStore((s) => s.createRevision)

  return (
    <div className="page">
      <div style={{ marginBottom: 12 }}>
        <StandardBadge project={project} />
      </div>
      {stations.map((st) => {
        const r = st.lastCalcResult
        const allPass = r?.allChecksPassed
        const failCount = r?.checks?.filter((c) => c.status === 'fail').length || 0
        const warnCount = r?.checks?.filter((c) => c.status === 'warning').length || 0

        return (
          <div key={st.id} style={{ marginBottom: 24 }}>
            <div className="validation-header">
              <div>
                <div className="validation-station-name">{st.name}</div>
                <div className="validation-summary">
                  {!r
                    ? 'Not calculated'
                    : allPass
                      ? `✓ All checks pass`
                      : `${failCount} fail${failCount !== 1 ? 's' : ''}, ${warnCount} warning${warnCount !== 1 ? 's' : ''}`}
                </div>
              </div>
              <div className="validation-actions">
                <button className="btn btn-sm" onClick={() => calculateStation(st.id)}>
                  Recalculate
                </button>
                {r && allPass && (
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => {
                      advanceWorkflow(st.id, 'approved')
                      createRevision(`${st.name} approved`)
                    }}
                  >
                    Approve
                  </button>
                )}
              </div>
            </div>

            {!r && (
              <InfoBox type="info">
                Click Recalculate to run engineering checks for this station.
              </InfoBox>
            )}

            {r && (
              <>
                <WorkflowStepper currentStatus={st.status} />
                <div style={{ marginTop: 12 }}>
                  {r.checks.map((check) => (
                    <CheckRow key={check.id} check={check} />
                  ))}
                </div>
                {r.insights.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <div className="section-label">Engineering Insights</div>
                    {r.insights.map((ins, i) => (
                      <InsightCard key={i} insight={ins} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}

