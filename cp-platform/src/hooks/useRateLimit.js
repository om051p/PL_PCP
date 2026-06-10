import { useState, useCallback, useRef, useEffect } from 'react'

/**
 * Client-side rate limiting hook.
 * Prevents brute-force attempts by enforcing delays between submissions.
 *
 * @param {Object} options
 * @param {number} options.maxAttempts - Maximum attempts before lockout (default: 5)
 * @param {number} options.windowMs - Time window in milliseconds (default: 300000 = 5 min)
 * @param {number} options.cooldownMs - Cooldown period after lockout (default: 60000 = 1 min)
 */
export function useRateLimit({
  maxAttempts = 5,
  windowMs = 5 * 60 * 1000,   // 5 minutes
  cooldownMs = 60 * 1000,     // 1 minute
} = {}) {
  const attempts = useRef([])
  const [isLocked, setIsLocked] = useState(false)
  const [cooldownRemaining, setCooldownRemaining] = useState(0)
  const cooldownTimer = useRef(null)

  const isRateLimited = useCallback(() => {
    const now = Date.now()

    // Clean up old attempts outside the window
    attempts.current = attempts.current.filter((t) => now - t < windowMs)

    // Check if locked out
    if (attempts.current.length >= maxAttempts) {
      const oldestAttempt = attempts.current[0]
      const lockoutEnds = oldestAttempt + cooldownMs

      if (now < lockoutEnds) {
        if (!isLocked) {
          setIsLocked(true)
          const remaining = Math.ceil((lockoutEnds - now) / 1000)
          setCooldownRemaining(remaining)

          // Update countdown
          if (cooldownTimer.current) clearInterval(cooldownTimer.current)
          cooldownTimer.current = setInterval(() => {
            const left = Math.ceil((lockoutEnds - Date.now()) / 1000)
            if (left <= 0) {
              clearInterval(cooldownTimer.current)
              setIsLocked(false)
              setCooldownRemaining(0)
              attempts.current = []
            } else {
              setCooldownRemaining(left)
            }
          }, 1000)
        }
        return true
      }

      // Lockout expired
      attempts.current = []
      setIsLocked(false)
      setCooldownRemaining(0)
    }

    return false
  }, [maxAttempts, windowMs, cooldownMs, isLocked])

  const recordAttempt = useCallback(() => {
    attempts.current.push(Date.now())
  }, [])

  const resetAttempts = useCallback(() => {
    attempts.current = []
    setIsLocked(false)
    setCooldownRemaining(0)
    if (cooldownTimer.current) clearInterval(cooldownTimer.current)
  }, [])

  // Cleanup cooldown timer on unmount
  useEffect(() => {
    return () => {
      if (cooldownTimer.current) clearInterval(cooldownTimer.current)
    }
  }, [])

  return {
    isRateLimited,
    recordAttempt,
    resetAttempts,
    isLocked,
    cooldownRemaining,
    attemptsRemaining: Math.max(0, maxAttempts - attempts.current.length),
  }
}
