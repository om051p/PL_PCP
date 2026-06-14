/**
 * SensitivitySliders.jsx
 *
 * Side panel widget with range sliders for adjusting attenuation parameters.
 * Each slider triggers instant recalculation with debounced 150ms.
 */

import { useState, useEffect, useRef, useMemo } from 'react'
import { runAttenuationAnalysis } from '../engine/modules/attenuationEngine.js'

const SLIDER_CONFIGS = [
  {
    id: 'resistivity',
    label: 'Soil Resistivity',
    field: 'coating.soilResistivityOhmCm',
    min: 100,
    max: 10000,
    step: 100,
    unit: 'Ω·cm',
    format: (v) => v.toFixed(0),
  },
  {
    id: 'coating',
    label: 'Coating Conductivity',
    field: 'coating.conductivityMicroSiemensPerM2',
    min: 50,
    max: 2000,
    step: 50,
    unit: 'μS/m²',
    format: (v) => v.toFixed(0),
  },
  {
    id: 'current',
    label: 'Current Density',
    field: 'coating.currentDensityMaPerM2',
    min: 0.05,
    max: 0.5,
    step: 0.01,
    unit: 'mA/m²',
    format: (v) => v.toFixed(3),
  },
  {
    id: 'diameter',
    label: 'Pipe Diameter',
    field: 'pipe.diameterInches',
    min: 4,
    max: 60,
    step: 1,
    unit: 'in',
    format: (v) => v.toFixed(0),
  },
  {
    id: 'length',
    label: 'Max Protection Length',
    field: 'pipe.maxProtectionLengthKm',
    min: 5,
    max: 50,
    step: 1,
    unit: 'km',
    format: (v) => v.toFixed(0),
  },
]

function setNestedField(obj, path, value) {
  const keys = path.split('.')
  const result = { ...obj }
  let current = result
  for (let i = 0; i < keys.length - 1; i++) {
    current[keys[i]] = { ...current[keys[i]] }
    current = current[keys[i]]
  }
  current[keys[keys.length - 1]] = value
  return result
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((o, k) => o?.[k], obj)
}

export function SensitivitySliders({ input, onPerturbedResult }) {
  const [sliders, setSliders] = useState(() => {
    const initial = {}
    SLIDER_CONFIGS.forEach((cfg) => {
      initial[cfg.id] = getNestedValue(input, cfg.field) ?? cfg.min
    })
    return initial
  })

  const timerRef = useRef(null)

  // Debounced recalculation (150ms)
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      let perturbed = { ...input }
      SLIDER_CONFIGS.forEach((cfg) => {
        perturbed = setNestedField(perturbed, cfg.field, sliders[cfg.id])
      })
      const result = runAttenuationAnalysis(perturbed)
      if (onPerturbedResult) onPerturbedResult(result)
    }, 150)
    return () => clearTimeout(timerRef.current)
  }, [sliders, input])

  // Compute deltas from baseline
  const deltas = useMemo(() => {
    const baseline = {}
    SLIDER_CONFIGS.forEach((cfg) => {
      baseline[cfg.id] = getNestedValue(input, cfg.field) ?? cfg.min
    })
    return SLIDER_CONFIGS.map((cfg) => ({
      ...cfg,
      baseline: baseline[cfg.id],
      current: sliders[cfg.id],
      delta: sliders[cfg.id] - baseline[cfg.id],
    }))
  }, [sliders, input])

  return (
    <div className="viz-side-section">
      <h3 className="viz-side-section-title">Sensitivity Parameters</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {deltas.map((cfg) => (
          <div key={cfg.id} className="viz-sensitivity-slider">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <label>{cfg.label}</label>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-secondary)' }}>
                {cfg.format(cfg.current)} {cfg.unit}
                {cfg.delta !== 0 && (
                  <span style={{ color: cfg.delta > 0 ? 'var(--pass)' : 'var(--fail)', marginLeft: 4 }}>
                    {cfg.delta > 0 ? '+' : ''}{cfg.format(cfg.delta)}
                  </span>
                )}
              </span>
            </div>
            <input
              type="range"
              min={cfg.min}
              max={cfg.max}
              step={cfg.step}
              value={cfg.current}
              onChange={(e) => setSliders((s) => ({ ...s, [cfg.id]: parseFloat(e.target.value) }))}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
