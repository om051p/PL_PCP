import { dbGet, dbPut, dbDelete, dbGetAll } from './indexedDbStore.js';
import { localStorageApi } from '../api/localStorageApi.js';

const LOCAL_STORAGE_PROJECT_PREFIX = 'raxa-project-';

/**
 * Cache a project in both IndexedDB (primary) and localStorage (fallback).
 * @param {object} project
 * @returns {Promise<void>}
 */
export async function cacheProject(project) {
  if (!project || !project.id) return;
  
  // 1. Primary Write: IndexedDB
  await dbPut('projects', project);

  // 2. Secondary/Fallback Write: localStorage
  localStorageApi.setJSON(`${LOCAL_STORAGE_PROJECT_PREFIX}${project.id}`, project);
}

/**
 * Retrieve a project by ID from cache (prefers IndexedDB, falls back to localStorage).
 * @param {string} projectId
 * @returns {Promise<object|null>}
 */
export async function getCachedProject(projectId) {
  if (!projectId) return null;

  // 1. Try IndexedDB
  const idbProject = await dbGet('projects', projectId);
  if (idbProject) {
    return idbProject;
  }

  // 2. Fallback to localStorage
  return localStorageApi.getJSON(`${LOCAL_STORAGE_PROJECT_PREFIX}${projectId}`);
}

/**
 * Retrieve all projects from the cache.
 * @returns {Promise<object[]>}
 */
export async function getAllCachedProjects() {
  // 1. Try IndexedDB
  const idbProjects = await dbGetAll('projects');
  if (idbProjects && idbProjects.length > 0) {
    return idbProjects;
  }

  // 2. Fallback: Scan localStorage keys
  const projects = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(LOCAL_STORAGE_PROJECT_PREFIX)) {
        const p = localStorageApi.getJSON(key);
        if (p) {
          projects.push(p);
        }
      }
    }
  } catch (err) {
    console.warn('[ProjectCache] LocalStorage scan bypassed:', err.message);
  }
  return projects;
}

/**
 * Delete a project from cache.
 * @param {string} projectId
 * @returns {Promise<void>}
 */
export async function deleteCachedProject(projectId) {
  if (!projectId) return;

  // 1. Delete from IndexedDB
  await dbDelete('projects', projectId);

  // 2. Delete from localStorage
  localStorageApi.removeItem(`${LOCAL_STORAGE_PROJECT_PREFIX}${projectId}`);
}
