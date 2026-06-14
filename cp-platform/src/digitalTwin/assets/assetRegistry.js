/**
 * M10 — Asset Registry (Digital Twin Foundation)
 * assetRegistry.js — CRUD operations for the asset registry
 *
 * Assets are keyed by asset.id and indexed by stationId.
 * The registry is pure state — it is integrated into the Zustand store via assetSlice.
 *
 * PROTECTED: No calculation logic. Pure data management only.
 */

/**
 * Create a fresh, empty registry state.
 * @returns {RegistryState}
 */
export function makeEmptyRegistry() {
  return {
    assets: {},           // Record<assetId, Asset>
    byStation: {},        // Record<stationId, assetId[]>
    byProject: {},        // Record<projectId, assetId[]>
    lastSyncedAt: null,
  }
}

/**
 * Add an asset to the registry.
 * Returns a new registry state (immutable update).
 *
 * @param {RegistryState} registry
 * @param {Asset} asset
 * @returns {RegistryState}
 */
export function registryAddAsset(registry, asset) {
  const assets = { ...registry.assets, [asset.id]: asset }

  const byStation = { ...registry.byStation }
  if (asset.stationId) {
    byStation[asset.stationId] = [
      ...(byStation[asset.stationId] ?? []),
      asset.id,
    ]
  }

  const byProject = { ...registry.byProject }
  if (asset.projectId) {
    byProject[asset.projectId] = [
      ...(byProject[asset.projectId] ?? []),
      asset.id,
    ]
  }

  return { ...registry, assets, byStation, byProject }
}

/**
 * Remove an asset from the registry.
 * Returns a new registry state.
 *
 * @param {RegistryState} registry
 * @param {string} assetId
 * @returns {RegistryState}
 */
export function registryRemoveAsset(registry, assetId) {
  const asset = registry.assets[assetId]
  if (!asset) return registry

  const assets = { ...registry.assets }
  delete assets[assetId]

  const byStation = { ...registry.byStation }
  if (asset.stationId && byStation[asset.stationId]) {
    byStation[asset.stationId] = byStation[asset.stationId].filter((id) => id !== assetId)
  }

  const byProject = { ...registry.byProject }
  if (asset.projectId && byProject[asset.projectId]) {
    byProject[asset.projectId] = byProject[asset.projectId].filter((id) => id !== assetId)
  }

  return { ...registry, assets, byStation, byProject }
}

/**
 * Update an asset's mutable fields (healthScore, name, notes).
 * designRef is never mutated after creation.
 *
 * @param {RegistryState} registry
 * @param {string} assetId
 * @param {Partial<Asset>} updates — only safe mutable fields
 * @returns {RegistryState}
 */
export function registryUpdateAsset(registry, assetId, updates) {
  const asset = registry.assets[assetId]
  if (!asset) return registry

  // Protect designRef — never allow it to be overwritten via update
  const { designRef: _ignored, id: _id, type: _type, stationId: _sid, projectId: _pid, createdAt: _cat, ...safeUpdates } = updates

  return {
    ...registry,
    assets: {
      ...registry.assets,
      [assetId]: { ...asset, ...safeUpdates },
    },
  }
}

/**
 * Get all assets for a station.
 *
 * @param {RegistryState} registry
 * @param {string} stationId
 * @returns {Asset[]}
 */
export function getAssetsForStation(registry, stationId) {
  const ids = registry.byStation[stationId] ?? []
  return ids.map((id) => registry.assets[id]).filter(Boolean)
}

/**
 * Get all assets for a project.
 *
 * @param {RegistryState} registry
 * @param {string} projectId
 * @returns {Asset[]}
 */
export function getAssetsForProject(registry, projectId) {
  const ids = registry.byProject[projectId] ?? []
  return ids.map((id) => registry.assets[id]).filter(Boolean)
}

/**
 * Get a single asset by ID.
 *
 * @param {RegistryState} registry
 * @param {string} assetId
 * @returns {Asset|undefined}
 */
export function getAssetById(registry, assetId) {
  return registry.assets[assetId]
}

/**
 * Bulk-replace all assets for a station.
 * Used when re-commissioning a station from updated design data.
 *
 * @param {RegistryState} registry
 * @param {string} stationId
 * @param {Asset[]} newAssets
 * @returns {RegistryState}
 */
export function registryReplaceStationAssets(registry, stationId, newAssets) {
  // Remove all existing assets for this station
  const existingIds = registry.byStation[stationId] ?? []
  let updated = existingIds.reduce(
    (reg, id) => registryRemoveAsset(reg, id),
    registry,
  )

  // Add new assets
  updated = newAssets.reduce(
    (reg, asset) => registryAddAsset(reg, asset),
    updated,
  )

  return { ...updated, lastSyncedAt: new Date().toISOString() }
}
