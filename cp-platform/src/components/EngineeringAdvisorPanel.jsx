/* eslint-disable react-refresh/only-export-components */
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
  Coins,
} from 'lucide-react'
import { analyze, SEVERITY, CATEGORY } from '../engine/engineeringAdvisor/engineeringAdvisorEngine.js'
import { analyze as analyzeV2, RECOMMENDATION_CATEGORIES, RECOMMENDATION_PRIORITIES, CATEGORY_LABELS } from '../engine/engineeringAdvisor/recommendationEngine.js'
import { useRecommendationFeedbackStore, FEEDBACK_KINDS } from '../store/recommendationFeedbackStore.js'
import { useAuthStore } from '../store/authStore.js'
import { collectFromAdvisorPanel } from '../store/feedbackCollector.js'

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
 *
 * P8: Delegates to feedbackCollector.collectFromAdvisorPanel for centralized
 * collection logic. Behavior is identical — same dedup, same PENDING state.
 */
function useFeedbackLogging(project, station, recommendations) {
  const ref = useRef({})
  const seen = useRef(new Set())

  useEffect(() => {
    if (!project || !station) return
    const lookup = collectFromAdvisorPanel(project, station, recommendations)
    for (const { recId, recordId } of lookup) {
      if (!seen.current.has(recId)) {
        ref.current[recId] = recordId
        seen.current.add(recId)
      }
    }
  }, [recommendations, project, station])

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

function RecommendationRow({ rec, enableV2 = false }) {
  const isCostReduction = enableV2 && rec.category === RECOMMENDATION_CATEGORIES.COST_REDUCTION
  return (
    <div className="advisor-rec" data-testid={'advisor-rec-' + rec.id.replace(/\./g, '-')} data-severity={rec.severity} data-category={rec.category || ''}>
      <SeverityIcon severity={rec.severity} />
      <div className="advisor-rec__body">
        <div className="advisor-rec__title">
          {rec.title}
          {isCostReduction && (
            <span className="advisor-rec__badge advisor-rec__badge--cost" aria-label="Cost reduction">
              <Coins size={10} />
            </span>
          )}
        </div>
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

export function EngineeringAdvisorPanel({ project, station, defaultMode = 'summary', enableV2 = false, testId = 'advisor-panel' }) {
  const [mode, setMode] = useState(defaultMode)
  const [categoryFilter, setCategoryFilter] = useState('all')

  const input = useMemo(() => buildAdvisorInput(project, station), [project, station])
  const result = useMemo(() => analyze(input), [input])
  // V2 result: layered engine with new vocabulary + cost-reduction rules
  const resultV2 = useMemo(() => enableV2 ? analyzeV2(input) : null, [enableV2, input])

  // Use V2 result when enabled, otherwise fall back to V1
  const activeResult = resultV2 || { recommendations: result?.recommendations || [] }
  const activeRecommendations = activeResult.recommendations || []

  // Log every shown recommendation as PENDING so we can capture user feedback later.
  // Only runs when there are actual recommendations to log.
  const feedbackRef = useFeedbackLogging(project, station, activeRecommendations)
  const acceptFeedback = useRecommendationFeedbackStore((s) => s.acceptFeedback)
  const overrideFeedback = useRecommendationFeedbackStore((s) => s.overrideFeedback)
  const addressFeedback = useRecommendationFeedbackStore((s) => s.addressFeedback)

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
  const allSuccess = activeRecommendations.length > 0 &&
    activeRecommendations.every((r) => r.severity === 'success')
  if (activeRecommendations.length === 0 || allSuccess) {
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

  // V2 filter: by category
  const filteredRecs = enableV2 && categoryFilter !== 'all'
    ? activeRecommendations.filter((r) => r.category === categoryFilter)
    : activeRecommendations

  // Cost mode: show only cost-reduction recs
  const displayRecs = mode === 'cost'
    ? activeRecommendations.filter((r) => r.category === RECOMMENDATION_CATEGORIES.COST_REDUCTION)
    : filteredRecs

  // Count cost-reduction recs for the mode tab
  const costRecCount = enableV2
    ? activeRecommendations.filter((r) => r.category === RECOMMENDATION_CATEGORIES.COST_REDUCTION).length
    : 0

  return (
    <div className="advisor-panel" data-testid={testId}>
      <div className="advisor-panel__header" onClick={() => setMode(mode === 'full' ? 'summary' : 'full')} role="button" tabIndex={0} data-testid="advisor-header">
        <Shield size={16} />
        <span>Engineering Advisor</span>
        <span className="advisor-panel__count">{activeRecommendations.length} advisory{activeRecommendations.length !== 1 ? 'ies' : ''}</span>
        <ScoreBadge score={result.score} label={result.scoreLabel} />
        {mode === 'full' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </div>

      {mode === 'summary' && !enableV2 && (
        <CategorySummary summary={result.summary} />
      )}

      {mode === 'summary' && enableV2 && resultV2 && (
        <V2CategorySummary byCategory={resultV2.byCategory} />
      )}

      {/* V2: Category filter chips */}
      {enableV2 && (mode === 'full' || mode === 'cost') && (
        <div className="advisor-panel__filters" data-testid="advisor-filters">
          {['all', ...Object.values(RECOMMENDATION_CATEGORIES)].map((cat) => {
            const count = cat === 'all'
              ? activeRecommendations.length
              : activeRecommendations.filter((r) => r.category === cat).length
            if (cat !== 'all' && count === 0) return null
            return (
              <button
                key={cat}
                className={`advisor-chip ${categoryFilter === cat ? 'advisor-chip--active' : ''}`}
                onClick={() => { setCategoryFilter(cat); setMode('full') }}
                data-testid={`advisor-filter-${cat}`}
              >
                {cat === 'all' ? 'All' : CATEGORY_LABELS[cat]}
                <span className="advisor-chip__count">{count}</span>
              </button>
            )
          })}
        </div>
      )}

      {(mode === 'full' || mode === 'cost') && (
        <div className="advisor-panel__list">
          {displayRecs.length === 0 ? (
            <div className="advisor-panel__empty">No recommendations in this category.</div>
          ) : (
            displayRecs.map((rec) => (
              <RecommendationRow key={rec.id} rec={rec} enableV2={enableV2} />
            ))
          )}
        </div>
      )}

      {/* V2: Cost mode tab */}
      {enableV2 && costRecCount > 0 && (
        <div className="advisor-panel__footer">
          <button
            className={`advisor-chip ${mode === 'cost' ? 'advisor-chip--active' : ''}`}
            onClick={() => setMode(mode === 'cost' ? 'full' : 'cost')}
            data-testid="advisor-mode-cost"
          >
            <Coins size={11} />
            Cost Reduction ({costRecCount})
          </button>
        </div>
      )}
    </div>
  )
}

/**
 * V2 category summary: shows the 4 new categories with counts.
 */
function V2CategorySummary({ byCategory }) {
  return (
    <div className="advisor-summary">
      {Object.entries(byCategory).map(([cat, recs]) => {
        const Icon = V2_CATEGORY_ICONS[cat] || Activity
        const status = recs.length === 0 ? 'clean' : 'issues'
        const headline = recs.length === 0 ? 'No issues' : recs[0]?.title || 'Issues found'
        return (
          <div key={cat} className="advisor-summary__tile" data-status={status} data-category={cat}>
            <Icon size={14} className="advisor-summary__icon" />
            <div className="advisor-summary__cat">{CATEGORY_LABELS[cat] || cat}</div>
            <div className="advisor-summary__headline">{headline}</div>
            <div className="advisor-summary__observed">{recs.length} recommendation{recs.length !== 1 ? 's' : ''}</div>
          </div>
        )
      })}
    </div>
  )
}

const V2_CATEGORY_ICONS = {
  [RECOMMENDATION_CATEGORIES.OPTIMIZATION]: TrendingUp,
  [RECOMMENDATION_CATEGORIES.WARNING]: AlertTriangle,
  [RECOMMENDATION_CATEGORIES.COMPLIANCE]: Shield,
  [RECOMMENDATION_CATEGORIES.COST_REDUCTION]: Coins,
}

export default EngineeringAdvisorPanel
