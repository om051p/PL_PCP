/**
 * ProjectProvider — INTERFACE CONTRACT
 *
 * Manages CP engineering project persistence (currently localStorage; future: remote DB).
 *
 * Contract version: 1.0.0
 */

/**
 * @typedef {Object} ProjectProvider
 *
 * @property {() => object}                              loadState
 *   Load the full project state from persistence.
 *   Returns the raw state object (projects array, active IDs, etc.).
 *   MUST return a valid default state when no saved state exists.
 *
 * @property {(state: object) => void}                   saveState
 *   Persist the full project state atomically.
 *   The state object includes: projects, activeProjectId, activeStationId,
 *   attenuationInput, attenuationResult, activeWorkspace.
 *
 * @property {(fileContent: string) => object | { success: false, error: string }} parseImport
 *   Parse and validate an imported project JSON file.
 *   Returns a project object ready for insertion on success.
 *
 * @property {(project: object) => void}                 exportProject
 *   Trigger a project export (download as JSON file).
 *
 * @property {() => string}                              providerId
 *   Stable identifier (e.g. 'local-storage', 'firestore', 'postgres').
 */

// Contract — no runtime exports.
export default {}
