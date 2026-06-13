import { v4 as uuid } from 'uuid'
import { ANODE_SPECS } from '../constants/index.js'

/**
 * Release date for Phase 6 (Dashboard 3.0).
 * Projects created before this date get dashboardV3Enabled=false (opt-in).
 * Projects created on or after this date get dashboardV3Enabled=true (opt-out).
 */
export const PHASE_6_RELEASE_DATE = '2026-06-13'

/**
 * Release date for Phase 7 (Engineering Intelligence v2).
 * Projects created before this date get intelligenceV2Enabled=false (opt-in).
 * Projects created on or after this date get intelligenceV2Enabled=true (opt-out).
 */
export const PHASE_7_RELEASE_DATE = '2026-06-13'

/**
 * Release date for Phase 8 (Learning Foundation).
 * Projects created before this date get learningV2Enabled=false (opt-in).
 * Projects created on or after this date get learningV2Enabled=true (opt-out).
 */
export const PHASE_8_RELEASE_DATE = '2026-06-13'

/**
 * Determines the default value of intelligenceV2Enabled for a project
 * based on its createdAt timestamp vs PHASE_7_RELEASE_DATE.
 */
export function defaultIntelligenceV2Flag(createdAt) {
  if (!createdAt) return true
  return createdAt >= PHASE_7_RELEASE_DATE
}

/**
 * Determines the default value of dashboardV3Enabled for a project
 * based on its createdAt timestamp vs PHASE_6_RELEASE_DATE.
 */
export function defaultDashboardV3Flag(createdAt) {
  if (!createdAt) return true
  return createdAt >= PHASE_6_RELEASE_DATE
}

/**
 * Determines the default value of learningV2Enabled for a project
 * based on its createdAt timestamp vs PHASE_8_RELEASE_DATE.
 */
export function defaultLearningV2Flag(createdAt) {
  if (!createdAt) return true
  return createdAt >= PHASE_8_RELEASE_DATE
}

export function makeDefaultStation(overrides = {}) {
  const id = uuid()
  return {
    id,
    name: 'ICCP Station-1',
    location: 'KM 00+000',
    designMode: 'deepwell',
    pipelineSegments: [
      {
        id: uuid(),
        name: '48" Gas Sales Pipeline',
        od: 48,
        wallThk: 0.875,
        lengthM: 292,
        opTempC: 57.22,
        currentDensityBase: 0.1,
        coatingType: 'fusion_bonded_epoxy',
        coatingEfficiency: 0.98,
      },
    ],
    groundbed: {
      type: 'deepwell',
      startDepthM: 15,
      anodeLengthM: 2.13,
      inactiveLenM: 1.5,
      anodeSpacingM: 1.5,
      boreholeDiaM: 0.25,
      numHoles: 1,
      cokeCoverM: 2.5,
      cementPlugM: 0.5,
    },
    anodeSpec: { ...ANODE_SPECS.HSCI_TA4 },
    proposedAnodes: 9,
    cables: {
      anodeTailLengths: [25, 30, 35, 40, 45, 50, 55, 60, 65, ...Array(41).fill(0)],
      anodeCableSizeMm2: 16,
      posMainLengthM: 180,
      posMainSizeMm2: 35,
      negMainLengthM: 100,
      negMainSizeMm2: 35,
      negSecLengthM: 60,
      negSecSizeMm2: 25,
    },
    tr: {
      ratedVoltage: 30,
      ratedCurrent: 25,
      backEMF: 2,
      structureResistance: 0.055,
    },
    soilResistivityOhmCm: 361,
    actualRemotenesM: 56,
    requiredRemotenesM: 20,
    designLifeYears: 25,
    status: 'draft',
    lastCalcResult: null,
    insights: [],
    alternatives: [],
    ...overrides,
  }
}

export function makeDefaultProject(overrides = {}) {
  const now = new Date().toISOString()
  return {
    id: uuid(),
    projectNumber: 'ECP25-0292',
    clientName: 'Client Name',
    endClient: '-',
    projectName: 'PERMANENT CATHODIC PROTECTION DESIGN',
    designer: '',
    createdAt: now,
    updatedAt: now,
    status: 'draft',
    stations: [makeDefaultStation()],
    revisions: [],
    currentRevision: null,
    activityLog: [],
    archived: false,
    hasCalculationsMismatch: false,
    designBasis: {
      designStandard: 'saudiAramco',
      systemDesignLifeYears: 25,
      backEmfV: 2.0,
      structureResistanceOhm: 0.055,
      acInputVoltageV: 480,
      acInputPhase: 3,
      trEfficiencyPct: 80,
      trPowerFactor: 0.8,
      cokeContingencyPct: 10,
      minRemotenessDistanceM: 20,
      actualRemotenessDistanceM: 56,
      soilResistivityOhmCm: 361,
      soilResistivitySource: 'standard',
      soilResistivityLayers: [],
      soilResistivitySurvey: [],
    },
    tank: {
      diameter: 30,
      currentDensity: 15,
      anodeSpacing: 1.5,
      layoutType: 'concentric',
      anodeRating: 17,
      status: 'draft',
      lastCalcResult: null,
    },
    vessel: {
      length: 8.0,
      diameter: 2.4,
      currentDensity: 30,
      anodeType: 'al_zn_in',
      anodeQty: 6,
      electrolyteResistivity: 80,
      drivingVoltageMode: 'polarized',
      status: 'draft',
      lastCalcResult: null,
    },
    dashboardV3Enabled: defaultDashboardV3Flag(now),
    intelligenceV2Enabled: defaultIntelligenceV2Flag(now),
    learningV2Enabled: defaultLearningV2Flag(now),
    ...overrides,
  }
}
