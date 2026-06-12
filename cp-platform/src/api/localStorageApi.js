/**
 * LOCAL STORAGE API WRAPPER
 * Provides safe browser localStorage access with an in-memory fallback.
 */

const inMemoryMap = new Map()

export const localStorageApi = {
  /**
   * Get an item from localStorage
   * @param {string} key
   * @returns {string|null}
   */
  getItem(key) {
    try {
      return localStorage.getItem(key)
    } catch {
      return inMemoryMap.get(key) ?? null
    }
  },

  /**
   * Set an item in localStorage
   * @param {string} key
   * @param {string} value
   */
  setItem(key, value) {
    try {
      localStorage.setItem(key, value)
    } catch {
      inMemoryMap.set(key, value)
    }
  },

  /**
   * Remove an item from localStorage
   * @param {string} key
   */
  removeItem(key) {
    try {
      localStorage.removeItem(key)
    } catch {
      inMemoryMap.delete(key)
    }
  },

  /**
   * Get and parse a JSON item from localStorage
   * @param {string} key
   * @returns {any|null}
   */
  getJSON(key) {
    const item = this.getItem(key)
    if (!item) return null
    try {
      return JSON.parse(item)
    } catch (err) {
      console.warn(`[LocalStorageAPI] Failed to parse key "${key}":`, err.message)
      return null
    }
  },

  /**
   * Serialize and save an object as JSON to localStorage
   * @param {string} key
   * @param {any} value
   */
  setJSON(key, value) {
    try {
      const serialized = JSON.stringify(value)
      this.setItem(key, serialized)
    } catch (err) {
      console.warn(`[LocalStorageAPI] Failed to serialize key "${key}":`, err.message)
    }
  },
}
