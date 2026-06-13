/**
 * a11y.test.jsx
 *
 * Accessibility tests for the new visualization components.
 * Uses jest-axe to enforce WCAG 2.1 AA baseline.
 *
 * // @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { SensitivityTornado } from './SensitivityTornado.jsx'
import { KPITrendWidget, extractTrendData } from './KPITrendWidget.jsx'
import { ProtectionHeatMap, buildHeatMapMatrix } from './ProtectionHeatMap.jsx'
import { ProjectOverviewMap } from './ProjectOverviewMap.jsx'
import { InputLinkView } from '../components/InputLinkView.jsx'

expect.extend(toHaveNoViolations)

const TOR_DATA = {
  output: { id: 'minTRVoltage', label: 'Min TR Voltage', unit: 'V' },
  base: 16.6,
  perturbationPct: 10,
  rows: [
    { id: 'soilResistivityOhmCm', label: 'Soil', range: 5, deltaLowPct: -8, deltaHighPct: 8 },
    { id: 'backEmfV', label: 'Back EMF', range: 3, deltaLowPct: -5, deltaHighPct: 5 },
  ],
}

const HM_DATA = {
  stations: [{ id: 's1', name: 'S1' }, { id: 's2', name: 'S2' }],
  scenarios: [{ id: 'sc1', label: 'Existing' }],
  matrix: [[1.0], [0.5]],
}

const PROJECTS = [
  { id: 'p1', name: 'Project Alpha', number: 'P-001', client: 'Aramco', status: 'in_review', standard: 'NACE' },
  { id: 'p2', name: 'Project Beta', status: 'approved' },
]

describe('a11y: SVG visualizations have role=img + aria-label', () => {
  it('SensitivityTornado is announced as a tornado diagram', async () => {
    const { container } = render(<SensitivityTornado data={TOR_DATA} />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('role', 'img')
    expect(svg.getAttribute('aria-label')).toContain('Tornado diagram')
    expect(svg.getAttribute('aria-label')).toContain('Min TR Voltage')
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('ProjectOverviewMap (grid view) passes axe', async () => {
    const { container } = render(<ProjectOverviewMap projects={PROJECTS} />)
    // Grid view uses card divs, not an svg. Just run axe.
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('ProjectOverviewMap (geo view) is announced as a project map', async () => {
    const geoProjects = PROJECTS.map((p) => ({ ...p, location: { lat: 26.3, lng: 50.1 } }))
    const { container } = render(<ProjectOverviewMap projects={geoProjects} />)
    // The map svg is the one with aria-label "Project overview map ..."
    const mapSvg = container.querySelector('svg[aria-label*="Project overview map"]')
    expect(mapSvg).toBeTruthy()
    expect(mapSvg).toHaveAttribute('role', 'img')
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})

describe('a11y: tables have proper headers', () => {
  it('ProtectionHeatMap uses <th> for headers', async () => {
    const { container } = render(<ProtectionHeatMap data={HM_DATA} />)
    const ths = container.querySelectorAll('th')
    expect(ths.length).toBeGreaterThan(0)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})

describe('a11y: lists and sections are well-structured', () => {
  it('InputLinkView field view passes axe', async () => {
    const { container } = render(<InputLinkView fieldName="soilResistivityOhmCm" />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('InputLinkView audit view passes axe', async () => {
    const { container } = render(<InputLinkView fieldName="audit" mode="audit" />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})

describe('a11y: trend widgets have proper labelling', () => {
  const DATA = [
    { t: 1700000000000, value: 5, label: 'Rev A' },
    { t: 1700100000000, value: 6, label: 'Current' },
  ]
  it('KPITrendWidget passes axe', async () => {
    const { container } = render(<KPITrendWidget data={DATA} label="Stations" />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
