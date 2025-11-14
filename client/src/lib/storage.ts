/**
 * LocalStorage utilities for persisting simulation runs
 */

import type { SavedRun } from "@/types/simulation";

const STORAGE_KEY = "vc-monte-carlo-runs";

/**
 * Load all saved runs from localStorage
 */
export function loadSavedRuns(): SavedRun[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data) as SavedRun[];
  } catch (error) {
    console.error("Error loading saved runs:", error);
    return [];
  }
}

/**
 * Save a new run to localStorage
 */
export function saveRun(run: SavedRun): void {
  try {
    const runs = loadSavedRuns();
    runs.unshift(run); // Add to beginning
    // Keep only last 50 runs
    const trimmedRuns = runs.slice(0, 50);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedRuns));
  } catch (error) {
    console.error("Error saving run:", error);
  }
}

/**
 * Delete all saved runs
 */
export function deleteAllRuns(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Error deleting runs:", error);
  }
}
