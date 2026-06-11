import { useState } from 'react'
import {
  FieldInput,
  SelectField,
  ResultRow,
  SectionCard,
  Divider,
  Grid2,
} from '../components/ui.jsx'
import { Shield, Zap, Layers, BarChart3, HelpCircle } from 'lucide-react'

export function PageTank() {
  // Inputs
  const [diameter, setDiameter] = useState(30) // m
  const [currentDensity, setCurrentDensity] = useState(15) // mA/m2
  const [designLife, setDesignLife] = useState(30) // years
  const [soilResistivity, setSoilResistivity] = useState(5000) // ohm-cm
  const [anodeSpacing, setAnodeSpacing] = useState(1.5) // m
  const [layoutType, setLayoutType] = useState('concentric') // 'concentric' | 'grid'
  const [anodeRating, setAnodeRating] = useState(17) // mA/m

  // MMO Anode properties
  const MMO_SPECS = {
    17: { label: 'MMO Ribbon 6.35mm x 0.635mm (17 mA/m)', value: 17, weightKgPerM: 0.03 },
    34: { label: 'MMO Ribbon 6.35mm x 0.90mm (34 mA/m)', value: 34, weightKgPerM: 0.045 },
  }

  const spec = MMO_SPECS[anodeRating] || MMO_SPECS[17]

  // Calculations
  const radius = diameter / 2
  const bottomArea = Math.PI * Math.pow(radius, 2)
  const reqCurrent = (bottomArea * currentDensity) / 1000 // A
  const designCurrent = reqCurrent * 1.3 // 30% spare capacity

  // Calculate ribbon anode length based on geometry
  let geomLength = 0
  const rings = []
  const gridLines = []

  if (layoutType === 'concentric') {
    const numRings = Math.floor(radius / anodeSpacing)
    for (let i = 1; i <= numRings; i++) {
      const ringRadius = i * anodeSpacing
      const circ = 2 * Math.PI * ringRadius
      geomLength += circ
      rings.push(ringRadius)
    }
  } else {
    // Parallel Grid layout
    const numLines = Math.floor(radius / anodeSpacing)
    // Center line
    geomLength += diameter
    gridLines.push(0)
    // Symmetric parallel chords
    for (let i = 1; i <= numLines; i++) {
      const dist = i * anodeSpacing
      const chordLength = 2 * Math.sqrt(Math.pow(radius, 2) - Math.pow(dist, 2))
      geomLength += chordLength * 2 // two sides
      gridLines.push(dist)
      gridLines.push(-dist)
    }
  }

  // Length based on electrical rating requirements
  const minLengthForCurrent = designCurrent / (spec.value / 1000)
  const finalLength = Math.max(geomLength, minLengthForCurrent)
  const totalAnodeWeight = finalLength * spec.weightKgPerM
  const operatingCurrentDensity = finalLength > 0 ? (designCurrent / finalLength) * 1000 : 0 // mA/m

  // System Resistance (Sunde's Formula / Dwight's Grid resistance approximation)
  // R = (rho / (2 * pi * L)) * (ln(8 * L / d) - 1) for ribbon anode in sand
  const ribbonDiaApprox = 0.008 // m equivalent
  const soilResistivityOhmM = soilResistivity / 100
  const resistance = finalLength > 0
    ? (soilResistivityOhmM / (2 * Math.PI * finalLength)) * (Math.log((8 * finalLength) / ribbonDiaApprox) - 1)
    : 0

  const dcVoltage = designCurrent * resistance + 2.0 // operating current * resistance + back EMF
  const powerW = designCurrent * dcVoltage

  // SVG dimensions & scaling
  const svgSize = 280
  const center = svgSize / 2
  const scale = (svgSize - 40) / diameter // leave 20px padding

  return (
    <div className="page">
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>Raxa Tank</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
          Above-ground storage tank (AST) bottom cathodic protection designer
        </p>
      </div>

      <Grid2>
        <SectionCard title="Tank Parameters" icon={Shield}>
          <FieldInput
            label="Tank Diameter"
            value={diameter}
            type="number"
            unit="m"
            min={5}
            max={120}
            onChange={(v) => setDiameter(Math.max(5, parseFloat(v) || 30))}
          />
          <FieldInput
            label="Design Current Density"
            value={currentDensity}
            type="number"
            unit="mA/m²"
            min={5}
            max={50}
            onChange={(v) => setCurrentDensity(Math.max(1, parseFloat(v) || 15))}
          />
          <FieldInput
            label="Design Life"
            value={designLife}
            type="number"
            unit="yrs"
            min={10}
            max={50}
            onChange={(v) => setDesignLife(Math.max(1, parseInt(v) || 30))}
          />
          <FieldInput
            label="Soil/Sand Resistivity"
            value={soilResistivity}
            type="number"
            unit="Ω·cm"
            min={100}
            onChange={(v) => setSoilResistivity(Math.max(1, parseInt(v) || 5000))}
          />
        </SectionCard>

        <SectionCard title="Anode Grid Configuration" icon={Layers}>
          <SelectField
            label="Anode Layout Type"
            value={layoutType}
            onChange={(v) => setLayoutType(v)}
            options={[
              { value: 'concentric', label: 'Concentric Rings' },
              { value: 'grid', label: 'Parallel Ribbon Grid' },
            ]}
          />
          <SelectField
            label="MMO Ribbon Specification"
            value={anodeRating}
            onChange={(v) => setAnodeRating(parseInt(v))}
            options={Object.values(MMO_SPECS).map((opt) => ({
              value: opt.value,
              label: opt.label,
            }))}
          />
          <FieldInput
            label="Anode Spacing"
            value={anodeSpacing}
            type="number"
            unit="m"
            step={0.1}
            min={0.5}
            max={5.0}
            onChange={(v) => setAnodeSpacing(Math.max(0.2, parseFloat(v) || 1.5))}
          />
        </SectionCard>
      </Grid2>

      <Grid2 style={{ marginTop: 24 }}>
        <SectionCard title="Engineering Calculations" icon={BarChart3}>
          <ResultRow
            label="Bottom Surface Area"
            symbol="A"
            value={bottomArea.toFixed(1)}
            unit="m²"
            formula="A = π × D² / 4"
          />
          <ResultRow
            label="Required Current"
            symbol="I_req"
            value={reqCurrent.toFixed(3)}
            unit="A"
            formula="I_req = A × i_CD"
          />
          <ResultRow
            label="Design Current (with 1.3 spare)"
            symbol="I_des"
            value={designCurrent.toFixed(3)}
            unit="A"
            formula="I_des = I_req × 1.3"
            highlight
          />
          <Divider />
          <ResultRow
            label="Ribbon Length (Geometric)"
            symbol="L_geom"
            value={geomLength.toFixed(1)}
            unit="m"
          />
          <ResultRow
            label="Min Ribbon Length (Current Cap)"
            symbol="L_min"
            value={minLengthForCurrent.toFixed(1)}
            unit="m"
            formula="L_min = I_des / i_rating"
          />
          <ResultRow
            label="Final Proposed Ribbon Length"
            symbol="L_total"
            value={finalLength.toFixed(1)}
            unit="m"
            formula="L_total = max(L_geom, L_min)"
            highlight
          />
          <ResultRow
            label="Total MMO Ribbon Weight"
            symbol="W_total"
            value={totalAnodeWeight.toFixed(2)}
            unit="kg"
          />
          <Divider />
          <ResultRow
            label="Operating Anode Current Density"
            symbol="i_ops"
            value={operatingCurrentDensity.toFixed(2)}
            unit="mA/m"
            color={operatingCurrentDensity > spec.value ? 'var(--fail, #E24B4A)' : 'var(--pass, #1D9E75)'}
          />
          <ResultRow
            label="Calculated Anode-to-Sand Resistance"
            symbol="R_system"
            value={resistance.toFixed(4)}
            unit="Ω"
            formula="Dwight Ribbon Approximation"
          />
          <ResultRow
            label="Min Rectifier DC Voltage"
            symbol="V_dc"
            value={dcVoltage.toFixed(1)}
            unit="V"
            formula="V_dc = I_des × R + E_emf"
          />
          <ResultRow
            label="DC Output Power"
            symbol="P_dc"
            value={powerW.toFixed(1)}
            unit="W"
          />
        </SectionCard>

        <SectionCard title="Ribbon Anode Layout Preview" icon={Zap}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <svg
              width={svgSize}
              height={svgSize}
              style={{
                background: 'var(--bg-inset, #181716)',
                borderRadius: '50%',
                border: '2px solid var(--border, #312f2c)',
                boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.3)',
              }}
            >
              {/* Tank Shell Rim */}
              <circle
                cx={center}
                cy={center}
                r={radius * scale}
                fill="none"
                stroke="var(--text-secondary, #888780)"
                strokeWidth={3}
              />

              {/* Anode concentric rings or grid lines */}
              {layoutType === 'concentric' &&
                rings.map((r, i) => (
                  <circle
                    key={i}
                    cx={center}
                    cy={center}
                    r={r * scale}
                    fill="none"
                    stroke="var(--brand-mid, #3B8BD4)"
                    strokeWidth={1.5}
                    strokeDasharray="4 2"
                  />
                ))}

              {layoutType === 'grid' &&
                gridLines.map((dist, i) => {
                  const offset = dist * scale
                  const halfChord = Math.sqrt(Math.pow(radius * scale, 2) - Math.pow(offset, 2))
                  return (
                    <line
                      key={i}
                      x1={center + offset}
                      y1={center - halfChord}
                      x2={center + offset}
                      y2={center + halfChord}
                      stroke="var(--brand-mid, #3B8BD4)"
                      strokeWidth={1.5}
                      strokeDasharray="4 2"
                    />
                  )
                })}

              {/* Conductor Bars (Ribbon Power Feeders) */}
              <line
                x1={center - radius * scale}
                y1={center}
                x2={center + radius * scale}
                y2={center}
                stroke="#D85A30"
                strokeWidth={2}
              />
              <line
                x1={center}
                y1={center - radius * scale}
                x2={center}
                y2={center + radius * scale}
                stroke="#D85A30"
                strokeWidth={2}
              />

              {/* Labels */}
              <text x={center} y={center - 10} fill="#D85A30" fontSize="9" textAnchor="middle" fontWeight="bold">
                Conductor Bars
              </text>
            </svg>

            <div style={{ marginTop: 16, fontSize: 12, color: 'var(--text-secondary)', display: 'flex', gap: 16 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ display: 'inline-block', width: 12, height: 2, background: 'var(--brand-mid, #3B8BD4)', borderStyle: 'dashed' }} />
                MMO Ribbon Anode
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ display: 'inline-block', width: 12, height: 2, background: '#D85A30' }} />
                Titanium Conductor
              </span>
            </div>
          </div>
        </SectionCard>
      </Grid2>
    </div>
  )
}
