import { motion } from 'framer-motion'
import { DURATION, EASE } from '../../../motion/timings'
import { useAnimatedNumber } from '../../../hooks/useAnimatedNumber'
import { cardHoverVariants } from '../../../motion/variants'

/**
 * KpiCard
 *
 * A small animated KPI card. The numeric value tweens from the previous
 * displayed value to the new one over `duration` (default 300 ms) using
 * `useAnimatedNumber`. Subtle scale pulse on update.
 *
 * All values are passed in as plain numbers — no calculations here.
 */
export function KpiCard({
  label,
  value,
  unit,
  precision = 2,
  format = (v) => v.toFixed(precision),
  hint,
  tone = 'neutral',
  size = 'md',
}) {
  const isNum = typeof value === 'number' && Number.isFinite(value)
  const display = useAnimatedNumber(isNum ? value : null, { precision })
  const text = isNum ? format(display) : value ?? '—'
  return (
    <motion.div
      className={`viz-side-kpi is-${tone} is-${size}`}
      variants={cardHoverVariants}
      initial="rest"
      whileHover="hover"
    >
      <div className="viz-side-kpi-label">{label}</div>
      <div className="viz-side-kpi-value">
        <span className="viz-side-kpi-num">{text}</span>
        {unit && <span className="viz-side-kpi-unit">{unit}</span>}
      </div>
      {hint && <div className="viz-side-kpi-hint">{hint}</div>}
    </motion.div>
  )
}

/**
 * KpiGrid — responsive grid wrapper for KpiCards.
 */
export function KpiGrid({ children, min = 140 }) {
  return (
    <div className="viz-side-kpi-grid" style={{ '--kpi-min': `${min}px` }}>
      {children}
    </div>
  )
}
