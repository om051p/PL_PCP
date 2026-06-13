/**
 * KPITrendWidget.test.jsx
 *
 * Component tests for the trend chart + extractTrendData helper.
 * // @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { KPITrendWidget, extractTrendData } from './KPITrendWidget.jsx'

const PROJECT = {
  id: 'p1',
  stations: [
    { id: 's1', name: 'S1', pipelineSegments: [{ lengthM: 100 }], groundbed: { type: 'deepwell' }, tr: { ratedVoltage: 30 } },
    { id: 's2', name: 'S2', pipelineSegments: [{ lengthM: 200 }], groundbed: { type: 'shallow' }, tr: { ratedVoltage: 20 } },
  ],
  revisions: [
    {
      id: 'r1', revNumber: 'Rev A', createdAt: '2025-01-01T00:00:00.000Z',
      snapshot: {
        stations: [
          { id: 's1', pipelineSegments: [{ lengthM: 50 }], groundbed: { type: 'deepwell' }, tr: { ratedVoltage: 30 } },
        ],
        revisions: [],
      },
    },
    {
      id: 'r2', revNumber: 'Rev B', createdAt: '2025-02-01T00:00:00.000Z',
      snapshot: {
        stations: [
          { id: 's1', pipelineSegments: [{ lengthM: 100 }], groundbed: { type: 'deepwell' }, tr: { ratedVoltage: 30 } },
          { id: 's2', pipelineSegments: [{ lengthM: 200 }], groundbed: { type: 'shallow' }, tr: { ratedVoltage: 20 } },
        ],
        revisions: [],
      },
    },
  ],
}

describe('extractTrendData', () => {
  it('returns empty array for null project', () => {
    expect(extractTrendData(null, 'totalStations')).toEqual([])
  })

  it('returns the current state if no revisions', () => {
    const out = extractTrendData({ ...PROJECT, revisions: [] }, 'totalStations')
    expect(out).toHaveLength(1)
    expect(out[0].value).toBe(2)
    expect(out[0].label).toBe('Current')
  })

  it('walks revisions newest-to-oldest, capped by max', () => {
    const out = extractTrendData(PROJECT, 'totalStations', 10)
    expect(out.length).toBe(3) // current + 2 revisions
    // Should be sorted ascending by `t`
    expect(out[0].t).toBeLessThan(out[1].t)
    expect(out[1].t).toBeLessThan(out[2].t)
  })

  it('current state shows the latest aggregate', () => {
    const out = extractTrendData(PROJECT, 'totalPipelineM')
    // Last point = current = 100 + 200 = 300
    expect(out[out.length - 1].value).toBe(300)
  })

  it('computes groundbedCount from stations with groundbed', () => {
    const out = extractTrendData(PROJECT, 'groundbedCount')
    expect(out[out.length - 1].value).toBe(2)
  })

  it('computes trCount from stations with tr', () => {
    const out = extractTrendData(PROJECT, 'trCount')
    expect(out[out.length - 1].value).toBe(2)
  })

  it('caps output to `max` points', () => {
    const out = extractTrendData(PROJECT, 'totalStations', 2)
    expect(out).toHaveLength(2)
  })
})

describe('<KPITrendWidget />', () => {
  const DATA = [
    { t: 1700000000000, value: 5, label: 'Rev A' },
    { t: 1700100000000, value: 7, label: 'Rev B' },
    { t: 1700200000000, value: 6, label: 'Current' },
  ]

  it('renders the label', () => {
    render(<KPITrendWidget data={DATA} label="Stations" />)
    expect(screen.getByText('Stations')).toBeInTheDocument()
  })

  it('renders the current value (last point)', () => {
    render(<KPITrendWidget data={DATA} label="Stations" />)
    // Recharts renders the value in a tooltip too, so use getAllByText
    const matches = screen.getAllByText('6.00')
    expect(matches.length).toBeGreaterThanOrEqual(1)
  })

  it('renders the unit suffix on the current value', () => {
    render(<KPITrendWidget data={DATA} label="Pipeline" unit="m" />)
    expect(screen.getByText('m')).toBeInTheDocument()
  })

  it('renders empty state for empty data', () => {
    render(<KPITrendWidget data={[]} label="Stations" />)
    expect(screen.getByText(/No trend data/)).toBeInTheDocument()
  })

  it('uses currentValue override if provided', () => {
    render(<KPITrendWidget data={DATA} label="X" currentValue={42} />)
    const matches = screen.getAllByText('42.00')
    expect(matches.length).toBeGreaterThanOrEqual(1)
  })
})
