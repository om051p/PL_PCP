import { motion } from 'framer-motion'
import { Clock } from 'lucide-react'
import { DURATION, EASE } from '../../../motion/timings'

/**
 * ActivityFeed
 *
 * A list of recent engineering activity entries. Pure display —
 * the caller provides the items. Designed to be backed by a future
 * "activity log" store, but for now works with anything the page
 * can derive (last calculation timestamp, last validation, etc.).
 */
export function ActivityFeed({ items = [], ariaLabel = 'Recent activity' }) {
  if (!items || items.length === 0) return null
  return (
    <ul className="viz-side-activity" role="list" aria-label={ariaLabel}>
      {items.map((it, i) => (
        <motion.li
          key={i}
          className="viz-side-activity-row"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: DURATION.base, ease: EASE.standard, delay: i * 0.04 }}
        >
          <span className="viz-side-activity-icon" aria-hidden="true">
            <Clock size={12} strokeWidth={2.25} />
          </span>
          <div className="viz-side-activity-body">
            <div className="viz-side-activity-text">{it.text}</div>
            {it.timestamp && <div className="viz-side-activity-time">{it.timestamp}</div>}
          </div>
        </motion.li>
      ))}
    </ul>
  )
}
