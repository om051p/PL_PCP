/**
 * BOM RULES ENGINE
 * BOM is generated from rules, not fixed tables.
 * Each design mode has its own BOM rule set.
 * Rules are evaluated against the calculation result.
 * Standard-driven: BOM references use the active standard's standardsReferences.
 */

import { STANDARDS } from '../../constants/index.js'

/**
 * Generate BOM for a station based on design mode and calc results.
 * @param {import('../../types').Station} station
 * @param {import('../../types').CalcResult} result
 * @param {object|null} [standardConfig=null] - Active standard configuration
 * @returns {import('../../types').BOMItem[]}
 */
export function generateBOM(station, result, standardConfig = null) {
  if (!result) return []

  const mode = station.groundbed.type
  const items = []
  const std = standardConfig || {}

  // Always required: TR Unit
  items.push(...bomRules_TRU(station, result, std))

  // Mode-specific groundbed
  if (mode === 'deepwell') items.push(...bomRules_Deepwell(station, result, std))
  else if (mode === 'shallow_vertical') items.push(...bomRules_ShallowVertical(station, result, std))
  else if (mode === 'distributed') items.push(...bomRules_Distributed(station, result, std))

  // Always required: cables
  items.push(...bomRules_Cables(station, result, std))

  // Always required: junction boxes, test stations, misc
  items.push(...bomRules_JunctionBoxes(station, result, std))
  items.push(...bomRules_TestStation(station, std))
  items.push(...bomRules_Misc(station, result, std))

  return items
}

// ─── TR Unit Rules ────────────────────────────────────────────────────────────

function bomRules_TRU(station, result, std = {}) {
  const V = station.tr.ratedVoltage
  const A = station.tr.ratedCurrent
  const kva = Math.ceil(result.acInputKVA * 10) / 10

  const sr = std.standardsReferences || {}
  const truStandard = sr.tru || STANDARDS.TRU
  const inputVoltage = std.trSizing?.inputVoltage || 480
  const inputPhase = std.trSizing?.inputPhases || 3

  return [
    {
      tag: 'TRU',
      description: `Transformer-Rectifier Unit, Oil-Cooled, NEMA4X, ${inputVoltage}V/${inputPhase}Φ Input, ${V}V/${A}A DC Output`,
      unit: 'Each',
      quantity: 1,
      standard: truStandard,
    },
    {
      tag: 'TRU',
      description: `CP Remote Monitoring Unit (RMU), Type-A`,
      unit: 'Each',
      quantity: 1,
      standard: truStandard,
    },
    {
      tag: 'TRU',
      description: `Transformer Oil (208 L/Drum)`,
      unit: 'Drum',
      quantity: kva <= 2 ? 2 : 3,
      notes: `Based on ${kva.toFixed(1)} kVA AC input`,
    },
    {
      tag: 'TRU',
      description: `AC Disconnecting Switch, ${inputVoltage}V/${inputPhase}Φ, ${Math.ceil(result.acInputCurrentA * 1.25)}A`,
      unit: 'Each',
      quantity: 1,
    },
    {
      tag: 'TRU',
      description: `AC Distribution Panel with MCBs`,
      unit: 'Each',
      quantity: 1,
    },
  ]
}

// ─── Deepwell Groundbed Rules ─────────────────────────────────────────────────

function bomRules_Deepwell(station, result, std = {}) {
  const N = station.proposedAnodes
  const gb = station.groundbed
  const items = []

  const sr = std.standardsReferences || {}
  const anodeStandard = sr.anode || STANDARDS.ANODE
  const cokeStandard = sr.cokeBackfill || STANDARDS.COKE_BACKFILL
  const cb = std.cokeBackfill || {}
  const contingency = ((cb.contingency ?? 1.15) - 1) * 100
  // Anodes with individual tail cables
  station.cables.anodeTailLengths.slice(0, N).forEach((len, i) => {
    items.push({
      tag: 'Anode',
      description: `Anode-${i + 1}: ${station.anodeSpec.label || 'HSCI Tubular TA-4'}, c/w ${len}m, 16mm² PVDF/HMWPE Tail Cable, Centralizer`,
      unit: 'Each',
      quantity: 1,
      standard: anodeStandard,
    })
  })

  // Coke backfill
  const cokeBags = result.cokeBagsWithContingency || 0
  items.push({
    tag: 'Backfill',
    description: `Calcined Petroleum Coke Breeze Backfill, 50lb (22.7kg) Bags, per Std. ${cokeStandard}`,
    unit: 'Bag (50lb)',
    quantity: cokeBags,
    standard: cokeStandard,
    notes: `Based on active length ${result.activeLengthM}m. Base: ${result.cokeBagsBase || '?'} bags +${contingency.toFixed(0)}% contingency`,
  })

  // Vent pipe
  items.push({
    tag: 'Deepwell',
    description: `Vent Pipe, PVC Sch-80, 25mm ID, perforated`,
    unit: 'm',
    quantity: Math.ceil(result.totalDrillDepthM),
  })

  // Centralizers
  items.push({
    tag: 'Deepwell',
    description: `Anode Centralizers, HDPE`,
    unit: 'Each',
    quantity: N * 2,
  })

  // Well cap / surface completion
  items.push({
    tag: 'Deepwell',
    description: `Wellhead Completion Assembly, SS 316L, c/w watertight cable exit`,
    unit: 'Each',
    quantity: 1,
  })

  // Cement plug (if required)
  if (gb.cementPlugM > 0) {
    items.push({
      tag: 'Deepwell',
      description: `Portland Cement for Bottom Plug (${gb.cementPlugM}m)`,
      unit: 'Bag (40kg)',
      quantity: Math.ceil(
        (Math.PI * Math.pow(gb.boreholeDiaM / 2, 2) * gb.cementPlugM * 1500) / 40,
      ),
    })
  }

  return items
}

// ─── Shallow Vertical Groundbed Rules ────────────────────────────────────────

function bomRules_ShallowVertical(station, result, std = {}) {
  const N = station.proposedAnodes
  const items = []

  const sr = std.standardsReferences || {}
  const anodeStandard = sr.anode || STANDARDS.ANODE
  const cokeStandard = sr.cokeBackfill || STANDARDS.COKE_BACKFILL
  const cb = std.cokeBackfill || {}
  const contingency = ((cb.contingency ?? 1.15) - 1) * 100
  station.cables.anodeTailLengths.slice(0, N).forEach((len, i) => {
    items.push({
      tag: 'Anode',
      description: `Anode-${i + 1}: ${station.anodeSpec.label || 'HSCI Tubular TA-4'}, c/w ${len}m, 16mm² PVDF/HMWPE Tail Cable`,
      unit: 'Each',
      quantity: 1,
      standard: anodeStandard,
    })
  })

  // Coke backfill
  const cokeBags = result.cokeBagsWithContingency || 0
  items.push({
    tag: 'Backfill',
    description: `Calcined Petroleum Coke Breeze Backfill, 50lb (22.7kg) Bags, per Std. ${cokeStandard}`,
    unit: 'Bag (50lb)',
    quantity: cokeBags,
    standard: cokeStandard,
    notes: `${N} holes × active length per hole. Base: ${result.cokeBagsBase || '?'} bags +${contingency.toFixed(0)}% contingency`,
  })

  return items
}

// ─── Distributed Groundbed Rules ─────────────────────────────────────────────

function bomRules_Distributed(station, result, std = {}) {
  const N = station.proposedAnodes
  const items = []

  const sr = std.standardsReferences || {}
  const anodeStandard = sr.anode || STANDARDS.ANODE
  const cokeStandard = sr.cokeBackfill || STANDARDS.COKE_BACKFILL
  const cb = std.cokeBackfill || {}
  const contingency = ((cb.contingency ?? 1.15) - 1) * 100
  station.cables.anodeTailLengths.slice(0, N).forEach((len, i) => {
    items.push({
      tag: 'Anode',
      description: `Anode-${i + 1}: ${station.anodeSpec.label || 'HSCI Tubular TA-4'}, distributed along pipeline, c/w ${len}m cable`,
      unit: 'Each',
      quantity: 1,
      standard: anodeStandard,
    })
  })

  // Coke backfill
  const cokeBags = result.cokeBagsWithContingency || 0
  items.push({
    tag: 'Backfill',
    description: `Calcined Petroleum Coke Breeze Backfill, 50lb (22.7kg) Bags, per Std. ${cokeStandard}`,
    unit: 'Bag (50lb)',
    quantity: cokeBags,
    standard: cokeStandard,
    notes: `${N} distributed anodes. Base: ${result.cokeBagsBase || '?'} bags +${contingency.toFixed(0)}% contingency`,
  })

  return items
}

// ─── Cable Rules ──────────────────────────────────────────────────────────────

function bomRules_Cables(station, result, std = {}) {
  const cb = station.cables
  const N = station.proposedAnodes
  const sr = std.standardsReferences || {}
  const cableStandard = sr.cable || STANDARDS.CABLE

  // Total anode tail cable length
  const totalTailLen = cb.anodeTailLengths.slice(0, N).reduce((a, b) => a + b, 0)

  return [
    {
      tag: 'Cable +ve',
      description: `Anode Tail Cable, 16mm² PVDF/HMWPE, 600V, Black`,
      unit: 'm',
      quantity: Math.ceil(totalTailLen * 1.05), // +5% cutting waste
      standard: cableStandard,
      notes: `${N} anode tails, total ${totalTailLen}m +5% waste`,
    },
    {
      tag: 'Cable +ve',
      description: `Main Positive Cable, ${cb.posMainSizeMm2}mm² PVDF/HMWPE, 600V, Red`,
      unit: 'm',
      quantity: Math.ceil(cb.posMainLengthM * 1.05),
      standard: cableStandard,
    },
    {
      tag: 'Cable -ve',
      description: `Main Negative Cable, ${cb.negMainSizeMm2}mm² HMWPE, 600V, Black`,
      unit: 'm',
      quantity: Math.ceil(cb.negMainLengthM * 1.05),
      standard: cableStandard,
    },
    {
      tag: 'Cable -ve',
      description: `Secondary Negative Cable, ${cb.negSecSizeMm2}mm² HMWPE, 600V, Black`,
      unit: 'm',
      quantity: Math.ceil(cb.negSecLengthM * 1.05),
      standard: cableStandard,
    },
  ]
}

// ─── Junction Box Rules ───────────────────────────────────────────────────────

function bomRules_JunctionBoxes(station, result, std = {}) {
  const N = station.proposedAnodes
  const boxSize = N <= 12 ? '12-terminal' : '20-terminal'
  const sr = std.standardsReferences || {}
  const jbStandard = sr.junctionBox || STANDARDS.JUNCTION_BOX

  return [
    {
      tag: 'Junction Box',
      description: `Anode Junction Box, ${boxSize}, SS316L, NEMA4X, c/w terminal blocks`,
      unit: 'Each',
      quantity: 1,
      standard: jbStandard,
    },
    {
      tag: 'Junction Box',
      description: `Negative Junction Box, 5-Terminal, SS316L, NEMA4X`,
      unit: 'Each',
      quantity: 1,
      standard: jbStandard,
    },
  ]
}

// ─── Test Station Rules ───────────────────────────────────────────────────────

function bomRules_TestStation(station, std = {}) {
  const sr = std.standardsReferences || {}
  const tsStandard = sr.testStation || STANDARDS.TEST_STATION

  return [
    {
      tag: 'Test Station',
      description: `Permanent Reference Electrode, Cu/CuSO₄, c/w 150m Reference Cable`,
      unit: 'Each',
      quantity: 1,
      standard: tsStandard,
    },
    {
      tag: 'Test Station',
      description: `Single-Pin CP Test Station (Drain Point)`,
      unit: 'Each',
      quantity: 1,
      standard: tsStandard,
    },
  ]
}

// ─── Miscellaneous Rules ──────────────────────────────────────────────────────

function bomRules_Misc(station) {
  const N = station.proposedAnodes
  return [
    {
      tag: 'Misc',
      description: `Thermoweld Mold CA-15, c/w Charges`,
      unit: 'Each',
      quantity: 1,
    },
    {
      tag: 'Misc',
      description: `Thermoweld Charges CA-15`,
      unit: 'Charge',
      quantity: Math.ceil(N * 2 + 10),
      notes: `2 connections per anode + 10 spare`,
    },
    {
      tag: 'Misc',
      description: `Cable Warning Tape, 18", Red/Yellow, 200m Roll`,
      unit: 'Roll',
      quantity:
        Math.ceil((station.cables.posMainLengthM + station.cables.negMainLengthM) / 200) + 1,
    },
    {
      tag: 'Misc',
      description: `Cable Route Markers, Redwood 100×100×1350mm`,
      unit: 'Each',
      quantity: 20,
    },
    {
      tag: 'Misc',
      description: `Cable Duct Sealing Compound`,
      unit: 'Kg',
      quantity: 5,
    },
  ]
}
