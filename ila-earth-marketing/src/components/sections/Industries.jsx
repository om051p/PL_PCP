import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Droplets, Flame, Factory, Building2 } from 'lucide-react'

const industries = [
  {
    icon: Flame,
    name: 'Oil & Gas',
    desc: 'Upstream, midstream, and downstream pipeline cathodic protection compliance and integrity management.',
    stats: ['50,000+ km pipeline monitored', 'Saudi Aramco, ADNOC, SABIC compliant'],
    gradient: 'from-orange-500/15',
  },
  {
    icon: Droplets,
    name: 'Water Utilities',
    desc: 'Municipal and regional water infrastructure CP monitoring, reporting, and regulatory compliance.',
    stats: ['10,000+ assets tracked', 'AWWA & ISO standards'],
    gradient: 'from-blue-500/15',
  },
  {
    icon: Factory,
    name: 'Petrochemical',
    desc: 'Refinery and petrochemical plant above-ground and buried asset corrosion management.',
    stats: ['500+ facilities served', 'API 571 & NACE compliance'],
    gradient: 'from-purple-500/15',
  },
  {
    icon: Building2,
    name: 'Infrastructure',
    desc: 'Bridges, storage tanks, and structural CP design, monitoring, and engineering certification.',
    stats: ['2,000+ structures protected', 'ISO 15589 & EN 12954'],
    gradient: 'from-cyan-500/15',
  },
]

export default function Industries() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section id="industries" ref={ref} className="py-28 lg:py-40 px-6">
      <div className="mx-auto max-w-7xl">
        <motion.div
          className="mb-16 text-center"
          initial={{ opacity: 0, y: 25 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <p className="mb-3 section-label text-green">Industries</p>
          <h2 className="section-title">Trusted by Infrastructure Leaders</h2>
          <p className="mt-4 text-text-secondary max-w-xl mx-auto">
            Deployed across the most demanding environments in critical infrastructure protection.
          </p>
        </motion.div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {industries.map((ind, i) => (
            <motion.div
              key={ind.name}
              className={`group relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br ${ind.gradient} to-bg-surface p-6`}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.1 + i * 0.08, duration: 0.5 }}
            >
              <div className="relative z-10">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-dim border border-green/15 mb-4 group-hover:bg-green-dim/60 transition-all">
                  <ind.icon size={20} className="text-green" />
                </div>
                <h3 className="text-lg font-bold text-text-primary">{ind.name}</h3>
                <p className="mt-2 text-sm text-text-secondary leading-relaxed">{ind.desc}</p>
                <div className="mt-5 space-y-1">
                  {ind.stats.map((s) => (
                    <p key={s} className="text-xs font-mono text-green">• {s}</p>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
