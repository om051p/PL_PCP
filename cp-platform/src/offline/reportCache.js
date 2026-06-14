import { dbGet, dbPut, dbDelete, dbGetAll } from './indexedDbStore.js';

/**
 * Cache a generated report blob and metadata.
 * @param {string} reportId
 * @param {Blob|ArrayBuffer} blob
 * @param {object} metadata
 * @returns {Promise<void>}
 */
export async function cacheReport(reportId, blob, metadata = {}) {
  if (!reportId || !blob) return;
  await dbPut('reports', {
    reportId,
    blob,
    metadata: {
      ...metadata,
      cachedAt: new Date().toISOString(),
    },
  });
}

/**
 * Retrieve a cached report.
 * @param {string} reportId
 * @returns {Promise<{reportId: string, blob: Blob|ArrayBuffer, metadata: object}|null>}
 */
export async function getCachedReport(reportId) {
  if (!reportId) return null;
  return await dbGet('reports', reportId);
}

/**
 * Retrieve all cached reports.
 * @returns {Promise<object[]>}
 */
export async function getAllCachedReports() {
  return await dbGetAll('reports');
}

/**
 * Evict a cached report by ID.
 * @param {string} reportId
 * @returns {Promise<void>}
 */
export async function evictCachedReport(reportId) {
  if (!reportId) return;
  await dbDelete('reports', reportId);
}
