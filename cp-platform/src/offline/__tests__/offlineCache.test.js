import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cacheProject, getCachedProject, deleteCachedProject } from '../projectCache.js';
import { cacheCalculation, getCachedCalculation, evictCalculationCache } from '../calculationCache.js';
import { cacheReport, getCachedReport, evictCachedReport } from '../reportCache.js';
import { dbGet, dbPut, dbDelete } from '../indexedDbStore.js';
import { localStorageApi } from '../../api/localStorageApi.js';

// Mock the indexedDbStore
vi.mock('../indexedDbStore.js', () => ({
  dbGet: vi.fn(),
  dbPut: vi.fn(),
  dbDelete: vi.fn(),
  dbGetAll: vi.fn(),
}));

// Mock localStorageApi
vi.mock('../../api/localStorageApi.js', () => ({
  localStorageApi: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    getJSON: vi.fn(),
    setJSON: vi.fn(),
  },
}));

describe('Offline Caches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Project Cache', () => {
    const mockProject = { id: 'proj-123', name: 'Al-Khobar Line' };

    it('should dual-write to IndexedDB and localStorage on cacheProject', async () => {
      await cacheProject(mockProject);
      expect(dbPut).toHaveBeenCalledWith('projects', mockProject);
      expect(localStorageApi.setJSON).toHaveBeenCalledWith('raxa-project-proj-123', mockProject);
    });

    it('should read from IndexedDB first in getCachedProject', async () => {
      vi.mocked(dbGet).mockResolvedValueOnce(mockProject);
      const res = await getCachedProject('proj-123');
      expect(dbGet).toHaveBeenCalledWith('projects', 'proj-123');
      expect(res).toEqual(mockProject);
      expect(localStorageApi.getJSON).not.toHaveBeenCalled();
    });

    it('should fall back to localStorage if IndexedDB returns null', async () => {
      vi.mocked(dbGet).mockResolvedValueOnce(null);
      vi.mocked(localStorageApi.getJSON).mockReturnValueOnce(mockProject);
      const res = await getCachedProject('proj-123');
      expect(dbGet).toHaveBeenCalledWith('projects', 'proj-123');
      expect(localStorageApi.getJSON).toHaveBeenCalledWith('raxa-project-proj-123');
      expect(res).toEqual(mockProject);
    });

    it('should delete from both stores on deleteCachedProject', async () => {
      await deleteCachedProject('proj-123');
      expect(dbDelete).toHaveBeenCalledWith('projects', 'proj-123');
      expect(localStorageApi.removeItem).toHaveBeenCalledWith('raxa-project-proj-123');
    });
  });

  describe('Calculation Cache', () => {
    const mockResult = { requiredCurrentA: 5.4 };

    it('should put calculation result in database', async () => {
      await cacheCalculation('station-1', mockResult);
      expect(dbPut).toHaveBeenCalledWith('calculations', expect.objectContaining({
        stationId: 'station-1',
        result: mockResult,
      }));
    });

    it('should get cached calculation', async () => {
      vi.mocked(dbGet).mockResolvedValueOnce({ stationId: 'station-1', result: mockResult });
      const res = await getCachedCalculation('station-1');
      expect(dbGet).toHaveBeenCalledWith('calculations', 'station-1');
      expect(res).toEqual(mockResult);
    });

    it('should return null if calculation not in cache', async () => {
      vi.mocked(dbGet).mockResolvedValueOnce(null);
      const res = await getCachedCalculation('station-1');
      expect(res).toBeNull();
    });

    it('should evict calculation from cache', async () => {
      await evictCalculationCache('station-1');
      expect(dbDelete).toHaveBeenCalledWith('calculations', 'station-1');
    });
  });

  describe('Report Cache', () => {
    const mockBlob = new ArrayBuffer(8);
    const mockMetadata = { title: 'Compliance Report' };

    it('should cache report with metadata', async () => {
      await cacheReport('report-1', mockBlob, mockMetadata);
      expect(dbPut).toHaveBeenCalledWith('reports', expect.objectContaining({
        reportId: 'report-1',
        blob: mockBlob,
        metadata: expect.objectContaining({ title: 'Compliance Report' }),
      }));
    });

    it('should retrieve cached report', async () => {
      const mockRecord = { reportId: 'report-1', blob: mockBlob, metadata: mockMetadata };
      vi.mocked(dbGet).mockResolvedValueOnce(mockRecord);
      const res = await getCachedReport('report-1');
      expect(dbGet).toHaveBeenCalledWith('reports', 'report-1');
      expect(res).toEqual(mockRecord);
    });

    it('should evict report from cache', async () => {
      await evictCachedReport('report-1');
      expect(dbDelete).toHaveBeenCalledWith('reports', 'report-1');
    });
  });
});
