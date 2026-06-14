# Zustand Store Split Report — M5b

## Overview

As part of the Track B architectural hardening track, the unified state manager `projectStore.js` (previously containing 1,162 lines of mixed concerns) has been refactored into a modular Zustand slice-based architecture. 

This refactoring was executed non-invasively, maintaining full backward compatibility for all component consumers and tests, with zero state regressions.

## Architecture

The unified store has been split into 8 logical files:

1. **`src/store/factories.js`**: Contains object generation helpers:
   - `makeDefaultStation`
   - `makeDefaultProject`
2. **`src/store/slices/projectSlice.js`**: Manages project-level CRUD, activity logging, and project switching.
3. **`src/store/slices/stationSlice.js`**: Manages station and segment CRUD.
4. **`src/store/slices/designSlice.js`**: Manages design basis settings, tank parameters, and vessel parameters.
5. **`src/store/slices/calculationSlice.js`**: Manages station, tank, and vessel calculations.
6. **`src/store/slices/workflowSlice.js`**: Manages station workflow status changes, design revisions, and diff comparisons.
7. **`src/store/slices/attenuationSlice.js`**: Manages pipeline transmission-line attenuation states and actions.
8. **`src/store/slices/uiSlice.js`**: Manages app shell UI states (sidebar status, theme toggling).

### Root Combiner (`src/store/projectStore.js`)

The root `useProjectStore` now functions as a thin combiner, importing and merging all the slice creator functions within the Immer and Persist middleware:

```javascript
export const useProjectStore = create(
  persist(
    immer((set, get) => ({
      ...createProjectSlice(set, get),
      ...createStationSlice(set, get),
      ...createDesignSlice(set, get),
      ...createCalculationSlice(set, get),
      ...createWorkflowSlice(set, get),
      ...createAttenuationSlice(set, get),
      ...createUiSlice(set, get),
      
      projects: [makeDefaultProject()],
    })),
    {
      name: 'cp-platform-project',
      version: 6,
      storage: createJSONStorage(() => customStorage),
      migrate: migrateLegacyState,
      partialize: (state) => ({
        projects: state.projects,
        activeProjectId: state.activeProjectId,
        activeStationId: state.activeStationId,
        attenuationInput: state.attenuationInput,
        attenuationResult: state.attenuationResult,
        activeWorkspace: state.activeWorkspace,
      }),
    }
  )
)
```

## Benefits of Split Pattern

- **Concern Separation**: Calculations, UI state, and revisions no longer overlap in a single mammoth file.
- **Maintainability**: New engineers can modify UI features or workflow rules in isolation without touching calculation orchestrators.
- **Performance**: Keeps bundling structured and sets up the project for future clean module splitting.
- **Testing**: Allows for cleaner test mocking of individual slices.

## Verification

- **Unit Tests**: All 892 unit tests pass successfully.
- **Build**: Vite production bundling completes with 0 errors.
