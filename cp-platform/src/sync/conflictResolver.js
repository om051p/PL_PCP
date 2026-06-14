/**
 * CONFLICT RESOLUTION UTILITY (STUB)
 * Extensible rules engine for resolving offline merges and branch conflicts.
 */

/**
 * Resolve conflict between local and remote project state.
 * @param {object} localState
 * @param {object} remoteState
 * @param {'client-wins'|'server-wins'|'manual'} strategy
 * @returns {object} resolvedState
 */
export function resolveConflict(localState, remoteState, strategy = 'client-wins') {
  console.info(`[ConflictResolver] Resolving conflict using strategy: ${strategy}`);

  if (strategy === 'client-wins') {
    return { ...remoteState, ...localState };
  }

  if (strategy === 'server-wins') {
    return { ...localState, ...remoteState };
  }

  // Fallback to client-wins for stub
  return { ...remoteState, ...localState };
}

/**
 * Detect if two project revisions have diverted.
 * @param {object} localProject
 * @param {object} remoteProject
 * @returns {boolean}
 */
export function hasDiverged(localProject, remoteProject) {
  if (!localProject || !remoteProject) return false;
  return localProject.updatedAt !== remoteProject.updatedAt;
}
