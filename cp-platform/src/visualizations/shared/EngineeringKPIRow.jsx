/**
 * EngineeringKPIRow.jsx
 *
 * Responsive row of KPI cards for engineering dashboards.
 * Wraps existing KpiCard/KpiGrid with a consistent layout
 * that matches the 65/35 panel workspace.
 */

import { KpiCard, KpiGrid } from '../sidePanel/widgets/KpiCard.jsx'

const CARD_TONES = {
  pass: 'pass',
  warn: 'warn',
  fail: 'fail',
  neutral: 'neutral',
  brand: 'brand',
  info: 'info',
}

export function EngineeringKPIRow({ cards, min = 130 }) {
  if (!cards?.length) return null

  return (
    <KpiGrid min={min}>
      {cards.map((card, i) => (
        <KpiCard
          key={card.label || i}
          label={card.label}
          value={card.value}
          unit={card.unit}
          precision={card.precision ?? 2}
          format={card.format}
          hint={card.hint}
          tone={CARD_TONES[card.status] || 'neutral'}
          size="md"
        />
      ))}
    </KpiGrid>
  )
}
