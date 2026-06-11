/**
 * attenuationTests.js
 *
 * Unit tests for attenuationEngine.js
 *
 * Usage (Node.js, no test framework required):
 *   node attenuationTests.js
 *
 * Optional: works with Jest, Mocha, or any test runner
 * that supports CommonJS modules. No dependencies needed
 * for the standalone runner below.
 *
 * Test categories:
 *   T1xx — Formula / arithmetic unit tests
 *   T2xx — Validation tests
 *   T3xx — Profile generation tests
 *   T4xx — Boundary / edge case tests
 *   T5xx — Engineering validation tests (spreadsheet comparisons)
 *   T6xx — Negative tests (invalid inputs, expected failures)
 */

'use strict';



import * as engine from './attenuationEngine.js';

import { describe, it, expect } from 'vitest'

function assertClose(actual, expected, tolerance, label) {
  const tol = tolerance ?? 1e-6;
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tol);
}

function assertEqual(actual, expected, label) {
  expect(actual).toEqual(expected);
}

function assertTrue(condition, label) {
  expect(condition).toBe(true);
}

function assertFalse(condition, label) {
  expect(condition).toBe(false);
}

function assertNotNull(value, label) {
  expect(value).not.toBeNull();
  expect(value).not.toBeUndefined();
}

// ─────────────────────────────────────────────────────────────────────────────
// Reference dataset — BB-2 Shore to Berri (DS-001)
// ─────────────────────────────────────────────────────────────────────────────

describe('Attenuation Engine Tests', () => {
  it('runs all attenuation profiling and verification check formulas', () => {
    const REF = {
  pipe: {
    diameterInches: 30,
    wallThicknessInches: 1.27,
    totalLengthKm: 44,
    maxProtectionLengthKm: 25,
    steelResistivityMicroOhmCm: 18,
  },
  coating: {
    conductivityMicroSiemensPerM2: 300,
    soilResistivityOhmCm: 1000,
    currentDensityMaPerM2: 0.175,
  },
  potentials: {
    naturalMv: 550,
    drainPointMv: 1100,
    minimumMv: 1000,
  },
  stations: [
    { id: 'CP3', positionKm: 44, label: 'CP#3' },
    { id: 'CP4', positionKm: 69, label: 'CP#4' },
    { id: 'CP5', positionKm: 73, label: 'CP#5' },
    { id: 'CP6', positionKm: 82, label: 'CP#6' },
  ],
  profileConfig: { startKm: 44, endKm: 89, stepKm: 1.0 },
};

// ─────────────────────────────────────────────────────────────────────────────
// T1xx — Formula / Arithmetic Unit Tests
// ─────────────────────────────────────────────────────────────────────────────

// T101 — Pipe steel cross-section area
{
  const ax = engine.calculatePipeSteelArea(30, 1.27);
  assertClose(ax, 0.07399102439772913, 1e-12, 'T101: calculatePipeSteelArea(30, 1.27)');
}

// T102 — Pipe steel area, small diameter
{
  const ax = engine.calculatePipeSteelArea(8, 0.5);
  assertTrue(ax > 0, 'T102a: small pipe area > 0');
  assertTrue(ax < 0.01, 'T102b: small pipe area < 0.01 m²');
}

// T103 — Unit surface area (A1)
{
  const a1 = engine.calculateUnitSurfaceArea(30);
  assertClose(a1, 2.3945065957239278, 1e-10, 'T103: calculateUnitSurfaceArea(30)');
}

// T104 — Total surface area
{
  const a1 = engine.calculateUnitSurfaceArea(30);
  const atot = engine.calculateTotalSurfaceArea(a1, 25);
  assertClose(atot, 59862.664893098197, 0.01, 'T104: calculateTotalSurfaceArea to 25 km');
}

// T105 — Current requirement
{
  const a1 = engine.calculateUnitSurfaceArea(30);
  const atot = engine.calculateTotalSurfaceArea(a1, 25);
  const i = engine.calculateCurrentRequirement(atot, 0.175);
  assertClose(i, 10.475966356292183, 1e-6, 'T105: calculateCurrentRequirement to X');
}

// T106 — Total current requirement
{
  const a1 = engine.calculateUnitSurfaceArea(30);
  const atot_full = engine.calculateTotalSurfaceArea(a1, 44);
  const i_tot = engine.calculateCurrentRequirement(atot_full, 0.175);
  assertClose(i_tot, 18.437700787074245, 1e-6, 'T106: calculateCurrentRequirement total');
}

// T107 — Pipe resistance
{
  const ax = engine.calculatePipeSteelArea(30, 1.27);
  const rs = engine.calculatePipeResistance(18, ax);
  assertClose(rs, 2.432727502628338e-6, 1e-18, 'T107: calculatePipeResistance');
}

// T108 — Leakage resistance
{
  const a1 = engine.calculateUnitSurfaceArea(30);
  const rl = engine.calculateLeakageResistance(300, a1, 1000);
  assertClose(rl, 1392.0752355771112, 0.001, 'T108: calculateLeakageResistance');
}

// T109 — Attenuation constant
{
  const ax = engine.calculatePipeSteelArea(30, 1.27);
  const a1 = engine.calculateUnitSurfaceArea(30);
  const rs = engine.calculatePipeResistance(18, ax);
  const rl = engine.calculateLeakageResistance(300, a1, 1000);
  const alpha = engine.calculateAttenuationConstant(rs, rl);
  assertClose(alpha, 4.1803763170231051e-5, 1e-16, 'T109: calculateAttenuationConstant');
}

// T110 — Potential at distance zero equals drain point
{
  const ax = engine.calculatePipeSteelArea(30, 1.27);
  const a1 = engine.calculateUnitSurfaceArea(30);
  const rs = engine.calculatePipeResistance(18, ax);
  const rl = engine.calculateLeakageResistance(300, a1, 1000);
  const alpha = engine.calculateAttenuationConstant(rs, rl);
  const V = engine.calculatePotentialAtDistance(44, 44, alpha, 550, 1100);
  assertClose(V, 1.100, 1e-10, 'T110: potential at distance 0 = drain point potential');
}

// T111 — Potential decays with distance
{
  const ax = engine.calculatePipeSteelArea(30, 1.27);
  const a1 = engine.calculateUnitSurfaceArea(30);
  const rs = engine.calculatePipeResistance(18, ax);
  const rl = engine.calculateLeakageResistance(300, a1, 1000);
  const alpha = engine.calculateAttenuationConstant(rs, rl);
  const V0  = engine.calculatePotentialAtDistance(44, 44, alpha, 550, 1100);
  const V10 = engine.calculatePotentialAtDistance(54, 44, alpha, 550, 1100);
  const V25 = engine.calculatePotentialAtDistance(69, 44, alpha, 550, 1100);
  assertTrue(V0 > V10, 'T111a: V(0) > V(10km)');
  assertTrue(V10 > V25, 'T111b: V(10km) > V(25km)');
}

// T112 — Single-station potential at KM 44 from CP3 (spreadsheet Z9 = 1.1)
{
  const alpha = 4.1803763170231051e-5;
  const V = engine.calculatePotentialAtDistance(44, 44, alpha, 550, 1100);
  assertClose(V, 1.1, 1e-10, 'T112: V at KM44 from CP3 = 1.100 V');
}

// T113 — Single-station potential at KM 44 from CP4 (spreadsheet AA9 = 0.89425)
{
  const alpha = 4.1803763170231051e-5;
  const V = engine.calculatePotentialAtDistance(44, 69, alpha, 550, 1100);
  assertClose(V, 0.8942529562497081, 1e-8, 'T113: V at KM44 from CP4 = 0.89425 V');
}

// T114 — Single-station potential at KM 44 from CP5 (spreadsheet AB9 = 0.85065)
{
  const alpha = 4.1803763170231051e-5;
  const V = engine.calculatePotentialAtDistance(44, 73, alpha, 550, 1100);
  assertClose(V, 0.8506493970576601, 1e-6, 'T114: V at KM44 from CP5 = 0.85065 V');
}

// T115 — Combined potential at KM 44 (spreadsheet AD9 ≈ 1.9606)
{
  const alpha = 4.1803763170231051e-5;
  const V = engine.calculateCombinedPotentialAtPoint(44, [44, 69, 73, 82], alpha, 550, 1100);
  assertClose(V, 1.960553433616793, 1e-6, 'T115: combined V at KM44 ≈ 1.9606 V');
}

// T116 — Check point assessment matches spreadsheet Q18-Q20
{
  const alpha = 4.1803763170231051e-5;
  const result = engine.calculateCheckPointAssessment(alpha, 550, 1100, 1000, 25);
  assertClose(result.deltaECalculated_V, 0.3442529562497081, 1e-8, 'T116a: ΔE_calc at X');
  assertClose(result.potentialCalculated_V, 0.8942529562497081, 1e-8, 'T116b: PotCALC at X');
  assertFalse(result.criterionMet, 'T116c: criterion NOT met at X (single station)');
  assertClose(result.deficitVolts, 1000/1000 - 0.8942529562497081, 1e-6, 'T116d: deficit');
}

// T117 — Protection length calculation
{
  const alpha = 4.1803763170231051e-5;
  const L = engine.calculateProtectionLength(alpha, 550, 1100, 1000);
  assertClose(L, 15.67, 0.1, 'T117: protection reach ≈ 15.67 km');
  assertTrue(L > 0, 'T117b: reach > 0');
}

// T118 — Leakage resistance scales with soil resistivity
{
  const a1 = engine.calculateUnitSurfaceArea(30);
  const rl_1000 = engine.calculateLeakageResistance(300, a1, 1000);
  const rl_2000 = engine.calculateLeakageResistance(300, a1, 2000);
  assertClose(rl_2000 / rl_1000, 2.0, 1e-6, 'T118: RL doubles when soil resistivity doubles');
}

// T119 — Alpha decreases with higher soil resistivity
{
  const ax = engine.calculatePipeSteelArea(30, 1.27);
  const a1 = engine.calculateUnitSurfaceArea(30);
  const rs = engine.calculatePipeResistance(18, ax);
  const rl_1000 = engine.calculateLeakageResistance(300, a1, 1000);
  const rl_5000 = engine.calculateLeakageResistance(300, a1, 5000);
  const alpha_1000 = engine.calculateAttenuationConstant(rs, rl_1000);
  const alpha_5000 = engine.calculateAttenuationConstant(rs, rl_5000);
  assertTrue(alpha_5000 < alpha_1000, 'T119: alpha decreases with higher soil resistivity');
}

// T120 — Combined potential ≥ natural potential everywhere
{
  const alpha = 4.1803763170231051e-5;
  const stations = [44, 69, 73, 82];
  for (let km = 44; km <= 89; km++) {
    const V = engine.calculateCombinedPotentialAtPoint(km, stations, alpha, 550, 1100);
    assertTrue(V >= 0.550, `T120: combined V at KM${km} >= natural potential`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// T2xx — Validation Tests
// ─────────────────────────────────────────────────────────────────────────────

// T201 — Valid input passes validation
{
  const r = engine.validateAttenuationInput(REF);
  assertTrue(r.valid, 'T201: valid reference input passes validation');
  assertEqual(r.errors.length, 0, 'T201b: no errors on valid input');
}

// T202 — Missing pipe object
{
  const input = { ...REF, pipe: undefined };
  const r = engine.validateAttenuationInput(input);
  assertFalse(r.valid, 'T202: missing pipe fails validation');
}

// T203 — Negative diameter
{
  const input = { ...REF, pipe: { ...REF.pipe, diameterInches: -5 } };
  const r = engine.validateAttenuationInput(input);
  assertFalse(r.valid, 'T203: negative diameter fails validation');
}

// T204 — Wall thickness >= OD/2
{
  const input = { ...REF, pipe: { ...REF.pipe, diameterInches: 10, wallThicknessInches: 6 } };
  const r = engine.validateAttenuationInput(input);
  assertFalse(r.valid, 'T204: wall thickness >= OD/2 fails validation');
}

// T205 — Drain point ≤ natural potential
{
  const input = { ...REF, potentials: { naturalMv: 550, drainPointMv: 400, minimumMv: 850 } };
  const r = engine.validateAttenuationInput(input);
  assertFalse(r.valid, 'T205: drain point <= natural potential fails validation');
}

// T206 — Empty stations array
{
  const input = { ...REF, stations: [] };
  const r = engine.validateAttenuationInput(input);
  assertFalse(r.valid, 'T206: empty stations array fails validation');
}

// T207 — Zero soil resistivity
{
  const input = { ...REF, coating: { ...REF.coating, soilResistivityOhmCm: 0 } };
  const r = engine.validateAttenuationInput(input);
  assertFalse(r.valid, 'T207: zero soil resistivity fails validation');
}

// T208 — Null input
{
  const r = engine.validateAttenuationInput(null);
  assertFalse(r.valid, 'T208: null input fails validation');
  assertTrue(r.errors.length > 0, 'T208b: null input produces errors');
}

// T209 — profileConfig startKm >= endKm produces error
{
  const input = { ...REF, profileConfig: { startKm: 80, endKm: 44, stepKm: 1 } };
  const r = engine.validateAttenuationInput(input);
  assertFalse(r.valid, 'T209: startKm >= endKm fails validation');
}

// T210 — Missing potentials object
{
  const input = { ...REF, potentials: null };
  const r = engine.validateAttenuationInput(input);
  assertFalse(r.valid, 'T210: missing potentials fails validation');
}

// ─────────────────────────────────────────────────────────────────────────────
// T3xx — Profile Generation Tests
// ─────────────────────────────────────────────────────────────────────────────

// T301 — Profile has correct number of points
{
  const result = engine.runAttenuationAnalysis(REF);
  assertTrue(result.success, 'T301a: analysis succeeds');
  // KM 44 to 89 inclusive, step 1.0 = 46 points
  assertEqual(result.profile.length, 46, 'T301b: profile has 46 points (KM 44-89)');
}

// T302 — Profile start and end km are correct
{
  const result = engine.runAttenuationAnalysis(REF);
  assertClose(result.profile[0].km, 44, 0.001, 'T302a: profile starts at KM 44');
  assertClose(result.profile[result.profile.length - 1].km, 89, 0.001, 'T302b: profile ends at KM 89');
}

// T303 — Profile has perStation entries for all stations
{
  const result = engine.runAttenuationAnalysis(REF);
  const point = result.profile[0];
  assertEqual(point.perStation.length, 4, 'T303: each profile point has 4 per-station entries');
}

// T304 — Combined potential matches expected at KM 44 (spreadsheet AD9)
{
  const result = engine.runAttenuationAnalysis(REF);
  const pt44 = result.profile.find(p => Math.abs(p.km - 44) < 0.001);
  assertNotNull(pt44, 'T304a: KM 44 point exists');
  assertClose(pt44.combinedPotentialV, 1.960553433616793, 1e-6, 'T304b: combined V at KM44 matches spreadsheet');
}

// T305 — All reference profile points are protected (combined > 1000 mV)
{
  const result = engine.runAttenuationAnalysis(REF);
  const unprotected = result.profile.filter(p => !p.isProtected);
  assertEqual(unprotected.length, 0, 'T305: all profile points are protected in reference design');
}

// T306 — Summary designAdequate is true for reference dataset
{
  const result = engine.runAttenuationAnalysis(REF);
  assertTrue(result.summary.designAdequate, 'T306: reference design is adequate');
}

// T307 — Profile KM values are monotonically increasing
{
  const result = engine.runAttenuationAnalysis(REF);
  for (let i = 1; i < result.profile.length; i++) {
    assertTrue(
      result.profile[i].km > result.profile[i - 1].km,
      `T307: KM values monotonically increasing at index ${i}`
    );
  }
}

// T308 — Step size 0.5 produces correct count
{
  const input = { ...REF, profileConfig: { startKm: 44, endKm: 46, stepKm: 0.5 } };
  const result = engine.runAttenuationAnalysis(input);
  // 44.0, 44.5, 45.0, 45.5, 46.0 = 5 points
  assertEqual(result.profile.length, 5, 'T308: step 0.5 produces 5 points over 2 km');
}

// T309 — perStation CP3 potential at KM 44 = 1.100 V
{
  const result = engine.runAttenuationAnalysis(REF);
  const pt44 = result.profile.find(p => Math.abs(p.km - 44) < 0.001);
  const cp3 = pt44.perStation.find(s => s.stationId === 'CP3');
  assertClose(cp3.potentialV, 1.100, 1e-8, 'T309: CP3 at its own drain point = 1.100 V');
}

// T310 — Unprotected segments returns empty for protected design
{
  const result = engine.runAttenuationAnalysis(REF);
  assertEqual(result.summary.unprotectedSegments.length, 0, 'T310: no unprotected segments in reference design');
}

// ─────────────────────────────────────────────────────────────────────────────
// T4xx — Boundary / Edge Case Tests
// ─────────────────────────────────────────────────────────────────────────────

// T401 — Very large distance → potential decays to natural
{
  const alpha = 4.1803763170231051e-5;
  // 200,000 m would produce cosh_arg = 8.36 → still manageable
  // 20,000,000 m → cosh_arg = 836 → overflow clamp
  const V = engine.calculatePotentialAtDistance(0, 20000, alpha, 550, 1100);
  assertClose(V, 550 / 1000, 0.001, 'T401: very large distance → natural potential');
}

// T402 — Single station, perfect protection at drain point
{
  const ax = engine.calculatePipeSteelArea(16, 0.5);
  const a1 = engine.calculateUnitSurfaceArea(16);
  const rs = engine.calculatePipeResistance(18, ax);
  const rl = engine.calculateLeakageResistance(200, a1, 1000);
  const alpha = engine.calculateAttenuationConstant(rs, rl);
  const V = engine.calculatePotentialAtDistance(0, 0, alpha, 550, 1050);
  assertClose(V, 1.050, 1e-8, 'T402: at drain point, V equals drain point potential');
}

// T403 — Protection length = 0 when ΔE₀ < ΔE_req
{
  // drainPointMv barely above naturalMv — not enough to meet criterion
  const alpha = 4.1803763170231051e-5;
  const L = engine.calculateProtectionLength(alpha, 550, 600, 850);
  assertEqual(L, 0, 'T403: protection length 0 when drain swing < required swing');
}

// T404 — Protection length null when criterion below natural
{
  const alpha = 4.1803763170231051e-5;
  // minimumMv = 549 < naturalMv = 550 → always "protected", return null
  const L = engine.calculateProtectionLength(alpha, 550, 1100, 549);
  assertEqual(L, null, 'T404: protection length null when criterion < natural potential');
}

// T405 — buildAttenuationInput factory produces valid input
{
  const input = engine.buildAttenuationInput({
    diameterInches: 30,
    wallThicknessInches: 1.27,
    totalLengthKm: 44,
    maxProtectionLengthKm: 25,
    currentDensityMaPerM2: 0.175,
    soilResistivityOhmCm: 1000,
    naturalPotentialMv: 550,
    drainPointPotentialMv: 1100,
    minimumPotentialMv: 1000,
    stations: [{ id: 'CP1', positionKm: 44 }],
  });
  const v = engine.validateAttenuationInput(input);
  assertTrue(v.valid, 'T405: buildAttenuationInput produces valid input');
}

// T406 — Single station analysis succeeds
{
  const input = engine.buildAttenuationInput({
    diameterInches: 16,
    wallThicknessInches: 0.75,
    totalLengthKm: 20,
    maxProtectionLengthKm: 10,
    currentDensityMaPerM2: 0.10,
    soilResistivityOhmCm: 2000,
    naturalPotentialMv: 550,
    drainPointPotentialMv: 1050,
    minimumPotentialMv: 850,
    stations: [{ id: 'CP1', positionKm: 10 }],
    profileStartKm: 0,
    profileEndKm: 20,
  });
  const result = engine.runAttenuationAnalysis(input);
  assertTrue(result.success, 'T406: single station analysis succeeds');
  assertNotNull(result.profile, 'T406b: profile is returned');
}

// T407 — Symmetric single-station profile (max at station position)
{
  const input = engine.buildAttenuationInput({
    diameterInches: 16,
    wallThicknessInches: 0.75,
    totalLengthKm: 20,
    maxProtectionLengthKm: 10,
    currentDensityMaPerM2: 0.10,
    soilResistivityOhmCm: 2000,
    naturalPotentialMv: 550,
    drainPointPotentialMv: 1050,
    minimumPotentialMv: 850,
    stations: [{ id: 'CP1', positionKm: 10 }],
    profileStartKm: 0,
    profileEndKm: 20,
    profileStepKm: 1.0,
  });
  const result = engine.runAttenuationAnalysis(input);
  const maxPt = result.profile.reduce((a, b) => a.combinedPotentialV > b.combinedPotentialV ? a : b);
  assertClose(maxPt.km, 10, 0.001, 'T407: profile maximum is at station position KM 10');
}

// T408 — Invalid input returns failure result (not throw)
{
  const result = engine.runAttenuationAnalysis(null);
  assertFalse(result.success, 'T408a: null input returns failure');
  assertTrue(result.errors.length > 0, 'T408b: failure includes errors');
  assertEqual(result.profile, null, 'T408c: profile is null on failure');
}

// T409 — combinedPotential with zero stations returns natural potential
{
  const alpha = 4.1803763170231051e-5;
  const V = engine.calculateCombinedPotentialAtPoint(50, [], alpha, 550, 1100);
  assertClose(V, 0.550, 1e-10, 'T409: combined V with 0 stations = natural potential');
}

// T410 — findUnprotectedSegments detects gap correctly
{
  // Manually construct a profile with a gap in the middle
  const profile = [];
  for (let km = 0; km <= 20; km++) {
    profile.push({
      km,
      combinedPotentialV: (km >= 8 && km <= 12) ? 0.800 : 0.900, // unprotected in middle
      combinedPotentialMv: (km >= 8 && km <= 12) ? 800 : 900,
      isProtected: !(km >= 8 && km <= 12),
      perStation: [],
    });
  }
  const segments = engine.findUnprotectedSegments(profile);
  assertEqual(segments.length, 1, 'T410a: one unprotected segment detected');
  assertClose(segments[0].startKm, 8, 0.001, 'T410b: segment starts at KM 8');
  assertClose(segments[0].endKm, 12, 0.001, 'T410c: segment ends at KM 12');
  assertClose(segments[0].minPotentialV, 0.800, 1e-6, 'T410d: segment min potential = 0.800 V');
}

// ─────────────────────────────────────────────────────────────────────────────
// T5xx — Engineering Validation Tests (Spreadsheet Comparisons)
// ─────────────────────────────────────────────────────────────────────────────

// T501 — All intermediate values match spreadsheet (DS-001)
{
  const result = engine.runAttenuationAnalysis(REF);
  const im = result.intermediates;
  assertClose(im.pipeSteelAreaM2,                0.07399102439772913, 1e-12, 'T501a: Ax');
  assertClose(im.unitSurfaceAreaM2PerM,           2.3945065957239278,  1e-10, 'T501b: A1');
  assertClose(im.surfaceAreaToX_M2,               59862.664893098197,  0.01,  'T501c: A_TOT');
  assertClose(im.currentRequiredToX_A,            10.475966356292183,  1e-6,  'T501d: I_REQ(X)');
  assertClose(im.currentRequiredTotal_A,          18.437700787074245,  1e-6,  'T501e: I_REQ(TOT)');
  assertClose(im.unitPipeResistance_OhmPerM,      2.432727502628338e-6, 1e-18, 'T501f: RS');
  assertClose(im.coatingLeakageResistance_OhmM,   1392.0752355771112,  0.001, 'T501g: RL');
  assertClose(im.alpha,                           4.1803763170231051e-5, 1e-16, 'T501h: alpha');
  assertClose(im.deltaE0_V,                       0.55,                1e-10, 'T501i: ΔE0');
  assertClose(im.deltaERequired_V,                0.45,                1e-10, 'T501j: ΔE_req');
}

// T502 — Check point assessment matches spreadsheet Q18–Q20
{
  const result = engine.runAttenuationAnalysis(REF);
  const cp = result.checkPointAssessment;
  assertClose(cp.deltaECalculated_V,     0.3442529562497081, 1e-8, 'T502a: ΔE_calc at X');
  assertClose(cp.potentialCalculated_V,  0.8942529562497081, 1e-8, 'T502b: PotCALC at X');
  assertFalse(cp.criterionMet, 'T502c: single-station does not meet criterion at X');
}

// T503 — Profile spot check at KM 57 (spreadsheet row 22: Z22=1.0277, AA22=1.0374, AD22=2.3057)
{
  const result = engine.runAttenuationAnalysis(REF);
  const pt57 = result.profile.find(p => Math.abs(p.km - 57) < 0.001);
  assertNotNull(pt57, 'T503a: KM 57 profile point exists');
  const cp3contribution = pt57.perStation.find(s => s.stationId === 'CP3');
  const cp4contribution = pt57.perStation.find(s => s.stationId === 'CP4');
  assertClose(cp3contribution.potentialV, 1.0277047975256932, 1e-6, 'T503b: CP3 V at KM57');
  assertClose(cp4contribution.potentialV, 1.0373791936211267, 1e-6, 'T503c: CP4 V at KM57');
  assertClose(pt57.combinedPotentialV,    2.3057105697513727, 1e-4, 'T503d: combined V at KM57');
}

// T504 — Profile spot check at KM 82 (CP6 drain point — spreadsheet row 47)
{
  const result = engine.runAttenuationAnalysis(REF);
  const pt82 = result.profile.find(p => Math.abs(p.km - 82) < 0.001);
  assertNotNull(pt82, 'T504a: KM 82 exists');
  const cp6 = pt82.perStation.find(s => s.stationId === 'CP6');
  assertClose(cp6.potentialV, 1.100, 1e-8, 'T504b: CP6 at own drain point = 1.100 V');
}

// T505 — Protection percentage is 100% for reference design
{
  const result = engine.runAttenuationAnalysis(REF);
  assertClose(result.summary.protectionPercentage, 100.0, 0.01, 'T505: 100% protection in reference design');
}

// T506 — Superposition symmetry: two equidistant stations produce same combined V at midpoint
{
  const alpha = 4.1803763170231051e-5;
  const V_mid = engine.calculateCombinedPotentialAtPoint(50, [40, 60], alpha, 550, 1100);
  const V_L   = engine.calculateCombinedPotentialAtPoint(49, [40, 60], alpha, 550, 1100);
  const V_R   = engine.calculateCombinedPotentialAtPoint(51, [40, 60], alpha, 550, 1100);
  assertClose(V_L, V_R, 1e-8, 'T506a: symmetric V on both sides of midpoint');
  assertTrue(V_mid > V_L, 'T506b: midpoint has different potential than offset');
}

// ─────────────────────────────────────────────────────────────────────────────
// T6xx — Negative Tests (Expected Failures)
// ─────────────────────────────────────────────────────────────────────────────

// T601 — Zero coating conductivity fails
{
  const input = { ...REF, coating: { ...REF.coating, conductivityMicroSiemensPerM2: 0 } };
  const r = engine.validateAttenuationInput(input);
  assertFalse(r.valid, 'T601: zero coating conductivity fails validation');
}

// T602 — String value in numeric field fails
{
  const input = { ...REF, pipe: { ...REF.pipe, diameterInches: 'thirty' } };
  const r = engine.validateAttenuationInput(input);
  assertFalse(r.valid, 'T602: string diameter fails validation');
}

// T603 — Station without positionKm fails
{
  const input = {
    ...REF,
    stations: [{ id: 'X', label: 'No position' }], // missing positionKm
  };
  const r = engine.validateAttenuationInput(input);
  assertFalse(r.valid, 'T603: station without positionKm fails validation');
}

// T604 — Negative current density fails
{
  const input = { ...REF, coating: { ...REF.coating, currentDensityMaPerM2: -0.1 } };
  const r = engine.validateAttenuationInput(input);
  assertFalse(r.valid, 'T604: negative current density fails validation');
}

// T605 — Profile step ≤ 0 fails
{
  const input = { ...REF, profileConfig: { startKm: 44, endKm: 89, stepKm: 0 } };
  const r = engine.validateAttenuationInput(input);
  assertFalse(r.valid, 'T605: step size 0 fails validation');
}

// T606 — Total length 0 fails
{
  const input = { ...REF, pipe: { ...REF.pipe, totalLengthKm: 0 } };
  const r = engine.validateAttenuationInput(input);
  assertFalse(r.valid, 'T606: zero total length fails validation');
}


  })
})
// ─────────────────────────────────────────────────────────────────────────────
// RESULTS SUMMARY
// ─────────────────────────────────────────────────────────────────────────────
console.log('Attenuation Engine tests complete');
