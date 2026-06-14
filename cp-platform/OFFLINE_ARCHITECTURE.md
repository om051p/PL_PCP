# Offline-First Architecture Report — M8

## Overview

To support field operation and remote inspection scenarios, the RAXA CP platform has been upgraded with an **"Offline Lite" Architecture**. 

The application is now fully capable of running calculations, validating designs against SAES standards, and managing projects when completely disconnected from the network. Data is preserved across page refreshes and browser restarts using a dual-storage offline cache.

---

## Storage Architecture

The offline storage engine is built on top of browser-native **IndexedDB** as the primary high-capacity store, with **localStorage** functioning as a synchronous fallback layer.

### 1. IndexedDB Store Layout (`raxa-cp-platform-db` v1)

IndexedDB is partitioned into 4 distinct object stores:

| Store Name | Key Path | Payload Type | Description |
|---|---|---|---|
| `projects` | `id` | Project JSON | Full project layout including active stations, tank, and vessel parameters. |
| `calculations` | `stationId` | Calculation Result JSON | Historical calculation outputs mapped to trace step records. |
| `reports` | `reportId` | Binary Blob + Metadata | Serialized PDF and Excel reports for offline download. |
| `standards` | `standardId` | Standard Spec JSON | Reference compliance specs (e.g., SAES-X-400 limits). |

### 2. Caching Strategies

* **Project Cache (Dual-Write)**:
  Implemented in [src/offline/projectCache.js](file:///home/rworld_pop/projects/raxa/cp-platform/src/offline/projectCache.js). Whenever Zustand persists state updates:
  1. Writes the full project payload asynchronously to IndexedDB `'projects'` store.
  2. Writes the serialized project payload to localStorage with a `raxa-project-` prefix.
  *Retrieval*: Prefers IndexedDB; falls back to localStorage if IndexedDB is blocked or unsupported in the client browser.

* **Calculation Cache**:
  Implemented in [src/offline/calculationCache.js](file:///home/rworld_pop/projects/raxa/cp-platform/src/offline/calculationCache.js). Stores the latest calculated result per station. Caches automatically upon successful calculation inside the `calculateStation` store slice action.

* **Report Cache**:
  Implemented in [src/offline/reportCache.js](file:///home/rworld_pop/projects/raxa/cp-platform/src/offline/reportCache.js). Stores PDF/Excel report blobs in IndexedDB, preventing the need to re-request document rendering from a remote server.

---

## Network State Detection & UI

### 1. React hook (`useOfflineStatus.js`)
Monitors the online status of the client browser using the `navigator.onLine` API and registers listeners for the window's `online`/`offline` transition events. It also probes for IndexedDB support to determine if offline capability is active.

### 2. Glassmorphism Status Bar (`OfflineStatusBar.jsx`)
When the system transitions to an offline state, a color-coded status bar slides up at the bottom right of the viewport.
* Styled with a sleek **dark-mode glassmorphic** design (`rgba(239, 68, 68, 0.1)` with a `blur` backdrop-filter).
* Informs the user they are working offline and indicates whether IndexedDB storage caching is active.
* Automatically fades out when connection is restored.

---

## Future Synchronisation & Stubs

To ensure the architecture remains extensible for future enterprise cloud synchronization, stubs are placed in [src/sync/](file:///home/rworld_pop/projects/raxa/cp-platform/src/sync/):

* **[syncEngine.js](file:///home/rworld_pop/projects/raxa/cp-platform/src/sync/syncEngine.js)**: Outlines transaction queueing, operational sync triggers, and subscription callbacks.
* **[conflictResolver.js](file:///home/rworld_pop/projects/raxa/cp-platform/src/sync/conflictResolver.js)**: Establishes conflict resolution strategies (e.g. client-wins vs server-wins) and revision divergence detection.
