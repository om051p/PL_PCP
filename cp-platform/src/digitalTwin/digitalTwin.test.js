/**
 * M10–M12 — Digital Twin — Tests
 * digitalTwin.test.js
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { AssetType } from './assets/AssetTypes.js'
import {
  makeEmptyRegistry,
  registryAddAsset,
  registryRemoveAsset,
  registryUpdateAsset,
  getAssetsForStation,
  getAssetsForProject,
  registryReplaceStationAssets,
} from './assets/assetRegistry.js'
import { makePipelineAsset, makeTRAsset, makeGroundbedAsset, makeStationAssets } from './assets/assetFactory.js'
import { computeHealthScore, getHealthStatus, HEALTH_THRESHOLDS } from './healthScoreEngine.js'
import { computeRiskAssessment, getRiskLevel, RISK_LEVELS } from './riskEngine.js'

// ─── Test Fixtures ─────────────────────────────────────────────────────────

function makeTestStation(overrides = {}) {
  return {
    id: 'st_001',
    stationName: 'Test Station',
    soilResistivityOhmCm: 350,
    proposedAnodes: 9,
    pipelineSegments: [
      { id: 's1', lengthM: 500, od: 0.4064, opTempC: 60, coatingType: '3lpe' },
    ],
    tr: { ratedVoltageV: 12, ratedCurrentA: 5 },
    groundbed: { anodeCount: 9, groundbedType: 'deepwell', depthM: 45 },
    lastCalcResult: {
      totalCurrentRequired: 3.2,
      trMinVoltage: 1.88,
      groundbedResistanceOhm: 0.110,
      designLifeYears: 31,
      positiveCableVoltageDrop: 0.26,
      negativeCableVoltageDrop: 0.18,
      checks: [
        { id: 'c1', status: 'pass' },
        { id: 'c2', status: 'pass' },
        { id: 'c3', status: 'pass' },
      ],
    },
    ...overrides,
  }
}

function makeTestProject(stationOverrides = {}) {
  return {
    id: 'proj_001',
    stations: [makeTestStation(stationOverrides)],
    designBasis: {
      designStandard: 'saudiAramco',
      systemDesignLifeYears: 25,
    },
  }
}

// ─── M10: Asset Registry ───────────────────────────────────────────────────

describe('assetRegistry — makeEmptyRegistry', () => {
  it('returns empty registry structure', () => {
    const reg = makeEmptyRegistry()
    expect(reg.assets).toEqual({})
    expect(reg.byStation).toEqual({})
    expect(reg.byProject).toEqual({})
  })
})

describe('assetRegistry — CRUD', () => {
  let registry
  let asset

  beforeEach(() => {
    registry = makeEmptyRegistry()
    asset = {
      id: 'asset_001',
      type: AssetType.PIPELINE,
      stationId: 'st_001',
      projectId: 'proj_001',
      name: 'Test Pipeline Asset',
      createdAt: new Date().toISOString(),
      designRef: Object.freeze({ stationId: 'st_001' }),
      healthScore: null,
      telemetry: null,
    }
  })

  it('adds asset and indexes by station and project', () => {
    const updated = registryAddAsset(registry, asset)
    expect(updated.assets['asset_001']).toBeDefined()
    expect(updated.byStation['st_001']).toContain('asset_001')
    expect(updated.byProject['proj_001']).toContain('asset_001')
  })

  it('remove asset cleans up indexes', () => {
    let reg = registryAddAsset(registry, asset)
    reg = registryRemoveAsset(reg, 'asset_001')
    expect(reg.assets['asset_001']).toBeUndefined()
    expect(reg.byStation['st_001']).not.toContain('asset_001')
  })

  it('update asset changes mutable fields but not designRef', () => {
    let reg = registryAddAsset(registry, asset)
    reg = registryUpdateAsset(reg, 'asset_001', { healthScore: 85, designRef: { corrupted: true } })
    expect(reg.assets['asset_001'].healthScore).toBe(85)
    // designRef must not be overwritten
    expect(reg.assets['asset_001'].designRef.corrupted).toBeUndefined()
    expect(reg.assets['asset_001'].designRef.stationId).toBe('st_001')
  })

  it('getAssetsForStation returns correct assets', () => {
    const reg = registryAddAsset(registry, asset)
    const assets = getAssetsForStation(reg, 'st_001')
    expect(assets).toHaveLength(1)
    expect(assets[0].id).toBe('asset_001')
  })

  it('registryReplaceStationAssets removes old and adds new', () => {
    let reg = registryAddAsset(registry, asset)
    const newAsset = { ...asset, id: 'asset_002', name: 'New Asset' }
    reg = registryReplaceStationAssets(reg, 'st_001', [newAsset])
    expect(reg.assets['asset_001']).toBeUndefined()
    expect(reg.assets['asset_002']).toBeDefined()
  })

  it('remove non-existent asset returns registry unchanged', () => {
    const reg = registryRemoveAsset(registry, 'nope_id')
    expect(reg).toEqual(registry)
  })
})

// ─── M10: Asset Factory ────────────────────────────────────────────────────

describe('assetFactory — makePipelineAsset', () => {
  it('creates pipeline asset with correct type and frozen designRef', () => {
    const station = makeTestStation()
    const project = makeTestProject()
    const asset = makePipelineAsset(station, project)

    expect(asset.type).toBe(AssetType.PIPELINE)
    expect(asset.stationId).toBe('st_001')
    expect(asset.projectId).toBe('proj_001')
    expect(Object.isFrozen(asset.designRef)).toBe(true)
    expect(asset.designRef.totalLengthM).toBe(500)
    expect(asset.telemetry).toBeNull()
  })
})

describe('assetFactory — makeTRAsset', () => {
  it('creates TR asset with correct designRef', () => {
    const station = makeTestStation()
    const project = makeTestProject()
    const asset = makeTRAsset(station, project)

    expect(asset.type).toBe(AssetType.TR_UNIT)
    expect(asset.designRef.ratedVoltageV).toBe(12)
    expect(asset.designRef.ratedCurrentA).toBe(5)
    expect(asset.designRef.minRequiredVoltageV).toBeCloseTo(1.88)
  })
})

describe('assetFactory — makeGroundbedAsset', () => {
  it('creates groundbed asset with resistance from lastCalcResult', () => {
    const station = makeTestStation()
    const project = makeTestProject()
    const asset = makeGroundbedAsset(station, project)

    expect(asset.type).toBe(AssetType.GROUNDBED)
    expect(asset.designRef.resistanceOhm).toBeCloseTo(0.110)
    expect(asset.designRef.anodeCount).toBe(9)
  })
})

describe('assetFactory — makeStationAssets', () => {
  it('returns all three asset types for a fully calculated station', () => {
    const station = makeTestStation()
    const project = makeTestProject()
    const assets = makeStationAssets(station, project)

    expect(assets).toHaveLength(3)
    const types = assets.map((a) => a.type)
    expect(types).toContain(AssetType.PIPELINE)
    expect(types).toContain(AssetType.TR_UNIT)
    expect(types).toContain(AssetType.GROUNDBED)
  })

  it('returns no TR asset if station has no TR data', () => {
    const station = makeTestStation({ tr: null, lastCalcResult: { ...makeTestStation().lastCalcResult, trMinVoltage: null } })
    const project = makeTestProject()
    const assets = makeStationAssets(station, project)
    const types = assets.map((a) => a.type)
    expect(types).not.toContain(AssetType.TR_UNIT)
  })
})

// ─── M11: Health Score Engine ──────────────────────────────────────────────

describe('computeHealthScore', () => {
  it('returns 0 score for null station', () => {
    const result = computeHealthScore(null, null)
    expect(result.score).toBe(0)
  })

  it('returns high score for well-designed station', () => {
    const station = makeTestStation()
    const project = makeTestProject()
    const result = computeHealthScore(station, project)

    expect(result.score).toBeGreaterThan(70)
    expect(result.status).toBeDefined()
    expect(result.factors).toBeDefined()
    expect(Object.keys(result.factors)).toContain('trVoltageMargine')
    expect(Object.keys(result.factors)).toContain('designLifeFactor')
    expect(Object.keys(result.factors)).toContain('groundbedResistanceMargine')
    expect(Object.keys(result.factors)).toContain('rulePassRatio')
    expect(Object.keys(result.factors)).toContain('cableDropMargine')
  })

  it('score is clamped to 0–100', () => {
    const station = makeTestStation()
    const project = makeTestProject()
    const result = computeHealthScore(station, project)
    expect(result.score).toBeGreaterThanOrEqual(0)
    expect(result.score).toBeLessThanOrEqual(100)
  })

  it('stations with validation failures get lower score', () => {
    const passing = makeTestStation()
    const failing = makeTestStation({
      lastCalcResult: {
        ...makeTestStation().lastCalcResult,
        checks: [
          { id: 'c1', status: 'fail' },
          { id: 'c2', status: 'fail' },
          { id: 'c3', status: 'fail' },
        ],
      },
    })
    const project = makeTestProject()
    const goodScore = computeHealthScore(passing, project).score
    const badScore = computeHealthScore(failing, project).score
    expect(goodScore).toBeGreaterThan(badScore)
  })

  it('station with anode life below design life gets lower design life factor', () => {
    const station = makeTestStation({
      lastCalcResult: {
        ...makeTestStation().lastCalcResult,
        designLifeYears: 15, // below 25-year project life
      },
    })
    const project = makeTestProject()
    const result = computeHealthScore(station, project)
    // designLifeFactor score should be below 50 (shortfall)
    expect(result.factors.designLifeFactor.score).toBeLessThan(50)
  })
})

describe('getHealthStatus', () => {
  it('returns HEALTHY for score ≥ 75', () => {
    expect(getHealthStatus(90).label).toBe('Healthy')
    expect(getHealthStatus(75).label).toBe('Healthy')
  })

  it('returns WARNING for score 50–74', () => {
    expect(getHealthStatus(60).label).toBe('Warning')
    expect(getHealthStatus(50).label).toBe('Warning')
  })

  it('returns CRITICAL for score < 50', () => {
    expect(getHealthStatus(49).label).toBe('Critical')
    expect(getHealthStatus(0).label).toBe('Critical')
  })
})

// ─── M12: Risk Engine ──────────────────────────────────────────────────────

describe('computeRiskAssessment', () => {
  it('returns valid result for null station', () => {
    const result = computeRiskAssessment(null, null)
    expect(result.riskScore).toBeDefined()
    expect(result.riskLevel).toBeDefined()
  })

  it('well-designed station has low risk', () => {
    const station = makeTestStation()
    const project = makeTestProject()
    const result = computeRiskAssessment(station, project)

    expect(result.riskScore).toBeGreaterThanOrEqual(1)
    expect(result.riskScore).toBeLessThanOrEqual(25)
    expect(result.consequence.score).toBeGreaterThanOrEqual(1)
    expect(result.likelihood.score).toBeGreaterThanOrEqual(1)
  })

  it('validation failures increase likelihood', () => {
    const good = makeTestStation()
    const bad = makeTestStation({
      lastCalcResult: {
        ...makeTestStation().lastCalcResult,
        checks: [{ id: 'c1', status: 'fail' }, { id: 'c2', status: 'fail' }],
      },
    })
    const project = makeTestProject()
    const goodRisk = computeRiskAssessment(good, project)
    const badRisk = computeRiskAssessment(bad, project)
    expect(badRisk.likelihood.score).toBeGreaterThan(goodRisk.likelihood.score)
  })

  it('aggressive soil increases likelihood', () => {
    const goodSoil = makeTestStation({ soilResistivityOhmCm: 5000 })
    const badSoil = makeTestStation({ soilResistivityOhmCm: 500 }) // < 1000 = highly aggressive
    const project = makeTestProject()
    const good = computeRiskAssessment(goodSoil, project)
    const bad = computeRiskAssessment(badSoil, project)
    expect(bad.likelihood.score).toBeGreaterThan(good.likelihood.score)
  })

  it('riskScore = consequence × likelihood', () => {
    const station = makeTestStation()
    const project = makeTestProject()
    const result = computeRiskAssessment(station, project)
    expect(result.riskScore).toBe(result.consequence.score * result.likelihood.score)
  })
})

describe('getRiskLevel', () => {
  it('maps score 1–4 to LOW', () => {
    expect(getRiskLevel(1).label).toBe('Low')
    expect(getRiskLevel(4).label).toBe('Low')
  })

  it('maps score 5–9 to MEDIUM', () => {
    expect(getRiskLevel(5).label).toBe('Medium')
    expect(getRiskLevel(9).label).toBe('Medium')
  })

  it('maps score 10–16 to HIGH', () => {
    expect(getRiskLevel(10).label).toBe('High')
    expect(getRiskLevel(16).label).toBe('High')
  })

  it('maps score 17–25 to CRITICAL', () => {
    expect(getRiskLevel(17).label).toBe('Critical')
    expect(getRiskLevel(25).label).toBe('Critical')
  })
})
