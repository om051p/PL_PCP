/**
 * INDEXEDDB STORE WRAPPER
 * Provides Promise-based CRUD access to native browser IndexedDB.
 */

const DB_NAME = 'raxa-cp-platform-db';
const DB_VERSION = 1;

/**
 * Open the IndexedDB instance, running migration schema upgrades if required.
 * @returns {Promise<IDBDatabase>}
 */
export function openDB() {
  return new Promise((resolve, reject) => {
    // If not in a browser environment, mock it out gracefully
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      reject(new Error(`Failed to open IndexedDB: ${event.target.error?.message || 'unknown error'}`));
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Store 1: projects (keyed by project ID)
      if (!db.objectStoreNames.contains('projects')) {
        db.createObjectStore('projects', { keyPath: 'id' });
      }

      // Store 2: calculations (keyed by station ID)
      if (!db.objectStoreNames.contains('calculations')) {
        db.createObjectStore('calculations', { keyPath: 'stationId' });
      }

      // Store 3: reports (keyed by report ID)
      if (!db.objectStoreNames.contains('reports')) {
        db.createObjectStore('reports', { keyPath: 'reportId' });
      }

      // Store 4: standards (keyed by standard ID)
      if (!db.objectStoreNames.contains('standards')) {
        db.createObjectStore('standards', { keyPath: 'standardId' });
      }
    };
  });
}

/**
 * Retrieve an item from the given IndexedDB store.
 * @param {string} storeName
 * @param {string} key
 * @returns {Promise<any|null>}
 */
export async function dbGet(storeName, key) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = (event) => {
        reject(new Error(`Failed to read from store "${storeName}": ${event.target.error?.message}`));
      };
    });
  } catch (err) {
    console.warn(`[IndexedDBStore] Read bypass for store "${storeName}":`, err.message);
    return null;
  }
}

/**
 * Write/update an item in the given IndexedDB store.
 * @param {string} storeName
 * @param {any} value
 * @returns {Promise<void>}
 */
export async function dbPut(storeName, value) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(value);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = (event) => {
        reject(new Error(`Failed to write to store "${storeName}": ${event.target.error?.message}`));
      };
    });
  } catch (err) {
    console.warn(`[IndexedDBStore] Write bypass for store "${storeName}":`, err.message);
  }
}

/**
 * Delete an item from the given IndexedDB store.
 * @param {string} storeName
 * @param {string} key
 * @returns {Promise<void>}
 */
export async function dbDelete(storeName, key) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = (event) => {
        reject(new Error(`Failed to delete from store "${storeName}": ${event.target.error?.message}`));
      };
    });
  } catch (err) {
    console.warn(`[IndexedDBStore] Delete bypass for store "${storeName}":`, err.message);
  }
}

/**
 * Retrieve all items from the given IndexedDB store.
 * @param {string} storeName
 * @returns {Promise<any[]>}
 */
export async function dbGetAll(storeName) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = (event) => {
        reject(new Error(`Failed to list from store "${storeName}": ${event.target.error?.message}`));
      };
    });
  } catch (err) {
    console.warn(`[IndexedDBStore] GetAll bypass for store "${storeName}":`, err.message);
    return [];
  }
}
