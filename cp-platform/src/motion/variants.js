/**
 * Motion Variants
 *
 * Reusable Framer Motion variants. Every animated component in the app
 * composes from these. Variants are plain objects (or functions that
 * return objects) — they integrate with framer-motion's `variants` prop
 * and stagger/orchestration features.
 *
 * Convention:
 * - All variants use the central DURATION / EASE constants.
 * - Reduced-motion variants are declared as a top-level key so the
 *   consumer can `useReducedMotion()` and pick the appropriate set.
 */

import { DURATION, EASE } from './timings.js'

/** Page-level fade + translateY. Apply to route content wrapper. */
export const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.reveal, ease: EASE.standard },
  },
  exit: {
    opacity: 0,
    y: -6,
    transition: { duration: DURATION.fast, ease: EASE.exit },
  },
}

/** Card hover — scale up subtly + shadow lift. */
export const cardHoverVariants = {
  rest: {
    scale: 1,
    boxShadow: '0 1px 2px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
    transition: { duration: DURATION.fast, ease: EASE.hover },
  },
  hover: {
    scale: 1.01,
    boxShadow: '0 4px 8px rgba(0,0,0,0.10), 0 2px 4px rgba(0,0,0,0.06)',
    transition: { duration: DURATION.fast, ease: EASE.hover },
  },
  press: {
    scale: 0.995,
    transition: { duration: DURATION.instant, ease: EASE.hover },
  },
}

/** Sidebar active item — animated indicator dot + background. */
export const sidebarItemVariants = {
  rest: { backgroundColor: 'rgba(0,0,0,0)', transition: { duration: DURATION.fast } },
  active: { backgroundColor: 'rgba(255,255,255,0.08)', transition: { duration: DURATION.fast } },
}

/** Sidebar section expand/collapse. */
export const sidebarSectionVariants = {
  collapsed: {
    height: 0,
    opacity: 0,
    transition: { duration: DURATION.base, ease: EASE.standard },
  },
  expanded: {
    height: 'auto',
    opacity: 1,
    transition: { duration: DURATION.base, ease: EASE.standard },
  },
}

/** Validation result step — sequential ✓/⚠ reveal. */
export const validationStepVariants = {
  initial: { opacity: 0, x: -6 },
  animate: {
    opacity: 1,
    x: 0,
    transition: { duration: DURATION.base, ease: EASE.standard },
  },
}

/** Container that staggers its children. Pair with validationStepVariants. */
export const staggerContainer = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.05,
    },
  },
}

/** Workflow stepper state transitions. */
export const workflowStepVariants = {
  pending: { opacity: 0.45, scale: 0.96 },
  active: {
    opacity: 1,
    scale: 1,
    transition: { duration: DURATION.base, ease: EASE.standard },
  },
  complete: {
    opacity: 1,
    scale: 1,
    transition: { duration: DURATION.base, ease: EASE.standard },
  },
}

/** KPI value pulse on update. */
export const kpiPulseVariants = {
  rest: { scale: 1 },
  pulse: {
    scale: [1, 1.03, 1],
    transition: { duration: DURATION.reveal, ease: EASE.standard, times: [0, 0.4, 1] },
  },
}

/** Reduced-motion versions. Identical visual end-state, no transition. */
export const reducedVariants = {
  pageVariants: {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0 } },
    exit: { opacity: 0, transition: { duration: 0 } },
  },
  cardHoverVariants: {
    rest: { scale: 1 },
    hover: { scale: 1 },
    press: { scale: 1 },
  },
  sidebarItemVariants: {
    rest: { backgroundColor: 'rgba(0,0,0,0)' },
    active: { backgroundColor: 'rgba(255,255,255,0.08)' },
  },
  sidebarSectionVariants: {
    collapsed: { height: 0, opacity: 0 },
    expanded: { height: 'auto', opacity: 1 },
  },
  validationStepVariants: {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0 } },
  },
  staggerContainer: {
    initial: {},
    animate: { transition: { staggerChildren: 0 } },
  },
  workflowStepVariants: {
    pending: { opacity: 0.45 },
    active: { opacity: 1 },
    complete: { opacity: 1 },
  },
  kpiPulseVariants: {
    rest: { scale: 1 },
    pulse: { scale: 1 },
  },
}
