/**
 * Input summary builders.
 *
 * Pure functions that compose an array of {label, value, unit, source}
 * items for the CalculationInputsUsed widget. All values are pre-
 * computed by the engine — these helpers just format them.
 */

function fmt(v, decimals = 2) {
  if (v == null || !Number.isFinite(v)) return '—'
  return Number(v).toFixed(decimals)
}

function fmtPct(frac) {
  if (frac == null || !Number.isFinite(frac)) return '—'
  return `${(frac * 100).toFixed(2)} %`
}

/**
 * Build the input list for a groundbed calculation.
 * @param {object} station
 * @param {object} project
 * @returns {Array<{label,value,unit,source}>}
 */
export function buildGroundbedInputsUsed(station, project) {
  if (!station) return []
  const gb = station.groundbed
  const r = station.lastCalcResult
  const db = project?.designBasis || {}
  const items = []

  // Groundbed type and geometry
  if (gb?.type) {
    items.push({
      label: 'Groundbed type',
      value: gb.type === 'deepwell' ? 'Deep well' : gb.type === 'shallow_vertical' ? 'Shallow vertical' : 'Distributed (horizontal)',
    })
  }
  if (gb?.startDepthM != null) {
    items.push({ label: 'Start depth', value: fmt(gb.startDepthM, 2), unit: 'm' })
  }
  if (gb?.anodeLengthM != null) {
    items.push({ label: 'Anode length', value: fmt(gb.anodeLengthM, 2), unit: 'm' })
  }
  if (gb?.anodeSpacingM != null) {
    items.push({ label: 'Anode spacing', value: fmt(gb.anodeSpacingM, 2), unit: 'm' })
  }
  if (gb?.boreholeDiaM != null) {
    items.push({ label: 'Borehole diameter', value: fmt(gb.boreholeDiaM, 2), unit: 'm' })
  }
  if (station.proposedAnodes != null) {
    items.push({ label: 'Proposed anodes', value: N(station.proposedAnodes) })
  }

  // Anode spec
  if (station.anodeSpec) {
    items.push({
      label: 'Anode spec',
      value: station.anodeSpec.label || station.anodeSpec.id,
      source: station.anodeSpec.id,
    })
  }

  // Design-basis-driven values
  const soilRho = db.soilResistivityOhmCm ?? station.soilResistivityOhmCm
  if (soilRho != null) {
    const source = db.soilResistivityOhmCm != null ? 'Central design settings' : 'Station override'
    items.push({
      label: 'Soil resistivity (ρ)',
      value: soilRho.toLocaleString(),
      unit: 'Ω·cm',
      source,
    })
  }
  if (db.systemDesignLifeYears != null) {
    items.push({
      label: 'Target design life',
      value: db.systemDesignLifeYears,
      unit: 'yrs',
      source: 'Central design settings',
    })
  }

  // Result context
  if (r?.groundbedResistanceOhm != null) {
    items.push({ label: 'R_G (calculated)', value: fmt(r.groundbedResistanceOhm, 4), unit: 'Ω' })
  }
  if (r?.activeLengthM != null) {
    items.push({ label: 'Active length L_a', value: fmt(r.activeLengthM, 2), unit: 'm' })
  }

  return items
}

/**
 * Build the input list for a cable resistance calculation.
 * @param {object} station
 * @param {object} project
 * @returns {Array<{label,value,unit,source}>}
 */
export function buildCableInputsUsed(station, project) {
  if (!station) return []
  const cb = station.cables
  const tr = station.tr
  const r = station.lastCalcResult
  const items = []

  if (tr) {
    items.push({ label: 'TR rated voltage', value: fmt(tr.ratedVoltage, 1), unit: 'V' })
    items.push({ label: 'TR rated current', value: fmt(tr.ratedCurrent, 2), unit: 'A' })
  }
  if (cb) {
    if (cb.anodeCableSizeMm2 != null) {
      items.push({ label: 'Anode tail cable size', value: `${cb.anodeCableSizeMm2}`, unit: 'mm²' })
    }
    if (Array.isArray(cb.anodeTailLengths)) {
      const total = cb.anodeTailLengths.reduce((a, b) => a + (Number(b) || 0), 0)
      items.push({ label: 'Anode tail length (sum)', value: fmt(total, 1), unit: 'm' })
    }
    items.push({ label: 'Positive main length', value: fmt(cb.posMainLengthM, 1), unit: 'm' })
    if (cb.posMainSizeMm2 != null) items.push({ label: 'Positive main size', value: `${cb.posMainSizeMm2}`, unit: 'mm²' })
    items.push({ label: 'Negative main length', value: fmt(cb.negMainLengthM, 1), unit: 'm' })
    if (cb.negMainSizeMm2 != null) items.push({ label: 'Negative main size', value: `${cb.negMainSizeMm2}`, unit: 'mm²' })
    items.push({ label: 'Negative secondary length', value: fmt(cb.negSecLengthM, 1), unit: 'm' })
  }
  if (station.groundbedResistanceOhmCm != null || r?.groundbedResistanceOhm != null) {
    items.push({ label: 'R_G (earth return)', value: fmt(r?.groundbedResistanceOhm, 4), unit: 'Ω' })
  }
  if (r?.totalCableResOhm != null) {
    items.push({ label: 'R_c (total cable)', value: fmt(r.totalCableResOhm, 4), unit: 'Ω' })
  }
  return items
}

/**
 * Build the input list for an attenuation calculation.
 * @param {object} input - attenuationInput from the store
 * @param {object} project
 * @returns {Array<{label,value,unit,source}>}
 */
export function buildAttenuationInputsUsed(input, project) {
  if (!input) return []
  const items = []
  if (input.pipe) {
    if (input.pipe.diameterInches != null) items.push({ label: 'Pipe diameter', value: fmt(input.pipe.diameterInches, 2), unit: 'in' })
    if (input.pipe.wallThicknessInches != null) items.push({ label: 'Wall thickness', value: fmt(input.pipe.wallThicknessInches, 3), unit: 'in' })
    if (input.pipe.totalLengthKm != null) items.push({ label: 'Total length', value: fmt(input.pipe.totalLengthKm, 2), unit: 'km' })
    if (input.pipe.maxProtectionLengthKm != null) items.push({ label: 'Max protection length', value: fmt(input.pipe.maxProtectionLengthKm, 2), unit: 'km' })
    if (input.pipe.steelResistivityMicroOhmCm != null) items.push({ label: 'Steel resistivity', value: fmt(input.pipe.steelResistivityMicroOhmCm, 2), unit: 'µΩ·cm' })
  }
  if (input.coating) {
    if (input.coating.conductivityMicroSiemensPerM2 != null) items.push({ label: 'Coating conductivity', value: fmt(input.coating.conductivityMicroSiemensPerM2, 1), unit: 'µS/m²' })
    if (input.coating.soilResistivityOhmCm != null) {
      const source = project?.designBasis?.soilResistivityOhmCm != null ? 'Central design settings' : 'Page input'
      items.push({ label: 'Soil resistivity', value: input.coating.soilResistivityOhmCm.toLocaleString(), unit: 'Ω·cm', source })
    }
    if (input.coating.currentDensityMaPerM2 != null) items.push({ label: 'Current density', value: fmt(input.coating.currentDensityMaPerM2, 3), unit: 'mA/m²' })
  }
  if (input.potentials) {
    if (input.potentials.naturalMv != null) items.push({ label: 'Natural potential', value: fmt(input.potentials.naturalMv, 0), unit: 'mV' })
    if (input.potentials.drainPointMv != null) items.push({ label: 'Drain point potential', value: fmt(input.potentials.drainPointMv, 0), unit: 'mV' })
    if (input.potentials.minimumMv != null) items.push({ label: 'Minimum protection', value: fmt(input.potentials.minimumMv, 0), unit: 'mV', source: 'NACE 850 mV' })
  }
  if (input.profileConfig) {
    if (input.profileConfig.startKm != null) items.push({ label: 'Profile start', value: fmt(input.profileConfig.startKm, 1), unit: 'km' })
    if (input.profileConfig.endKm != null) items.push({ label: 'Profile end', value: fmt(input.profileConfig.endKm, 1), unit: 'km' })
  }
  if (Array.isArray(input.stations)) {
    items.push({ label: 'CP stations', value: N(input.stations.length) })
  }
  return items
}

function N(v) {
  if (v == null || !Number.isFinite(v)) return '—'
  return Math.round(v).toString()
}
