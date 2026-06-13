import { motion } from 'framer-motion'
import { Check, AlertTriangle, Circle, Loader2 } from 'lucide-react'
import { DURATION, EASE } from '../../../motion/timings'

/**
 * WorkflowProgress
 *
 * A vertical stepper of workflow stages with animated state. Each step
 * shows its current status (pending / active / complete / blocked).
 */
const ICONS = {
  pending: Circle,
  active: Loader2,
  complete: Check,
  blocked: AlertTriangle,
}

export function WorkflowProgress({ steps = [], ariaLabel = 'Workflow progress' }) {
  if (!steps || steps.length === 0) return null
  return (
    <ol className="viz-side-workflow" aria-label={ariaLabel}>
      {steps.map((s, i) => {
        const Icon = ICONS[s.status] || Circle
        const tone = s.status === 'complete' ? 'ok' : s.status === 'blocked' ? 'fail' : s.status === 'active' ? 'active' : 'pending'
        return (
          <motion.li
            key={s.key || i}
            className={`viz-side-workflow-step is-${tone}`}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: DURATION.base, ease: EASE.standard, delay: i * 0.05 }}
          >
            <span className="viz-side-workflow-bullet" aria-hidden="true">
              <Icon
                size={12}
                strokeWidth={2.5}
                className={s.status === 'active' ? 'is-spin' : ''}
              />
            </span>
            <span className="viz-side-workflow-label">{s.label}</span>
            {s.hint && <span className="viz-side-workflow-hint">{s.hint}</span>}
          </motion.li>
        )
      })}
    </ol>
  )
}
