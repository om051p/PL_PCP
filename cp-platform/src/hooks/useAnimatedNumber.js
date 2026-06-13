import { useEffect, useRef, useState } from 'react'
import { DURATION } from '../motion/timings.js'
import { usePrefersReducedMotion } from './usePrefersReducedMotion.js'

/**
 * useAnimatedNumber
 *
 * Smoothly interpolates a numeric value over a configurable duration.
 * Used by KPI cards, validation meters, and any other component that
 * displays a number which changes as a result of recalculation.
 *
 * Behavior:
 * - On every change of `value`, animates from the previously displayed
 *   value to the new `value` over `duration` seconds.
 * - Uses requestAnimationFrame with an ease-out curve.
 * - Respects prefers-reduced-motion: snaps to the target value
 *   instantly with no interpolation.
 * - Returns the currently displayed number (rounded to `precision`).
 *
 * @param {number} value - target value
 * @param {object} [opts]
 * @param {number} [opts.duration=DURATION.reveal] - seconds
 * @param {number} [opts.precision=2] - decimal places
 * @returns {number}
 */
export function useAnimatedNumber(value, { duration = DURATION.reveal, precision = 2 } = {}) {
  const reduced = usePrefersReducedMotion()
  const [display, setDisplay] = useState(value)
  const rafRef = useRef(null)
  const animationRef = useRef({ from: value, to: value, start: 0 })

  useEffect(() => {
    if (value == null || Number.isNaN(value)) {
      queueMicrotask(() => setDisplay(value))
      return undefined
    }

    if (reduced) {
      animationRef.current = { from: value, to: value, start: 0 }
      queueMicrotask(() => setDisplay(Number(value.toFixed(precision))))
      return undefined
    }

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }

    const from = display
    animationRef.current = { from, to: value, start: performance.now() }
    const { to, start } = animationRef.current

    const tick = (now) => {
      const elapsed = (now - start) / 1000
      const t = Math.min(1, elapsed / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      const current = from + (to - from) * eased
      setDisplay(Number(current.toFixed(precision)))
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        rafRef.current = null
      }
    }

    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
    // `display` is intentionally read (not depended on) so the animation
    // chains from the current displayed value when `value` changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration, precision, reduced])

  return display
}
