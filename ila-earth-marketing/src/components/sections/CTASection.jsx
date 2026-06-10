import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

export default function CTASection() {
  return (
    <section className="py-28 lg:py-40 px-6">
      <div className="mx-auto max-w-5xl">
        <motion.div
          className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-green-dim/30 via-bg-surface to-bg-surface p-10 sm:p-16 text-center"
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
        >
          <div className="absolute top-0 right-0 w-72 h-72 bg-green/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-56 h-56 bg-green/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative">
            <p className="mb-3 section-label text-green">Get Started</p>
            <h2 className="section-title">Ready to Transform Your CP Operations?</h2>
            <p className="mt-4 text-text-secondary max-w-lg mx-auto">
              Join 500+ CP engineers already using ILA Earth to streamline surveys, ensure compliance, and protect critical infrastructure.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="#contact"
                className="inline-flex items-center gap-2 rounded-xl bg-green px-6 py-3.5 text-sm font-bold text-bg hover:bg-green/90 transition-all"
              >
                Request Demo
                <ArrowRight size={16} />
              </a>
              <a
                href="#"
                className="inline-flex items-center gap-2 rounded-xl border border-border-light px-6 py-3.5 text-sm font-semibold text-text-primary hover:bg-bg-surface transition-all"
              >
                View Documentation
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
