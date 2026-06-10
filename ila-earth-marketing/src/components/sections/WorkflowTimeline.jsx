import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { ClipboardCheck, Search, CheckCircle, ThumbsUp, FileText, Archive } from 'lucide-react'

const steps = [
  { icon: ClipboardCheck, label: 'Field Survey', desc: 'GPS-tagged offline data collection' },
  { icon: Search, label: 'Validation', desc: 'Automated data quality checks' },
  { icon: CheckCircle, label: 'Engineering Review', desc: 'CP standards compliance review' },
  { icon: ThumbsUp, label: 'Approval', desc: 'Multi-level approval workflow' },
  { icon: FileText, label: 'Report Generation', desc: 'PDF & Excel report export' },
  { icon: Archive, label: 'Archive', desc: 'Audit trail & version control' },
]

export default function WorkflowTimeline() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section id="workflow" ref={ref} className="py-28 lg:py-40 px-6 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-bg via-bg-surface/20 to-bg pointer-events-none" />
      <div className="mx-auto max-w-7xl relative">
        <motion.div
          className="mb-16 text-center"
          initial={{ opacity: 0, y: 25 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <p className="mb-3 section-label text-green">End-to-End Workflow</p>
          <h2 className="section-title">Seamless Pipeline</h2>
          <p className="mt-4 text-text-secondary max-w-xl mx-auto">
            From field data collection to archived engineering reports — every step connected.
          </p>
        </motion.div>

        <div className="relative">
          <div className="absolute left-8 right-8 top-9 hidden h-px bg-border lg:block" />
          <motion.div
            className="absolute left-8 top-9 hidden h-px bg-gradient-to-r from-green/60 to-green lg:block"
            initial={{ width: 0 }}
            animate={isInView ? { width: 'calc(100% - 4rem)' } : {}}
            transition={{ duration: 1.5, delay: 0.4, ease: 'easeInOut' }}
          />

          <div className="hidden lg:grid lg:grid-cols-6 gap-4">
            {steps.map((step, i) => (
              <motion.div
                key={step.label}
                className="flex flex-col items-center text-center"
                initial={{ opacity: 0, y: 25 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.2 + i * 0.1, duration: 0.5 }}
              >
                <motion.div
                  className="relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl border border-border-light bg-bg-surface transition-all duration-300"
                  whileHover={{ scale: 1.1, borderColor: 'rgba(0,210,106,0.4)', backgroundColor: 'rgba(0,210,106,0.05)' }}
                >
                  <step.icon size={22} className="text-green" />
                </motion.div>
                <p className="mt-4 text-sm font-semibold text-text-primary">{step.label}</p>
                <p className="mt-1.5 text-xs text-text-tertiary leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>

          <div className="lg:hidden">
            {steps.map((step, i) => (
              <motion.div
                key={step.label}
                className="flex items-start gap-4 pb-8 last:pb-0 relative"
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.15 + i * 0.1, duration: 0.5 }}
              >
                <div className="flex flex-col items-center">
                  <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border-light bg-bg-surface">
                    <step.icon size={18} className="text-green" />
                  </div>
                  {i < steps.length - 1 && (
                    <div className="mt-1 w-px flex-1 bg-border" />
                  )}
                </div>
                <div className="pt-2">
                  <p className="text-sm font-semibold text-text-primary">{step.label}</p>
                  <p className="mt-0.5 text-xs text-text-tertiary">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
