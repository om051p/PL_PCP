import { v4 as uuid } from 'uuid'

/**
 * Generate a new unique identifier.
 * Centralized wrapper to support potential future tracking, prefixing, or seeding.
 * 
 * @returns {string} UUID v4
 */
export const newId = () => uuid()
