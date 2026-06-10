/**
 * PageAttenuation.jsx
 *
 * Lazy-loader wrapper for the Attenuation Analysis page.
 * Avoids circular dependency issues by dynamically importing AttenuationPage.
 */

import { useState, useEffect } from 'react'

export function PageAttenuation() {
  const [AttenuationPage, setAttenuationPage] = useState(null)

  useEffect(() => {
    import('./AttenuationPage.jsx').then((mod) => setAttenuationPage(() => mod.default))
  }, [])

  if (!AttenuationPage) {
    return (
      <div className="page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', gap: 8 }}>
        <div className="spinner" />
        <span>Loading attenuation module…</span>
      </div>
    )
  }

  return <AttenuationPage />
}

