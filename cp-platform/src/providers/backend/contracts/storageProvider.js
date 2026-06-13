/**
 * StorageProvider — INTERFACE CONTRACT
 *
 * File/blob storage for reports, exports, and user uploads.
 * Currently not used in production (export is client-side download),
 * but defined now for future migration readiness.
 *
 * Contract version: 1.0.0
 */

/**
 * @typedef {Object} StorageProvider
 *
 * @property {(path: string, data: Blob|ArrayBuffer|string, metadata?: object) => Promise<string>} upload
 *   Upload data to the given path. Returns a public or signed URL.
 *
 * @property {(path: string) => Promise<string>}         getDownloadUrl
 *   Get a download URL for an existing object at the given path.
 *
 * @property {(path: string) => Promise<void>}           delete
 *   Delete an object at the given path.
 *
 * @property {() => string}                              providerId
 *   Stable identifier (e.g. 'firebase-storage', 's3', 'azure-blob').
 */

// Contract — no runtime exports.
export default {}
