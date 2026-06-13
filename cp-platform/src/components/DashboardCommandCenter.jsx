/**
 * DashboardCommandCenter.jsx
 *
 * Phase 6 — Dashboard 3.0. The new "Engineering Command Center" that
 * surfaces actionable intelligence: 7 executive KPIs, 10-stage workflow,
 * current project focus, and engineering activity feed.
 *
 * Composes three pure engines:
 *   - workflowEngine.computeWorkflow()
 *   - projectHealthEngine.computeAllKPIs()
 *   - dashboardStatusEngine.nextBestAction()
 *
 * Mounted above the existing dashboard sections in PageDashboard.jsx,
 * behind the `dashboardV3Enabled` feature flag.
 */

import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  Zap,
  Layers,
  ClipboardCheck,
  Activity,
  Shield,
  ArrowRight,
} from 'lucide-react'
import { useProjectStore } from '../store/projectStore.js'
import { subscribeToActivity } from '../services/activityLogger.js'
import { analyze } from '../engine/engineeringAdvisor/engineeringAdvisorEngine.js'
import { computeWorkflow, WORKFLOW_STATES } from '../engine/dashboard/workflowEngine.js'
import { computeAllKPIs } from '../engine/dashboard/projectHealthEngine.js'
import { nextBestAction } from '../engine/dashboard/dashboardStatusEngine.js'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildAdvisorInputs(project, stations) {
  if (!project || !stations || stations.length === 0) return {}
  const station = stations[0]
  const lr = station.lastCalcResult || {}
  const db = project.designBasis || {}
  return {
    soilResistivityOhmCm: db.soilResistivityOhmCm ?? station.soilResistivityOhmCm,
    pipelineLengthKm: (station.pipelineSegments || []).reduce((s, seg) => s + (seg.lengthM || 0), 0) / 1000,
    currentReqA: lr.requiredCurrentA,
    groundbedResistanceOhm: lr.groundbedResistanceOhm,
    trRatedVoltage: station.tr?.ratedVoltage,
    trMinVoltage: lr.minTRVoltage,
    cableDropV: lr.totalCableDropV,
    attenuationCoveragePct: lr.attenuationPercent,
    attenuationWorstPointMv: lr.minCombinedPotentialMv,
    designLifeYears: lr.designLifeYears,
    targetDesignLifeYears: lr.targetDesignLifeYears ?? db.systemDesignLifeYears,
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ExecutiveKpiCard({ label, value, sub, tone = 'neutral', icon: Icon }) {
  return (
    <div className={`kpi-card kpi-card--${tone}`}>
      {Icon && (
        <div className="kpi-card__icon" style={{ marginBottom: 4, opacity: 0.7 }}>
          <Icon size={14} />
        </div>
      )}
      <div className="kpi-card__label">{label}</div>
      <div className="kpi-card__value" style={{ fontSize: 18 }}>
        {value}
      </div>
      {sub && <div className="kpi-card__sub">{sub}</div>}
    </div>
  )
}

function CurrentProjectFocus({ action, onNavigate }) {
  if (!action) {
    return (
      <div
        className="section-card"
        style={{
          background: 'var(--card)',
          border: '1px solid var(--pass)',
          padding: '12px 14px',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle2 size={16} style={{ color: 'var(--pass)' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
            Project is complete
          </span>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
          All workflow stages are done. You can export the engineering report.
        </p>
      </div>
    )
  }

  const iconMap = {
    blocked: AlertCircle,
    advisor_error: AlertCircle,
    advisor_warn: AlertTriangle,
    review_required: ClipboardCheck,
    continue: ArrowRight,
  }
  const toneMap = {
    blocked: 'fail',
    advisor_error: 'fail',
    advisor_warn: 'warn',
    review_required: 'brand',
    continue: 'brand',
  }
  const Icon = iconMap[action.kind] || ArrowRight
  const tone = toneMap[action.kind] || 'brand'

  return (
    <div
      className="section-card"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        padding: '12px 14px',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)',
        cursor: action.link ? 'pointer' : 'default',
      }}
      onClick={() => action.link && onNavigate(action.link)}
      role={action.link ? 'button' : undefined}
      tabIndex={action.link ? 0 : undefined}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 'var(--radius-sm)',
            background: tone === 'fail' ? 'var(--fail-bg, #fef2f2)' : tone === 'warn' ? 'var(--warn-bg, #fefce8)' : 'var(--brand-bg, #eff6ff)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon size={16} style={{ color: `var(--${tone === 'fail' ? 'fail' : tone === 'warn' ? 'warn' : 'brand-mid'})` }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: 'var(--text-tertiary)',
              marginBottom: 2,
            }}
          >
            Current Focus
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
            {action.title}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            {action.body}
          </div>
        </div>
        {action.link && (
          <ArrowRight size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0, marginTop: 8 }} />
        )}
      </div>
    </div>
  )
}

function WorkflowProgressPanel({ workflow }) {
  if (!workflow || workflow.length === 0) return null

  // Map engine states to the WorkflowProgress widget's expected statuses
  const steps = workflow.map((s) => {
    let status = 'pending'
    if (s.state === WORKFLOW_STATES.COMPLETE) status = 'complete'
    else if (s.state === WORKFLOW_STATES.IN_PROGRESS) status = 'active'
    else if (s.state === WORKFLOW_STATES.REVIEW_REQUIRED) status = 'active'
    else if (s.state === WORKFLOW_STATES.BLOCKED) status = 'blocked'
    return {
      key: s.key,
      label: s.label,
      status,
      hint: s.hint,
    }
  })

  // Compute a completion percentage for the header
  const complete = steps.filter((s) => s.status === 'complete').length
  const pct = Math.round((complete / steps.length) * 100)

  return (
    <div className="section-card" style={{ marginTop: 12 }}>
      <div className="section-card-header">
        <span className="section-card-title">Engineering Workflow</span>
        <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
          {complete} of {steps.length} stages complete · {pct}%
        </span>
      </div>
      <div className="section-card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        <div>
          <ol className="viz-side-workflow" aria-label="10-stage engineering workflow">
            {steps.map((s, i) => {
              const status = s.status
              const tone = status === 'complete' ? 'ok' : status === 'blocked' ? 'fail' : status === 'active' ? 'active' : 'pending'
              const Icon = status === 'complete' ? CheckCircle2 : status === 'blocked' ? AlertCircle : status === 'active' ? Clock : Activity
              return (
                <li key={s.key || i} className={`viz-side-workflow-step is-${tone}`}>
                  <span className="viz-side-workflow-bullet" aria-hidden="true">
                    <Icon size={12} strokeWidth={2.5} />
                  </span>
                  <span className="viz-side-workflow-label">{s.label}</span>
                  {s.hint && <span className="viz-side-workflow-hint">{s.hint}</span>}
                </li>
              )
            })}
          </ol>
        </div>
      </div>
    </div>
  )
}

function ActivityFeedPanel({ projectId, stations, filters, onFilterChange }) {
  const [realActivity, setRealActivity] = useState([])

  useEffect(() => {
    if (!projectId) return undefined
    const unsub = subscribeToActivity(projectId, (entries) => setRealActivity(entries), 20)
    return () => { if (typeof unsub === 'function') unsub() }
  }, [projectId])

  // Derived fallback when no real activity yet
  const derived = useMemo(() => {
    if (!Array.isArray(stations)) return []
    return stations
      .flatMap((s) => {
        const events = []
        if (s.lastCalcResult?.calculatedAt) {
          events.push({ id: `calc-${s.id}`, station: s.name, kind: 'calc', text: 'Calculation run', ts: s.lastCalcResult.calculatedAt })
        }
        if (s.status === 'approved' || s.status === 'issued_for_construction') {
          events.push({ id: `app-${s.id}`, station: s.name, kind: 'success', text: 'Station approved', ts: s.updatedAt || new Date().toISOString() })
        }
        if (s.status === 'engineering_review') {
          events.push({ id: `rev-${s.id}`, station: s.name, kind: 'warning', text: 'In engineering review', ts: s.updatedAt || new Date().toISOString() })
        }
        return events
      })
      .sort((a, b) => new Date(b.ts) - new Date(a.ts))
      .slice(0, 10)
  }, [stations])

  const items = realActivity.length > 0 ? realActivity : derived
  const filtered = items.filter((ev) => {
    if (filters === 'all') return true
    if (filters === 'blocked') return ev.kind === 'warning' || ev.kind === 'error'
    if (filters === 'review') return ev.kind === 'warning' || (ev.text && ev.text.toLowerCase().includes('review'))
    return true
  })

  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '12px 14px',
        boxShadow: 'var(--shadow-sm)',
        marginTop: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <h3 style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-tertiary)', margin: 0 }}>
          Engineering Activity {realActivity.length > 0 && <span style={{ fontSize: 9, color: 'var(--pass)', fontWeight: 400, marginLeft: 6 }}>● live</span>}
        </h3>
        <div style={{ display: 'flex', gap: 4 }}>
          {['all', 'review', 'blocked'].map((f) => (
            <button
              key={f}
              className={`btn btn-sm ${filters === f ? 'btn-primary' : ''}`}
              onClick={() => onFilterChange(f)}
              style={{ fontSize: 10, padding: '2px 8px' }}
            >
              {f === 'all' ? 'All' : f === 'review' ? 'Review' : 'Needs Attention'}
            </button>
          ))}
        </div>
      </div>
      <div className="activity-feed">
        {filtered.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', padding: 8 }}>
            No activity matching the current filter.
          </div>
        ) : (
          filtered.map((ev, i) => (
            <div key={ev.id || i} className="activity-feed__item">
              <div className={`activity-feed__dot activity-feed__dot--${ev.kind || 'info'}`} />
              <span className="activity-feed__label">
                {realActivity.length > 0 ? (
                  <><strong>{ev.userEmail}</strong> · <em>{ev.action}</em>{ev.details ? ` — ${ev.details}` : ''}</>
                ) : (
                  <><strong>{ev.station}</strong> · {ev.text}</>
                )}
              </span>
              <span className="activity-feed__time">
                {new Date(ev.timestamp || ev.ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function DashboardCommandCenter({ project }) {
  const navigate = useNavigate()
  const attenuationResult = useProjectStore((s) => s.attenuationResult)
  const [activityFilter, setActivityFilter] = useState('all')

  // All hooks must be called unconditionally before any early return
  const stations = useMemo(() => project?.stations || [], [project])

  const workflow = useMemo(
    () => project ? computeWorkflow(project, stations, { attenuationResult }) : [],
    [project, stations, attenuationResult]
  )

  const advisorRecs = useMemo(() => {
    if (!project) return []
    const stationWithCalc = stations.find((s) => s.lastCalcResult)
    if (!stationWithCalc) return []
    const input = buildAdvisorInputs(project, [stationWithCalc])
    const result = analyze(input)
    return result.recommendations || []
  }, [project, stations])

  const kpis = useMemo(
    () => project ? computeAllKPIs(project, stations, workflow, advisorRecs) : null,
    [project, stations, workflow, advisorRecs]
  )

  const action = useMemo(
    () => project ? nextBestAction(workflow, kpis, stations, advisorRecs) : null,
    [project, workflow, kpis, stations, advisorRecs]
  )

  if (!project) return null

  // Format KPI values for display
  const healthValue = kpis.projectHealth.totalCount === 0 ? '—' : `${kpis.projectHealth.score}`
  const healthSub = kpis.projectHealth.totalCount === 0
    ? 'No stations'
    : `${kpis.projectHealth.calculatedCount}/${kpis.projectHealth.totalCount} calculated`
  const healthTone = kpis.projectHealth.score >= 80 ? 'pass' : kpis.projectHealth.score >= 50 ? 'brand' : 'fail'

  const complianceValue = kpis.complianceScore === null ? 'N/A' : `${kpis.complianceScore}`
  const complianceSub = kpis.complianceScore === null ? 'No checks yet' : kpis.complianceScore >= 90 ? 'All passing' : 'Review needed'
  const complianceTone = kpis.complianceScore === null ? 'info' : kpis.complianceScore >= 90 ? 'pass' : kpis.complianceScore >= 70 ? 'warn' : 'fail'

  const completionValue = `${kpis.designCompletion}%`
  const completionTone = kpis.designCompletion >= 80 ? 'pass' : kpis.designCompletion >= 40 ? 'brand' : 'warn'

  const currentValue = kpis.currentRequirement === null ? '—' : `${kpis.currentRequirement.toFixed(2)} A`
  const currentSub = kpis.currentRequirement === null ? 'Run calculation' : 'Largest across stations'
  const currentTone = 'brand'

  const groundbedValue = kpis.groundbedStatus.total === 0
    ? '—'
    : kpis.groundbedStatus.status === 'pass' ? 'PASS'
    : kpis.groundbedStatus.status === 'warn' ? 'WARN'
    : kpis.groundbedStatus.status === 'fail' ? 'FAIL'
    : 'N/A'
  const groundbedSub = kpis.groundbedStatus.total === 0
    ? 'No data'
    : `${kpis.groundbedStatus.pass}P · ${kpis.groundbedStatus.warn}W · ${kpis.groundbedStatus.fail}F`
  const groundbedTone = kpis.groundbedStatus.status === 'pass' ? 'pass' : kpis.groundbedStatus.status === 'warn' ? 'warn' : kpis.groundbedStatus.status === 'fail' ? 'fail' : 'info'

  const validationValue = kpis.validationStatus.totalIssues === 0 ? 'CLEAN' : `${kpis.validationStatus.totalIssues}`
  const validationSub = kpis.validationStatus.totalIssues === 0 ? 'All checks passed' : 'Open issues'
  const validationTone = kpis.validationStatus.totalIssues === 0 ? 'pass' : 'warn'

  const riskValue = kpis.engineeringRisk.level.toUpperCase()
  const riskSub = `Score ${kpis.engineeringRisk.score}/100`
  const riskTone = kpis.engineeringRisk.level === 'Low' ? 'pass' : kpis.engineeringRisk.level === 'Medium' ? 'warn' : 'fail'

  return (
    <div data-testid="dashboard-command-center">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '8px 0 4px' }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Engineering Command Center
        </h2>
      </div>

      {/* 7-Card Executive KPI Row */}
      <div className="kpi-row" data-testid="executive-kpi-row">
        <ExecutiveKpiCard label="Project Health" value={healthValue} sub={healthSub} tone={healthTone} icon={Shield} />
        <ExecutiveKpiCard label="Compliance" value={complianceValue} sub={complianceSub} tone={complianceTone} icon={CheckCircle2} />
        <ExecutiveKpiCard label="Design Completion" value={completionValue} sub={`${kpis.designCompletion}% of 10 stages`} tone={completionTone} icon={Layers} />
        <ExecutiveKpiCard label="Current Req." value={currentValue} sub={currentSub} tone={currentTone} icon={Zap} />
        <ExecutiveKpiCard label="Groundbed" value={groundbedValue} sub={groundbedSub} tone={groundbedTone} icon={Layers} />
        <ExecutiveKpiCard label="Validation" value={validationValue} sub={validationSub} tone={validationTone} icon={ClipboardCheck} />
        <ExecutiveKpiCard label="Eng. Risk" value={riskValue} sub={riskSub} tone={riskTone} icon={AlertTriangle} />
      </div>

      {/* Current Project Focus + Workflow Progress */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12, marginTop: 12 }}>
        <CurrentProjectFocus action={action} onNavigate={navigate} />
        <WorkflowProgressPanel workflow={workflow} />
      </div>

      {/* Engineering Activity Feed */}
      <ActivityFeedPanel
        projectId={project.id}
        stations={stations}
        filters={activityFilter}
        onFilterChange={setActivityFilter}
      />
    </div>
  )
}

export default DashboardCommandCenter
