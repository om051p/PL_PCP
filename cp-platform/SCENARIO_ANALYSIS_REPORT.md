# Scenario Analysis Engine Report — M7

## Overview

To enable engineers to evaluate environmental swings and model design margins, RAXA CP now includes a pure, state-cloning **"What-If" Scenario Analysis Engine**. 

This allows users to create, configure, and compare multiple design scenarios (e.g., varying soil resistivity, anode counts, or design life targets) side-by-side with the active design basis. All calculations run against the official CP rules engine without mutating the primary project state.

---

## Architecture

The sandbox architecture is split into a pure calculation layer and a State Management layer:

### 1. Pure Calculation Layer
* **[ScenarioModel.js](file:///home/rworld_pop/projects/raxa/cp-platform/src/engine/scenarios/ScenarioModel.js)**: Defines the structured `Scenario` schema. Each scenario maintains its unique metadata, base station association, and a set of overrides mapped to `station`, `designBasis`, `groundbed`, and `tr` sections.
* **[scenarioRunner.js](file:///home/rworld_pop/projects/raxa/cp-platform/src/engine/scenarios/scenarioRunner.js)**: A pure function that takes the base station, project, and scenario, performs an internal deep clone, applies overrides, runs `runStationCalculations()`, and returns a comparative `ScenarioResult` record.

```javascript
export function runScenario(station, project, scenario) {
  const clonedStation = JSON.parse(JSON.stringify(station));
  const clonedProject = JSON.parse(JSON.stringify(project));

  // Pure overrides application
  Object.assign(clonedStation, scenario.overrides.station || {});
  Object.assign(clonedProject.designBasis, scenario.overrides.designBasis || {});
  Object.assign(clonedStation.groundbed, scenario.overrides.groundbed || {});
  Object.assign(clonedStation.tr, scenario.overrides.tr || {});

  // Execute standard calculations on temporary cloned state
  const result = runStationCalculations(clonedStation, clonedProject.designBasis.systemDesignLifeYears, null, clonedProject);
  return {
    scenarioId: scenario.id,
    computedAt: new Date().toISOString(),
    appliedOverrides: scenario.overrides,
    result
  };
}
```

### 2. State Management
* **[scenarioSlice.js](file:///home/rworld_pop/projects/raxa/cp-platform/src/store/slices/scenarioSlice.js)**: A modular Zustand slice incorporated into the root store combiner. It tracks:
  - `scenarios`: Array of saved scenarios
  - `saveScenario()` / `deleteScenario()`: Persistence methods
  - `runScenario()`: Invokes the runner and stores results inside the scenario record
  - `runAllScenarios()`: Batch computes all scenarios associated with the current active station

---

## User Interface Integration

The simulation sandbox is exposed via the **[ScenarioAnalysisPanel.jsx](file:///home/rworld_pop/projects/raxa/cp-platform/src/components/ScenarioAnalysisPanel.jsx)** component, which is integrated into the bottom of **[PageSensitivity.jsx](file:///home/rworld_pop/projects/raxa/cp-platform/src/pages/PageSensitivity.jsx)**.

### Features
1. **Scenario Creation & Presets**: Engineers can quickly instantiate preset scenarios with a single click:
   - **Soil Resistivity +20%**: Simulates dry soil conditions.
   - **Worst Case Summer**: Overrides soil resistivity to 1000 Ω·cm, operating temperature to 75°C, and reduces active anodes to simulate physical failures.
   - **Extended Design Life**: Tests TR capacity and anode weight requirement if the system design life is extended to 35 years.
   - **Custom Overrides**: Allows the engineer to input arbitrary values for soil resistivity, anode count, design life, and TR voltage.
2. **Comparative Matrix**: Renders a tabular side-by-side comparison of the Base Design vs all active scenarios.
   - Highlights changes (e.g., `+20%` or `-24%`) on critical outputs.
   - Color-codes PASS/FAIL compliance status for groundbed resistance, TR voltage adequacy, and anode design life limits.
   - Displays clear warning signs for boundary exceedances.

---

## Verification

* **Unit Tests**:
  - [scenarioRunner.test.js](file:///home/rworld_pop/projects/raxa/cp-platform/src/engine/scenarios/scenarioRunner.test.js) verifies that overrides apply correctly, engine results are calculated cleanly, and the base station remains unmutated.
  - [scenarioStore.test.js](file:///home/rworld_pop/projects/raxa/cp-platform/src/store/scenarioStore.test.js) validates store transitions, scenario creation, deletion, and reactive computation.
* **All tests pass successfully.**
