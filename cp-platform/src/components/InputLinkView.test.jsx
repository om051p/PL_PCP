/**
 * InputLinkView.test.jsx
 *
 * Component tests for the input dependency view.
 * // @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { InputLinkView } from './InputLinkView.jsx'

describe('<InputLinkView />', () => {
  it('renders field view by default', () => {
    render(<InputLinkView fieldName="soilResistivityOhmCm" />)
    expect(screen.getByText(/Soil Resistivity/)).toBeInTheDocument()
    expect(screen.getByText(/Downstream Consumers/)).toBeInTheDocument()
  })

  it('renders the consumer count', () => {
    render(<InputLinkView fieldName="soilResistivityOhmCm" />)
    expect(screen.getAllByText(/Downstream Consumers \(8\)/).length).toBeGreaterThanOrEqual(1)
  })

  it('shows the standard reference', () => {
    render(<InputLinkView fieldName="soilResistivityOhmCm" />)
    expect(screen.getAllByText(/NACE SP0169/).length).toBeGreaterThanOrEqual(1)
  })

  it('renders the validation rules section', () => {
    render(<InputLinkView fieldName="soilResistivityOhmCm" />)
    expect(screen.getAllByText(/Validation rules/).length).toBeGreaterThanOrEqual(1)
  })

  it('renders module view when mode=module', () => {
    render(<InputLinkView fieldName="Groundbed Design" mode="module" />)
    expect(screen.getByText(/Inputs consumed by Groundbed Design/)).toBeInTheDocument()
  })

  it('renders audit view when mode=audit with KPI tiles', () => {
    render(<InputLinkView fieldName="audit" mode="audit" />)
    expect(screen.getByText(/Inputs Audited/)).toBeInTheDocument()
    expect(screen.getByText(/Consumer Links/)).toBeInTheDocument()
    expect(screen.getByText(/Downstream Modules/)).toBeInTheDocument()
    expect(screen.getByText(/Coverage/)).toBeInTheDocument()
  })

  it('shows unknown-field message for bad field name', () => {
    render(<InputLinkView fieldName="nonexistent" />)
    expect(screen.getByText(/Unknown input/)).toBeInTheDocument()
  })
})
