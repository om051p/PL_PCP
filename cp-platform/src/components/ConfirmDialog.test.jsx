/**
 * ConfirmDialog.test.jsx
 *
 * Tests for the unified confirm dialog.
 * // @vitest-environment jsdom
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, act, waitFor, cleanup } from '@testing-library/react'
import { confirm, ConfirmDialogHost, useConfirm } from './ConfirmDialog.jsx'

function Probe() {
  const ask = useConfirm()
  return (
    <div>
      <button onClick={async () => {
        const r = await ask({ title: 'Approve?', message: 'Sure?', confirmLabel: 'Yes' })
        document.title = r ? 'ok' : 'no'
      }}>ask</button>
      <button onClick={async () => {
        const r = await ask({
          title: 'Delete?',
          message: 'This cannot be undone.',
          variant: 'danger',
          confirmLabel: 'Delete',
          destructive: true,
        })
        document.title = r ? 'ok' : 'no'
      }}>ask-dangerous</button>
    </div>
  )
}

const btn = (text) => screen.getAllByText(text)[0]

describe('confirm() / ConfirmDialogHost', () => {
  afterEach(() => {
    cleanup()
    document.title = ''
  })

  it('renders nothing when not open', () => {
    render(<ConfirmDialogHost />)
    expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument()
  })

  it('opens when confirm() is called, resolves with true on OK', async () => {
    render(<><Probe /><ConfirmDialogHost /></>)
    fireEvent.click(btn('ask'))
    expect(await screen.findByTestId('confirm-dialog')).toBeInTheDocument()
    expect(screen.getByText('Approve?')).toBeInTheDocument()
    fireEvent.click(screen.getAllByTestId('confirm-ok')[0])
    await waitFor(() => expect(document.title).toBe('ok'))
  })

  it('resolves with false on Cancel', async () => {
    render(<><Probe /><ConfirmDialogHost /></>)
    fireEvent.click(btn('ask'))
    await screen.findByTestId('confirm-dialog')
    fireEvent.click(screen.getAllByTestId('confirm-cancel')[0])
    await waitFor(() => expect(document.title).toBe('no'))
    expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument()
  })

  it('resolves with false on ESC', async () => {
    render(<><Probe /><ConfirmDialogHost /></>)
    fireEvent.click(btn('ask'))
    await screen.findByTestId('confirm-dialog')
    act(() => { fireEvent.keyDown(window, { key: 'Escape' }) })
    await waitFor(() => expect(document.title).toBe('no'))
  })

  it('resolves with false on overlay click', async () => {
    render(<><Probe /><ConfirmDialogHost /></>)
    fireEvent.click(btn('ask'))
    await screen.findByTestId('confirm-dialog')
    // Click the overlay (parent of the dialog) — not the inner dialog
    const overlay = document.querySelector('.confirm-overlay')
    fireEvent.click(overlay)
    await waitFor(() => expect(document.title).toBe('no'))
  })

  it('handles the danger variant with destructive styling', async () => {
    render(<><Probe /><ConfirmDialogHost /></>)
    fireEvent.click(btn('ask-dangerous'))
    const dialog = await screen.findByTestId('confirm-dialog')
    expect(dialog).toHaveClass('confirm-dialog--danger')
    expect(screen.getByText('Delete?')).toBeInTheDocument()
    fireEvent.click(screen.getAllByTestId('confirm-cancel')[0])
    await waitFor(() => expect(document.title).toBe('no'))
  })

  it('exported confirm() function returns a Promise', async () => {
    render(<ConfirmDialogHost />)
    const p = confirm({ title: 't', message: 'm' })
    expect(p).toBeInstanceOf(Promise)
    await screen.findByTestId('confirm-dialog')
    fireEvent.click(screen.getAllByTestId('confirm-cancel')[0])
    const result = await p
    expect(result).toBe(false)
  })
})
