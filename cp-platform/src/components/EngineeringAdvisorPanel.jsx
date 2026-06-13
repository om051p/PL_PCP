/**
 * EngineeringAdvisorPanel.jsx
 *
 * UI panel that shows the rule-based engineering advisor's recommendations.
 * Read-only — consumes `analyze(input)` from engineeringAdvisorEngine.
 *
 * Three modes:
 *   - 'collapsed'  : title + score badge + count
 *   - 'summary'    : + per-category summary tiles
 *   - 'full'       : + full list of recommendations
 *
 * Designed to be embedded on the dashboard and on individual engineering pages.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Shield,
  Layers,
  Activity,
  Cpu,
  Cable,
  Signal,
  Zap,
  Route,
  Clock,
  TrendingUp,
  TrendingDown,
  FlaskConical,
} from 'lucide-react'
import { analyze, SEVERITY, CATEGORY } from '../engine/engineeringAdvisor/engineeringAdvisorEngine.js'
import { useRecommendationFeedbackStore, FEEDBACK_KINDS } from '../store/recommendationFeedbackStore.js'
import { useAuthStore } from '../store/authStore.js'

const SEVERITY_ICONS = {
  [SEVERITY.ERROR]: AlertCircle,
  [SEVERITY.WARN]: AlertTriangle,
  [SEVERITY.INFO]: Info,
  [SEVERITY.SUCCESS]: CheckCircle2,
}

const SEVERITY_COLORS = {
  [SEVERITY.ERROR]: 'var(--fail)',
  [SEVERITY.WARN]: 'var(--warn)',
  [SEVERITY.INFO]: 'var(--brand-mid)',
  [SEVERITY.SUCCESS]: 'var(--pass)',
}

const CATEGORY_ICONS = {
  [CATEGORY.SOIL]: FlaskConical,
  [CATEGORY.PIPELINE]: Route,
  [CATEGORY.CURRENT]: Zap,
  [CATEGORY.GROUNDBED]: Layers,
  [CATEGORY.TR]: Cpu,
  [CATEGORY.CABLE]: Cable,
  [CATEGORY.ATTENUATION]: Signal,
  [CATEGORY.DESIGN_LIFE]: Clock,
  [CATEGORY.WORKFLOW]: TrendingUp,
}

/**
 * Hook: auto-log every shown recommendation as PENDING in the feedback store.
 * Returns a lookup from `recId -> recordId` so we can update the record when
 * the user accepts/overrides/addresses.
 */
function useFeedbackLogging(project, station, recommendations) {
  const user = useAuthStore((s) => s.user)
  const logFeedback = useRecommendationFeedbackStore((s) => s.logFeedback)
  const records = useRecommendationFeedbackStore((s) => s.records)
  const ref = useRef({})
  const seen = useRef(new Set())

  useEffect(() => {
    if (!project || !station) return
    for (const rec of recommendations) {
      const key = rec.id
      if (seen.current.has(key)) continue
      const existing = records.find(
        (r) => r.recommendationId === key && r.stationId === station.id && r.projectId === project.id && r.feedback === FEEDBACK_KINDS.PENDING
      )
      if (existing) {
        ref.current[key] = existing.id
      } else {
        const record = logFeedback({
          userId: user?.uid,
          userEmail: user?.email || user?.displayName,
          projectId: project.id,
          stationId: station.id,
          recommendationId: rec.id,
          category: rec.category,
          severity: rec.severity,
          title: rec.title,
          message: rec.message,
          action: rec.action,
          confidence: rec.confidence,
          source: rec.source,
          observedInputs: rec.observedInputs,
        })
        ref.current[key] = record.id
      }
      seen.current.add(key)
    }
  }, [recommendations, project, station, user, records, logFeedback])

  return ref
}

/**
 * Convert a project/station snapshot to the engine's input shape.
 * @param {object} project
 * @param {object} station
 */
export function buildAdvisorInput(project, station) {
  if (!project || !station) return {}
  const lr = station.lastCalcResult
  const designLife = lr?.designLifeYears
  const designBasis = project.designBasis || {}
  return {
    soilResistivityOhmCm: designBasis.soilResistivityOhmCm ?? station.soilResistivityOhmCm,
    pipelineLengthKm: (station.pipelineSegments || []).reduce((s, seg) => s + (seg.lengthM || 0), 0) / 1000,
    currentReqA: lr?.totalCurrentAmps ?? lr?.requiredCurrentA,
    groundbedResistanceOhm: lr?.groundbedResistanceOhm,
    trRatedVoltage: station.tr?.ratedVoltage,
    trMinVoltage: lr?.minTRVoltage,
    cableDropV: lr?.totalCableDropV,
    attenuationCoveragePct: lr?.attenuationPercent,
    attenuationWorstPointMv: lr?.minCombinedPotentialMv,
    designLifeYears: designLife,
    targetDesignLifeYears: designBasis.systemDesignLifeYears ?? 25,
  }
}

function ScoreBadge({ score, label }) {
  const tone = score >= 90 ? 'pass' : score >= 55 ? 'warn' : 'fail'
  return (
    <div className="advisor-score advisor-score--' + tone}" data-testid="advisor-score">
      <div className="advisor-score__value">{score}</div>
      <div className="advisor-score__label">{label}</div>
    </div>
  )
}

function SeverityIcon({ severity }) {
  const Icon = SEVERITY_ICONS[severity] || Info
  return <Icon size={14} style={{ color: SEVERITY_COLORS[severity], flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
}

function RecommendationRow({ rec }) {
  return (
    <div className="advisor-rec" data-testid={'advisor-rec-' + rec.id.replace(/\./g, '-')} data-severity={rec.severity}>
      <SeverityIcon severity={rec.severity} />
      <div className="advisor-rec__body">
        <div className="advisor-rec__title">{rec.title}</div>
        <div className="advisor-rec__message">{rec.message}</div>
        <div className="advisor-rec__action">
          <ChevronUp size={11} style={{ transform: 'rotate(90deg)' }} />
          <span>{rec.action}</span>
        </div>
      </div>
      {rec.source === 'ai' && (
        <div className="advisor-rec__badge" aria-label="AI-generated">
          <Sparkles size={10} />
        </div>
      )}
    </div>
  )
}

function CategorySummary({ summary }) {
  return (
    <div className="advisor-summary">
      {Object.entries(summary).map(([cat, info]) => {
        const Icon = CATEGORY_ICONS[cat] || Activity
        return (
          <div key={cat} className="advisor-summary__tile" data-status={info.status}>
            <Icon size={14} className="advisor-summary__icon" />
            <div className="advisor-summary__cat">{cat.replace(/_/g, ' ')}</div>
            <div className="advisor-summary__headline">{info.headline}</div>
            <div className="advisor-summary__observed">{info.observed}</div>
          </div>
        )
      })}
    </div>
  )
}

export function EngineeringAdvisorPanel({ project, station, defaultMode = 'summary', testId = 'advisor-panel' }) {
  const [mode, setMode] = useState(defaultMode)

  const input = useMemo(() => buildAdvisorInput(project, station), [project, station])
  const result = useMemo(() => analyze(input), [input])
  if (!project || !station) {
    return (
      <div className="advisor-panel advisor-panel--empty" data-testid={testId}>
        <div className="advisor-panel__header">
          <Shield size={16} />
          <span>Engineering Advisor</span>
        </div>
        <div className="advisor-panel__empty">No active station. Select a station to see recommendations.</div>
      </div>
    )
  }

  // Treat "all recommendations are SUCCESS" (positive feedback) as all-clear too
  const allSuccess = result.recommendations.length > 0 &&
    result.recommendations.every((r) => r.severity === 'success')
  if (result.recommendations.length === 0 || allSuccess) {
    return (
      <div className="advisor-panel" data-testid={testId}>
        <div className="advisor-panel__header">
          <Shield size={16} />
          <span>Engineering Advisor</span>
          <ScoreBadge score={result.score} label={result.scoreLabel} />
        </div>
        <div className="advisor-panel__all-clear">
          <CheckCircle2 size={20} style={{ color: 'var(--pass)' }} />
          <span>All engineering checks passing for {station.name || station.id}.</span>
        </div>
      </div>
    )
  }

  // Log every shown recommendation as PENDING so we can capture user feedback later.
  // Only runs when there are actual recommendations to log.
  const feedbackRef = useFeedbackLogging(project, station, result.recommendations)
  const acceptFeedback = useRecommendationFeedbackStore((s) => s.acceptFeedback)
  const overrideFeedback = useRecommendationFeedbackStore((s) => s.overrideFeedback)
  const addressFeedback = useRecommendationFeedbackStore((s) => s.addressFeedback)

  function handleAccept(recId) {
    const recordId = feedbackRef.current[recId]
    if (recordId) acceptFeedback(recordId)
  }
  function handleOverride(recId) {
    const reason = typeof window !== 'undefined' ? window.prompt('Why are you overriding this recommendation?') : null
    const recordId = feedbackRef.current[recId]
    if (recordId) overrideFeedback(recordId, reason || undefined)
  }
  function handleAddress(recId, beforeValue, afterValue) {
    const note = typeof window !== 'undefined' ? window.prompt('What did you change?') : null
    const recordId = feedbackRef.current[recId]
    if (recordId) addressFeedback(recordId, note || undefined, beforeValue, afterValue)
  }

  return (
    <div className="advisor-panel" data-testid={testId}>
      <div className="advisor-panel__header" onClick={() => setMode(mode === 'full' ? 'summary' : 'full')} role="button" tabIndex={0} data-testid="advisor-header">
        <Shield size={16} />
        <span>Engineering Advisor</span>
        <span className="advisor-panel__count">{result.recommendations.length} advisory{result.recommendations.length !== 1 ? 'ies' : ''}</span>
        <ScoreBadge score={result.score} label={result.scoreLabel} />
        {mode === 'full' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </div>

      {mode === 'summary' && (
        <CategorySummary summary={result.summary} />
      )}

      {mode === 'full' && (
        <div className="advisor-panel__list">
          {result.recommendations.map((rec) => (
            <RecommendationRow key={rec.id} rec={rec} />
          ))}
        </div>
      )}
    </div>
  )
}

export default EngineeringAdvisorPanel
