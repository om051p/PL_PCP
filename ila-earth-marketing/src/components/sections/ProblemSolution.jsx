import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { AlertTriangle, Clock, FileX, CheckCircle, Zap, BarChart3 } from 'lucide-react'

const problems = [
  { icon: FileX, text: 'Scattered field data in disconnected spreadsheets and PDFs' },
  { icon: Clock, text: 'Manual approval workflows stretching weeks across teams' },
  { icon: AlertTriangle, text: 'No standardized validation against AMPP/NACE criteria' },
]

const solutions = [
  { icon: CheckCircle, text: 'Unified platform with offline-first mobile architecture' },
  { icon: Zap, text: 'Automated engineering review and multi-level approval pipelines' },
  { icon: BarChart3, text: 'Real-time compliance validation with engineering calculations' },
]

export default function ProblemSolution() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section ref={ref} className="py-28 lg:py-40 px-6 bg-bg-surface/20">
      <div className="mx-auto max-w-7xl">
        <motion.div
          className="mb-16 text-center"
          initial={{ opacity: 0, y: 25 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <p className="mb-3 section-label text-green">The Challenge</p>
          <h2 className="section-title">Not Another Field Survey Tool</h2>
          <p className="mt-4 text-text-secondary max-w-xl mx-auto">
            The industry needs engineering intelligence, not another data collection app.
          </p>
        </motion.div>

        <div className="grid gap-8 lg:grid-cols-2 lg:gap-16">
          <div className="space-y-4">
            {problems.map((item, i) => (
              <motion.div
                key={i}
                className="flex items-start gap-4 rounded-xl border border-border bg-bg-surface/40 p-5"
                initial={{ opacity: 0, x: -20 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: 0.1 + i * 0.12, duration: 0.5 }}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-500/10">
                  <item.icon size={16} className="text-red-400" />
                </div>
                <p className="text-sm text-text-secondary leading-relaxed">{item.text}</p>
              </motion.div>
            ))}
          </div>

          <div className="space-y-4">
            {solutions.map((item, i) => (
              <motion.div
                key={i}
                className="flex items-start gap-4 rounded-xl border border-green/15 bg-green-dim/30 p-5"
                initial={{ opacity: 0, x: 20 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: 0.25 + i * 0.12, duration: 0.5 }}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-dim">
                  <item.icon size={16} className="text-green" />
                </div>
                <p className="text-sm text-text-primary leading-relaxed">{item.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
