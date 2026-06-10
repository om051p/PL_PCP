export default function PillBadge({ children, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border border-border-light bg-white/[0.03] px-4 py-2 text-xs font-medium text-text-secondary transition-colors hover:border-green/30 hover:text-green ${className}`}
    >
      {children}
    </span>
  )
}
