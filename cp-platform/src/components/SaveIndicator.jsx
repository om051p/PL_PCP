/* eslint-disable react-refresh/only-export-components */
/**
 * SaveIndicator.jsx
 *
 * Floating save-status indicator. Shows in the bottom-right corner:
 *   - 'idle'    : hidden or low-profile
 *   - 'saving'  : animated blue dot, "Saving..."
 *   - 'saved'   : green dot, "Saved · 12:34:56"
 *   - 'error'   : red dot, "Save failed"
 *
 * Designed to be a single global instance, mounted at app root.
 */

import { useState, useEffect } from 'react'
import { useToast } from './Toast.jsx'

let listener = null

export function notifySaveStatus(status, detail = '') {
  if (listener) listener(status, detail)
}

export function SaveIndicator() {
  const [status, setStatus] = useState('idle') // 'idle' | 'saving' | 'saved' | 'error'
  const [detail, setDetail] = useState('')
  const [visible, setVisible] = useState(false)
  const toast = useToast()

  useEffect(() => {
    listener = (next, det) => {
      setStatus(next)
      setDetail(det)
      setVisible(next !== 'idle')
      if (next === 'saved' && det) {
        // Don't spam toasts on every save
      } else if (next === 'error' && det) {
        toast.error('Save failed', det)
      }
    }
    return () => { listener = null }
  }, [toast])

  if (!visible) return null
  const label = {
    saving: 'Saving…',
    saved: detail ? `Saved · ${detail}` : 'Saved',
    error: detail ? `Save failed · ${detail}` : 'Save failed',
  }[status] || ''
  return (
    <div
      className={`save-indicator save-indicator--${status}`}
      role="status"
      aria-live="polite"
      data-testid="save-indicator"
    >
      <span className="save-indicator__dot" aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}
