import { motion } from 'framer-motion'
import { Check, AlertTriangle, X, Circle } from 'lucide-react'
import { DURATION, EASE } from '../../../motion/timings'

/**
 * StatusList
 *
 * A vertical list of status rows, each with an icon and text.
 * Status icons pulse softly every few seconds.
 */
const ICONS = {
  ok: { Icon: Check, color: '#10b981', label: 'ok' },
  warn: { Icon: AlertTriangle, color: '#f59e0b', label: 'warn' },
  fail: { Icon: X, color: '#ef4444', label: 'fail' },
  pending: { Icon: Circle, color: '#71717a', label: 'pending' },
}

export function StatusList({ items = [], ariaLabel = 'Status list' }) {
  if (!items || items.length === 0) return null
  return (
    <ul className="viz-side-status-list" role="list" aria-label={ariaLabel}>
      {items.map((it, i) => {
        const meta = ICONS[it.status] || ICONS.pending
        const { Icon } = meta
        return (
          <motion.li
            key={it.key || i}
            className={`viz-side-status-row is-${it.status}`}
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: DURATION.base, ease: EASE.standard, delay: i * 0.04 }}
          >
            <span
              className="viz-side-status-icon"
              style={{ color: meta.color }}
              aria-label={meta.label}
            >
              <Icon size={14} strokeWidth={2.5} />
            </span>
            <span className="viz-side-status-text">{it.label}</span>
            {it.hint && <span className="viz-side-status-hint">{it.hint}</span>}
          </motion.li>
        )
      })}
    </ul>
  )
}
