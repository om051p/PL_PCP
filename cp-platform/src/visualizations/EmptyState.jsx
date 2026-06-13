import { ButtonHTMLAttributes } from 'react'
import { Inbox } from 'lucide-react'

/**
 * EmptyState
 *
 * Modern empty state for pages and visualizations. Renders an icon,
 * title, description, and optional action button. Dark/light themed.
 */
export function EmptyState({
  icon: Icon = Inbox,
  title = 'Nothing here yet',
  description,
  action,
  compact = false,
  className = '',
}) {
  return (
    <div className={`viz-empty-state ${compact ? 'is-compact' : ''} ${className}`.trim()}>
      <div className="viz-empty-icon" aria-hidden="true">
        <Icon size={compact ? 32 : 48} strokeWidth={1.5} />
      </div>
      <div className="viz-empty-title">{title}</div>
      {description && <div className="viz-empty-description">{description}</div>}
      {action && (
        <div className="viz-empty-action">
          {typeof action === 'object' && action.label ? (
            <ActionFromObject {...action} />
          ) : (
            action
          )}
        </div>
      )}
    </div>
  )
}

function ActionFromObject({ label, onClick, variant = 'primary', icon: Icon }) {
  return (
    <button type="button" className={`btn btn-${variant}`} onClick={onClick}>
      {Icon && <Icon size={14} />}
      {label}
    </button>
  )
}
