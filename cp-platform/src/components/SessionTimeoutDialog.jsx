/**
 * SessionTimeoutDialog
 *
 * Modal dialog shown when user is about to be logged out due to inactivity.
 * Displays countdown timer and option to stay signed in.
 */

import { AlertCircle, Clock } from 'lucide-react'

/**
 * Format milliseconds to MM:SS display.
 *
 * @param {number} ms - Milliseconds remaining
 * @returns {string} Formatted time string
 */
function formatTimeRemaining(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

/**
 * Session timeout warning dialog.
 *
 * @param {Object} props
 * @param {boolean} props.show - Whether to show the dialog
 * @param {number} props.timeRemaining - Milliseconds until auto-logout
 * @param {Function} props.onStaySignedIn - Callback to dismiss and stay logged in
 */
export function SessionTimeoutDialog({ show, timeRemaining, onStaySignedIn }) {
  if (!show) return null

  const isUrgent = timeRemaining < 60 * 1000 // Less than 1 minute

  return (
    <div className="dialog-overlay" role="dialog" aria-modal="true" aria-label="Session timeout warning">
      <div className="dialog session-timeout-dialog">
        <div className="dialog-title">
          <span className="dialog-title-icon">
            {isUrgent ? (
              <AlertCircle size={20} color="var(--fail)" />
            ) : (
              <Clock size={20} color="var(--warn)" />
            )}
          </span>
          Session Expiring
        </div>

        <p className="dialog-message">
          Your session will expire due to inactivity.
        </p>

        <div className="session-timeout-timer">
          <span className={`session-timeout-countdown ${isUrgent ? 'urgent' : ''}`}>
            {formatTimeRemaining(timeRemaining)}
          </span>
          <span className="session-timeout-label">remaining</span>
        </div>

        <div className="dialog-actions">
          <button className="btn btn-primary" onClick={onStaySignedIn}>
            Stay Signed In
          </button>
        </div>
      </div>
    </div>
  )
}
