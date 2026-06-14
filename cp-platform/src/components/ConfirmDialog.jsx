/* eslint-disable react-refresh/only-export-components */
/**
 * ConfirmDialog.jsx
 *
 * Reusable confirmation dialog component. Replaces window.confirm() with
 * a styled, accessible, keyboard-navigable dialog. Supports three variants
 * (info, warning, danger) and integrates with the toast system for
 * "undo" actions.
 *
 * Usage:
 *   const ok = await confirm({
 *     title: 'Approve design?',
 *     message: 'This locks the design for construction.',
 *     variant: 'warning',
 *     confirmLabel: 'Approve',
 *     cancelLabel: 'Cancel',
 *   })
 *   if (ok) { ... }
 *   if (ok) { ... }
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { AlertCircle, AlertTriangle, Info, X } from 'lucide-react'
import { useToast } from './Toast.jsx'

const VARIANT_ICONS = {
  info: Info,
  warning: AlertTriangle,
  danger: AlertCircle,
}

let nextConfirmId = 1

const confirmStore = {
  state: { open: false, options: null, resolve: null, id: 0 },
  listeners: new Set(),
  setState(updater) {
    const nextState = typeof updater === 'function' ? updater(this.state) : updater
    this.state = { ...this.state, ...nextState }
    this.listeners.forEach((l) => l())
  },
  subscribe(l) { this.listeners.add(l); return () => this.listeners.delete(l) },
  getState() { return this.state },
}

export function confirm(options) {
  return new Promise((resolve) => {
    const id = nextConfirmId++
    confirmStore.setState({ open: true, options, resolve, id })
  })
}

function useConfirmState() {
  const [s, setS] = useState(confirmStore.getState())
  useEffect(() => confirmStore.subscribe(() => setS(confirmStore.getState())), [])
  return s
}

export function ConfirmDialogHost() {
  const { open, options, resolve, id } = useConfirmState()
  const dialogRef = useRef(null)
  const confirmBtnRef = useRef(null)
  const toast = useToast()

  const handleClose = useCallback((value) => {
    confirmStore.setState({ open: false, options: null, resolve: null })
    if (resolve) resolve(value)
  }, [resolve])

  useEffect(() => {
    if (!open) return
    // Focus the confirm button on open
    setTimeout(() => confirmBtnRef.current?.focus(), 0)
    // ESC to cancel
    const onKey = (e) => {
      if (e.key === 'Escape') handleClose(false)
      else if (e.key === 'Enter' && document.activeElement === confirmBtnRef.current) {
        e.preventDefault()
        handleClose(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, handleClose])

  if (!open || !options) return null

  const variant = options.variant || 'info'
  const Icon = VARIANT_ICONS[variant] || Info
  const confirmLabel = options.confirmLabel || 'Confirm'
  const cancelLabel = options.cancelLabel || 'Cancel'
  const destructive = options.destructive || false

  return (
    <div
      className="confirm-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(false) }}
    >
      <div
        ref={dialogRef}
        className={`confirm-dialog confirm-dialog--${variant}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`confirm-title-${id}`}
        aria-describedby={`confirm-message-${id}`}
        data-testid="confirm-dialog"
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <Icon size={22} className="confirm-dialog__icon" aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 id={`confirm-title-${id}`} className="confirm-dialog__title">
              {options.title}
            </h2>
            <p id={`confirm-message-${id}`} className="confirm-dialog__message">
              {options.message}
            </p>
            {options.secondaryMessage && (
              <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: '0 0 12px' }}>
                {options.secondaryMessage}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => handleClose(false)}
            className="toast__dismiss"
            aria-label="Close"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 2 }}
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
        <div className="confirm-dialog__actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => handleClose(false)}
            data-testid="confirm-cancel"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            className={`btn ${destructive ? 'btn-danger' : 'btn-primary'}`}
            onClick={() => handleClose(true)}
            data-testid="confirm-ok"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * useConfirm hook — convenience wrapper
 */
export function useConfirm() {
  return confirm
}

// Note: when confirm() is called, host must be mounted in the tree.
// ConfirmDialogHost is exported separately so it can be mounted in main.jsx
// or App.jsx. Toast import here is for type hints only.
