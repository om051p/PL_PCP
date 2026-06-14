import { dbGet, dbPut, dbDelete } from './indexedDbStore.js';

/**
 * Cache the latest calculation result for a station.
 * @param {string} stationId
 * @param {object} result
 * @returns {Promise<void>}
 */
export async function cacheCalculation(stationId, result) {
  if (!stationId || !result) return;
  await dbPut('calculations', {
    stationId,
    timestamp: new Date().toISOString(),
    result,
  });
}

/**
 * Retrieve the cached calculation result for a station.
 * @param {string} stationId
 * @returns {Promise<object|null>}
 */
export async function getCachedCalculation(stationId) {
  if (!stationId) return null;
  const record = await dbGet('calculations', stationId);
  return record ? record.result : null;
}

/**
 * Evict a station's calculation cache.
 * @param {string} stationId
 * @returns {Promise<void>}
 */
export async function evictCalculationCache(stationId) {
  if (!stationId) return;
  await dbDelete('calculations', stationId);
}
