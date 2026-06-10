import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Layers, Globe, Shield, Wifi } from 'lucide-react'

const features = [
  {
    icon: Wifi,
    title: 'Offline-First Architecture',
    desc: 'Full field functionality without internet. GPS-tagged data collection, digital forms, and cached maps — automatically sync when connected.',
  },
  {
    icon: Shield,
    title: 'NACE/AMPP Compliant',
    desc: 'All workflows engineered to NACE SP0169, SP0207, and SP0285 standards. Audit-ready reports with digital signatures and version history.',
  },
  {
    icon: Globe,
    title: 'Multi-Project GIS',
    desc: 'Centralized geospatial hub for all CP assets. Layer-based visualization, route intelligence, and corridor analysis with historical overlay.',
  },
  {
    icon: Layers,
    title: 'Smart Workflow Engine',
    desc: 'Configurable approval chains, automated quality gates, and real-time dashboard analytics. Reduce report turnaround by up to 70%.',
  },
]

export default function PlatformShowcase() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section ref={ref} className="py-28 lg:py-40 px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-bg via-bg-surface/10 to-bg pointer-events-none" />
      <div className="mx-auto max-w-7xl relative">
        <motion.div
          className="mb-16 text-center"
          initial={{ opacity: 0, y: 25 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <p className="mb-3 section-label text-green">Platform</p>
          <h2 className="section-title">Built for the Field,<br className="sm:hidden" /> Connected in the Office</h2>
          <p className="mt-4 text-text-secondary max-w-xl mx-auto">
            Four architectural pillars that make ILA Earth the most comprehensive CP management platform.
          </p>
        </motion.div>

        <div className="grid gap-8 lg:gap-12">
          {features.map((feat, i) => (
            <motion.div
              key={feat.title}
              className="flex flex-col sm:flex-row items-start gap-5 sm:gap-8 group"
              initial={{ opacity: 0, x: i % 2 === 0 ? -15 : 15 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: 0.1 + i * 0.1, duration: 0.5 }}
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-border-light bg-bg-surface group-hover:border-green/20 group-hover:bg-green-dim/20 transition-all">
                <feat.icon size={26} className="text-green" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-text-primary">{feat.title}</h3>
                <p className="mt-2 text-sm text-text-secondary leading-relaxed max-w-2xl">{feat.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
