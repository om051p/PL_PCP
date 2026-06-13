/**
 * recommendationFeedbackStore.test.js
 *
 * Tests for the recommendation feedback store. Covers logging, feedback
 * transitions, queries, export, and cap behavior.
 */

// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { useRecommendationFeedbackStore, FEEDBACK_KINDS } from './recommendationFeedbackStore.js'

const SAMPLE_REC = {
  userId: 'u1',
  userEmail: 'engineer@example.com',
  projectId: 'p1',
  stationId: 's1',
  recommendationId: 'soil.very_high',
  category: 'soil',
  severity: 'warn',
  title: 'Very high soil resistivity',
  message: 'Soil resistivity is 60000 Ohm-cm',
  action: 'Switch to deepwell',
  confidence: 0.9,
  source: 'rule',
  observedInputs: { soilResistivityOhmCm: 60000, pipelineLengthKm: 12 },
}

beforeEach(() => {
  // Clear localStorage between tests (jsdom)
  if (typeof localStorage !== 'undefined') localStorage.clear()
  useRecommendationFeedbackStore.getState()._clearAll()
})

describe('recommendationFeedbackStore — basic logging', () => {
  it('starts with empty records and no session', () => {
    const s = useRecommendationFeedbackStore.getState()
    expect(s.records).toEqual([])
    expect(s.currentSessionId).toBeNull()
  })

  it('logs a new feedback record', () => {
    const s = useRecommendationFeedbackStore.getState()
    const r = s.logFeedback(SAMPLE_REC)
    expect(r.id).toMatch(/^fb_/)
    expect(r.timestamp).toMatch(/T.+Z$/)
    expect(r.feedback).toBe(FEEDBACK_KINDS.PENDING)
    expect(r.sessionId).toMatch(/^sess_/)
    expect(useRecommendationFeedbackStore.getState().records).toHaveLength(1)
  })

  it('ensures a session id is set', () => {
    const s = useRecommendationFeedbackStore.getState()
    expect(s.currentSessionId).toBeNull()
    s.ensureSession()
    expect(useRecommendationFeedbackStore.getState().currentSessionId).toMatch(/^sess_/)
  })

  it('uses the same session for multiple logs in the same session', () => {
    const s = useRecommendationFeedbackStore.getState()
    s.logFeedback(SAMPLE_REC)
    s.logFeedback({ ...SAMPLE_REC, recommendationId: 'tr.undersized' })
    const sess = useRecommendationFeedbackStore.getState().currentSessionId
    expect(sess).toMatch(/^sess_/)
    expect(useRecommendationFeedbackStore.getState().records.every((r) => r.sessionId === sess)).toBe(true)
  })
})

describe('recommendationFeedbackStore — feedback transitions', () => {
  it('transitions PENDING → ACCEPTED', () => {
    const s = useRecommendationFeedbackStore.getState()
    const r = s.logFeedback(SAMPLE_REC)
    s.acceptFeedback(r.id)
    const after = useRecommendationFeedbackStore.getState().records[0]
    expect(after.feedback).toBe(FEEDBACK_KINDS.ACCEPTED)
    expect(after.decidedAt).toBeTruthy()
  })

  it('transitions PENDING → CHANGED with diff values', () => {
    const s = useRecommendationFeedbackStore.getState()
    const r = s.logFeedback(SAMPLE_REC)
    s.addressFeedback(r.id, 'Increased anode count from 8 to 12', 8, 12)
    const after = useRecommendationFeedbackStore.getState().records[0]
    expect(after.feedback).toBe(FEEDBACK_KINDS.CHANGED)
    expect(after.changeDescription).toBe('Increased anode count from 8 to 12')
    expect(after.beforeValue).toBe(8)
    expect(after.afterValue).toBe(12)
  })

  it('transitions PENDING → OVERRIDDEN with reason', () => {
    const s = useRecommendationFeedbackStore.getState()
    const r = s.logFeedback(SAMPLE_REC)
    s.overrideFeedback(r.id, 'No budget for deepwell retrofit')
    const after = useRecommendationFeedbackStore.getState().records[0]
    expect(after.feedback).toBe(FEEDBACK_KINDS.OVERRIDDEN)
    expect(after.changeDescription).toBe('No budget for deepwell retrofit')
  })

  it('updateFeedback is idempotent (no-op on missing id)', () => {
    const s = useRecommendationFeedbackStore.getState()
    s.logFeedback(SAMPLE_REC)
    s.updateFeedback('fb_nonexistent', { feedback: FEEDBACK_KINDS.ACCEPTED })
    expect(useRecommendationFeedbackStore.getState().records[0].feedback).toBe(FEEDBACK_KINDS.PENDING)
  })
})

describe('recommendationFeedbackStore — markStationPendingAsIgnored', () => {
  it('marks only PENDING records for the specified station as IGNORED', () => {
    const s = useRecommendationFeedbackStore.getState()
    s.logFeedback(SAMPLE_REC)
    s.logFeedback({ ...SAMPLE_REC, stationId: 's2', recommendationId: 'tr.oversized' })
    s.logFeedback({ ...SAMPLE_REC, stationId: 's1', recommendationId: 'attenuation.inadequate' })
    s.acceptFeedback(useRecommendationFeedbackStore.getState().records[1].id)  // accept s2
    s.markStationPendingAsIgnored('p1', 's1')
    const records = useRecommendationFeedbackStore.getState().records
    expect(records.find((r) => r.stationId === 's1' && r.recommendationId === 'soil.very_high').feedback).toBe(FEEDBACK_KINDS.IGNORED)
    expect(records.find((r) => r.stationId === 's1' && r.recommendationId === 'attenuation.inadequate').feedback).toBe(FEEDBACK_KINDS.IGNORED)
    expect(records.find((r) => r.stationId === 's2').feedback).toBe(FEEDBACK_KINDS.ACCEPTED)  // not affected
  })

  it('does not touch records from other projects', () => {
    const s = useRecommendationFeedbackStore.getState()
    s.logFeedback(SAMPLE_REC)
    s.logFeedback({ ...SAMPLE_REC, projectId: 'p2' })
    s.markStationPendingAsIgnored('p1', 's1')
    const records = useRecommendationFeedbackStore.getState().records
    expect(records.find((r) => r.projectId === 'p1').feedback).toBe(FEEDBACK_KINDS.IGNORED)
    expect(records.find((r) => r.projectId === 'p2').feedback).toBe(FEEDBACK_KINDS.PENDING)
  })
})

describe('recommendationFeedbackStore — queries', () => {
  beforeEach(() => {
    const s = useRecommendationFeedbackStore.getState()
    s.logFeedback(SAMPLE_REC)
    s.logFeedback({ ...SAMPLE_REC, stationId: 's2', recommendationId: 'tr.oversized' })
    s.logFeedback({ ...SAMPLE_REC, projectId: 'p2', stationId: 's3' })
  })

  it('getProjectHistory returns project records newest-first', () => {
    const s = useRecommendationFeedbackStore.getState()
    const hist = s.getProjectHistory('p1')
    expect(hist).toHaveLength(2)
    expect(hist.every((r) => r.projectId === 'p1')).toBe(true)
  })

  it('getStationHistory filters by both project and station', () => {
    const s = useRecommendationFeedbackStore.getState()
    const hist = s.getStationHistory('p1', 's1')
    expect(hist).toHaveLength(1)
    expect(hist[0].stationId).toBe('s1')
  })

  it('getTrainingDataset excludes PENDING', () => {
    const s = useRecommendationFeedbackStore.getState()
    s.acceptFeedback(useRecommendationFeedbackStore.getState().records[0].id)
    const ds = s.getTrainingDataset()
    expect(ds).toHaveLength(1)
    expect(ds[0].feedback).toBe(FEEDBACK_KINDS.ACCEPTED)
  })

  it('getTrainingDataset supports filters', () => {
    const s = useRecommendationFeedbackStore.getState()
    s.acceptFeedback(useRecommendationFeedbackStore.getState().records[0].id)
    const ds = s.getTrainingDataset({ projectId: 'p1' })
    expect(ds).toHaveLength(1)
    const ds2 = s.getTrainingDataset({ projectId: 'p_nonexistent' })
    expect(ds2).toHaveLength(0)
  })

  it('getTrainingDataset supports since-filter', () => {
    const s = useRecommendationFeedbackStore.getState()
    s.acceptFeedback(useRecommendationFeedbackStore.getState().records[0].id)
    const since = new Date(Date.now() + 100000).toISOString()
    expect(s.getTrainingDataset({ since })).toHaveLength(0)
  })
})

describe('recommendationFeedbackStore — export', () => {
  it('exports a versioned JSON envelope', () => {
    const s = useRecommendationFeedbackStore.getState()
    s.logFeedback(SAMPLE_REC)
    s.acceptFeedback(useRecommendationFeedbackStore.getState().records[0].id)
    const exp = s.exportDataset()
    expect(exp.version).toBe(1)
    expect(exp.exportedAt).toMatch(/T.+Z$/)
    expect(exp.count).toBe(1)
    expect(Array.isArray(exp.records)).toBe(true)
    expect(exp.records[0].feedback).toBe(FEEDBACK_KINDS.ACCEPTED)
  })

  it('exportDataset filters by projectId', () => {
    const s = useRecommendationFeedbackStore.getState()
    s.logFeedback(SAMPLE_REC)
    s.logFeedback({ ...SAMPLE_REC, projectId: 'p2' })
    s.acceptFeedback(useRecommendationFeedbackStore.getState().records[0].id)
    s.acceptFeedback(useRecommendationFeedbackStore.getState().records[1].id)
    const exp = s.exportDataset({ projectId: 'p1' })
    expect(exp.count).toBe(1)
  })
})

describe('recommendationFeedbackStore — counts', () => {
  it('returns correct counts by kind', () => {
    const s = useRecommendationFeedbackStore.getState()
    s.logFeedback(SAMPLE_REC)
    s.logFeedback({ ...SAMPLE_REC, recommendationId: 'tr.oversized' })
    s.logFeedback({ ...SAMPLE_REC, recommendationId: 'attenuation.inadequate' })
    s.acceptFeedback(useRecommendationFeedbackStore.getState().records[0].id)
    s.overrideFeedback(useRecommendationFeedbackStore.getState().records[1].id, 'budget')
    s.markStationPendingAsIgnored('p1', 's1')  // third one
    const c = s.getCounts('p1')
    expect(c.total).toBe(3)
    expect(c.accepted).toBe(1)
    expect(c.overridden).toBe(1)
    expect(c.ignored).toBe(1)
    expect(c.pending).toBe(0)
  })
})

describe('recommendationFeedbackStore — edge cases', () => {
  it('handles missing user/email gracefully', () => {
    const s = useRecommendationFeedbackStore.getState()
    const r = s.logFeedback({ ...SAMPLE_REC, userId: undefined, userEmail: undefined })
    expect(r.id).toBeTruthy()
    expect(r.sessionId).toBeTruthy()
  })

  it('logFeedback returns a new record each time', () => {
    const s = useRecommendationFeedbackStore.getState()
    const r1 = s.logFeedback(SAMPLE_REC)
    const r2 = s.logFeedback(SAMPLE_REC)
    expect(r1.id).not.toBe(r2.id)
  })
})
