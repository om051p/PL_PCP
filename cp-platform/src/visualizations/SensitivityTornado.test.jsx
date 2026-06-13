/**
 * SensitivityTornado.test.jsx
 *
 * Component tests for the SVG-based tornado diagram.
 * // @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SensitivityTornado } from './SensitivityTornado.jsx'

const SAMPLE_DATA = {
  output: { id: 'minTRVoltage', label: 'Min TR Voltage', unit: 'V' },
  base: 16.6,
  perturbationPct: 10,
  rows: [
    { id: 'soilResistivityOhmCm', label: 'Soil Resistivity (ρ)', range: 5.0, deltaLowPct: -8, deltaHighPct: 8, low: 15.27, high: 17.93 },
    { id: 'backEmfV', label: 'Back EMF (V_emf)', range: 3.0, deltaLowPct: -5, deltaHighPct: 5, low: 15.77, high: 17.43 },
    { id: 'proposedAnodes', label: 'Anodes', range: 1.5, deltaLowPct: -3, deltaHighPct: 2, low: 16.10, high: 16.93 },
  ],
}

describe('<SensitivityTornado />', () => {
  it('renders the output label and base value', () => {
    render(<SensitivityTornado data={SAMPLE_DATA} />)
    expect(screen.getAllByText(/Min TR Voltage sensitivity/).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/base = 16\.6000 V/).length).toBeGreaterThanOrEqual(1)
  })

  it('renders the perturbation percentage', () => {
    render(<SensitivityTornado data={SAMPLE_DATA} />)
    expect(screen.getAllByText(/±10% perturbation/).length).toBeGreaterThanOrEqual(1)
  })

  it('renders SVG rectangles for the bars', () => {
    const { container } = render(<SensitivityTornado data={SAMPLE_DATA} />)
    const rects = container.querySelectorAll('rect')
    expect(rects.length).toBeGreaterThanOrEqual(6)
  })

  it('renders the SVG with role=img and aria-label', () => {
    const { container } = render(<SensitivityTornado data={SAMPLE_DATA} />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('role', 'img')
    expect(svg.getAttribute('aria-label')).toContain('Tornado diagram')
    expect(svg.getAttribute('aria-label')).toContain('Min TR Voltage')
  })

  it('shows the empty state when no data', () => {
    render(<SensitivityTornado data={null} />)
    expect(screen.getByText(/No sensitivity data/)).toBeInTheDocument()
  })

  it('shows the empty state when rows are empty', () => {
    render(<SensitivityTornado data={{ ...SAMPLE_DATA, rows: [] }} />)
    expect(screen.getAllByText(/No sensitivity data/).length).toBeGreaterThanOrEqual(1)
  })

  it('renders a legend explaining the colors', () => {
    render(<SensitivityTornado data={SAMPLE_DATA} />)
    expect(screen.getAllByText(/output decreases/).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/output increases/).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/most influential input/).length).toBeGreaterThanOrEqual(1)
  })
})
