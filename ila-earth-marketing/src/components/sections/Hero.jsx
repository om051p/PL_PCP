import { motion } from 'framer-motion'
import { ArrowRight, Play } from 'lucide-react'
import GlowButton from '../ui/GlowButton'
import FloatingOrb from '../ui/FloatingOrb'
import DashboardMockup from '../dashboard/DashboardMockup'

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden pt-28 pb-20 px-6">
      <FloatingOrb size={600} top="-15%" left="-10%" color="rgba(0,210,106,0.06)" />
      <FloatingOrb size={400} bottom="5%" right="-5%" color="rgba(0,210,106,0.05)" delay={3} />

      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-16 lg:grid-cols-2">
        <div className="relative z-10">
          <motion.div
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-green/20 bg-green-dim px-4 py-1.5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-green animate-pulse" />
            <span className="text-xs font-medium text-green tracking-wide">Engineering Intelligence Platform</span>
          </motion.div>

          <motion.h1
            className="text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl"
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Engineering Intelligence for{' '}
            <span className="text-gradient-green">Critical Infrastructure</span>
          </motion.h1>

          <motion.p
            className="mt-6 max-w-lg text-base leading-relaxed text-text-secondary sm:text-lg"
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Digitize cathodic protection surveys, GIS inspections, engineering reviews, approvals
            and reporting in one integrated platform.
          </motion.p>

          <motion.div
            className="mt-10 flex flex-wrap items-center gap-4"
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <GlowButton href="#cta" variant="primary">
              Request Demo <ArrowRight size={15} />
            </GlowButton>
            <GlowButton href="#platform" variant="secondary">
              <Play size={13} /> Watch Platform Overview
            </GlowButton>
          </motion.div>

          <motion.div
            className="mt-12 flex items-center gap-5 text-xs text-text-tertiary"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <span className="flex items-center gap-1.5">
              <span className="h-1 w-1 rounded-full bg-green" /> Offline First
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1 w-1 rounded-full bg-green" /> GPS Tagged
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1 w-1 rounded-full bg-green" /> AMPP Compliant
            </span>
          </motion.div>
        </div>

        <motion.div
          className="relative z-10"
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <div className="glow-green rounded-2xl">
            <DashboardMockup />
          </div>
        </motion.div>
      </div>
    </section>
  )
}
