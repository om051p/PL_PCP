/**
 * BOM RULES ENGINE
 * BOM is generated from rules, not fixed tables.
 * Each design mode has its own BOM rule set.
 * Rules are evaluated against the calculation result.
 */

import { STANDARDS } from '../../constants/index.js'

/**
 * Generate BOM for a station based on design mode and calc results.
 * @param {import('../../types').Station} station
 * @param {import('../../types').CalcResult} result
 * @returns {import('../../types').BOMItem[]}
 */
export function generateBOM(station, result) {
  if (!result) return []

  const mode = station.groundbed.type
  const items = []

  // Always required: TR Unit
  items.push(...bomRules_TRU(station, result))

  // Mode-specific groundbed
  if (mode === 'deepwell') items.push(...bomRules_Deepwell(station, result))
  else if (mode === 'shallow_vertical') items.push(...bomRules_ShallowVertical(station, result))

  // Always required: cables
  items.push(...bomRules_Cables(station, result))

  // Always required: junction boxes, test stations, misc
  items.push(...bomRules_JunctionBoxes(station, result))
  items.push(...bomRules_TestStation(station))
  items.push(...bomRules_Misc(station, result))

  return items
}

// ─── TR Unit Rules ────────────────────────────────────────────────────────────

function bomRules_TRU(station, result) {
  const V = station.tr.ratedVoltage
  const A = station.tr.ratedCurrent
  const kva = Math.ceil(result.acInputKVA * 10) / 10

  return [
    {
      tag: 'TRU',
      description: `Transformer-Rectifier Unit, Oil-Cooled, NEMA4X, 480V/3Φ Input, ${V}V/${A}A DC Output`,
      unit: 'Each',
      quantity: 1,
      standard: STANDARDS.TRU,
    },
    {
      tag: 'TRU',
      description: `CP Remote Monitoring Unit (RMU), Type-A`,
      unit: 'Each',
      quantity: 1,
      standard: STANDARDS.TRU,
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
      description: `AC Disconnecting Switch, 480V/3Φ, ${Math.ceil(result.acInputCurrentA * 1.25)}A`,
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

function bomRules_Deepwell(station, result) {
  const N = station.proposedAnodes
  const gb = station.groundbed
  const items = []

  // Anodes with individual tail cables
  station.cables.anodeTailLengths.slice(0, N).forEach((len, i) => {
    items.push({
      tag: 'Anode',
      description: `Anode-${i + 1}: ${station.anodeSpec.label || 'HSCI Tubular TA-4'}, c/w ${len}m, 16mm² PVDF/HMWPE Tail Cable, Centralizer`,
      unit: 'Each',
      quantity: 1,
      standard: STANDARDS.ANODE,
    })
  })

  // Coke backfill
  const boreholeVolM3 = Math.PI * Math.pow(gb.boreholeDiaM / 2, 2) * result.activeLengthM
  const cokeKg = boreholeVolM3 * 1000 * 0.7   // Bulk density ~700 kg/m³
  const cokeBags = Math.ceil((cokeKg / 25) * 1.10)   // 25kg bags +10%
  items.push({
    tag: 'Backfill',
    description: `Calcined Petroleum Coke Breeze Backfill (17-855-011), 25kg Bags`,
    unit: 'Bag (25kg)',
    quantity: cokeBags,
    standard: STANDARDS.COKE_BACKFILL,
    notes: `+10% contingency. Borehole volume: ${boreholeVolM3.toFixed(3)}m³`,
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
      quantity: Math.ceil(Math.PI * Math.pow(gb.boreholeDiaM / 2, 2) * gb.cementPlugM * 1500 / 40),
    })
  }

  return items
}

// ─── Shallow Vertical Groundbed Rules ────────────────────────────────────────

function bomRules_ShallowVertical(station) {
  const N = station.proposedAnodes
  const gb = station.groundbed
  const items = []

  station.cables.anodeTailLengths.slice(0, N).forEach((len, i) => {
    items.push({
      tag: 'Anode',
      description: `Anode-${i + 1}: ${station.anodeSpec.label || 'HSCI Tubular TA-4'}, c/w ${len}m, 16mm² PVDF/HMWPE Tail Cable`,
      unit: 'Each',
      quantity: 1,
      standard: STANDARDS.ANODE,
    })
  })

  // Coke per hole
  const volPerHole = Math.PI * Math.pow(gb.boreholeDiaM / 2, 2) * gb.anodeLengthM
  const cokeKgPerHole = volPerHole * 700
  const totalCokeBags = Math.ceil((cokeKgPerHole * N / 25) * 1.10)
  items.push({
    tag: 'Backfill',
    description: `Calcined Petroleum Coke Breeze Backfill (17-855-011), 25kg Bags`,
    unit: 'Bag (25kg)',
    quantity: totalCokeBags,
    standard: STANDARDS.COKE_BACKFILL,
    notes: `${N} holes × ${(cokeKgPerHole).toFixed(1)}kg each +10%`,
  })

  return items
}

// ─── Cable Rules ──────────────────────────────────────────────────────────────

function bomRules_Cables(station) {
  const cb = station.cables
  const N = station.proposedAnodes

  // Total anode tail cable length
  const totalTailLen = cb.anodeTailLengths.slice(0, N).reduce((a, b) => a + b, 0)

  return [
    {
      tag: 'Cable +ve',
      description: `Anode Tail Cable, 16mm² PVDF/HMWPE, 600V, Black`,
      unit: 'm',
      quantity: Math.ceil(totalTailLen * 1.05),   // +5% cutting waste
      standard: STANDARDS.CABLE,
      notes: `${N} anode tails, total ${totalTailLen}m +5% waste`,
    },
    {
      tag: 'Cable +ve',
      description: `Main Positive Cable, ${cb.posMainSizeMm2}mm² PVDF/HMWPE, 600V, Red`,
      unit: 'm',
      quantity: Math.ceil(cb.posMainLengthM * 1.05),
      standard: STANDARDS.CABLE,
    },
    {
      tag: 'Cable -ve',
      description: `Main Negative Cable, ${cb.negMainSizeMm2}mm² HMWPE, 600V, Black`,
      unit: 'm',
      quantity: Math.ceil(cb.negMainLengthM * 1.05),
      standard: STANDARDS.CABLE,
    },
    {
      tag: 'Cable -ve',
      description: `Secondary Negative Cable, ${cb.negSecSizeMm2}mm² HMWPE, 600V, Black`,
      unit: 'm',
      quantity: Math.ceil(cb.negSecLengthM * 1.05),
      standard: STANDARDS.CABLE,
    },
  ]
}

// ─── Junction Box Rules ───────────────────────────────────────────────────────

function bomRules_JunctionBoxes(station) {
  const N = station.proposedAnodes
  const boxSize = N <= 12 ? '12-terminal' : '20-terminal'

  return [
    {
      tag: 'Junction Box',
      description: `Anode Junction Box, ${boxSize}, SS316L, NEMA4X, c/w terminal blocks`,
      unit: 'Each',
      quantity: 1,
      standard: STANDARDS.JUNCTION_BOX,
    },
    {
      tag: 'Junction Box',
      description: `Negative Junction Box, 5-Terminal, SS316L, NEMA4X`,
      unit: 'Each',
      quantity: 1,
      standard: STANDARDS.JUNCTION_BOX,
    },
  ]
}

// ─── Test Station Rules ───────────────────────────────────────────────────────

function bomRules_TestStation() {
  return [
    {
      tag: 'Test Station',
      description: `Permanent Reference Electrode, Cu/CuSO₄, c/w 150m Reference Cable`,
      unit: 'Each',
      quantity: 1,
      standard: STANDARDS.TEST_STATION,
    },
    {
      tag: 'Test Station',
      description: `Single-Pin CP Test Station (Drain Point)`,
      unit: 'Each',
      quantity: 1,
      standard: STANDARDS.TEST_STATION,
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
      quantity: Math.ceil((station.cables.posMainLengthM + station.cables.negMainLengthM) / 200) + 1,
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
