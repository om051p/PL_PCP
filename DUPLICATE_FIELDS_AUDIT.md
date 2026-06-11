# RAXA Platform — Duplicate Field Audit

This audit identifies duplicate inputs, redundant data entry points, and naming inconsistencies across the engineering pages in the **Raxa Pipeline** module, proposing a roadmap to establish a single source of truth.

---

## 1. Summary of Duplications

During our code review of `cp-platform/src/pages/`, we identified **8 primary engineering parameters** that are duplicated or entered multiple times across pages. 

Many values are entered once in the project setup (`PageProjectSetup.jsx`), but then re-entered or duplicated as sub-properties under specific stations or calculation views (such as `PageGroundbed.jsx` or `PageTRSizing.jsx`).

---

## 2. Detailed Duplicate Field Inventory

### 1. System Design Life
*   **Source Location**: [PageProjectSetup.jsx](file:///home/rworld_pop/projects/PL%20PCP/cp-platform/src/pages/PageProjectSetup.jsx) (as `systemDesignLifeYears`)
*   **Duplicate Location(s)**: [PageGroundbed.jsx](file:///home/rworld_pop/projects/PL%20PCP/cp-platform/src/pages/PageGroundbed.jsx) (as `designLifeYears` under the active station object)
*   **Inconsistent Naming**: `systemDesignLifeYears` (Project Level) vs. `designLifeYears` (Station Level)
*   **Recommended Owner Module**: **Design Basis**
*   **Cleanup Action**: Remove `designLifeYears` input from the Groundbed Design page. Replace it with a read-only text indicator bound to the Design Basis value. Update [calculations.js](file:///home/rworld_pop/projects/PL%20PCP/cp-platform/src/engine/modules/calculations.js) to consume `project.designBasis.systemDesignLifeYears`.

### 2. Back EMF (Electromotive Force)
*   **Source Location**: [PageProjectSetup.jsx](file:///home/rworld_pop/projects/PL%20PCP/cp-platform/src/pages/PageProjectSetup.jsx) (as `back_emf_v` in project settings)
*   **Duplicate Location(s)**: [PageTRSizing.jsx](file:///home/rworld_pop/projects/PL%20PCP/cp-platform/src/pages/PageTRSizing.jsx) (as `backEMF` in TR settings under the active station)
*   **Inconsistent Naming**: `back_emf_v` (snake_case) vs. `backEMF` (camelCase)
*   **Recommended Owner Module**: **Design Basis**
*   **Cleanup Action**: Lock the `Back EMF (V)` input field on the TR Sizing page to read-only. Bind the value to the Design Basis setting. Display a message: *"Locked to Central Design Settings in Design Basis"*.

### 3. Structure-to-Earth Resistance
*   **Source Location**: [PageProjectSetup.jsx](file:///home/rworld_pop/projects/PL%20PCP/cp-platform/src/pages/PageProjectSetup.jsx) (as `structure_resistance_ohm`)
*   **Duplicate Location(s)**: [PageTRSizing.jsx](file:///home/rworld_pop/projects/PL%20PCP/cp-platform/src/pages/PageTRSizing.jsx) (as `structureResistance` under active station TR parameters)
*   **Inconsistent Naming**: `structure_resistance_ohm` (snake_case) vs. `structureResistance` (camelCase)
*   **Recommended Owner Module**: **Design Basis**
*   **Cleanup Action**: Disable local input in the TR Sizing module and read directly from the Design Basis.

### 4. Soil Resistivity
*   **Source Location**: [PagePipeline.jsx](file:///home/rworld_pop/projects/PL%20PCP/cp-platform/src/pages/PagePipeline.jsx) (as `soilResistivityOhmCm` under station parameters)
*   **Duplicate Location(s)**: 
    *   [PageGroundbed.jsx](file:///home/rworld_pop/projects/PL%20PCP/cp-platform/src/pages/PageGroundbed.jsx) (as `soilResistivityOhmCm` under station parameters)
    *   [AttenuationPage.jsx](file:///home/rworld_pop/projects/PL%20PCP/cp-platform/src/pages/AttenuationPage.jsx) (as `soilResistivity` under the local attenuation inputs)
*   **Inconsistent Naming**: `soilResistivityOhmCm` vs. `soilResistivity`
*   **Recommended Owner Module**: **Design Basis** (if uniform across the project) or **Pipeline Parameters** (if station-specific).
*   **Cleanup Action**: Since soil resistivity is a fundamental environmental parameter, make it a single input in the **Design Basis** environmental section. Propagate this value as read-only labels on the Groundbed and Attenuation pages.

### 5. Actual & Minimum Groundbed Remoteness Distance
*   **Source Location**: [PageProjectSetup.jsx](file:///home/rworld_pop/projects/PL%20PCP/cp-platform/src/pages/PageProjectSetup.jsx) (as `actual_remoteness_distance_m` and `min_remoteness_distance_m`)
*   **Duplicate Location(s)**: [PageGroundbed.jsx](file:///home/rworld_pop/projects/PL%20PCP/cp-platform/src/pages/PageGroundbed.jsx) (as `actualRemotenessM` and `requiredRemotenessM` on the active station)
*   **Inconsistent Naming**: 
    *   `actual_remoteness_distance_m` vs. `actualRemotenessM`
    *   `min_remoteness_distance_m` vs. `requiredRemotenessM`
*   **Recommended Owner Module**: **Design Basis**
*   **Cleanup Action**: Remove the duplicate inputs from the Groundbed Design page and reference the Design Basis constants.

### 6. Pipeline Geometry (Outer Diameter & Wall Thickness)
*   **Source Location**: [PagePipeline.jsx](file:///home/rworld_pop/projects/PL%20PCP/cp-platform/src/pages/PagePipeline.jsx) (as segment `od` and `wallThk`)
*   **Duplicate Location(s)**: [AttenuationPage.jsx](file:///home/rworld_pop/projects/PL%20PCP/cp-platform/src/pages/AttenuationPage.jsx) (as `od` and `wallThk` under the local attenuation calculator form)
*   **Inconsistent Naming**: `od` / `wallThk` (Segment) vs. `outerDiameter` / `wallThickness` (Attenuation Page)
*   **Recommended Owner Module**: **Pipeline Parameters** (the segment grid)
*   **Cleanup Action**: The Attenuation module should automatically sum and reference the geometry parameters from the **Pipeline Parameters** segment grid rather than asking the user to manually type them again.

---

## 3. UI/UX Strategy for Duplicate Fields

To implement these changes without confusing current users, we apply a two-phased UI/UX approach:

1.  **Lock and Display**:
    Instead of hiding the inputs on downstream pages immediately, we keep them visible to maintain layout density, but set their state to `disabled`. 
    We render a subtle visual tooltip or sub-label:
    ```html
    <FieldInput
      label="Back EMF"
      value={designBasis.backEmfV}
      readOnly={true}
      hint="Locked to Central Design Basis"
    />
    ```
2.  **Highlight Context-Level Overrides**:
    For parameters that *may* differ per station but default to the Design Basis (e.g. soil resistivity), we display a toggle: `[ Use Project Default (361 Ω-cm) ]`. Unchecking it reveals a local override input.
