import { motion } from 'framer-motion'

export default function FloatingOrb({ size = 300, color = 'rgba(0,210,106,0.10)', top, left, right, bottom, delay = 0 }) {
  return (
    <motion.div
      className="absolute pointer-events-none rounded-full"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        filter: 'blur(80px)',
        top,
        left,
        right,
        bottom,
      }}
      animate={{
        y: [0, -20, 0],
        scale: [1, 1.08, 1],
      }}
      transition={{
        duration: 10,
        repeat: Infinity,
        ease: 'easeInOut',
        delay,
      }}
    />
  )
}
