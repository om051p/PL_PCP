/**
 * ProtectionHeatMap.test.jsx
 *
 * Component tests for the 2D grid heat map.
 * // @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ProtectionHeatMap, buildHeatMapMatrix } from './ProtectionHeatMap.jsx'

const STATIONS = [
  { id: 's1', name: 'Station A' },
  { id: 's2', name: 'Station B' },
]
const SCENARIOS = [
  { id: 'sc1', label: 'Existing' },
  { id: 'sc2', label: 'Plus20' },
]
const MATRIX = [
  [1.0, 0.7],
  [0.5, 0.0],
]
const DATA = { stations: STATIONS, scenarios: SCENARIOS, matrix: MATRIX }

describe('buildHeatMapMatrix', () => {
  it('evaluates the function for each (station, scenario) pair', () => {
    const fn = (st, sc) => (st.id === 's1' && sc.id === 'sc1' ? 1 : 0)
    const out = buildHeatMapMatrix(STATIONS, SCENARIOS, fn)
    expect(out.matrix).toEqual([
      [1, 0],
      [0, 0],
    ])
  })
})

describe('<ProtectionHeatMap />', () => {
  it('renders the station and scenario headers', () => {
    render(<ProtectionHeatMap data={DATA} />)
    expect(screen.getByText('Station A')).toBeInTheDocument()
    expect(screen.getByText('Station B')).toBeInTheDocument()
    expect(screen.getByText('Existing')).toBeInTheDocument()
    expect(screen.getByText('Plus20')).toBeInTheDocument()
  })

  it('renders the cell values formatted to 2 decimals', () => {
    render(<ProtectionHeatMap data={DATA} />)
    expect(screen.getAllByText('1.00').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('0.50').length).toBeGreaterThanOrEqual(1)
  })

  it('shows the empty state when no data', () => {
    render(<ProtectionHeatMap data={null} />)
    expect(screen.getByText(/No heat map data/)).toBeInTheDocument()
  })

  it('renders the legend', () => {
    render(<ProtectionHeatMap data={DATA} />)
    expect(screen.getAllByText(/^Pass/).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/^Warn/).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/^Fail/).length).toBeGreaterThanOrEqual(1)
  })

  it('shows hover detail on cell mouseenter', () => {
    render(<ProtectionHeatMap data={DATA} />)
    const cell = screen.getAllByText('0.50')[0]
    fireEvent.mouseEnter(cell)
    // The detail panel is conditionally rendered
    expect(screen.getAllByText(/Station B/).length).toBeGreaterThan(1)
  })
})
