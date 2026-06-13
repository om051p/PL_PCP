import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { useEffect, useId } from 'react'
import { DURATION, EASE } from '../../../motion/timings'
import { usePrefersReducedMotion } from '../../../hooks/usePrefersReducedMotion'

/**
 * DonutChart
 *
 * Animated donut showing the proportion of a value (e.g. protected
 * length). Single arc fills from 0 to `percent` over `DURATION.reveal`.
 *
 * Pure display — `percent` is passed in; the chart does no math.
 */
export function DonutChart({
  percent = 0,
  size = 140,
  thickness = 18,
  label,
  caption,
  tone = 'ok',
  ariaLabel,
}) {
  const id = useId()
  const reduced = usePrefersReducedMotion()
  const clamped = Math.max(0, Math.min(100, Number.isFinite(percent) ? percent : 0))
  const radius = (size - thickness) / 2
  const cx = size / 2
  const cy = size / 2
  const circumference = 2 * Math.PI * radius

  const offset = useMotionValue(reduced ? circumference : circumference)
  const offsetStr = useTransform(offset, (v) => v.toFixed(3))

  useEffect(() => {
    const target = circumference * (1 - clamped / 100)
    if (reduced) {
      offset.set(target)
      return undefined
    }
    const controls = animate(offset, target, {
      duration: DURATION.reveal,
      ease: EASE.standard,
    })
    return () => controls.stop()
  }, [clamped, circumference, offset, reduced])

  const colors = {
    ok: '#10b981',
    warn: '#f59e0b',
    fail: '#ef4444',
    draft: '#3b82f6',
    neutral: '#71717a',
  }
  const color = colors[tone] || colors.neutral

  return (
    <div className={`viz-side-donut is-${tone}`} role="img" aria-label={ariaLabel || `${label || 'Donut'}: ${clamped.toFixed(0)} percent`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="var(--border, #27272a)"
          strokeWidth={thickness}
        />
        <motion.circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={circumference}
          style={{
            strokeDashoffset: offsetStr,
            transform: 'rotate(-90deg)',
            transformOrigin: `${cx}px ${cy}px`,
          }}
        />
      </svg>
      <div className="viz-side-donut-center">
        <div className="viz-side-donut-value">{clamped.toFixed(0)}%</div>
        {label && <div className="viz-side-donut-label">{label}</div>}
        {caption && <div className="viz-side-donut-caption">{caption}</div>}
      </div>
    </div>
  )
}
