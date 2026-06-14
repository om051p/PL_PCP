/**
 * CriticalKPDetector.jsx
 *
 * Side panel widget displaying critical key points detected in the attenuation profile.
 */

import { useMemo } from 'react'
import { findCriticalKPs } from '../engine/modules/criticalKPs.js'
import { AlertTriangle, Target, MapPin, Shield } from 'lucide-react'

export function CriticalKPDetector({ profile, minimumMv = 850 }) {
  // M7 defensive: guard against non-array or empty profile, but ALWAYS run
  // hooks first to satisfy the rules of hooks.
  const kps = useMemo(() => {
    if (!Array.isArray(profile) || profile.length === 0) return null
    return findCriticalKPs(profile, minimumMv)
  }, [profile, minimumMv])

  if (!kps?.minProtectionPoint) return null

  const fmt = (v, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : '—')
  const items = []

  if (kps.minProtectionPoint) {
    items.push({
      icon: AlertTriangle,
      label: 'Minimum Protection',
      value: `${fmt(kps.minProtectionPoint.potentialMv, 0)} mV`,
      km: fmt(kps.minProtectionPoint.km),
      status: kps.minProtectionPoint.isProtected ? 'pass' : 'fail',
    })
  }

  if (kps.maxAttenuationPoint) {
    items.push({
      icon: Target,
      label: 'Max Attenuation',
      value: `${fmt(kps.maxAttenuationPoint.slopePerKm, 1)} mV/km`,
      km: fmt(kps.maxAttenuationPoint.km),
      status: 'warn',
    })
  }

  if (kps.firstProtectedKm != null) {
    items.push({
      icon: Shield,
      label: 'First Protected',
      value: `KM ${fmt(kps.firstProtectedKm)}`,
      km: null,
      status: 'pass',
    })
  }

  if (kps.lastProtectedKm != null) {
    items.push({
      icon: MapPin,
      label: 'Last Protected',
      value: `KM ${fmt(kps.lastProtectedKm)}`,
      km: null,
      status: 'pass',
    })
  }

  return (
    <div className="viz-side-section">
      <h3 className="viz-side-section-title">Critical Key Points</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map((item, i) => {
          const Icon = item.icon
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                padding: '6px 8px',
                background: 'var(--surface)',
                borderRadius: 4,
                fontSize: 11,
              }}
            >
              <Icon
                size={13}
                style={{
                  color: item.status === 'pass' ? 'var(--pass)' : item.status === 'warn' ? 'var(--warn)' : 'var(--fail)',
                  marginTop: 1,
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: 'var(--text-tertiary)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                  {item.label}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {item.value}
                </div>
              </div>
              {item.km && (
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-tertiary)', flexShrink: 0 }}>
                  {item.km} km
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
