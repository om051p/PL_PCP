/**
 * attenuationInputBuilder.test.js
 *
 * Architecture contract: the builder is a pure downstream consumer of
 * actual project assets. No defaults. No synthetic stations. No crashes.
 */

import { describe, it, expect } from 'vitest'

import {
  buildAttenuationInputFromProject,
  parseChainageKm,
  guidanceForReason,
  ATTENUATION_REASONS,
} from './attenuationInputBuilder.js'

// ─── Test fixtures ─────────────────────────────────────────────────────────

function mkSegment(overrides = {}) {
  return {
    id: 'seg-1',
    name: '48" Gas Sales Pipeline',
    od: 48,
    wallThk: 0.875,
    lengthM: 44000,
    opTempC: 57.22,
    currentDensityBase: 0.1,
    coatingType: 'fusion_bonded_epoxy',
    coatingEfficiency: 0.98,
    ...overrides,
  }
}

function mkGroundbed(overrides = {}) {
  return {
    type: 'deepwell',
    startDepthM: 15,
    anodeLengthM: 2.13,
    ...overrides,
  }
}

function mkTR(overrides = {}) {
  return {
    ratedVoltage: 30,
    ratedCurrent: 25,
    backEMF: 2,
    structureResistance: 0.055,
    ...overrides,
  }
}

function mkStation(id, locationKm, overrides = {}) {
  return {
    id,
    name: `ICCP Station-${id}`,
    location: typeof locationKm === 'number' ? `KM ${String(locationKm).padStart(2, '0')}+000` : locationKm,
    pipelineSegments: [mkSegment()],
    groundbed: mkGroundbed(),
    tr: mkTR(),
    soilResistivityOhmCm: 1000,
    ...overrides,
  }
}

function mkProject(stations = [], overrides = {}) {
  return {
    id: 'p-1',
    projectNumber: 'TEST-001',
    stations,
    designBasis: {
      soilResistivityOhmCm: 1000,
      ...(overrides.designBasis || {}),
    },
    ...overrides,
  }
}

// ─── parseChainageKm ──────────────────────────────────────────────────────

describe('parseChainageKm', () => {
  it('parses "KM 44+635" → 44.635', () => {
    expect(parseChainageKm('KM 44+635')).toBeCloseTo(44.635, 6)
  })

  it('parses "KM 00+000" → 0', () => {
    expect(parseChainageKm('KM 00+000')).toBe(0)
  })

  it('parses lowercase "km 10+250"', () => {
    expect(parseChainageKm('km 10+250')).toBeCloseTo(10.25, 6)
  })

  it('parses plain "44" → 44', () => {
    expect(parseChainageKm('44')).toBe(44)
  })

  it('parses decimal km "44.5" → 44.5', () => {
    expect(parseChainageKm('44.5')).toBe(44.5)
  })

  it('passes through numeric input', () => {
    expect(parseChainageKm(42.5)).toBe(42.5)
  })

  it('returns null for empty string', () => {
    expect(parseChainageKm('')).toBeNull()
    expect(parseChainageKm('   ')).toBeNull()
  })

  it('returns null for null/undefined', () => {
    expect(parseChainageKm(null)).toBeNull()
    expect(parseChainageKm(undefined)).toBeNull()
  })

  it('returns null for non-string non-number', () => {
    expect(parseChainageKm({})).toBeNull()
    expect(parseChainageKm([])).toBeNull()
  })

  it('returns null for unparsable garbage', () => {
    expect(parseChainageKm('not a chainage')).toBeNull()
  })
})

// ─── guidanceForReason ─────────────────────────────────────────────────────

describe('guidanceForReason', () => {
  it('returns a guidance object with title, message, action, route', () => {
    const g = guidanceForReason(ATTENUATION_REASONS.NO_TR)
    expect(g.reason).toBe(ATTENUATION_REASONS.NO_TR)
    expect(g.title).toMatch(/TR/)
    expect(g.message).toBeTypeOf('string')
    expect(g.action).toBeTypeOf('string')
    expect(g.route).toBeTypeOf('string')
  })

  it('returns an UNKNOWN guidance for unknown reasons', () => {
    const g = guidanceForReason('FOO_BAR')
    expect(g.title).toBeTypeOf('string')
  })
})

// ─── 0 / 1 / N asset scenarios ─────────────────────────────────────────────

describe('buildAttenuationInputFromProject — zero assets', () => {
  it('returns EMPTY when project is null', () => {
    const r = buildAttenuationInputFromProject(null)
    expect(r.input).toBeNull()
    expect(r.validation.isReady).toBe(false)
    expect(r.validation.reasons).toContain(ATTENUATION_REASONS.NO_PROJECT)
  })

  it('returns EMPTY when project is undefined', () => {
    const r = buildAttenuationInputFromProject(undefined)
    expect(r.input).toBeNull()
    expect(r.validation.reasons).toContain(ATTENUATION_REASONS.NO_PROJECT)
  })

  it('returns INCOMPLETE for project with no stations', () => {
    const r = buildAttenuationInputFromProject(mkProject([]))
    expect(r.input).toBeNull()
    expect(r.validation.reasons).toContain(ATTENUATION_REASONS.NO_STATIONS)
  })
})

describe('buildAttenuationInputFromProject — single asset', () => {
  it('uses exactly 1 station / 1 TR / 1 groundbed when one exists', () => {
    const station = mkStation('CP1', 0)
    const r = buildAttenuationInputFromProject(mkProject([station]))
    expect(r.validation.isReady).toBe(true)
    expect(r.input.stations).toHaveLength(1)
    expect(r.input.stations[0].id).toBe('CP1')
    expect(r.input.stations[0].positionKm).toBe(0)
  })

  it('reports NO_TR when station has no TR', () => {
    const station = mkStation('CP1', 0, { tr: null })
    const r = buildAttenuationInputFromProject(mkProject([station]))
    expect(r.input).toBeNull()
    expect(r.validation.reasons).toContain(ATTENUATION_REASONS.NO_TR)
  })

  it('reports NO_GROUNDBED when station has no groundbed', () => {
    const station = mkStation('CP1', 0, { groundbed: null })
    const r = buildAttenuationInputFromProject(mkProject([station]))
    expect(r.input).toBeNull()
    expect(r.validation.reasons).toContain(ATTENUATION_REASONS.NO_GROUNDBED)
  })

  it('reports NO_PIPELINE when station has no pipeline segments', () => {
    const station = mkStation('CP1', 0, { pipelineSegments: [] })
    const r = buildAttenuationInputFromProject(mkProject([station]))
    expect(r.input).toBeNull()
    expect(r.validation.reasons).toContain(ATTENUATION_REASONS.NO_PIPELINE)
  })

  it('reports MISSING_STATION_CHAINAGE when location is unparsable', () => {
    const station = mkStation('CP1', 'not a chainage')
    const r = buildAttenuationInputFromProject(mkProject([station]))
    expect(r.input).toBeNull()
    expect(r.validation.reasons).toContain(ATTENUATION_REASONS.MISSING_STATION_CHAINAGE)
  })

  it('reports MISSING_TR_VOLTAGE when TR has no rated voltage', () => {
    const station = mkStation('CP1', 0, { tr: { ratedVoltage: 0 } })
    const r = buildAttenuationInputFromProject(mkProject([station]))
    expect(r.input).toBeNull()
    expect(r.validation.reasons).toContain(ATTENUATION_REASONS.MISSING_TR_VOLTAGE)
  })
})

describe('buildAttenuationInputFromProject — multiple assets', () => {
  it('uses exactly 3 stations / 3 TRs / 3 groundbeds when three exist', () => {
    const stations = [
      mkStation('CP1', 0),
      mkStation('CP2', 25),
      mkStation('CP3', 50),
    ]
    const r = buildAttenuationInputFromProject(mkProject(stations))
    expect(r.validation.isReady).toBe(true)
    expect(r.input.stations).toHaveLength(3)
    expect(r.input.stations.map((s) => s.id)).toEqual(['CP1', 'CP2', 'CP3'])
    expect(r.input.stations.map((s) => s.positionKm)).toEqual([0, 25, 50])
  })

  it('sums total pipeline length across all stations', () => {
    const stations = [
      mkStation('CP1', 0, { pipelineSegments: [mkSegment({ lengthM: 10000 })] }),
      mkStation('CP2', 25, { pipelineSegments: [mkSegment({ lengthM: 20000 })] }),
      mkStation('CP3', 50, { pipelineSegments: [mkSegment({ lengthM: 30000 })] }),
    ]
    const r = buildAttenuationInputFromProject(mkProject(stations))
    expect(r.input.pipe.totalLengthKm).toBe(60)
  })

  it('uses the first segment diameter/wall across all stations', () => {
    const stations = [
      mkStation('CP1', 0, { pipelineSegments: [mkSegment({ od: 48, wallThk: 0.875 })] }),
      mkStation('CP2', 25, { pipelineSegments: [mkSegment({ od: 36, wallThk: 0.625 })] }),
    ]
    const r = buildAttenuationInputFromProject(mkProject(stations))
    expect(r.input.pipe.diameterInches).toBe(48)
    expect(r.input.pipe.wallThicknessInches).toBe(0.875)
  })
})

// ─── Deletion scenarios (engineer removes assets at runtime) ──────────────

describe('buildAttenuationInputFromProject — deletion scenarios', () => {
  it('after engineer removes the only TR, attenuation becomes INCOMPLETE (no crash)', () => {
    let station = mkStation('CP1', 0)
    const r1 = buildAttenuationInputFromProject(mkProject([station]))
    expect(r1.validation.isReady).toBe(true)

    // Engineer deletes the TR
    station = { ...station, tr: null }
    const r2 = buildAttenuationInputFromProject(mkProject([station]))
    expect(r2.input).toBeNull()
    expect(r2.validation.reasons).toContain(ATTENUATION_REASONS.NO_TR)
  })

  it('after engineer removes the only station, attenuation becomes INCOMPLETE', () => {
    let stations = [mkStation('CP1', 0)]
    const r1 = buildAttenuationInputFromProject(mkProject(stations))
    expect(r1.validation.isReady).toBe(true)

    stations = []
    const r2 = buildAttenuationInputFromProject(mkProject(stations))
    expect(r2.input).toBeNull()
    expect(r2.validation.reasons).toContain(ATTENUATION_REASONS.NO_STATIONS)
  })

  it('after engineer removes a groundbed, attenuation becomes INCOMPLETE', () => {
    let station = mkStation('CP1', 0)
    const r1 = buildAttenuationInputFromProject(mkProject([station]))
    expect(r1.validation.isReady).toBe(true)

    station = { ...station, groundbed: null }
    const r2 = buildAttenuationInputFromProject(mkProject([station]))
    expect(r2.input).toBeNull()
    expect(r2.validation.reasons).toContain(ATTENUATION_REASONS.NO_GROUNDBED)
  })

  it('partial deletion: 1 of 3 stations removed → still works with remaining 2', () => {
    let stations = [
      mkStation('CP1', 0),
      mkStation('CP2', 25),
      mkStation('CP3', 50),
    ]
    const r1 = buildAttenuationInputFromProject(mkProject(stations))
    expect(r1.input.stations).toHaveLength(3)

    stations = stations.filter((s) => s.id !== 'CP2')
    const r2 = buildAttenuationInputFromProject(mkProject(stations))
    expect(r2.validation.isReady).toBe(true)
    expect(r2.input.stations).toHaveLength(2)
  })
})

// ─── Defensive programming — never throws ──────────────────────────────────

describe('buildAttenuationInputFromProject — defensive', () => {
  it('does not throw on project with stations=null', () => {
    const r = buildAttenuationInputFromProject({ stations: null })
    expect(r.input).toBeNull()
    expect(r.validation.reasons).toContain(ATTENUATION_REASONS.NO_STATIONS)
  })

  it('does not throw on project with stations=undefined', () => {
    const r = buildAttenuationInputFromProject({})
    expect(r.input).toBeNull()
  })

  it('does not throw on station with null pipelineSegments', () => {
    const r = buildAttenuationInputFromProject(
      mkProject([mkStation('CP1', 0, { pipelineSegments: null })])
    )
    expect(r.input).toBeNull()
  })

  it('does not throw on station with NaN lengthM', () => {
    const r = buildAttenuationInputFromProject(
      mkProject([
        mkStation('CP1', 0, {
          pipelineSegments: [mkSegment({ lengthM: NaN })],
        }),
      ])
    )
    expect(r.validation.isReady).toBe(true)
    expect(r.input.pipe.totalLengthKm).toBe(0)
  })

  it('handles station with .id missing (skipped silently)', () => {
    const stationA = mkStation('CP1', 0)
    const stationB = { ...mkStation('CP2', 25), id: undefined }
    const r = buildAttenuationInputFromProject(mkProject([stationA, stationB]))
    expect(r.validation.isReady).toBe(true)
    // 2 stations, even if one lacks id
    expect(r.input.stations).toHaveLength(2)
  })

  it('handles designBasis missing entirely', () => {
    const project = mkProject([mkStation('CP1', 0)], {})
    delete project.designBasis
    const r = buildAttenuationInputFromProject(project)
    // Soil resistivity from station level (1000) — should pass
    expect(r.validation.isReady).toBe(true)
  })

  it('falls back to active station soilResistivity when designBasis lacks it', () => {
    const project = mkProject([mkStation('CP1', 0, { soilResistivityOhmCm: 2500 })])
    delete project.designBasis.soilResistivityOhmCm
    const r = buildAttenuationInputFromProject(project)
    expect(r.input.coating.soilResistivityOhmCm).toBe(2500)
  })

  it('reports MISSING_SOIL_RESISTIVITY when neither designBasis nor station has it', () => {
    const station = mkStation('CP1', 0, { soilResistivityOhmCm: undefined })
    const project = mkProject([station])
    delete project.designBasis.soilResistivityOhmCm
    const r = buildAttenuationInputFromProject(project)
    expect(r.validation.reasons).toContain(ATTENUATION_REASONS.MISSING_SOIL_RESISTIVITY)
  })
})
