import { useEffect } from 'react'
import { useProjectStore } from '../store/projectStore.js'
import {
  FieldInput,
  SelectField,
  ResultRow,
  SectionCard,
  Divider,
  Grid2,
} from '../components/ui.jsx'
import { Shield, Zap, Layers, BarChart3 } from 'lucide-react'

export function PageVessel() {
  const project = useProjectStore((s) => s.getProject())
  const vessel = project.vessel || {}
  const updateVesselParameters = useProjectStore((s) => s.updateVesselParameters)
  const runVesselCalculations = useProjectStore((s) => s.runVesselCalculations)

  // Bind values from store
  const length = vessel.length ?? 8.0
  const diameter = vessel.diameter ?? 2.4
  const currentDensity = vessel.currentDensity ?? 30
  const electrolyteResistivity = vessel.electrolyteResistivity ?? 80
  const anodeType = vessel.anodeType ?? 'al_zn_in'
  const anodeQty = vessel.anodeQty ?? 6
  const drivingVoltageMode = vessel.drivingVoltageMode ?? 'polarized'
  const systemDesignLife = project.designBasis.systemDesignLifeYears ?? 25

  // Run calculations in useEffect when inputs change
  useEffect(() => {
    runVesselCalculations()
  }, [length, diameter, currentDensity, electrolyteResistivity, anodeType, anodeQty, drivingVoltageMode, runVesselCalculations])

  // Get outputs from store or use fallback if not run yet
  const lastCalcResult = vessel.lastCalcResult || {}
  const totalArea = lastCalcResult.totalArea ?? (Math.PI * diameter * length + 2 * Math.PI * Math.pow(diameter / 2, 2))
  const reqCurrent = lastCalcResult.reqCurrent ?? ((totalArea * currentDensity) / 1000)
  const designCurrent = lastCalcResult.designCurrent ?? (reqCurrent * 1.3)
  const anodeResistance = lastCalcResult.anodeResistance ?? 0
  const outputCurrentPerAnode = lastCalcResult.outputCurrentPerAnode ?? 0
  const totalOutputCapacity = lastCalcResult.totalOutputCapacity ?? 0
  const expectedLife = lastCalcResult.expectedLife ?? 0

  // Anode specs database
  const ANODE_SPECS = {
    al_zn_in: {
      label: 'Al-Zn-In (Galvalum III) - 4.5kg, 300mm',
      weightKg: 4.5,
      lengthMm: 300,
      radiusMm: 45,
      consumptionRate: 3.4, // kg/A-yr
      drivingVoltageV: drivingVoltageMode === 'bare' ? 0.45 : 0.25, // vs protected steel (-1.05V vs -0.80V/bare -0.60V)
      utilizationFactor: 0.85,
    },
    zinc_high_pure: {
      label: 'High-Purity Zinc - 6.0kg, 400mm',
      weightKg: 6.0,
      lengthMm: 400,
      radiusMm: 35,
      consumptionRate: 11.8, // kg/A-yr
      drivingVoltageV: drivingVoltageMode === 'bare' ? 0.45 : 0.25, // vs protected steel
      utilizationFactor: 0.85,
    },
    magnesium_h1: {
      label: 'Magnesium H-1 (High Potential) - 4.0kg, 350mm',
      weightKg: 4.0,
      lengthMm: 350,
      radiusMm: 50,
      consumptionRate: 17.7, // kg/A-yr
      drivingVoltageV: drivingVoltageMode === 'bare' ? 0.90 : 0.70, // vs protected steel (-1.50V vs -0.80V/bare -0.60V)
      utilizationFactor: 0.50,
    },
  }

  const spec = ANODE_SPECS[anodeType] || ANODE_SPECS.al_zn_in

  // SVG parameters
  const svgW = 340
  const svgH = 180
  const vScaleX = (svgW - 60) / length
  const vScaleY = (svgH - 60) / diameter
  const scale = Math.min(vScaleX, vScaleY)

  const vesselW = length * scale
  const vesselH = diameter * scale
  const offsetX = (svgW - vesselW) / 2
  const offsetY = (svgH - vesselH) / 2

  // Generate anode locations inside the vessel for visualization
  const anodes = []
  if (anodeQty > 0) {
    const spacing = vesselW / (anodeQty + 1)
    for (let i = 1; i <= anodeQty; i++) {
      anodes.push({
        x: offsetX + i * spacing,
        y: offsetY + vesselH / 2 + (i % 2 === 0 ? -vesselH / 4 : vesselH / 4),
      })
    }
  }

  return (
    <div className="page">
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>Raxa Vessel</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
          Internal/external cathodic protection designer for pressure vessels and separators
        </p>
      </div>

      <Grid2>
        <SectionCard title="Vessel Parameters" icon={Shield}>
          <FieldInput
            label="Vessel Length"
            value={length}
            type="number"
            unit="m"
            min={1}
            max={30}
            step={0.5}
            onChange={(v) => updateVesselParameters({ length: Math.max(1, parseFloat(v) || 8.0) })}
          />
          <FieldInput
            label="Vessel Diameter"
            value={diameter}
            type="number"
            unit="m"
            min={0.5}
            max={10}
            step={0.1}
            onChange={(v) => updateVesselParameters({ diameter: Math.max(0.5, parseFloat(v) || 2.4) })}
          />
          <FieldInput
            label="Design Current Density"
            value={currentDensity}
            type="number"
            unit="mA/m²"
            min={1}
            max={100}
            onChange={(v) => updateVesselParameters({ currentDensity: Math.max(1, parseFloat(v) || 30) })}
          />
          <FieldInput
            label="Electrolyte Resistivity"
            value={electrolyteResistivity}
            type="number"
            unit="Ω·cm"
            min={10}
            onChange={(v) => updateVesselParameters({ electrolyteResistivity: Math.max(1, parseInt(v) || 80) })}
          />
        </SectionCard>

        <SectionCard title="Anode System Configuration" icon={Layers}>
          <SelectField
            label="Anode Type (Sacrificial)"
            value={anodeType}
            onChange={(v) => updateVesselParameters({ anodeType: v })}
            options={Object.keys(ANODE_SPECS).map((k) => ({
              value: k,
              label: ANODE_SPECS[k].label,
            }))}
          />
          <FieldInput
            label="Proposed Quantity"
            value={anodeQty}
            type="number"
            min={1}
            max={50}
            onChange={(v) => updateVesselParameters({ anodeQty: Math.max(1, parseInt(v) || 6) })}
          />
          <SelectField
            label="Steel Condition (Driving Voltage)"
            value={drivingVoltageMode}
            onChange={(v) => updateVesselParameters({ drivingVoltageMode: v })}
            options={[
              { value: 'polarized', label: `Polarized Steel (ΔE = ${anodeType === 'magnesium_h1' ? '0.70V' : '0.25V'})` },
              { value: 'bare', label: `Bare Steel (ΔE = ${anodeType === 'magnesium_h1' ? '0.90V' : '0.45V'})` },
            ]}
          />
        </SectionCard>
      </Grid2>

      <Grid2 style={{ marginTop: 24 }}>
        <SectionCard title="Calculated Results" icon={BarChart3}>
          <ResultRow
            label="Vessel Internal Surface Area"
            symbol="A_total"
            value={totalArea.toFixed(1)}
            unit="m²"
            formula="A = π × D × L + 2 × (π × D² / 4)"
          />
          <ResultRow
            label="Required Protection Current"
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
            label="Anode Resistance (McCoy)"
            symbol="R_a"
            value={anodeResistance.toFixed(3)}
            unit="Ω"
            formula="McCoy: R_a = ρ / (2πL) × [ln(4L/r) − 1]"
          />
          <ResultRow
            label="Current Output per Anode"
            symbol="I_anode"
            value={outputCurrentPerAnode.toFixed(3)}
            unit="A"
            formula="I = ΔE / R_a"
          />
          <ResultRow
            label="Total Anode Output Capacity"
            symbol="I_cap"
            value={totalOutputCapacity.toFixed(3)}
            unit="A"
            formula="I_cap = N × I_anode"
            color={totalOutputCapacity < designCurrent ? 'var(--fail, #E24B4A)' : 'var(--pass, #1D9E75)'}
            highlight
          />
          <ResultRow
            label="Capacity Check"
            value={totalOutputCapacity >= designCurrent ? '✓ PASS: Output meets requirement' : '✗ FAIL: Insufficient output capacity'}
          />
          <Divider />
          <ResultRow
            label="Estimated Anode Design Life"
            symbol="Y"
            value={expectedLife.toFixed(1)}
            unit="years"
            formula="Y = (N × W × U) / (I_des × Consumption)"
            color={expectedLife < systemDesignLife ? 'var(--fail, #E24B4A)' : 'var(--pass, #1D9E75)'}
            highlight
          />
        </SectionCard>

        <SectionCard title="Vessel Internal Anode Distribution Layout" icon={Zap}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <svg
              width={svgW}
              height={svgH}
              style={{
                background: 'var(--bg-inset, #181716)',
                borderRadius: '8px',
                border: '1px solid var(--border, #312f2c)',
                boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.3)',
              }}
            >
              {/* Vessel Shell Body */}
              <rect
                x={offsetX}
                y={offsetY}
                width={vesselW}
                height={vesselH}
                rx={vesselH / 6}
                ry={vesselH / 6}
                fill="none"
                stroke="var(--text-secondary, #888780)"
                strokeWidth={3}
              />

              {/* Anodes distributed inside */}
              {anodes.map((anode, i) => (
                <g key={i}>
                  {/* Anode Mount Bar */}
                  <line
                    x1={anode.x}
                    y1={anode.y + (anode.y > offsetY + vesselH / 2 ? 10 : -10)}
                    x2={anode.x}
                    y2={anode.y > offsetY + vesselH / 2 ? offsetY + vesselH : offsetY}
                    stroke="#888780"
                    strokeWidth={1.5}
                  />
                  {/* Anode Body */}
                  <rect
                    x={anode.x - 5}
                    y={anode.y - 12}
                    width={10}
                    height={24}
                    rx={2}
                    fill="var(--brand-mid, #3B8BD4)"
                    stroke="var(--brand-dark, #1D6FB3)"
                    strokeWidth={1}
                  />
                  {/* Anode Index Label */}
                  <text
                    x={anode.x}
                    y={anode.y + 3}
                    fill="#fff"
                    fontSize="7"
                    textAnchor="middle"
                    fontWeight="bold"
                  >
                    {i + 1}
                  </text>
                </g>
              ))}

              {/* Central flow / separator details */}
              <path
                d={`M ${offsetX + 10} ${offsetY + vesselH / 2} L ${offsetX + vesselW - 10} ${offsetY + vesselH / 2}`}
                stroke="var(--border)"
                strokeWidth={1}
                strokeDasharray="5 5"
              />
            </svg>

            <div style={{ marginTop: 16, fontSize: 12, color: 'var(--text-secondary)', display: 'flex', gap: 16 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ display: 'inline-block', width: 10, height: 10, background: 'var(--brand-mid, #3B8BD4)', borderRadius: 2 }} />
                Sacrificial Anode
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ display: 'inline-block', width: 10, height: 2, background: '#888780' }} />
                Mounting Studs
              </span>
            </div>
          </div>
        </SectionCard>
      </Grid2>
    </div>
  )
}
