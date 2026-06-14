import { FORMULA_REGISTRY } from './formulaRegistry.js'

/**
 * CALCULATION TRACE ENGINE
 * Enriches the raw CP calculation output with a step-by-step mathematical trace,
 * detailing formula references, variable substitutions, intermediate results,
 * assumptions, and engineering standards.
 * 
 * Non-invasive — does not change any calculation values.
 */

/**
 * Build a full trace record from engine outputs.
 * 
 * @param {object} station - The calculated station
 * @param {object} project - The project context
 * @param {object} rawResult - Output of runStationCalculations
 * @param {object} inputAudit - The frozen input snapshot
 * @returns {object} TraceRecord
 */
export function buildTraceRecord(station, project, rawResult, inputAudit) {
  if (!rawResult || !inputAudit) return null

  const steps = [
    buildSurfaceAreaStep(station, rawResult),
    buildCurrentRequirementStep(station, project, rawResult),
    buildGroundbedResistanceStep(station, project, rawResult),
    buildCableResistanceStep(station, rawResult),
    buildTRSizingStep(station, rawResult),
    buildDesignLifeStep(station, rawResult),
    buildCokeRequirementStep(station, rawResult)
  ]

  const checks = rawResult.checks || []

  return {
    stationId: station.id,
    calculatedAt: inputAudit.capturedAt,
    standardId: inputAudit.standardId,
    inputAudit,
    steps,
    summary: {
      passCount: checks.filter(c => c.status === 'pass').length,
      failCount: checks.filter(c => c.status === 'fail').length,
      warnCount: checks.filter(c => c.status === 'warn').length,
    }
  }
}

function buildSurfaceAreaStep(station, rawResult) {
  const segments = station.pipelineSegments || []
  
  const intermediates = segments.map((seg) => {
    const odM = seg.od * 0.0254
    const area = Math.PI * odM * seg.lengthM
    return {
      label: `${seg.name} Area`,
      value: Number(area.toFixed(4)),
      unit: 'm²',
      description: `π × (${seg.od} in × 0.0254 m/in) × ${seg.lengthM} m`
    }
  })

  const totalArea = rawResult?.totalSurfaceAreaM2 ?? 0

  return {
    stepId: 'SURFACE_AREA',
    label: 'Pipeline Surface Area',
    formulaId: 'SURFACE_AREA',
    formula: FORMULA_REGISTRY.SURFACE_AREA,
    summary: {
      output: { name: 'totalSurfaceAreaM2', value: Number(totalArea.toFixed(4)), unit: 'm²' },
      formulaName: FORMULA_REGISTRY.SURFACE_AREA.label,
      standard: FORMULA_REGISTRY.SURFACE_AREA.standard,
      keyInputs: segments.map(seg => ({
        symbol: `L_${seg.name}`,
        label: `${seg.name} Length`,
        value: seg.lengthM,
        unit: 'm'
      })),
      validation: { criterion: 'Required for CD calculation', status: 'pass' }
    },
    detail: {
      substitution: segments.map(seg => {
        const odM = seg.od * 0.0254
        return `A_${seg.name} = π × (${seg.od} × 0.0254) × ${seg.lengthM} = ${((Math.PI * odM * seg.lengthM)).toFixed(2)} m²`
      }).join('\n'),
      intermediates,
      assumptions: [
        'Pipeline behaves as a perfect cylinder.',
        'Nominal outside diameter is uniform throughout the segment.'
      ],
      engineeringNotes: 'Used as the primary surface area for cathodic protection current density calculations.'
    }
  }
}

function buildCurrentRequirementStep(station, project, rawResult) {
  const segments = station.pipelineSegments || []
  const db = project?.designBasis || {}
  const standard = db.designStandard === 'nace' ? 'NACE SP0169' : 'Saudi Aramco (SAES-X-400)'
  const tempMethod = db.designStandard === 'nace' ? 'linear' : 'exponential'
  
  const intermediates = (rawResult?.perSegmentCurrents || []).map((psc) => {
    const seg = segments.find(s => s.id === psc.segmentId) || {}
    return {
      label: `${seg.name || 'Segment'} Current`,
      value: Number((psc.currentA || 0).toFixed(4)),
      unit: 'A',
      description: `(${psc.areaM2?.toFixed(2) ?? 0} m² × ${psc.iTempMam2?.toFixed(3) ?? 0} mA/m²) / 1000`
    }
  })

  const spareFactor = 1.30
  const reqCurrent = rawResult?.requiredCurrentA ?? 0
  const designCurrent = rawResult?.designCurrentA ?? 0
  const tempCD = rawResult?.tempCorrectedCurrentDensity ?? 0

  return {
    stepId: 'CURRENT_REQUIREMENT',
    label: 'Current Requirement Sizing',
    formulaId: 'CURRENT_REQUIREMENT',
    formula: FORMULA_REGISTRY.CURRENT_REQUIREMENT,
    summary: {
      output: { name: 'designCurrentA', value: Number(designCurrent.toFixed(3)), unit: 'A' },
      formulaName: FORMULA_REGISTRY.CURRENT_REQUIREMENT.label,
      standard: FORMULA_REGISTRY.CURRENT_REQUIREMENT.standard,
      keyInputs: [
        { symbol: 'I_req', label: 'Base Required Current', value: Number(reqCurrent.toFixed(3)), unit: 'A' },
        { symbol: 'SF', label: 'Design Spare Factor', value: spareFactor, unit: '' }
      ],
      validation: { criterion: `Design I = Required I × ${spareFactor}`, status: 'pass' }
    },
    detail: {
      substitution: `I_req = Σ(A_i × i_T_i) / 1000 = ${reqCurrent.toFixed(3)} A\nI_design = ${reqCurrent.toFixed(3)} × ${spareFactor} = ${designCurrent.toFixed(3)} A`,
      intermediates: [
        { label: 'Correction Method', value: tempMethod, unit: '' },
        { label: 'Reference Base Temp', value: 30, unit: '°C' },
        { label: 'Temperature CD Factor', value: Number(tempCD.toFixed(3)), unit: 'mA/m²' },
        ...intermediates
      ],
      assumptions: [
        'Coating breakdown is conservatively neglected to specify design current based on bare-equivalent requirement per SAES-X-400 practice.',
        'Design current incorporates a 30% spare capacity margin (Spare Factor = 1.30).'
      ],
      engineeringNotes: `Calculated using the ${standard} standard temperature correction. The exponential method yields a current density multiplier of 1.25 per 10°C rise above 30°C.`
    }
  }
}

function buildGroundbedResistanceStep(station, project, rawResult) {
  const gb = station.groundbed || {}
  const type = gb.type || 'deepwell'
  const N = station.proposedAnodes || 9
  const rho = station.soilResistivityOhmCm || 361
  const gbRes = rawResult?.groundbedResistanceOhm ?? 0
  const drillDepth = rawResult?.totalDrillDepthM ?? 0
  
  let formulaId
  let formulaLabel
  let substitution
  let intermediates
  
  if (type === 'deepwell') {
    formulaId = 'DWIGHT_DEEPWELL'
    formulaLabel = 'Dwight Deepwell Equation'
    const activeLength = N * (gb.anodeLengthM || 0) + Math.max(0, N - 1) * (gb.anodeSpacingM || 0)
    const topDepth = gb.startDepthM || 0
    const h = topDepth + activeLength / 2
    const rhoOhmM = rho / 100
    const d = gb.boreholeDiaM || 0.25
    
    substitution = `Rg = (${rhoOhmM} / 2π × ${activeLength.toFixed(2)}) × (ln(8 × ${activeLength.toFixed(2)} / ${d}) − 1 + ${activeLength.toFixed(2)} / (4 × ${h.toFixed(2)}))`
    intermediates = [
      { label: 'Soil Resistivity (SI)', value: rhoOhmM, unit: 'Ω·m' },
      { label: 'Active Column Length (L)', value: Number(activeLength.toFixed(2)), unit: 'm' },
      { label: 'Column Midpoint Depth (h)', value: Number(h.toFixed(2)), unit: 'm' },
      { label: 'Drill Depth', value: drillDepth, unit: 'm' }
    ]
  } else if (type === 'shallow_vertical') {
    formulaId = 'SUNDE_SHALLOW'
    formulaLabel = 'Sunde Shallow Parallel Equation'
    const L = gb.anodeLengthM || 0
    const d = gb.boreholeDiaM || 0.25
    const h = (gb.startDepthM || 0) + L / 2
    const rhoOhmM = rho / 100
    const S = L + (gb.anodeSpacingM || 0)
    
    const R_single = L > 0 && d > 0 && h > 0 ? (rhoOhmM / (2 * Math.PI * L)) * (Math.log((4 * L) / d) - 1 + L / (2 * h)) : 0
    
    let mutualSum = 0
    for (let i = 1; i < N; i++) {
      mutualSum += Math.log((2 * i * S) / (L || 1))
    }
    const R_mutual = L > 0 ? (rhoOhmM / (Math.PI * L * N * N)) * mutualSum : 0

    substitution = `R_single = (${rhoOhmM} / 2π×${L}) × (ln(4×${L}/${d}) - 1 + ${L}/(2×${h.toFixed(2)})) = ${R_single.toFixed(4)} Ω\n` +
                   `R_mutual = (${rhoOhmM} / π×${L}×${N}²) × ${mutualSum.toFixed(4)} = ${R_mutual.toFixed(4)} Ω\n` +
                   `Rg = ${R_single.toFixed(4)} / ${N} + ${R_mutual.toFixed(4)}`
    
    intermediates = [
      { label: 'Soil Resistivity (SI)', value: rhoOhmM, unit: 'Ω·m' },
      { label: 'Single Anode Resistance', value: Number(R_single.toFixed(4)), unit: 'Ω' },
      { label: 'Mutual Interference Term', value: Number(R_mutual.toFixed(4)), unit: 'Ω' },
      { label: 'Anode Spacing (centre-to-centre)', value: S, unit: 'm' }
    ]
  } else {
    formulaId = 'DISTRIBUTED_GROUNDBED'
    formulaLabel = 'Distributed Groundbed Equation (Independent)'
    const L = gb.anodeLengthM || 0
    const d = gb.boreholeDiaM || 0.25
    const h = (gb.startDepthM || 0) + L / 2
    const rhoOhmM = rho / 100
    
    const R_single = L > 0 && d > 0 && h > 0 ? (rhoOhmM / (2 * Math.PI * L)) * (Math.log((4 * L) / d) - 1 + L / (2 * h)) : 0
    
    substitution = `R_single = (${rhoOhmM} / 2π×${L}) × (ln(4×${L}/${d}) - 1 + ${L}/(2×${h.toFixed(2)})) = ${R_single.toFixed(4)} Ω\n` +
                   `Rg = R_single / N = ${R_single.toFixed(4)} / ${N}`

    intermediates = [
      { label: 'Soil Resistivity (SI)', value: rhoOhmM, unit: 'Ω·m' },
      { label: 'Single Anode Resistance', value: Number(R_single.toFixed(4)), unit: 'Ω' }
    ]
  }

  return {
    stepId: 'GROUNDBED_RESISTANCE',
    label: 'Groundbed Ground Resistance',
    formulaId,
    formula: FORMULA_REGISTRY[formulaId],
    summary: {
      output: { name: 'groundbedResistanceOhm', value: Number(gbRes.toFixed(4)), unit: 'Ω' },
      formulaName: formulaLabel,
      standard: FORMULA_REGISTRY[formulaId].standard,
      keyInputs: [
        { symbol: 'ρ', label: 'Resistivity', value: rho, unit: 'Ω·cm' },
        { symbol: 'N', label: 'Anodes', value: N, unit: '' },
        { symbol: 'L_anode', label: 'Anode Length', value: gb.anodeLengthM, unit: 'm' }
      ],
      validation: { criterion: '< 1.0 Ω (Aramco Target)', status: gbRes < 1.0 ? 'pass' : 'warn' }
    },
    detail: {
      substitution,
      intermediates,
      assumptions: [
        'Resistivity is uniform across the entire depth of the active column.',
        'Backfill column is fully compacted with petroleum coke breeze.'
      ],
      engineeringNotes: 'Mutual electrostatic interference between parallel anodes is detailed based on the groundbed configuration type.'
    }
  }
}

function buildCableResistanceStep(station, rawResult) {
  const cables = station.cables || {}
  const totalCable = rawResult?.totalCableResOhm ?? 0
  const tailsParallel = rawResult?.anodeTailParallelResOhm ?? 0
  const posMain = rawResult?.posMainCableResOhm ?? 0
  const negMain = rawResult?.negMainCableResOhm ?? 0

  return {
    stepId: 'CABLE_RESISTANCE',
    label: 'Conductor Resistance',
    formulaId: 'CABLE_RESISTANCE',
    formula: FORMULA_REGISTRY.CABLE_RESISTANCE,
    summary: {
      output: { name: 'totalCableResOhm', value: Number(totalCable.toFixed(4)), unit: 'Ω' },
      formulaName: FORMULA_REGISTRY.CABLE_RESISTANCE.label,
      standard: FORMULA_REGISTRY.CABLE_RESISTANCE.standard,
      keyInputs: [
        { symbol: 'posMain', label: 'Pos Main Length', value: cables.posMainLengthM, unit: 'm' },
        { symbol: 'negMain', label: 'Neg Main Length', value: cables.negMainLengthM, unit: 'm' }
      ],
      validation: { criterion: 'Aggregated copper resistance', status: 'pass' }
    },
    detail: {
      substitution: `R_cable = R_tails (${tailsParallel.toFixed(4)} Ω) + ` +
                     `R_pos_main (${posMain.toFixed(4)} Ω) + ` +
                     `R_neg_main (${negMain.toFixed(4)} Ω) = ${totalCable.toFixed(4)} Ω`,
      intermediates: [
        { label: 'Anode Cable Size', value: cables.anodeCableSizeMm2, unit: 'mm²' },
        { label: 'Pos Main Cable Size', value: cables.posMainSizeMm2, unit: 'mm²' },
        { label: 'Neg Main Cable Size', value: cables.negMainSizeMm2, unit: 'mm²' },
        { label: 'Tails Parallel Resistance', value: Number(tailsParallel.toFixed(4)), unit: 'Ω' },
        { label: 'Positive Main Resistance', value: Number(posMain.toFixed(4)), unit: 'Ω' },
        { label: 'Negative Main Resistance', value: Number(negMain.toFixed(4)), unit: 'Ω' }
      ],
      assumptions: [
        'Conductors are pure annealed copper operating at standard operating temperature.',
        'Parallel resistances are calculated based on identical anode tail cables.'
      ],
      engineeringNotes: 'Cable sizing matches IEC 60287 copper resistivity specifications.'
    }
  }
}

function buildTRSizingStep(station, rawResult) {
  const tr = station.tr || {}
  const minTRVolt = rawResult?.minTRVoltage ?? 0
  const gbRes = rawResult?.groundbedResistanceOhm ?? 0
  const cableRes = rawResult?.totalCableResOhm ?? 0
  const backEMFRes = rawResult?.backEMFResistanceOhm ?? 0
  const totalCircuitRes = rawResult?.totalCircuitResistanceOhm ?? 0
  const acKVA = rawResult?.acInputKVA ?? 0
  const acCurrent = rawResult?.acInputCurrentA ?? 0
  const maxGBRes = rawResult?.maxAllowableGroundbedRes ?? 0

  const ratedVolts = tr.ratedVoltage || 30
  const ratedAmps = tr.ratedCurrent || 25
  const backEMF = tr.backEMF !== undefined ? tr.backEMF : 2.0
  const structureResistance = tr.structureResistance !== undefined ? tr.structureResistance : 0.055

  return {
    stepId: 'TR_CIRCUIT_ANALYSIS',
    label: 'TR Rectifier Voltage Sizing',
    formulaId: 'TR_CIRCUIT_ANALYSIS',
    formula: FORMULA_REGISTRY.TR_CIRCUIT_ANALYSIS,
    summary: {
      output: { name: 'minTRVoltage', value: Number(minTRVolt.toFixed(2)), unit: 'V' },
      formulaName: FORMULA_REGISTRY.TR_CIRCUIT_ANALYSIS.label,
      standard: FORMULA_REGISTRY.TR_CIRCUIT_ANALYSIS.standard,
      keyInputs: [
        { symbol: 'V_emf', label: 'Back EMF', value: backEMF, unit: 'V' },
        { symbol: 'R_G', label: 'Groundbed R', value: Number(gbRes.toFixed(4)), unit: 'Ω' },
        { symbol: 'I_rated', label: 'TR Current', value: ratedAmps, unit: 'A' }
      ],
      validation: { criterion: `Voltage Margin: ${((ratedVolts - minTRVolt) / (ratedVolts || 1) * 100).toFixed(1)}%`, status: ratedVolts >= minTRVolt ? 'pass' : 'fail' }
    },
    detail: {
      substitution: `R_emf = ${backEMF} V / ${ratedAmps} A = ${backEMFRes.toFixed(4)} Ω\n` +
                     `R_total = ${gbRes.toFixed(4)} (R_G) + ${cableRes.toFixed(4)} (R_c) + ${backEMFRes.toFixed(4)} (R_emf) + ${structureResistance} (R_s) = ${totalCircuitRes.toFixed(4)} Ω\n` +
                     `V_min = ${totalCircuitRes.toFixed(4)} × ${ratedAmps} + ${backEMF} = ${minTRVolt.toFixed(2)} V`,
      intermediates: [
        { label: 'Effective Back-EMF Resistance', value: Number(backEMFRes.toFixed(4)), unit: 'Ω' },
        { label: 'Total Circuit Loop Resistance', value: Number(totalCircuitRes.toFixed(4)), unit: 'Ω' },
        { label: 'AC Input Apparent Power', value: Number(acKVA.toFixed(3)), unit: 'kVA' },
        { label: 'AC Input Operating Current', value: Number(acCurrent.toFixed(2)), unit: 'A' },
        { label: 'Max allowable R_G (70% limit)', value: Number(maxGBRes.toFixed(3)), unit: 'Ω' }
      ],
      assumptions: [
        'Back-EMF is modeled as an equivalent constant series resistance under rated current load.',
        'Sizing accounts for 70% of maximum voltage rating for operating headroom per SAES-X-600.'
      ],
      engineeringNotes: 'Total loop resistance calculation maps structure resistance, groundbed resistance, cable resistance, and the effective counter-electromotive force.'
    }
  }
}

function buildDesignLifeStep(station, rawResult) {
  const spec = station.anodeSpec || {}
  const N = station.proposedAnodes || 9
  const tr = station.tr || {}
  const life = rawResult?.designLifeYears ?? 0
  const targetLife = rawResult?.targetDesignLifeYears ?? 25

  const standardUf = 0.85
  const anodeWeight = spec.weightKg || spec.unitWeightKg || 0
  const consumptionRate = spec.consumptionRate || spec.consumptionRateKgAmpYear || 0.001
  const ratedAmps = tr.ratedCurrent || 25

  return {
    stepId: 'DESIGN_LIFE',
    label: 'Anode Bed Design Life',
    formulaId: 'DESIGN_LIFE',
    formula: FORMULA_REGISTRY.DESIGN_LIFE,
    summary: {
      output: { name: 'designLifeYears', value: Number(life.toFixed(1)), unit: 'years' },
      formulaName: FORMULA_REGISTRY.DESIGN_LIFE.label,
      standard: FORMULA_REGISTRY.DESIGN_LIFE.standard,
      keyInputs: [
        { symbol: 'N', label: 'Anode Qty', value: N, unit: '' },
        { symbol: 'W', label: 'Anode Weight', value: anodeWeight, unit: 'kg' },
        { symbol: 'I_rated', label: 'TR Rated Current', value: ratedAmps, unit: 'A' }
      ],
      validation: { criterion: `>= ${targetLife} years`, status: life >= targetLife ? 'pass' : 'warn' }
    },
    detail: {
      substitution: `Life = (${N} anodes × ${anodeWeight} kg × ${standardUf}) / (${consumptionRate} kg/A·yr × ${ratedAmps} A) = ${life.toFixed(1)} years`,
      intermediates: [
        { label: 'Individual Anode Mass', value: anodeWeight, unit: 'kg' },
        { label: 'Consumption Rate', value: consumptionRate, unit: 'kg/A·yr' },
        { label: 'Utilization Factor (U_f)', value: standardUf, unit: '' },
        { label: 'Target Design Life', value: targetLife, unit: 'years' }
      ],
      assumptions: [
        'Anodes are consumed uniformly throughout their active lifetime.',
        'Operating current matches the rated current capacity of the rectifier.'
      ],
      engineeringNotes: 'Calculated using standard chemical consumption models per NACE SP0169. High temperature and environmental degradation are factored in consumption rate.'
    }
  }
}

function buildCokeRequirementStep(station, rawResult) {
  const gb = station.groundbed || {}
  const N = station.proposedAnodes || 9
  const activeLength = rawResult?.activeLengthM ?? 0
  const bagsBase = rawResult?.cokeBagsBase ?? 0
  const bagsWithContingency = rawResult?.cokeBagsWithContingency ?? 0

  return {
    stepId: 'COKE_REQUIREMENT',
    label: 'Coke Breeze Backfill Sizing',
    formulaId: 'COKE_REQUIREMENT',
    formula: FORMULA_REGISTRY.COKE_REQUIREMENT,
    summary: {
      output: { name: 'cokeBagsWithContingency', value: bagsWithContingency, unit: 'bags' },
      formulaName: FORMULA_REGISTRY.COKE_REQUIREMENT.label,
      standard: FORMULA_REGISTRY.COKE_REQUIREMENT.standard,
      keyInputs: [
        { symbol: 'L_col', label: 'Active Column L', value: Number(activeLength.toFixed(2)), unit: 'm' },
        { symbol: 'N', label: 'Anodes', value: N, unit: '' }
      ],
      validation: { criterion: 'Handling Contingency Applied', status: 'pass' }
    },
    detail: {
      substitution: `Bags_base = CEILING((${activeLength.toFixed(2)} m × 3.28 ft/m × 39.2 lbs/ft) / 50 lbs/bag) = ${bagsBase} bags\n` +
                     `Bags_final = CEILING(${bagsBase} × contingency) = ${bagsWithContingency} bags`,
      intermediates: [
        { label: 'Bags Base (CEILING)', value: bagsBase, unit: 'bags' },
        { label: 'Bags with Contingency', value: bagsWithContingency, unit: 'bags' },
        { label: 'Active Borehole Length', value: Number(activeLength.toFixed(2)), unit: 'm' }
      ],
      assumptions: [
        'Borehole diameter is uniform throughout the active column.',
        'Standard bag weight is 50 lbs (22.68 kg).',
        'Contingency includes handling, settlement, and drilling washouts.'
      ],
      engineeringNotes: 'Coke breeze backfill provides a low-resistance path for cathodic protection current dispersion.'
    }
  }
}
