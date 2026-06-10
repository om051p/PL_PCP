import { motion } from 'framer-motion'

export default function GlowButton({ children, href, variant = 'primary', className = '' }) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-xl font-semibold text-sm px-6 py-3.5 transition-colors cursor-pointer'

  const variants = {
    primary:
      'bg-green text-black hover:shadow-[0_0_30px_rgba(0,210,106,0.35)]',
    secondary:
      'border border-border-light bg-white/[0.02] text-text-primary hover:border-green/40 hover:text-green',
    ghost:
      'text-text-secondary hover:text-green',
  }

  return (
    <motion.a
      href={href}
      className={`${base} ${variants[variant]} ${className}`}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
    >
      {children}
    </motion.a>
  )
}
