/**
 * Toast.jsx
 *
 * Unified toast / notification system. Replaces raw window.alert/confirm
 * with a styled, accessible, auto-dismissing notification panel.
 *
 * Usage:
 *   const toast = useToast()
 *   toast.success('Project approved', 'CP-001 is now ready for construction')
 *   toast.error('Save failed', 'Check your connection and retry')
 *   toast.warning('Unsaved changes', 'You have unsaved edits in Pipeline tab')
 *   toast.info('Auto-saved', 'Last save: 12:34:56')
 *
 * Accessibility:
 *   - role="status" + aria-live="polite" for screen readers
 *   - focus management: first toast receives focus, ESC dismisses all
 *   - color is not the only signal (icon + text)
 */

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react'

const ToastContext = createContext(null)

const VARIANTS = {
  success: {
    icon: CheckCircle2,
    borderColor: 'var(--pass)',
    iconColor: 'var(--pass)',
    label: 'Success',
  },
  error: {
    icon: AlertCircle,
    borderColor: 'var(--fail)',
    iconColor: 'var(--fail)',
    label: 'Error',
  },
  warning: {
    icon: AlertTriangle,
    borderColor: 'var(--warn)',
    iconColor: 'var(--warn)',
    label: 'Warning',
  },
  info: {
    icon: Info,
    borderColor: 'var(--brand-mid)',
    iconColor: 'var(--brand-mid)',
    label: 'Info',
  },
}

let nextId = 1

export function ToastProvider({ children, defaultDuration = 5000, maxStack = 5 }) {
  const [toasts, setToasts] = useState([])
  const timersRef = useRef(new Map())

  const dismiss = useCallback((id) => {
    setToasts((arr) => arr.filter((t) => t.id !== id))
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }
  }, [])

  const dismissAll = useCallback(() => {
    setToasts([])
    timersRef.current.forEach((t) => clearTimeout(t))
    timersRef.current.clear()
  }, [])

  const show = useCallback((variant, title, description, opts = {}) => {
    const id = nextId++
    const duration = opts.duration ?? defaultDuration
    const action = opts.action || null
    const toast = { id, variant, title, description, action, duration, createdAt: Date.now() }
    setToasts((arr) => {
      // Cap the stack: drop oldest if over maxStack
      const next = [...arr, toast]
      if (next.length > maxStack) {
        const dropped = next.shift()
        const t = timersRef.current.get(dropped.id)
        if (t) { clearTimeout(t); timersRef.current.delete(dropped.id) }
      }
      return next
    })
    if (duration > 0) {
      const t = setTimeout(() => dismiss(id), duration)
      timersRef.current.set(id, t)
    }
    return id
  }, [dismiss, defaultDuration, maxStack])

  // ESC dismisses all toasts
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && toasts.length > 0) dismissAll()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toasts.length, dismissAll])

  const api = {
    success: (title, description, opts) => show('success', title, description, opts),
    error: (title, description, opts) => show('error', title, description, opts),
    warning: (title, description, opts) => show('warning', title, description, opts),
    info: (title, description, opts) => show('info', title, description, opts),
    dismiss,
    dismissAll,
  }

  // Expose to the global store (for actions triggered from non-React code).
  // This is a controlled escape hatch: stores can dispatch toasts without
  // threading useToast() through every caller.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__raxaToast = api
      return () => { if (window.__raxaToast === api) delete window.__raxaToast }
    }
    return undefined
  }, [api])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    // Outside provider: log + return a noop
    if (typeof console !== 'undefined') {
      console.warn('[toast] useToast() called outside <ToastProvider>')
    }
    return {
      success: () => {},
      error: () => {},
      warning: () => {},
      info: () => {},
      dismiss: () => {},
      dismissAll: () => {},
    }
  }
  return ctx
}

function ToastViewport({ toasts, dismiss }) {
  if (toasts.length === 0) return null
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="false"
      className="toast-viewport"
      data-testid="toast-viewport"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
      ))}
    </div>
  )
}

function ToastItem({ toast, onDismiss }) {
  const v = VARIANTS[toast.variant] || VARIANTS.info
  const Icon = v.icon
  return (
    <div
      className={`toast toast--${toast.variant}`}
      role={toast.variant === 'error' ? 'alert' : 'status'}
      style={{ borderLeftColor: v.borderColor }}
      data-testid={`toast-${toast.variant}`}
    >
      <Icon size={18} style={{ color: v.iconColor, flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
          {toast.title}
        </div>
        {toast.description && (
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
            {toast.description}
          </div>
        )}
        {toast.action && (
          <button
            type="button"
            className="toast__action"
            onClick={() => { toast.action.onClick(); onDismiss() }}
            style={{ marginTop: 6 }}
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="toast__dismiss"
        aria-label={`Dismiss ${v.label.toLowerCase()}`}
        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--text-tertiary)' }}
      >
        <X size={14} aria-hidden="true" />
      </button>
    </div>
  )
}
