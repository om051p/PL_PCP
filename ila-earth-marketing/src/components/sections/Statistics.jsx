import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

const stats = [
  { value: '500+', label: 'CP Engineers' },
  { value: '50,000 km', label: 'Pipeline Protected' },
  { value: '150+', label: 'Enterprise Deployments' },
  { value: '99.9%', label: 'Platform Uptime' },
]

export default function Statistics() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section ref={ref} className="py-20 lg:py-32 px-6 relative">
      <div className="absolute inset-0 bg-radial-green opacity-20 pointer-events-none" />
      <div className="mx-auto max-w-7xl relative">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-10">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              className="text-center rounded-xl border border-border-light bg-bg-surface/40 p-6 lg:p-8"
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.1, duration: 0.5 }}
            >
              <p className="section-title text-green text-3xl lg:text-5xl font-bold tracking-tight">{stat.value}</p>
              <p className="mt-2 text-sm text-text-tertiary font-medium">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
