import { beforeEach, describe, expect, it, vi } from 'vitest';

const getMarketSnapshot = vi.fn();
const getPlatformStats = vi.fn();

vi.mock('next/cache', () => ({
  unstable_cache: (loader: unknown) => loader,
}));

vi.mock('@/lib/market-source', () => ({
  getMarketSnapshot,
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
    getMarketSnapshot.mockResolvedValue({
      markets: [],
      source: 'neon',
      complete: true,
      fetchedAt: '2026-08-29T00:00:00.000Z',
    });
    const { loadPlatformStats } = await import('@/lib/platform-stats');

    await expect(loadPlatformStats()).resolves.toEqual({
      totalVolume: 0,
      activeMarkets: 0,
      totalMarkets: 0,
      accuracy: null,
      source: 'neon',
      complete: true,
    });
  });

  it('does not convert a complete source failure into zero stats', async () => {
    getMarketSnapshot.mockRejectedValue(new Error('market sources unavailable'));
    const { loadPlatformStats } = await import('@/lib/platform-stats');

    await expect(loadPlatformStats()).rejects.toThrow('market sources unavailable');
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