/**
 * Motion Timings
 *
 * Centralized duration and easing constants. Every Framer Motion variant
 * and CSS transition in the app should pull from here so that the
 * entire product speaks one motion language.
 *
 * Durations are in seconds (Framer Motion convention). When applying via
 * CSS, multiply by 1000 for ms.
 *
 * Easing presets are cubic-bezier arrays in [x1, y1, x2, y2] form.
 * They are tuned for enterprise UI: subtle, never bouncy, never linear.
 */

export const DURATION = Object.freeze({
  instant: 0.08,
  fast: 0.15,
  base: 0.2,
  slow: 0.32,
  reveal: 0.4,
})

export const EASE = Object.freeze({
  /** Standard ease for most transitions. Equivalent to ease-out. */
  standard: [0.2, 0, 0.2, 1],
  /** Enter — slightly stronger out-curve. */
  enter: [0, 0, 0.2, 1],
  /** Exit — slightly stronger in-curve. */
  exit: [0.2, 0, 1, 1],
  /** Linear — only for continuous value interpolation (e.g. number tween). */
  linear: [0, 0, 1, 1],
  /** For hover state micro-interactions. Subtle, responsive. */
  hover: [0.4, 0, 0.2, 1],
})

/** Convert a DURATION key to ms for CSS transitions. */
export const ms = (key) => Math.round(DURATION[key] * 1000)
