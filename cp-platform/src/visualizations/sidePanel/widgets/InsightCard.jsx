import { motion } from 'framer-motion'
import { Info, AlertTriangle, CheckCircle2, TrendingUp } from 'lucide-react'
import { DURATION, EASE } from '../../../motion/timings'

/**
 * InsightCard
 *
 * A short engineering insight with an icon and tone.
 * No math here — text is composed upstream.
 */
const ICONS = {
  info: Info,
  warn: AlertTriangle,
  ok: CheckCircle2,
  trend: TrendingUp,
}

export function InsightCard({ tone = 'info', icon, children }) {
  const Icon = icon || ICONS[tone] || ICONS.info
  return (
    <motion.div
      className={`viz-side-insight is-${tone}`}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION.base, ease: EASE.standard }}
    >
      <span className="viz-side-insight-icon" aria-hidden="true">
        <Icon size={14} strokeWidth={2.25} />
      </span>
      <div className="viz-side-insight-body">{children}</div>
    </motion.div>
  )
}

export function InsightList({ items = [] }) {
  if (!items || items.length === 0) return null
  return (
    <div className="viz-side-insight-list">
      {items.map((it, i) => (
        <InsightCard key={i} tone={it.tone || 'info'} icon={it.icon}>
          {it.text}
        </InsightCard>
      ))}
    </div>
  )
}
