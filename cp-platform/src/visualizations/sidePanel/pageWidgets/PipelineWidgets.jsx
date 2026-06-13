import { KpiCard, KpiGrid, RadialGauge, StatusList, WorkflowProgress, ActivityFeed } from '../widgets/index.js'

/**
 * Build the widget set for the Pipeline Overview right-side panel.
 *
 * Aggregates over the project's stations list. No calculations.
 */
const WORKFLOW_STAGES = [
  { key: 'design_basis', label: 'Design Basis' },
  { key: 'pipeline', label: 'Pipeline' },
  { key: 'groundbed', label: 'Groundbed' },
  { key: 'tr', label: 'TR' },
  { key: 'validation', label: 'Validation' },
]

function formatRelative(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const diff = Date.now() - d.getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day}d ago`
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function projectHealth(stations) {
  if (!stations || stations.length === 0) return { score: 0, calculatedCount: 0, totalCount: 0, approvedCount: 0 }
  const total = stations.length
  const calculated = stations.filter((s) => s.lastCalcResult).length
  const approved = stations.filter((s) => s.status === 'approved' || s.status === 'issued_for_construction').length
  const review = stations.filter((s) => s.status === 'engineering_review' || s.status === 'optimized').length
  // Score = 50 % calculated + 30 % approved + 20 % in review
  const score = Math.round(
    ((calculated / total) * 50) + ((approved / total) * 30) + ((review / total) * 20)
  )
  return { score, calculatedCount: calculated, totalCount: total, approvedCount: approved, reviewCount: review }
}

function buildWorkflowSteps(stations) {
  const total = stations?.length || 0
  const calculated = (stations || []).filter((s) => s.lastCalcResult).length
  const approved = (stations || []).filter((s) => s.status === 'approved' || s.status === 'issued_for_construction').length
  const inReview = (stations || []).filter((s) => s.status === 'engineering_review' || s.status === 'optimized').length
  const validationDone = (stations || []).filter((s) => (s.validationErrors || []).length === 0).length
  return [
    {
      key: 'design_basis',
      label: 'Design basis',
      status: 'complete',
      hint: 'set',
    },
    {
      key: 'pipeline',
      label: 'Pipeline parameters',
      status: calculated > 0 ? 'complete' : 'pending',
      hint: `${calculated}/${total} stations`,
    },
    {
      key: 'groundbed',
      label: 'Groundbed design',
      status: calculated > 0 ? 'complete' : 'pending',
      hint: `${calculated}/${total} anodes`,
    },
    {
      key: 'tr',
      label: 'TR sizing',
      status: inReview > 0 ? 'active' : calculated > 0 ? 'complete' : 'pending',
      hint: `${inReview} in review`,
    },
    {
      key: 'validation',
      label: 'Validation',
      status: validationDone === total && total > 0 ? 'complete' : 'active',
      hint: `${validationDone}/${total} passed`,
    },
    {
      key: 'approval',
      label: 'Approval',
      status: approved === total && total > 0 ? 'complete' : approved > 0 ? 'active' : 'pending',
      hint: `${approved}/${total} approved`,
    },
  ]
}

function buildActivity(stations) {
  const items = []
  for (const s of stations || []) {
    if (s.lastCalcResult?.calculatedAt) {
      items.push({
        text: `Calculation run on ${s.name || 'station'}`,
        timestamp: formatRelative(s.lastCalcResult.calculatedAt),
      })
    }
    if (s.status === 'approved' || s.status === 'issued_for_construction') {
      items.push({ text: `${s.name || 'Station'} approved` })
    }
    if (s.status === 'engineering_review') {
      items.push({ text: `${s.name || 'Station'} in engineering review` })
    }
  }
  return items.slice(0, 6)
}

export function PipelineWidgets({ project }) {
  if (!project) return null
  const stations = project.stations || []
  const { score, calculatedCount, totalCount, approvedCount } = projectHealth(stations)
  const gaugeTone = score >= 80 ? 'ok' : score >= 50 ? 'warn' : score > 0 ? 'fail' : 'draft'

  // Asset counts (pure aggregation)
  const groundbedCount = stations.filter((s) => s.groundbed).length
  const trCount = stations.filter((s) => s.tr).length
  // Pipeline length = sum of all pipeline segments (m)
  const pipelineLengthM = stations.reduce(
    (acc, s) => acc + (s.pipelineSegments || []).reduce((a, seg) => a + (Number(seg.lengthM) || 0), 0),
    0
  )
  // Crossings and isolation joints not in current data shape → render as 0 with hint
  const crossings = 0
  const isolationJoints = 0

  const workflow = buildWorkflowSteps(stations)
  const activity = buildActivity(stations)

  return (
    <div className="viz-side-widgets">
      <section className="viz-side-section viz-side-section-center">
        <h3 className="viz-side-section-title">Project health</h3>
        <RadialGauge
          percent={score}
          label="Health"
          caption="0–100 score"
          tone={gaugeTone}
          ariaLabel={`Project health score: ${score}`}
        />
      </section>

      <KpiGrid min={120}>
        <KpiCard
          label="Pipeline length"
          value={pipelineLengthM}
          precision={1}
          unit="m"
          format={(v) => v >= 1000 ? `${(v / 1000).toFixed(2)}` : v.toFixed(1)}
          hint={pipelineLengthM >= 1000 ? 'km' : undefined}
        />
        <KpiCard label="Stations" value={totalCount} precision={0} format={(v) => v.toFixed(0)} unit="total" />
        <KpiCard label="Groundbeds" value={groundbedCount} precision={0} format={(v) => v.toFixed(0)} />
        <KpiCard label="TR units" value={trCount} precision={0} format={(v) => v.toFixed(0)} />
        <KpiCard label="Crossings" value={crossings} precision={0} format={(v) => v.toFixed(0)} hint="not in scope" />
        <KpiCard label="Isolation joints" value={isolationJoints} precision={0} format={(v) => v.toFixed(0)} hint="not in scope" />
      </KpiGrid>

      <section className="viz-side-section">
        <h3 className="viz-side-section-title">Workflow progress</h3>
        <WorkflowProgress steps={workflow} ariaLabel="Engineering workflow progress" />
      </section>

      {activity.length > 0 && (
        <section className="viz-side-section">
          <h3 className="viz-side-section-title">Recent activity</h3>
          <ActivityFeed items={activity} />
        </section>
      )}

      <section className="viz-side-section">
        <h3 className="viz-side-section-title">Status</h3>
        <StatusList
          items={[
            {
              key: 'calc',
              status: calculatedCount === totalCount && totalCount > 0 ? 'ok' : 'warn',
              label: `${calculatedCount} / ${totalCount} stations calculated`,
            },
            {
              key: 'approved',
              status: approvedCount === totalCount && totalCount > 0 ? 'ok' : 'pending',
              label: `${approvedCount} / ${totalCount} stations approved`,
            },
          ]}
        />
      </section>
    </div>
  )
}
