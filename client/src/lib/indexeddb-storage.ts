/**
 * IndexedDB storage utilities for persisting simulation runs
 * Provides unlimited storage capacity compared to localStorage
 */

import type { SavedRun } from "@/types/simulation";

const DB_NAME = "vc-monte-carlo";
const DB_VERSION = 1;
const STORE_NAME = "simulation-runs";

/**
 * Open IndexedDB connection
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        // Create index on timestamp for sorting
        store.createIndex("timestamp", "timestamp", { unique: false });
      }
    };
  });
}

/**
 * Load all saved runs from IndexedDB, sorted by timestamp (newest first)
 */
export async function loadSavedRuns(): Promise<SavedRun[]> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index("timestamp");

    return new Promise((resolve, reject) => {
      const request = index.openCursor(null, "prev"); // Descending order
      const runs: SavedRun[] = [];

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          runs.push(cursor.value as SavedRun);
          cursor.continue();
        } else {
          resolve(runs);
        }
      };

      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Error loading saved runs from IndexedDB:", error);
    return [];
  }
}

/**
 * Save a new run to IndexedDB
 * Now stores full simulation results without quota limits
 */
export async function saveRun(run: SavedRun): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.put(run);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Error saving run to IndexedDB:", error);
    throw new Error(
      `Failed to save run: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Delete a specific run by ID
 */
export async function deleteRun(id: string): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Error deleting run from IndexedDB:", error);
    throw error;
  }
}

/**
 * Delete all saved runs
 */
export async function deleteAllRuns(): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Error deleting all runs from IndexedDB:", error);
    throw error;
  }
}

/**
 * Get count of saved runs
 */
export async function getRunCount(): Promise<number> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Error getting run count from IndexedDB:", error);
    return 0;
  }
}

/**
 * Migrate data from localStorage to IndexedDB
 */
export async function migrateFromLocalStorage(): Promise<number> {
  try {
    const STORAGE_KEY = "vc-monte-carlo-runs";
    const data = localStorage.getItem(STORAGE_KEY);

    if (!data) {
      return 0; // No data to migrate
    }

    const runs = JSON.parse(data) as SavedRun[];

    // Save each run to IndexedDB
    for (const run of runs) {
      await saveRun(run);
    }

    // Clear localStorage after successful migration
    localStorage.removeItem(STORAGE_KEY);

    console.log(`Migrated ${runs.length} runs from localStorage to IndexedDB`);
    return runs.length;
  } catch (error) {
    console.error("Error migrating from localStorage:", error);
    return 0;
  }
}
