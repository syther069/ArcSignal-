import { beforeEach, describe, expect, it, vi } from 'vitest';

const getIndexedMarkets = vi.fn();
const getPlatformStats = vi.fn();

vi.mock('next/cache', () => ({
  unstable_cache: (loader: unknown) => loader,
}));

vi.mock('@/lib/indexed-markets', () => ({
  getIndexedMarkets,
}));

vi.mock('@/lib/platform-stats', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/platform-stats')>();
  return {
    ...original,
    getPlatformStats,
  };
});

describe('stats availability behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps zero stats for a successful empty indexed dataset', async () => {
    getIndexedMarkets.mockResolvedValue([]);
    const { loadPlatformStats } = await import('@/lib/platform-stats');

    await expect(loadPlatformStats()).resolves.toEqual({
      totalVolume: 0,
      activeMarkets: 0,
      totalMarkets: 0,
      accuracy: null,
    });
  });

  it('does not convert an index failure into zero stats', async () => {
    getIndexedMarkets.mockRejectedValue(new Error('database unavailable'));
    const { loadPlatformStats } = await import('@/lib/platform-stats');

    await expect(loadPlatformStats()).rejects.toThrow('database unavailable');
  });

  it('returns an explicit retryable 503 when stats are unavailable', async () => {
    getPlatformStats.mockRejectedValue(new Error('database unavailable'));
    const { GET } = await import('@/app/api/stats/route');

    const response = await GET();
    await expect(response.json()).resolves.toEqual({
      error: 'Stats are temporarily unavailable',
      source: 'unavailable',
    });
    expect(response.status).toBe(503);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('retry-after')).toBe('30');
  });
});