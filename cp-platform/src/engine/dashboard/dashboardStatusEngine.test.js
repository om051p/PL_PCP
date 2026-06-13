/**
 * dashboardStatusEngine.test.js
 *
 * Tests for the nextBestAction function. Covers all 5 priority levels,
 * null returns, and deep-link generation.
 */

import { describe, it, expect } from 'vitest'
import {
  nextBestAction,
  hasPendingWork,
  describeAction,
} from './dashboardStatusEngine.js'
import { WORKFLOW_STATES } from './workflowEngine.js'

function makeStage(key, state) {
  return { key, label: key.charAt(0).toUpperCase() + key.slice(1), path: `/${key}`, state, hint: '' }
}

function makeWorkflow(states) {
  const keys = ['design_basis', 'pipeline', 'soil', 'current', 'groundbed', 'cable', 'tr', 'attenuation', 'validation', 'report']
  return keys.map((k, i) => makeStage(k, states[i] || WORKFLOW_STATES.NOT_STARTED))
}

describe('nextBestAction — priority 1: blocked', () => {
  it('returns a blocked action when any stage is blocked', () => {
    const workflow = makeWorkflow([
      WORKFLOW_STATES.COMPLETE, WORKFLOW_STATES.COMPLETE, WORKFLOW_STATES.BLOCKED,
    ])
    const action = nextBestAction(workflow, null, [], [])
    expect(action).not.toBeNull()
    expect(action.kind).toBe('blocked')
    expect(action.priority).toBe(1)
    expect(action.title).toContain('Soil')
  })

  it('blocked takes priority over advisor errors', () => {
    const workflow = makeWorkflow([
      WORKFLOW_STATES.COMPLETE, WORKFLOW_STATES.COMPLETE, WORKFLOW_STATES.BLOCKED,
    ])
    const recs = [{ severity: 'error', title: 'Critical', message: 'Bad', category: 'groundbed' }]
    const action = nextBestAction(workflow, null, [], recs)
    expect(action.kind).toBe('blocked')
  })
})

describe('nextBestAction — priority 2: advisor ERROR', () => {
  it('returns an error action when an ERROR rec exists', () => {
    const workflow = makeWorkflow(Array(10).fill(WORKFLOW_STATES.COMPLETE))
    const recs = [
      { severity: 'error', title: 'R_G too high', message: 'Groundbed resistance exceeds threshold', category: 'groundbed', id: 'groundbed.very_high' },
    ]
    const action = nextBestAction(workflow, null, [], recs)
    expect(action).not.toBeNull()
    expect(action.kind).toBe('advisor_error')
    expect(action.priority).toBe(2)
    expect(action.link).toContain('/groundbed')
  })

  it('includes station id in link when station is found', () => {
    const workflow = makeWorkflow(Array(10).fill(WORKFLOW_STATES.COMPLETE))
    const recs = [{ severity: 'error', title: 'Test', category: 'tr' }]
    const stations = [{ id: 'st42', lastCalcResult: {} }]
    const action = nextBestAction(workflow, null, stations, recs)
    expect(action.link).toContain('station=st42')
  })
})

describe('nextBestAction — priority 3: advisor WARN', () => {
  it('returns a warn action when a WARN rec exists (and no errors)', () => {
    const workflow = makeWorkflow(Array(10).fill(WORKFLOW_STATES.COMPLETE))
    const recs = [
      { severity: 'warn', title: 'TR oversized', message: 'TR is too large', category: 'tr', id: 'tr.oversized' },
    ]
    const action = nextBestAction(workflow, null, [], recs)
    expect(action).not.toBeNull()
    expect(action.kind).toBe('advisor_warn')
    expect(action.priority).toBe(3)
  })

  it('error takes priority over warn', () => {
    const workflow = makeWorkflow(Array(10).fill(WORKFLOW_STATES.COMPLETE))
    const recs = [
      { severity: 'warn', title: 'Warning' },
      { severity: 'error', title: 'Error' },
    ]
    const action = nextBestAction(workflow, null, [], recs)
    expect(action.kind).toBe('advisor_error')
  })
})

describe('nextBestAction — priority 4: review_required', () => {
  it('returns a review action when a stage is in review', () => {
    const workflow = makeWorkflow([
      WORKFLOW_STATES.COMPLETE, WORKFLOW_STATES.REVIEW_REQUIRED,
    ])
    const stations = [{ id: 'st1', status: 'engineering_review', lastCalcResult: {} }]
    const action = nextBestAction(workflow, null, stations, [])
    expect(action).not.toBeNull()
    expect(action.kind).toBe('review_required')
    expect(action.priority).toBe(4)
  })
})

describe('nextBestAction — priority 5: first not_started', () => {
  it('returns a continue action for the first non-complete stage', () => {
    const workflow = makeWorkflow([
      WORKFLOW_STATES.COMPLETE, WORKFLOW_STATES.COMPLETE, WORKFLOW_STATES.NOT_STARTED,
    ])
    const action = nextBestAction(workflow, null, [], [])
    expect(action).not.toBeNull()
    expect(action.kind).toBe('continue')
    expect(action.priority).toBe(5)
    expect(action.title).toContain('Soil')
  })

  it('handles in_progress as the first pending stage', () => {
    const workflow = makeWorkflow([
      WORKFLOW_STATES.COMPLETE, WORKFLOW_STATES.IN_PROGRESS,
    ])
    const action = nextBestAction(workflow, null, [], [])
    expect(action.kind).toBe('continue')
  })
})

describe('nextBestAction — null return', () => {
  it('returns null when all stages are complete', () => {
    const workflow = makeWorkflow(Array(10).fill(WORKFLOW_STATES.COMPLETE))
    const action = nextBestAction(workflow, null, [], [])
    expect(action).toBeNull()
  })
})

describe('nextBestAction — edge cases', () => {
  it('handles null workflow gracefully', () => {
    const action = nextBestAction(null, null, [], [])
    expect(action).toBeNull()
  })

  it('handles null stations gracefully', () => {
    const workflow = makeWorkflow([
      WORKFLOW_STATES.COMPLETE, WORKFLOW_STATES.REVIEW_REQUIRED,
    ])
    const action = nextBestAction(workflow, null, null, [])
    expect(action).not.toBeNull()
    expect(action.kind).toBe('review_required')
  })

  it('handles null advisorRecs gracefully', () => {
    const workflow = makeWorkflow(Array(10).fill(WORKFLOW_STATES.COMPLETE))
    const action = nextBestAction(workflow, null, [], null)
    expect(action).toBeNull()
  })

  it('falls back to /validation for unknown advisor category', () => {
    const workflow = makeWorkflow(Array(10).fill(WORKFLOW_STATES.COMPLETE))
    const recs = [{ severity: 'error', title: 'Test', category: 'unknown_category' }]
    const action = nextBestAction(workflow, null, [], recs)
    expect(action.link).toContain('/validation')
  })
})

describe('hasPendingWork', () => {
  it('returns true when any stage is not complete and not review_required', () => {
    const workflow = makeWorkflow([WORKFLOW_STATES.COMPLETE, WORKFLOW_STATES.NOT_STARTED])
    expect(hasPendingWork(workflow)).toBe(true)
  })

  it('returns false when all stages are complete or review_required', () => {
    const workflow = makeWorkflow([
      WORKFLOW_STATES.COMPLETE, WORKFLOW_STATES.COMPLETE, WORKFLOW_STATES.REVIEW_REQUIRED,
      WORKFLOW_STATES.COMPLETE, WORKFLOW_STATES.COMPLETE, WORKFLOW_STATES.COMPLETE,
      WORKFLOW_STATES.COMPLETE, WORKFLOW_STATES.COMPLETE, WORKFLOW_STATES.COMPLETE,
      WORKFLOW_STATES.COMPLETE,
    ])
    expect(hasPendingWork(workflow)).toBe(false)
  })

  it('returns false for null workflow', () => {
    expect(hasPendingWork(null)).toBe(false)
  })
})

describe('describeAction', () => {
  it('returns "Project is complete" for null action', () => {
    expect(describeAction(null)).toBe('Project is complete.')
  })

  it('returns a human-readable description for a blocked action', () => {
    expect(describeAction({ priority: 1, title: 'Soil is blocked' })).toBe('Blocked: Soil is blocked')
  })

  it('returns a human-readable description for an error action', () => {
    expect(describeAction({ priority: 2, title: 'R_G too high' })).toBe('Critical issue: R_G too high')
  })
})
