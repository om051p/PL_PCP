/**
 * learningStore.test.js
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  getTrainingDataset,
  exportDataset,
  getCounts,
  getOverrideHistory,
  getAcceptedHistory,
} from './learningStore.js'
import { useRecommendationFeedbackStore, FEEDBACK_KINDS } from './recommendationFeedbackStore.js'
import { useDecisionHistoryStore, DECISION_TYPES } from './decisionHistoryStore.js'

beforeEach(() => {
  if (typeof localStorage !== 'undefined') localStorage.clear()
  useRecommendationFeedbackStore.getState()._clearAll()
  useDecisionHistoryStore.getState()._clearAll()
})

describe('getTrainingDataset', () => {
  it('returns empty array when no data', () => {
    expect(getTrainingDataset()).toEqual([])
  })

  it('joins decisions with matching feedback', () => {
    // Log a feedback record
    const fbRec = useRecommendationFeedbackStore.getState().logFeedback({
      projectId: 'p1',
      stationId: 's1',
      recommendationId: 'rec_1',
      category: 'soil',
      severity: 'warn',
      title: 'T',
      message: 'M',
      action: 'A',
    })
    useRecommendationFeedbackStore.getState().acceptFeedback(fbRec.id)

    // Log a decision linked to that recommendation
    useDecisionHistoryStore.getState().logDecision({
      projectId: 'p1',
      stationId: 's1',
      decisionType: DECISION_TYPES.INPUT_CHANGE,
      relatedRecommendationId: 'rec_1',
    })

    const ds = getTrainingDataset()
    expect(ds).toHaveLength(1)
    expect(ds[0].feedback).toBeTruthy()
    expect(ds[0].feedback.recommendationId).toBe('rec_1')
  })

  it('returns decisions without feedback when no match', () => {
    useDecisionHistoryStore.getState().logDecision({
      projectId: 'p1',
      decisionType: DECISION_TYPES.CALC_RUN,
    })
    const ds = getTrainingDataset()
    expect(ds).toHaveLength(1)
    expect(ds[0].feedback).toBeNull()
  })

  it('supports projectId filter', () => {
    useDecisionHistoryStore.getState().logDecision({ projectId: 'p1', decisionType: DECISION_TYPES.CALC_RUN })
    useDecisionHistoryStore.getState().logDecision({ projectId: 'p2', decisionType: DECISION_TYPES.CALC_RUN })
    expect(getTrainingDataset({ projectId: 'p1' })).toHaveLength(1)
  })

  it('supports decisionType filter', () => {
    useDecisionHistoryStore.getState().logDecision({ projectId: 'p1', decisionType: DECISION_TYPES.CALC_RUN })
    useDecisionHistoryStore.getState().logDecision({ projectId: 'p1', decisionType: DECISION_TYPES.STATUS_CHANGE })
    const ds = getTrainingDataset({ decisionType: DECISION_TYPES.CALC_RUN })
    expect(ds).toHaveLength(1)
  })
})

describe('exportDataset', () => {
  it('returns a versioned JSON envelope', () => {
    useDecisionHistoryStore.getState().logDecision({ projectId: 'p1', decisionType: DECISION_TYPES.CALC_RUN })
    const exp = exportDataset()
    expect(exp.version).toBe(1)
    expect(exp.exportedAt).toMatch(/T.+Z$/)
    expect(exp.count).toBe(1)
  })
})

describe('getCounts', () => {
  it('returns decision and feedback counts', () => {
    useDecisionHistoryStore.getState().logDecision({ projectId: 'p1', decisionType: DECISION_TYPES.CALC_RUN })
    const fbRec = useRecommendationFeedbackStore.getState().logFeedback({
      projectId: 'p1', stationId: 's1', recommendationId: 'r1',
      category: 'soil', severity: 'warn', title: 'T', message: 'M', action: 'A',
    })
    useRecommendationFeedbackStore.getState().acceptFeedback(fbRec.id)

    const c = getCounts('p1')
    expect(c.decisions.total).toBe(1)
    expect(c.feedback.total).toBe(1)
    expect(c.feedback.accepted).toBe(1)
  })
})

describe('getOverrideHistory', () => {
  it('returns only OVERRIDDEN records', () => {
    const fb1 = useRecommendationFeedbackStore.getState().logFeedback({
      projectId: 'p1', stationId: 's1', recommendationId: 'r1',
      category: 'soil', severity: 'warn', title: 'T', message: 'M', action: 'A',
    })
    const fb2 = useRecommendationFeedbackStore.getState().logFeedback({
      projectId: 'p1', stationId: 's1', recommendationId: 'r2',
      category: 'soil', severity: 'warn', title: 'T2', message: 'M2', action: 'A2',
    })
    useRecommendationFeedbackStore.getState().acceptFeedback(fb1.id)
    useRecommendationFeedbackStore.getState().overrideFeedback(fb2.id, 'budget')

    const overrides = getOverrideHistory('p1')
    expect(overrides).toHaveLength(1)
    expect(overrides[0].recommendationId).toBe('r2')
  })
})

describe('getAcceptedHistory', () => {
  it('returns only ACCEPTED records', () => {
    const fb1 = useRecommendationFeedbackStore.getState().logFeedback({
      projectId: 'p1', stationId: 's1', recommendationId: 'r1',
      category: 'soil', severity: 'warn', title: 'T', message: 'M', action: 'A',
    })
    useRecommendationFeedbackStore.getState().acceptFeedback(fb1.id)
    const accepted = getAcceptedHistory('p1')
    expect(accepted).toHaveLength(1)
    expect(accepted[0].recommendationId).toBe('r1')
  })
})
