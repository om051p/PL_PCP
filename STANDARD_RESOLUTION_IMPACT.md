# Standard Resolution Impact Analysis

## Current Behavior
In the legacy schema, the active engineering standard is stored as a flat property directly on the project object: `project.designStandard`.
The `getActiveStandard(project)` function reads this flat property:
```javascript
export function getActiveStandard(project) {
  if (!project || !project.designStandard) {
    return SAUDI_ARAMCO
  }
  return getStandard(project.designStandard)
}
```
In the multi-tenant/multi-project refactored database layout, the active standard is stored under the `designBasis` sub-object: `project.designBasis.designStandard`. Since the existing `getActiveStandard` function does not check `project.designBasis.designStandard`, it fails to resolve the correct standard when a user updates it in the UI. Consequently, the application always falls back to the default `saudiAramco` configuration, leaving UI badges, validation engines, and exports locked to Saudi Aramco defaults.

## New Behavior
The updated `getActiveStandard(project)` function resolves the standard by checking both the new `designBasis` schema and the legacy flat schema, ensuring backward compatibility for legacy and migrated projects:
```javascript
export function getActiveStandard(project) {
  if (!project) {
    return SAUDI_ARAMCO
  }
  const standardId = project.designBasis?.designStandard || project.designStandard;
  if (!standardId) {
    return SAUDI_ARAMCO
  }
  return getStandard(standardId)
}
```

---

## Callers Discovered by GitNexus

Below is the exhaustive list of callers that invoke `getActiveStandard(project)`, grouped by component layer:

### 1. Presentation Layer (UI Badges & Cards)

#### `StandardBadge`
* **File**: [ui.jsx](file:///home/rworld_pop/projects/PL%20PCP/cp-platform/src/components/ui.jsx#L366)
* **Description**: Renders the active standard badge in the UI navigation or main views (e.g., displaying "Saudi Aramco" or "NACE SP0169").
* **Risk Assessment**: **LOW**. The component only accesses standard metadata (`label` and `color`) for rendering. Correct resolution will immediately display the correct badge.

#### `ProjectCard`
* **File**: [PageDashboard.jsx](file:///home/rworld_pop/projects/PL%20PCP/cp-platform/src/pages/PageDashboard.jsx#L47)
* **Description**: Displays the selected design standard on the project cards in the dashboard.
* **Risk Assessment**: **LOW**. Display only; changes here have no side-effects.

#### `DesignStandardInfoBox` and `PageCurrentRequirement`
* **File**: [PageCurrentRequirement.jsx](file:///home/rworld_pop/projects/PL%20PCP/cp-platform/src/pages/PageCurrentRequirement.jsx#L21)
* **Description**: Displays the thresholds and current density requirements corresponding to the active standard.
* **Risk Assessment**: **MEDIUM**. Renders calculation inputs. Correct resolution will update the UI text and inputs to reflect NACE or other selected standards.

---

### 2. Business Logic & Calculation Layer

#### `runFullCalculation`
* **File**: [calculationService.js](file:///home/rworld_pop/projects/PL%20PCP/cp-platform/src/services/calculationService.js#L44)
* **Description**: Invoked during calculation cycles to obtain standard-specific constants, which are then passed to `runStationCalculations` and `runRules`.
* **Risk Assessment**: **CRITICAL**. Modifying the standard resolver directly changes the calculation parameters (e.g., current density requirements, temperature corrections, and safety factors). Extensive regression testing is required to verify calculation outputs.

#### `generateStationBOM`
* **File**: [bomService.js](file:///home/rworld_pop/projects/PL%20PCP/cp-platform/src/services/bomService.js#L31)
* **Description**: Generates the Bill of Materials (BOM) based on standard-specific rules.
* **Risk Assessment**: **HIGH**. BOM generation rules change depending on whether a NACE or Aramco standard is active. Correct resolution ensures NACE projects use correct NACE BOM logic.

#### `generateBOMForDisplay` / `PageBOM`
* **File**: [PageBOM.jsx](file:///home/rworld_pop/projects/PL%20PCP/cp-platform/src/pages/PageBOM.jsx#L19)
* **Description**: Renders the BOM to the user.
* **Risk Assessment**: **MEDIUM**. Renders output only, but changes have user visibility.

---

### 3. Reporting & Export Layer

#### `exportToExcel`
* **File**: [excelEngine.js](file:///home/rworld_pop/projects/PL%20PCP/cp-platform/src/reporting/excelEngine.js#L19)
* **Description**: Generates Excel spreadsheet exports containing design basis parameters and station calculations.
* **Risk Assessment**: **HIGH**. The Excel export must match calculations shown on screen. If standard resolution changes, the output in Excel must align exactly.

#### `generateEngineeringReport` / `downloadEngineeringReport`
* **File**: [pdfGenerator.js](file:///home/rworld_pop/projects/PL%20PCP/cp-platform/src/reporting/pdfGenerator.js#L278)
* **Description**: Renders design specifications and calculation summaries to a PDF engineering report.
* **Risk Assessment**: **HIGH**. PDFs must print the active standard correctly and present validation checks aligned with that standard.
