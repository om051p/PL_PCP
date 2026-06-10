import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Wifi, MapPin, Shield, Award, FileSpreadsheet, Cloud } from 'lucide-react'

const items = [
  { icon: Wifi, label: 'Offline First' },
  { icon: MapPin, label: 'GPS Tagged Surveys' },
  { icon: Shield, label: 'Audit Trails' },
  { icon: Award, label: 'AMPP/NACE Workflows' },
  { icon: FileSpreadsheet, label: 'Excel & PDF Reporting' },
  { icon: Cloud, label: 'Cloud Synchronization' },
]

export default function TrustBar() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-40px' })

  return (
    <section ref={ref} className="border-y border-border bg-bg-surface/40 py-16 px-6">
      <div className="mx-auto max-w-7xl">
        <motion.p
          className="mb-8 text-center section-label text-text-tertiary"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5 }}
        >
          Built for Field Operations
        </motion.p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {items.map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 10 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: i * 0.06 }}
            >
              <span className="inline-flex items-center gap-2 rounded-full border border-border-light bg-white/[0.02] px-4 py-2 text-xs font-medium text-text-secondary hover:border-green/30 hover:text-green transition-colors">
                <item.icon size={13} className="text-green" />
                {item.label}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
