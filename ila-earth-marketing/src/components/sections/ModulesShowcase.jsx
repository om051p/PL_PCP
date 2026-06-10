import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Radio, Waves, Zap, Activity, Battery, Mountain, Map, FileText } from 'lucide-react'

const premier = [
  {
    icon: Radio,
    name: 'CIPS',
    label: 'Close Interval Potential Survey',
    desc: 'Full pipeline potential mapping with GPS-tagged readings and automated IR drop analysis.',
  },
  {
    icon: Waves,
    name: 'DCVG',
    label: 'Direct Current Voltage Gradient',
    desc: 'Pinpoint coating defects with millivolt gradient analysis and defect severity classification.',
  },
  {
    icon: Zap,
    name: 'ACVG',
    label: 'Alternating Current Voltage Gradient',
    desc: 'Locate AC interference and coating holidays with precision A-frame positioning.',
  },
  {
    icon: Activity,
    name: 'PCM',
    label: 'Pipeline Current Mapper',
    desc: 'Current attenuation surveys and anomaly detection for pipeline integrity assessment.',
  },
]

const secondary = [
  {
    icon: Battery,
    name: 'ICCP',
    label: 'Impressed Current CP',
    desc: 'Rectifier sizing, cable resistance, groundbed design, and attenuation modeling.',
  },
  {
    icon: Mountain,
    name: 'Soil Resistivity',
    label: 'Wenner & Schlumberger Methods',
    desc: 'Soil resistivity testing with automated Wenner array calculations and anode bed optimization.',
  },
  {
    icon: Map,
    name: 'GIS Mapping',
    label: 'Geographic Information System',
    desc: 'Interactive pipeline maps with layered CP data, anomaly visualization, and spatial queries.',
  },
  {
    icon: FileText,
    name: 'Engineering Reports',
    label: 'Automated Report Generation',
    desc: 'AMPP/NACE-formatted PDF and Excel reports with one-click export and customizable templates.',
  },
]

export default function ModulesShowcase() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section id="modules" ref={ref} className="py-28 lg:py-40 px-6 relative">
      <div className="absolute inset-0 bg-radial-green opacity-30 pointer-events-none" />
      <div className="mx-auto max-w-7xl relative">
        <motion.div
          className="mb-16 text-center"
          initial={{ opacity: 0, y: 25 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <p className="mb-3 section-label text-green">Platform Modules</p>
          <h2 className="section-title">Everything Your CP Operations Need</h2>
          <p className="mt-4 text-text-secondary max-w-2xl mx-auto">
            Eight integrated modules covering the full spectrum of cathodic protection surveys, engineering, and reporting.
          </p>
        </motion.div>

        {/* Preview banner */}
        <motion.div
          className="mb-10 rounded-2xl border border-border bg-gradient-to-br from-green-dim/30 to-bg-surface overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="p-8 sm:p-10 flex flex-col lg:flex-row items-center gap-8">
            <div className="flex-1">
              <p className="text-xs font-semibold tracking-wider text-green uppercase mb-2">Field-Proven</p>
              <h3 className="text-xl sm:text-2xl font-bold text-text-primary">Complete CP Survey Suite</h3>
              <p className="mt-2 text-sm text-text-secondary max-w-md">
                From CIPS to DCVG, ACVG to PCM — every survey method with GPS tagging, offline capability, and automated reporting.
              </p>
            </div>
            <div className="w-full lg:w-72 h-36 rounded-xl border border-border bg-gradient-to-br from-bg-elevated to-bg relative overflow-hidden shrink-0">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="grid grid-cols-4 gap-2 p-4 w-full">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="h-8 rounded-lg bg-green-dim/40 border border-green/10 flex items-center justify-center">
                      <div className="w-3 h-3 rounded-full bg-green/30" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="absolute bottom-2 left-3 right-3 h-4 rounded bg-green-dim/20 border border-green/10" />
            </div>
          </div>
        </motion.div>

        {/* Premier row */}
        <p className="mb-4 text-xs font-semibold tracking-wider text-text-tertiary uppercase">Core Survey Modules</p>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-10">
          {premier.map((mod, i) => (
            <motion.div
              key={mod.name}
              className="group rounded-xl border border-border bg-bg-surface/60 p-6 transition-all duration-300 hover:border-green/20 hover:bg-green-dim/10"
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.08 + i * 0.06, duration: 0.5 }}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-green/15 bg-green-dim/40 group-hover:bg-green-dim/60 group-hover:border-green/30 transition-all mb-4">
                <mod.icon size={20} className="text-green" />
              </div>
              <h3 className="text-base font-bold text-text-primary">{mod.name}</h3>
              <p className="mt-0.5 text-xs font-medium text-green/80">{mod.label}</p>
              <p className="mt-2 text-sm text-text-secondary leading-relaxed">{mod.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Secondary row */}
        <p className="mb-4 text-xs font-semibold tracking-wider text-text-tertiary uppercase">Engineering & Reporting</p>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {secondary.map((mod, i) => (
            <motion.div
              key={mod.name}
              className="group rounded-xl border border-border bg-bg-surface/30 p-5 transition-all duration-300 hover:border-green/20 hover:bg-green-dim/10"
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.15 + i * 0.06, duration: 0.5 }}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-green/15 bg-green-dim/30 group-hover:bg-green-dim/50 transition-all mb-3">
                <mod.icon size={18} className="text-green" />
              </div>
              <h3 className="text-sm font-bold text-text-primary">{mod.name}</h3>
              <p className="mt-0.5 text-xs font-medium text-green/70">{mod.label}</p>
              <p className="mt-2 text-sm text-text-secondary leading-relaxed">{mod.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
