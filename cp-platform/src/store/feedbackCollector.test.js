/**
 * feedbackCollector.test.js
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  collectFromAdvisorPanel,
  collectFromValidation,
  collectFromCalculation,
  collectFromApproval,
} from './feedbackCollector.js'
import { useRecommendationFeedbackStore, FEEDBACK_KINDS } from './recommendationFeedbackStore.js'
import { useDecisionHistoryStore, DECISION_TYPES } from './decisionHistoryStore.js'

const PROJECT = { id: 'p1', designBasis: { designStandard: 'saudiAramco' } }
const STATION = { id: 's1', name: 'Station 1' }

beforeEach(() => {
  if (typeof localStorage !== 'undefined') localStorage.clear()
  useRecommendationFeedbackStore.getState()._clearAll()
  useDecisionHistoryStore.getState()._clearAll()
})

describe('collectFromAdvisorPanel', () => {
  it('returns empty array for null inputs', () => {
    expect(collectFromAdvisorPanel(null, null, [])).toEqual([])
  })

  it('logs PENDING feedback for each recommendation', () => {
    const recs = [
      { id: 'soil.very_high', category: 'soil', severity: 'warn', title: 'T', message: 'M', action: 'A' },
      { id: 'tr.oversized', category: 'tr', severity: 'warn', title: 'T2', message: 'M2', action: 'A2' },
    ]
    const result = collectFromAdvisorPanel(PROJECT, STATION, recs)
    expect(result).toHaveLength(2)
    expect(useRecommendationFeedbackStore.getState().records).toHaveLength(2)
    expect(useRecommendationFeedbackStore.getState().records[0].feedback).toBe(FEEDBACK_KINDS.PENDING)
  })

  it('does not duplicate existing PENDING records', () => {
    const recs = [{ id: 'soil.very_high', category: 'soil', severity: 'warn', title: 'T', message: 'M', action: 'A' }]
    collectFromAdvisorPanel(PROJECT, STATION, recs)
    collectFromAdvisorPanel(PROJECT, STATION, recs)
    expect(useRecommendationFeedbackStore.getState().records).toHaveLength(1)
  })

  it('returns lookup with recId → recordId', () => {
    const recs = [{ id: 'soil.very_high', category: 'soil', severity: 'warn', title: 'T', message: 'M', action: 'A' }]
    const result = collectFromAdvisorPanel(PROJECT, STATION, recs)
    expect(result[0].recId).toBe('soil.very_high')
    expect(result[0].recordId).toMatch(/^fb_/)
  })

  it('skips recs without id', () => {
    const recs = [{ category: 'soil' }, { id: 'valid.id', category: 'soil' }]
    const result = collectFromAdvisorPanel(PROJECT, STATION, recs)
    expect(result).toHaveLength(1)
  })
})

describe('collectFromValidation', () => {
  it('returns null for null inputs', () => {
    expect(collectFromValidation(null, null, [])).toBeNull()
  })

  it('logs a validation_resolved decision', () => {
    const r = collectFromValidation(PROJECT, STATION, ['Error 1', 'Error 2'])
    expect(r).toBeTruthy()
    expect(r.decisionType).toBe(DECISION_TYPES.VALIDATION_RESOLVED)
    expect(r.afterValue).toBe(2)
  })

  it('handles empty errors array', () => {
    const r = collectFromValidation(PROJECT, STATION, [])
    expect(r.afterValue).toBe(0)
  })
})

describe('collectFromCalculation', () => {
  it('returns null for null inputs', () => {
    expect(collectFromCalculation(null, null, null, null)).toBeNull()
  })

  it('logs a calc_run decision', () => {
    const records = collectFromCalculation(PROJECT, STATION, null, null)
    expect(Array.isArray(records)).toBe(true)
    expect(records).toHaveLength(1)
    expect(records[0].decisionType).toBe(DECISION_TYPES.CALC_RUN)
  })

  it('logs input_change records for differing fields', () => {
    const before = { soilResistivityOhmCm: 5000, pipelineLengthKm: 12 }
    const after = { soilResistivityOhmCm: 7500, pipelineLengthKm: 12 }
    const records = collectFromCalculation(PROJECT, STATION, before, after)
    const inputChanges = records.filter((r) => r.decisionType === DECISION_TYPES.INPUT_CHANGE)
    expect(inputChanges).toHaveLength(1)
    expect(inputChanges[0].field).toBe('soilResistivityOhmCm')
    expect(inputChanges[0].beforeValue).toBe(5000)
    expect(inputChanges[0].afterValue).toBe(7500)
  })

  it('does not log input_change for unchanged fields', () => {
    const before = { soilResistivityOhmCm: 5000 }
    const after = { soilResistivityOhmCm: 5000 }
    const records = collectFromCalculation(PROJECT, STATION, before, after)
    const inputChanges = records.filter((r) => r.decisionType === DECISION_TYPES.INPUT_CHANGE)
    expect(inputChanges).toHaveLength(0)
  })
})

describe('collectFromApproval', () => {
  it('returns null for null inputs', () => {
    expect(collectFromApproval(null, null, null, null)).toBeNull()
  })

  it('logs a status_change decision', () => {
    const r = collectFromApproval(PROJECT, STATION, 'draft', 'approved')
    expect(r.decisionType).toBe(DECISION_TYPES.STATUS_CHANGE)
    expect(r.beforeValue).toBe('draft')
    expect(r.afterValue).toBe('approved')
  })
})
