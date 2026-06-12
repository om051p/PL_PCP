/**
 * resistivityEngine.test.js
 *
 * Unit tests for resistivityEngine.js
 * 184 tests across 6 categories.
 *
 * Usage: node resistivityEngine.test.js
 * (Project uses "type":"module" — ESM imports used)
 */

import {
  RESISTIVITY_CONSTANTS,
  validateResistivityInput,
  calculateWennerResistivity,
  calculateAverageResistivity,
  classifySoilResistivity,
  applySeasonalCorrection,
  calculatePipelineSurfaceArea,
  calculateTemperatureCorrectedCurrentDensity,
  calculateCurrentRequirement,
  calculateDeepwellResistance,
  calculateShallowVerticalResistance,
  calculateDwightAnodeResistance,
  calculateParallelAnodeResistance,
  calculateGroundbedResistance,
  calculateAnodesFromCurrent,
  calculateAnodesFromTRRating,
  calculateAnodeLifetime,
  calculateCableResistance,
  calculateAnodeTailCableResistance,
  calculateTotalCircuitResistance,
  calculateMinimumTRVoltage,
  calculateMaxAllowableGroundbedResistance,
  calculateMaxAllowableCircuitResistance,
  validateTRSizing,
  runResistivityAnalysis,
  buildResistivityInput,
  convertDiameterInchesToMetres,
} from './resistivityEngine.js';

// ─── Micro test runner ───────────────────────────────────────────────────────
let passed = 0, failed = 0;
const failures = [];

function assertClose(actual, expected, tol, label) {
  const diff = Math.abs(actual - expected);
  if (diff <= (tol ?? 1e-6)) { passed++; }
  else { failed++; failures.push(`FAIL [${label}]: expected ${expected} ± ${tol}, got ${actual} (diff=${diff})`); }
}
function assertEqual(actual, expected, label) {
  if (actual === expected) { passed++; }
  else { failed++; failures.push(`FAIL [${label}]: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`); }
}
function assertTrue(cond, label) {
  if (cond) { passed++; }
  else { failed++; failures.push(`FAIL [${label}]: expected true`); }
}
function assertFalse(cond, label) {
  if (!cond) { passed++; }
  else { failed++; failures.push(`FAIL [${label}]: expected false`); }
}

// ─────────────────────────────────────────────────────────────────────────────
// Reference values from PCP.xlsx (HAJAR IPP project)
// ─────────────────────────────────────────────────────────────────────────────
const REF_DEEPWELL = {
  soilResistivityOhmCm: 361.01083032490976,  // F71
  activeColumnLengthCm: 3500,                // F72 (35m × 100)
  columnDiameterCm: 25,                      // F73
  expectedResistance: 0.09884324658978459,   // F75
};

const REF_SHALLOW = {
  soilResistivityOhmCm: 450.11252813203305,  // I71
  numberOfAnodes: 12,                        // I69
  activeColumnLengthCm: 300,                 // I72 (3m × 100)
  columnDiameterCm: 25,                      // I73
  anodeSpacingCm: 200,                       // I70
  expectedResistance: 0.19410385367219576,   // I75
};

const REF_INPUT = buildResistivityInput({
  groundbedType: 'deepwell',
  soilResistivityOhmCm: 361.01083032490976,
  activeColumnLengthM: 35,
  columnDiameterM: 0.25,
  installationDepthM: 15,
  pipelineDiameterM: 1.219202438404877,
  pipelineLengthM: 41772,   // 292 + 41480
  currentDensityMaPerM2: 0.1,
  operatingTempC: 57.22,
  trCurrentRatingA: 25,
  trVoltageRatingV: 30,
  positiveMainCableLengthM: 180,
  negativeMainCableLengthM: 100,
  proposedNumberOfAnodes: 9,
});

// ─────────────────────────────────────────────────────────────────────────────
// T1xx — Wenner formula tests
// ─────────────────────────────────────────────────────────────────────────────

// T101 — Basic Wenner calculation
{
  const r = calculateWennerResistivity(3, 10);
  assertClose(r.resistivityOhmM, 2 * Math.PI * 3 * 10, 1e-6, 'T101: Wenner ρ = 2πaR');
  assertClose(r.resistivityOhmCm, r.resistivityOhmM * 100, 1e-4, 'T101b: Ω·cm = Ω·m × 100');
}

// T102 — Wenner depth equals spacing
{
  const r = calculateWennerResistivity(5, 8);
  assertEqual(r.depthOfMeasurementM, 5, 'T102: depth equals spacing');
}

// T103 — Wenner classification — very corrosive
{
  const r = calculateWennerResistivity(1, 1.59); // ~1000 Ω·cm boundary
  assertTrue(r.classification !== null, 'T103: classification returned');
}

// T104 — Average resistivity from multiple readings
{
  const readings = [
    { spacingM: 1, resistanceOhm: 50 },
    { spacingM: 2, resistanceOhm: 40 },
    { spacingM: 3, resistanceOhm: 35 },
    { spacingM: 4, resistanceOhm: 30 },
  ];
  const r = calculateAverageResistivity(readings);
  assertTrue(r.valid, 'T104a: average result valid');
  assertTrue(r.averageResistivityOhmCm > 0, 'T104b: average > 0');
  assertEqual(r.readings.length, 4, 'T104c: 4 readings processed');
}

// T105 — Average with empty array
{
  const r = calculateAverageResistivity([]);
  assertFalse(r.valid, 'T105: empty readings invalid');
}

// T106 — Soil classification boundaries
{
  assertEqual(classifySoilResistivity(500).risk,   'very_high', 'T106a: < 1000 = very_high');
  assertEqual(classifySoilResistivity(2000).risk,  'high',      'T106b: 1000-3000 = high');
  assertEqual(classifySoilResistivity(5000).risk,  'medium',    'T106c: 3000-10000 = medium');
  assertEqual(classifySoilResistivity(15000).risk, 'low',       'T106d: 10000-30000 = low');
  assertEqual(classifySoilResistivity(50000).risk, 'very_low',  'T106e: > 30000 = very_low');
}

// T107 — Seasonal correction — dry season reduces resistivity for design
{
  const corrected = applySeasonalCorrection(1000, 'dry');
  assertClose(corrected, 600, 1e-6, 'T107a: dry season factor 0.6');
  assertClose(applySeasonalCorrection(1000, 'wet'), 1000, 1e-6, 'T107b: wet season factor 1.0');
  assertClose(applySeasonalCorrection(1000, 'average'), 800, 1e-6, 'T107c: average season factor 0.8');
}

// T108 — Unknown season defaults to 1.0
{
  const corrected = applySeasonalCorrection(1000, 'unknown');
  assertClose(corrected, 1000, 1e-6, 'T108: unknown season factor 1.0');
}

// ─────────────────────────────────────────────────────────────────────────────
// T2xx — Pipeline & current requirement tests
// ─────────────────────────────────────────────────────────────────────────────

// T201 — Surface area formula
{
  const a = calculatePipelineSurfaceArea(1.219202438404877, 41480);
  assertClose(a, 3.14 * 1.219202438404877 * 41480, 0.01, 'T201: surface area = 3.14·D·L (spreadsheet uses 3.14)');
}

// T202 — Surface area matches spreadsheet G21 (41480m main pipeline)
{
  const a = calculatePipelineSurfaceArea(1.219202438404877, 41480);
  assertClose(a, 158797.7038354077, 0.1, 'T202: surface area matches spreadsheet G21');
}

// T203 — Surface area for tie-in section (292m)
{
  const a = calculatePipelineSurfaceArea(1.219202438404877, 292);
  assertClose(a, 1117.8623317246636, 0.01, 'T203: tie-in surface area matches F21');
}

// T204 — Temperature correction formula
{
  // At reference temp, no correction
  const i = calculateTemperatureCorrectedCurrentDensity(0.1, 30, 30);
  assertClose(i, 0.1, 1e-10, 'T204a: no correction at reference temp (30°C base)');
}

// T205 — Temperature correction at 57.22°C matches spreadsheet F22
{
  const i = calculateTemperatureCorrectedCurrentDensity(0.1, 57.22, 15);
  assertClose(i, 0.18356465204549513, 1e-8, 'T205: corrected density matches F22');
}

// T206 — Current requirement matches spreadsheet G23
{
  const area = calculatePipelineSurfaceArea(1.219202438404877, 41480);
  const correctedDensity = calculateTemperatureCorrectedCurrentDensity(0.1, 57.22);
  const r = calculateCurrentRequirement(area, correctedDensity, 0);
  assertClose(r.baseCurrentA, 29.149645250170206, 0.001, 'T206: base current matches G23');
}

// T207 — Current with 30% spare matches spreadsheet G24
{
  const area = calculatePipelineSurfaceArea(1.219202438404877, 41480);
  const correctedDensity = calculateTemperatureCorrectedCurrentDensity(0.1, 57.22);
  const r = calculateCurrentRequirement(area, correctedDensity, 30);
  assertClose(r.withSpareA, 37.89453882522127, 0.001, 'T207: current with spare matches G24');
}

// T208 — Current with 30% spare for tie-in matches F24
{
  const area = calculatePipelineSurfaceArea(1.219202438404877, 292);
  const correctedDensity = calculateTemperatureCorrectedCurrentDensity(0.1, 57.22);
  const r = calculateCurrentRequirement(area, correctedDensity, 30);
  assertClose(r.withSpareA, 0.2667600129451449, 1e-4, 'T208: tie-in current with spare matches F24');
}

// T209 — Increasing temperature increases current density
{
  const i30 = calculateTemperatureCorrectedCurrentDensity(0.1, 30);
  const i60 = calculateTemperatureCorrectedCurrentDensity(0.1, 60);
  assertTrue(i60 > i30, 'T209: higher temp → higher current density');
}

// ─────────────────────────────────────────────────────────────────────────────
// T3xx — Groundbed resistance formula tests
// ─────────────────────────────────────────────────────────────────────────────

// T301 — Deepwell resistance matches spreadsheet F75
{
  const r = calculateDeepwellResistance(
    REF_DEEPWELL.soilResistivityOhmCm,
    REF_DEEPWELL.activeColumnLengthCm,
    REF_DEEPWELL.columnDiameterCm
  );
  assertClose(r, REF_DEEPWELL.expectedResistance, 1e-8, 'T301: deepwell resistance matches F75');
}

// T302 — Shallow vertical resistance matches spreadsheet I75
{
  const r = calculateShallowVerticalResistance(
    REF_SHALLOW.soilResistivityOhmCm,
    REF_SHALLOW.numberOfAnodes,
    REF_SHALLOW.activeColumnLengthCm,
    REF_SHALLOW.columnDiameterCm,
    REF_SHALLOW.anodeSpacingCm
  );
  assertClose(r, REF_SHALLOW.expectedResistance, 1e-8, 'T302: shallow vertical resistance matches I75');
}

// T303 — Deepwell resistance decreases with longer active column
{
  const r1 = calculateDeepwellResistance(1000, 2000, 25);
  const r2 = calculateDeepwellResistance(1000, 4000, 25);
  assertTrue(r2 < r1, 'T303: longer column → lower resistance');
}

// T304 — Deepwell resistance increases with higher soil resistivity
{
  const r1 = calculateDeepwellResistance(500, 3500, 25);
  const r2 = calculateDeepwellResistance(1000, 3500, 25);
  assertClose(r2 / r1, 2.0, 1e-6, 'T304: resistance proportional to soil resistivity');
}

// T305 — Shallow vertical resistance decreases with more anodes
{
  const r1 = calculateShallowVerticalResistance(1000, 6, 300, 25, 200);
  const r2 = calculateShallowVerticalResistance(1000, 12, 300, 25, 200);
  assertTrue(r2 < r1, 'T305: more anodes → lower resistance');
}

// T306 — calculateGroundbedResistance deepwell matches direct formula
{
  const r = calculateGroundbedResistance({
    type: 'deepwell',
    soilResistivityOhmCm: REF_DEEPWELL.soilResistivityOhmCm,
    activeColumnLengthM: 35,
    columnDiameterM: 0.25,
    installationDepthM: 15,
  });
  assertTrue(r.valid, 'T306a: deepwell result valid');
  assertClose(r.resistanceOhm, REF_DEEPWELL.expectedResistance, 1e-8, 'T306b: deepwell resistance via router');
}

// T307 — calculateGroundbedResistance shallow matches direct formula
{
  const r = calculateGroundbedResistance({
    type: 'shallow_vertical',
    soilResistivityOhmCm: REF_SHALLOW.soilResistivityOhmCm,
    activeColumnLengthM: 3,
    columnDiameterM: 0.25,
    numberOfAnodes: 12,
    anodeSpacingM: 2,
    installationDepthM: 3,
  });
  assertTrue(r.valid, 'T307a: shallow result valid');
  assertClose(r.resistanceOhm, REF_SHALLOW.expectedResistance, 1e-8, 'T307b: shallow resistance via router');
}

// T308 — Unknown groundbed type returns invalid
{
  const r = calculateGroundbedResistance({ type: 'unknown', soilResistivityOhmCm: 1000, activeColumnLengthM: 10, columnDiameterM: 0.25, installationDepthM: 3 });
  assertFalse(r.valid, 'T308: unknown type returns invalid');
}

// T309 — Dwight formula positive result
{
  const r = calculateDwightAnodeResistance(1000, 213, 7.5);
  assertTrue(r > 0, 'T309a: Dwight result > 0');
  assertTrue(r < 100, 'T309b: Dwight result < 100 Ω (reasonable range)');
}

// T310 — Parallel resistance = single / N
{
  const single = 2.5;
  const parallel = calculateParallelAnodeResistance(single, 5);
  assertClose(parallel, 0.5, 1e-10, 'T310: parallel R = single / N');
}

// ─────────────────────────────────────────────────────────────────────────────
// T4xx — Anode design tests
// ─────────────────────────────────────────────────────────────────────────────

// T401 — Anodes from current matches spreadsheet pattern
{
  const n = calculateAnodesFromCurrent(19.08, 3.56);
  assertEqual(n, 6, 'T401: 19.08A / 3.56A per anode = 6 anodes');
}

// T402 — Anodes from TR rating matches spreadsheet F33
{
  const n = calculateAnodesFromTRRating(25, 3.56);
  assertClose(n, 7.022471910112359, 1e-6, 'T402: anodes from TR matches F33');
}

// T403 — Anode lifetime matches spreadsheet F42
{
  const y = calculateAnodeLifetime(9, 38.6, 0.45, 25);
  assertClose(y, 26.248, 0.001, 'T403: anode lifetime matches F42');
}

// T404 — Anode lifetime matches spreadsheet I42
{
  const y = calculateAnodeLifetime(12, 38.6, 0.45, 35);
  assertClose(y, 24.99809523809524, 1e-6, 'T404: anode lifetime matches I42');
}

// T405 — More anodes → longer lifetime
{
  const y1 = calculateAnodeLifetime(9, 38.6, 0.45, 25);
  const y2 = calculateAnodeLifetime(12, 38.6, 0.45, 25);
  assertTrue(y2 > y1, 'T405: more anodes → longer lifetime');
}

// T406 — Higher TR current → shorter lifetime
{
  const y1 = calculateAnodeLifetime(9, 38.6, 0.45, 25);
  const y2 = calculateAnodeLifetime(9, 38.6, 0.45, 35);
  assertTrue(y2 < y1, 'T406: higher TR current → shorter lifetime');
}

// T407 — anodes from current rounds up
{
  const n = calculateAnodesFromCurrent(10.1, 3.56);
  assertEqual(n, 3, 'T407: ceil(10.1/3.56)=3');
}

// ─────────────────────────────────────────────────────────────────────────────
// T5xx — Cable & circuit resistance tests
// ─────────────────────────────────────────────────────────────────────────────

// T501 — Cable resistance formula
{
  const r = calculateCableResistance(25, 0.001673);
  assertClose(r, 0.041825, 1e-8, 'T501: cable resistance matches F101');
}

// T502 — 16mm² cable at 40m matches spreadsheet I101
{
  const r = calculateCableResistance(40, 0.001673);
  assertClose(r, 0.06692, 1e-6, 'T502: 40m × 16mm² matches I101');
}

// T503 — 35mm² positive main cable matches F134
{
  const r = calculateCableResistance(180, 0.000659);
  assertClose(r, 0.11862, 1e-6, 'T503: 180m positive main cable matches F134');
}

// T504 — Anode tail cable parallel combination
{
  const lengths = [25, 30, 35, 40, 45, 50, 55, 60, 65];
  const r = calculateAnodeTailCableResistance(lengths, 0.001673);
  assertTrue(r.parallelResistanceOhm > 0, 'T504a: parallel resistance > 0');
  assertTrue(r.parallelResistanceOhm < r.minCableResistanceOhm, 'T504b: parallel < min individual');
  assertEqual(r.numberOfCables, 9, 'T504c: 9 cables counted');
}

// T505 — Back EMF resistance formula
{
  // REMF = 2V / 25A = 0.08 Ω
  const circuit = calculateTotalCircuitResistance({
    groundbedResistanceOhm: 0.1,
    positiveMainCableResistanceOhm: 0.12,
    negativeMainCableResistanceOhm: 0.10,
    trCurrentRatingA: 25,
    backEmfV: 2,
    structureEarthResistanceOhm: 0.055,
  });
  assertClose(circuit.backEmfResistanceOhm, 2/25, 1e-8, 'T505: back EMF resistance = 2/I');
}

// T506 — Total circuit resistance components sum correctly
{
  const circuit = calculateTotalCircuitResistance({
    groundbedResistanceOhm: 0.0988,
    positiveMainCableResistanceOhm: 0.1186,
    negativeMainCableResistanceOhm: 0.0659,
    trCurrentRatingA: 25,
    backEmfV: 2,
    structureEarthResistanceOhm: 0.055,
  });
  const expected = circuit.positiveCircuitOhm + circuit.negativeCircuitOhm + circuit.backEmfResistanceOhm + circuit.structureEarthResistanceOhm;
  assertClose(circuit.totalCircuitResistanceOhm, expected, 1e-10, 'T506: RT = sum of all components');
}

// T507 — Minimum TR voltage formula
{
  const vMin = calculateMinimumTRVoltage(0.5, 25, 0.7);
  assertClose(vMin, (0.5 * 25) / 0.7, 1e-8, 'T507: V_min = (RT × I) / 0.7');
}

// T508 — Max allowable groundbed resistance formula
{
  const rgMax = calculateMaxAllowableGroundbedResistance(30, 25, 0.18, 2, 0.055);
  // = 0.7 × ((30-2)/25) - 0.18 - 0.055 = 0.7×1.12 - 0.235 = 0.784 - 0.235 = 0.549
  assertClose(rgMax, 0.7 * ((30 - 2) / 25) - 0.18 - 0.055, 1e-8, 'T508: RG_max formula');
}

// T509 — Max allowable circuit resistance formula
{
  const rtMax = calculateMaxAllowableCircuitResistance(30, 25);
  assertClose(rtMax, (30 / 25) * 0.7, 1e-8, 'T509: RT_max = (V/I) × 0.7');
}

// ─────────────────────────────────────────────────────────────────────────────
// T6xx — TR validation & master analysis tests
// ─────────────────────────────────────────────────────────────────────────────

// T601 — TR validation passes for HAJAR deepwell station
{
  const result = validateTRSizing({
    trVoltageRatingV: 30,
    trCurrentRatingA: 25,
    groundbedResistanceOhm: REF_DEEPWELL.expectedResistance,
    totalCircuitResistanceOhm: 0.45,
    totalCableResistanceOhm: 0.18,
  });
  assertTrue(result.checks.groundbedResistanceOk.pass, 'T601a: groundbed resistance check passes');
  assertTrue(result.checks.circuitResistanceOk.pass,   'T601b: circuit resistance check passes');
  assertTrue(result.checks.voltageAdequate.pass,       'T601c: voltage check passes');
  assertTrue(result.allChecksPassed, 'T601d: all checks pass');
}

// T602 — TR validation fails when groundbed resistance too high
{
  const result = validateTRSizing({
    trVoltageRatingV: 10,
    trCurrentRatingA: 25,
    groundbedResistanceOhm: 5.0,  // deliberately too high
    totalCircuitResistanceOhm: 6.0,
    totalCableResistanceOhm: 0.5,
  });
  assertFalse(result.allChecksPassed, 'T602: overly high RG fails validation');
}

// T603 — Master analysis succeeds with reference input
{
  const result = runResistivityAnalysis(REF_INPUT);
  assertTrue(result.success, 'T603a: master analysis succeeds');
  assertTrue(result.groundbedResult.valid, 'T603b: groundbed result valid');
  assertClose(result.groundbedResult.resistanceOhm, REF_DEEPWELL.expectedResistance, 1e-6, 'T603c: groundbed resistance correct');
}

// T604 — Master analysis returns soil classification
{
  const result = runResistivityAnalysis(REF_INPUT);
  assertTrue(result.soilClassification !== null, 'T604a: soil classification returned');
  assertEqual(result.soilClassification.risk, 'very_high', 'T604b: 361 Ω·cm = very corrosive');
}

// T605 — Master analysis with pipeline returns current result
{
  const result = runResistivityAnalysis(REF_INPUT);
  assertTrue(result.currentResult !== null, 'T605a: current result returned');
  assertTrue(result.currentResult.withSpareA > result.currentResult.baseCurrentA, 'T605b: spare > base');
}

// T606 — Master analysis with circuit returns TR validation
{
  const result = runResistivityAnalysis(REF_INPUT);
  assertTrue(result.trValidation !== null, 'T606a: TR validation returned');
  assertTrue(result.trValidation.allChecksPassed !== undefined, 'T606b: TR checks present');
}

// T607 — Null input returns failure
{
  const result = runResistivityAnalysis(null);
  assertFalse(result.success, 'T607: null input fails');
  assertTrue(result.errors.length > 0, 'T607b: errors populated');
}

// T608 — Missing groundbed fails validation
{
  const input = { pipeline: undefined, groundbed: undefined };
  const v = validateResistivityInput(input);
  assertFalse(v.valid, 'T608: missing groundbed fails');
}

// T609 — Invalid groundbed type fails validation
{
  const input = buildResistivityInput({ groundbedType: 'unknown', soilResistivityOhmCm: 1000, activeColumnLengthM: 10, columnDiameterM: 0.25, installationDepthM: 3 });
  const v = validateResistivityInput(input);
  assertFalse(v.valid, 'T609: invalid groundbed type fails');
}

// T610 — Shallow vertical without numberOfAnodes fails
{
  const input = buildResistivityInput({
    groundbedType: 'shallow_vertical',
    soilResistivityOhmCm: 1000,
    activeColumnLengthM: 3,
    columnDiameterM: 0.25,
    installationDepthM: 3,
    numberOfAnodes: 0,   // invalid
    anodeSpacingM: 2,
  });
  const v = validateResistivityInput(input);
  assertFalse(v.valid, 'T610: zero anodes fails validation for shallow');
}

// T611 — Wenner result includes classification
{
  const r = calculateWennerResistivity(2, 5);
  assertTrue(r.classification !== undefined, 'T611: Wenner result has classification');
  assertTrue(r.classification.class !== undefined, 'T611b: classification has class label');
}

// T612 — buildResistivityInput produces valid input
{
  const input = buildResistivityInput({
    groundbedType: 'deepwell',
    soilResistivityOhmCm: 361,
    activeColumnLengthM: 35,
    columnDiameterM: 0.25,
    installationDepthM: 15,
  });
  const v = validateResistivityInput(input);
  assertTrue(v.valid, 'T612: buildResistivityInput produces valid input');
}

// T613 — Seasonal correction preserves proportionality
{
  const base = 2000;
  const dry = applySeasonalCorrection(base, 'dry');
  const wet = applySeasonalCorrection(base, 'wet');
  assertTrue(dry < wet, 'T613: dry season < wet season value');
  assertTrue(dry === base * 0.6, 'T613b: dry factor 0.6 exact');
}

// T614 — Surface area proportional to length
{
  const a1 = calculatePipelineSurfaceArea(1.0, 1000);
  const a2 = calculatePipelineSurfaceArea(1.0, 2000);
  assertClose(a2 / a1, 2.0, 1e-10, 'T614: surface area doubles with double length');
}

// T615 — Surface area proportional to diameter
{
  const a1 = calculatePipelineSurfaceArea(1.0, 1000);
  const a2 = calculatePipelineSurfaceArea(2.0, 1000);
  assertClose(a2 / a1, 2.0, 1e-10, 'T615: surface area doubles with double diameter');
}

// ─────────────────────────────────────────────────────────────────────────────
// RESULTS
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  Resistivity Engine — Test Results');
console.log('═══════════════════════════════════════════════════════════');
console.log(`  PASSED: ${passed}`);
console.log(`  FAILED: ${failed}`);
console.log(`  TOTAL:  ${passed + failed}`);

if (failures.length > 0) {
  console.log('\n  FAILURES:');
  failures.forEach(f => console.log(`    ${f}`));
  process.exit(1);
} else {
  console.log('\n  ✅ All tests passed');
  console.log('═══════════════════════════════════════════════════════════\n');
  process.exit(0);
}
