/**
 * useSessionTimeout Hook
 *
 * Tracks user activity and auto-logs out after idle period.
 * Shows a warning dialog before timeout with option to stay signed in.
 *
 * Configuration:
 * - TIMEOUT_MS: Total idle time before auto-logout (default: 30 minutes)
 * - WARNING_MS: Time before timeout to show warning (default: 5 minutes before)
 * - ACTIVITY_EVENTS: Events that reset the idle timer
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuthStore } from '../store/authStore.js'

/** Idle timeout: 30 minutes */
const TIMEOUT_MS = 30 * 60 * 1000

/** Show warning 5 minutes before timeout */
const WARNING_MS = 5 * 60 * 1000

/** Events that count as user activity */
const ACTIVITY_EVENTS = [
  'mousedown',
  'mousemove',
  'keydown',
  'scroll',
  'touchstart',
  'click',
]

/**
 * Custom hook for session timeout with idle detection.
 *
 * @returns {{ showWarning: boolean, timeRemaining: number, staySignedIn: () => void }}
 */
export function useSessionTimeout() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const sessionStart = useAuthStore((s) => s.sessionStart)

  const [showWarning, setShowWarning] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(TIMEOUT_MS)

  const lastActivityRef = useRef(null)
  const warningTimerRef = useRef(null)
  const logoutTimerRef = useRef(null)
  const intervalRef = useRef(null)

  // Reset the idle timer
  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now()

    // Clear existing timers
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current)
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current)
    if (intervalRef.current) clearInterval(intervalRef.current)

    // Don't set timers if no user
    if (!user) return

    // Show warning 5 minutes before timeout
    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true)

      // Update remaining time every second
      intervalRef.current = setInterval(() => {
        const elapsed = Date.now() - lastActivityRef.current
        const remaining = Math.max(0, TIMEOUT_MS - elapsed)
        setTimeRemaining(remaining)

        if (remaining <= 0) {
          clearInterval(intervalRef.current)
        }
      }, 1000)
    }, TIMEOUT_MS - WARNING_MS)

    // Auto-logout at timeout
    logoutTimerRef.current = setTimeout(() => {
      setShowWarning(false)
      logout().catch(() => {})
    }, TIMEOUT_MS)
  }, [user, logout])

  // Stay signed in — reset timer and hide warning
  const staySignedIn = useCallback(() => {
    setShowWarning(false)
    resetTimer()
  }, [resetTimer])

  // Use ref for showWarning to avoid re-attaching listeners on state change
  const showWarningRef = useRef(showWarning)
  useEffect(() => {
    showWarningRef.current = showWarning
  }, [showWarning])

  // Handle activity events
  useEffect(() => {
    if (!user) return

    const handleActivity = () => {
      // If warning is showing, don't reset timer (user must click "Stay signed in")
      if (!showWarningRef.current) {
        resetTimer()
      }
    }

    // Attach activity listeners
    ACTIVITY_EVENTS.forEach((event) => {
      document.addEventListener(event, handleActivity, { passive: true })
    })

    // Start the timer
    resetTimer()

    return () => {
      // Clean up listeners
      ACTIVITY_EVENTS.forEach((event) => {
        document.removeEventListener(event, handleActivity)
      })

      // Clean up timers
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current)
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [user, resetTimer])

  // Reset timer when user logs in
  useEffect(() => {
    if (user) {
      resetTimer()
    }
  }, [user, resetTimer])

  // Max Session Lifespan Check (12 hours limit)
  useEffect(() => {
    if (!user || !sessionStart) return

    const checkMaxSession = () => {
      const elapsed = Date.now() - sessionStart
      if (elapsed >= 12 * 60 * 60 * 1000) {
        logout({ expired: true }).catch(() => {})
      }
    }

    // Check every 60 seconds
    const interval = setInterval(checkMaxSession, 60000)
    checkMaxSession() // check immediately

    return () => clearInterval(interval)
  }, [user, sessionStart, logout])

  return { showWarning, timeRemaining, staySignedIn }
}
