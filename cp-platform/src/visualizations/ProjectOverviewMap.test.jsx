/**
 * ProjectOverviewMap.test.jsx
 *
 * Component tests for the multi-project rollup (geo + grid views).
 * // @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ProjectOverviewMap } from './ProjectOverviewMap.jsx'

const PROJECTS = [
  { id: 'p1', name: 'Project Alpha', number: 'P-001', client: 'Aramco', status: 'in_review', standard: 'NACE' },
  { id: 'p2', name: 'Project Beta', number: 'P-002', client: 'Shell', status: 'approved', standard: 'SAES' },
  { id: 'p3', name: 'Project Gamma', number: 'P-003', client: 'PDO', status: 'draft', standard: 'ISO' },
]

const PROJECTS_WITH_GEO = [
  { id: 'p1', name: 'Project Alpha', status: 'in_review', location: { lat: 26.3, lng: 50.1 } },
  { id: 'p2', name: 'Project Beta', status: 'approved', location: { lat: 24.7, lng: 46.7 } },
]

describe('<ProjectOverviewMap />', () => {
  it('renders empty state when no projects', () => {
    render(<ProjectOverviewMap projects={[]} />)
    expect(screen.getByText(/No projects to display/)).toBeInTheDocument()
  })

  it('renders grid view when no projects have lat/lng', () => {
    render(<ProjectOverviewMap projects={PROJECTS} />)
    expect(screen.getByText(/Grid view/)).toBeInTheDocument()
    expect(screen.getByText('Project Alpha')).toBeInTheDocument()
    expect(screen.getByText('Project Beta')).toBeInTheDocument()
    expect(screen.getByText('Project Gamma')).toBeInTheDocument()
  })

  it('renders geo view when at least one project has lat/lng', () => {
    render(<ProjectOverviewMap projects={PROJECTS_WITH_GEO} />)
    expect(screen.getByText(/Geo view/)).toBeInTheDocument()
    const svg = document.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('invokes onProjectClick when a card is clicked', () => {
    const onClick = vi.fn()
    render(<ProjectOverviewMap projects={PROJECTS} onProjectClick={onClick} />)
    // Use getAllByTestId because React StrictMode may double-render in test env
    const cards = screen.getAllByTestId('project-card-p1')
    fireEvent.click(cards[0])
    expect(onClick).toHaveBeenCalled()
    const call = onClick.mock.calls[0][0]
    expect(call.id).toBe('p1')
  })

  it('renders project number', () => {
    render(<ProjectOverviewMap projects={PROJECTS} />)
    expect(screen.getAllByText('P-001').length).toBeGreaterThanOrEqual(1)
  })

  it('renders client names', () => {
    render(<ProjectOverviewMap projects={PROJECTS} />)
    expect(screen.getAllByText('Aramco').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Shell').length).toBeGreaterThanOrEqual(1)
  })
})
