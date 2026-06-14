/**
 * SoilColumnVisualization.jsx
 *
 * Interactive vertical depth column showing soil layers with
 * depth, material type, and resistivity.
 */

import { useState, useMemo } from 'react'

const LAYER_COLORS = {
  low: '#22c55e',     // < 500 Ω·cm — low resistivity
  medium: '#f59e0b',  // 500-2000 Ω·cm
  high: '#ef4444',    // 2000-5000 Ω·cm
  extreme: '#dc2626', // > 5000 Ω·cm
}

function getLayerColor(resistivityOhmCm) {
  if (resistivityOhmCm < 500) return LAYER_COLORS.low
  if (resistivityOhmCm < 2000) return LAYER_COLORS.medium
  if (resistivityOhmCm < 5000) return LAYER_COLORS.high
  return LAYER_COLORS.extreme
}

function getResistivityLabel(resistivityOhmCm) {
  if (resistivityOhmCm < 500) return 'Low'
  if (resistivityOhmCm < 2000) return 'Medium'
  if (resistivityOhmCm < 5000) return 'High'
  return 'Extreme'
}

/**
 * @param {object} props
 * @param {Array<{depthM: number, thicknessM: number, resistivityOhmCm: number, material?: string}>} props.layers
 * @param {number} [props.width=200]
 * @param {number} [props.height=300]
 */
export function SoilColumnVisualization({ layers, width = 200, height = 300 }) {
  const [selectedIdx, setSelectedIdx] = useState(null)

  const totalDepth = useMemo(() => {
    if (!layers?.length) return 0
    return layers.reduce((sum, l) => sum + (l.thicknessM || 1), 0)
  }, [layers])

  if (!layers?.length) return null

  const selectedLayer = selectedIdx != null ? layers[selectedIdx] : null

  return (
    <div className="viz-side-section">
      <h3 className="viz-side-section-title">Soil Profile</h3>
      <div style={{ display: 'flex', gap: 12 }}>
        {/* Depth ruler */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontSize: 9, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', paddingRight: 4 }}>
          <span>0m</span>
          <span>{(totalDepth / 2).toFixed(0)}m</span>
          <span>{totalDepth.toFixed(0)}m</span>
        </div>

        {/* Layer column */}
        <div style={{ display: 'flex', flexDirection: 'column', width: width - 40 }}>
          {layers.map((layer, i) => {
            const layerHeight = Math.max(8, (layer.thicknessM / totalDepth) * height)
            const color = getLayerColor(layer.resistivityOhmCm)
            const isSelected = selectedIdx === i

            return (
              <div
                key={i}
                className={`viz-soil-layer ${isSelected ? 'selected' : ''}`}
                style={{
                  height: layerHeight,
                  background: color,
                  opacity: isSelected ? 1 : 0.75,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  color: 'white',
                  fontWeight: 600,
                  textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                }}
                onClick={() => setSelectedIdx(isSelected ? null : i)}
              >
                {layer.material || `${layer.resistivityOhmCm} Ω·cm`}
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 10, paddingLeft: 4 }}>
          {Object.entries(LAYER_COLORS).map(([label, color]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
              <span style={{ color: 'var(--text-tertiary)', textTransform: 'capitalize' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Selected layer details */}
      {selectedLayer && (
        <div style={{ marginTop: 8, padding: '6px 8px', background: 'var(--surface)', borderRadius: 4, fontSize: 11 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-tertiary)' }}>Depth</span>
            <span style={{ fontFamily: 'var(--font-mono)' }}>{selectedLayer.depthM?.toFixed(1) || '—'} m</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-tertiary)' }}>Thickness</span>
            <span style={{ fontFamily: 'var(--font-mono)' }}>{selectedLayer.thicknessM?.toFixed(1) || '—'} m</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-tertiary)' }}>Resistivity</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: getLayerColor(selectedLayer.resistivityOhmCm) }}>
              {selectedLayer.resistivityOhmCm} Ω·cm ({getResistivityLabel(selectedLayer.resistivityOhmCm)})
            </span>
          </div>
          {selectedLayer.material && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-tertiary)' }}>Material</span>
              <span>{selectedLayer.material}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
