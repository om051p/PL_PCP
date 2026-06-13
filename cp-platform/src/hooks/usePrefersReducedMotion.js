import { useEffect, useState } from 'react'

/**
 * usePrefersReducedMotion
 *
 * Returns true when the user has requested reduced motion at the OS
 * level (prefers-reduced-motion: reduce). All animated components in
 * the app must use this to disable Framer Motion transitions and
 * CSS animations.
 *
 * The hook is reactive: it subscribes to matchMedia changes so a user
 * who toggles the setting at runtime is respected immediately.
 */
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = (e) => setReduced(e.matches)
    if (mq.addEventListener) mq.addEventListener('change', onChange)
    else mq.addListener(onChange)
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange)
      else mq.removeListener(onChange)
    }
  }, [])

  return reduced
}
