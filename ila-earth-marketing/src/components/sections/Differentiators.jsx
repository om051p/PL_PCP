import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { ScanLine, FileDown, Cloud, GitBranch } from 'lucide-react'

const items = [
  {
    icon: ScanLine,
    title: 'AI-Assisted Survey Analysis',
    desc: 'Automated anomaly detection from CIPS/DCVG survey data reduces review time from days to minutes.',
  },
  {
    icon: FileDown,
    title: 'One-Click NACE Reports',
    desc: 'Generate compliant engineering reports, RFAs, and EXCEL workbooks in seconds — not hours.',
  },
  {
    icon: Cloud,
    title: 'Real-Time Cloud Sync',
    desc: 'Field data syncs instantly to the cloud. Office team sees live progress without manual file transfers.',
  },
  {
    icon: GitBranch,
    title: 'Version-Controlled Audits',
    desc: 'Every change logged with full traceability. Perfect for regulatory audits and quality assurance.',
  },
]

export default function Differentiators() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section id="why-us" ref={ref} className="py-28 lg:py-40 px-6">
      <div className="mx-auto max-w-7xl">
        <motion.div
          className="mb-16 text-center"
          initial={{ opacity: 0, y: 25 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <p className="mb-3 section-label text-green">Why ILA Earth</p>
          <h2 className="section-title">What Sets Us Apart</h2>
          <p className="mt-4 text-text-secondary max-w-xl mx-auto">
            Purpose-built for CP engineers — not a generic field app with a CP skin.
          </p>
        </motion.div>

        <div className="grid gap-6 sm:grid-cols-2">
          {items.map((item, i) => (
            <motion.div
              key={item.title}
              className="group relative overflow-hidden rounded-2xl border border-border bg-bg-surface/40 p-6 sm:p-8 hover:border-green/15 transition-all duration-300"
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.08 + i * 0.08, duration: 0.5 }}
            >
              <div className="flex items-center gap-4 mb-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-green-dim border border-green/15">
                  <item.icon size={20} className="text-green" />
                </div>
                <h3 className="text-base font-bold text-text-primary">{item.title}</h3>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed pl-[3.75rem]">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
