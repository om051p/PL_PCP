/**
 * activityLogger.test.js
 *
 * Tests for the activity logger. Uses a mock Firestore to avoid needing the
 * emulator. The mock is local; it doesn't hit the real backend.
 *
 * // @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the firebase/firestore module BEFORE importing the logger
const mockSetDoc = vi.fn().mockResolvedValue(undefined)
const mockGetDocs = vi.fn().mockResolvedValue({ docs: [] })
const mockOnSnapshot = vi.fn().mockReturnValue(() => {})
const mockServerTimestamp = vi.fn().mockReturnValue({ _isServerTimestamp: true })

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  collection: vi.fn((db, name) => ({ __type: 'collection', name })),
  doc: vi.fn((db, name, id) => ({ __type: 'doc', name, id })),
  setDoc: (...args) => mockSetDoc(...args),
  getDocs: (...args) => mockGetDocs(...args),
  query: vi.fn((...args) => ({ __type: 'query', args })),
  where: vi.fn((f, op, v) => ({ __type: 'where', f, op, v })),
  orderBy: vi.fn((f, dir) => ({ __type: 'orderBy', f, dir })),
  limit: vi.fn((n) => ({ __type: 'limit', n })),
  onSnapshot: (...args) => mockOnSnapshot(...args),
  serverTimestamp: () => mockServerTimestamp(),
  Timestamp: class {
    constructor(seconds, nanoseconds) { this.seconds = seconds; this.nanoseconds = nanoseconds }
    toDate() { return new Date(this.seconds * 1000 + this.nanoseconds / 1e6) }
    toMillis() { return this.seconds * 1000 + Math.floor(this.nanoseconds / 1e6) }
  },
}))

vi.mock('uuid', () => ({
  v4: () => 'mock-uuid-1234',
}))

// Now import the logger
const { logActivity, listRecentActivity, subscribeToActivity, buildEntry } = await import('./activityLogger.js')

beforeEach(() => {
  mockSetDoc.mockClear()
  mockGetDocs.mockClear()
  mockOnSnapshot.mockClear()
})

describe('logActivity', () => {
  it('persists an activity entry via setDoc', async () => {
    const user = { uid: 'u1', email: 'a@b.com' }
    const entry = await logActivity({
      projectId: 'p1',
      user,
      action: 'Calculation Run',
      module: 'Calculations',
      details: 'Calculated station S1',
    })
    expect(entry.id).toBe('mock-uuid-1234')
    expect(entry.userId).toBe('u1')
    expect(entry.userEmail).toBe('a@b.com')
    expect(entry.kind).toBe('info')
    expect(mockSetDoc).toHaveBeenCalledTimes(1)
  })

  it('does not throw when setDoc fails (graceful degradation)', async () => {
    mockSetDoc.mockRejectedValueOnce(new Error('Firestore offline'))
    const user = { uid: 'u1', email: 'a@b.com' }
    // Should not throw
    const entry = await logActivity({
      projectId: 'p1',
      user,
      action: 'X',
      module: 'M',
    })
    expect(entry.id).toBe('mock-uuid-1234')
  })

  it('throws if projectId is missing', async () => {
    await expect(logActivity({ action: 'X', module: 'M' }))
      .rejects.toThrow('projectId is required')
  })

  it('throws if action is missing', async () => {
    await expect(logActivity({ projectId: 'p1', module: 'M' }))
      .rejects.toThrow('action is required')
  })

  it('throws if module is missing', async () => {
    await expect(logActivity({ projectId: 'p1', action: 'X' }))
      .rejects.toThrow('module is required')
  })

  it('falls back to "anonymous" for missing user', async () => {
    const entry = await logActivity({
      projectId: 'p1',
      user: null,
      action: 'X',
      module: 'M',
    })
    expect(entry.userId).toBe('anonymous')
    expect(entry.userEmail).toBe('Anonymous')
  })

  it('accepts custom kind (info/success/warning/error)', async () => {
    const entry = await logActivity({
      projectId: 'p1', user: null, action: 'X', module: 'M', kind: 'error',
    })
    expect(entry.kind).toBe('error')
  })
})

describe('listRecentActivity', () => {
  it('returns empty array for missing projectId', async () => {
    const out = await listRecentActivity(null)
    expect(out).toEqual([])
  })

  it('queries Firestore and maps docs', async () => {
    mockGetDocs.mockResolvedValueOnce({
      docs: [
        {
          id: 'a1',
          data: () => ({
            projectId: 'p1', userId: 'u1', userEmail: 'a@b',
            action: 'X', module: 'M', details: 'd',
            metadata: {}, timestamp: '2025-01-01T00:00:00.000Z', kind: 'info',
          }),
        },
      ],
    })
    const out = await listRecentActivity('p1')
    expect(out).toHaveLength(1)
    expect(out[0].id).toBe('a1')
    expect(out[0].action).toBe('X')
  })

  it('returns empty array on error (graceful degradation)', async () => {
    mockGetDocs.mockRejectedValueOnce(new Error('Firestore down'))
    const out = await listRecentActivity('p1')
    expect(out).toEqual([])
  })
})

describe('subscribeToActivity', () => {
  it('returns noop for missing projectId', () => {
    const cb = vi.fn()
    const unsub = subscribeToActivity(null, cb)
    expect(cb).toHaveBeenCalledWith([])
    expect(typeof unsub).toBe('function')
  })

  it('returns onSnapshot unsubscribe for valid projectId', () => {
    const cb = vi.fn()
    const unsub = subscribeToActivity('p1', cb)
    expect(typeof unsub).toBe('function')
    expect(mockOnSnapshot).toHaveBeenCalled()
  })
})

describe('buildEntry', () => {
  it('returns a plain entry without persisting', () => {
    const e = buildEntry('p1', { uid: 'u1', email: 'a@b' }, 'A', 'M', 'd', 'success')
    expect(e.id).toBe('mock-uuid-1234')
    expect(e.action).toBe('A')
    expect(e.kind).toBe('success')
    expect(mockSetDoc).not.toHaveBeenCalled()
  })

  it('defaults kind to info', () => {
    const e = buildEntry('p1', null, 'A', 'M')
    expect(e.kind).toBe('info')
  })
})
