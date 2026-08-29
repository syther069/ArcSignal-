import { afterEach, describe, expect, it, vi } from 'vitest';
import { assertCryptoData, type CryptoData } from '@/lib/coingecko';

const validMarket: CryptoData = {
  id: 'bitcoin',
  symbol: 'btc',
  current_price: 100_000,
  price_change_percentage_24h: -1.5,
  market_cap: 2_000_000_000_000,
  market_cap_rank: 1,
  total_volume: 50_000_000_000,
  high_24h: 102_000,
  low_24h: 98_000,
  price_source: 'coingecko',
  price_observed_at: 1_788_000_000,
};

describe('crypto market validation', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('accepts complete finite market data', () => {
    expect(assertCryptoData([validMarket])).toEqual([validMarket]);
  });

  it.each([
    ['NaN current price', { current_price: Number.NaN }],
    ['infinite change', { price_change_percentage_24h: Number.POSITIVE_INFINITY }],
    ['negative current price', { current_price: -1 }],
    ['negative volume', { total_volume: -1 }],
    ['invalid daily range', { high_24h: 90_000, low_24h: 98_000 }],
    ['fractional rank', { market_cap_rank: 1.5 }],
    ['missing provider timestamp', { price_observed_at: Number.NaN }],
  ])('rejects %s', (_label, patch) => {
    expect(() => assertCryptoData([{ ...validMarket, ...patch }])).toThrow(
      'CoinGecko returned incomplete market data',
    );
  });

  it('bypasses the shared and in-memory caches for generation reads', async () => {
    const firstPrice = 100_000;
    const secondPrice = 101_000;
    const observedAt = new Date().toISOString();
    const responseFor = (price: number) => ({
      ok: true,
      json: async () => [{
        id: 'bitcoin',
        symbol: 'btc',
        current_price: price,
        price_change_percentage_24h: 1,
        market_cap: 2_000_000_000_000,
        market_cap_rank: 1,
        total_volume: 50_000_000_000,
        high_24h: 102_000,
        low_24h: 98_000,
        last_updated: observedAt,
      }],
    });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(responseFor(firstPrice))
      .mockResolvedValueOnce(responseFor(secondPrice));
    vi.stubGlobal('fetch', fetchMock);

    const { fetchCryptoMarkets } = await import('@/lib/coingecko');
    const cached = await fetchCryptoMarkets();
    const fresh = await fetchCryptoMarkets({ fresh: true });

    expect(cached[0].current_price).toBe(firstPrice);
    expect(fresh[0].current_price).toBe(secondPrice);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ cache: 'no-store' });
    expect(fetchMock.mock.calls[1][1]).not.toHaveProperty('next');
  });
});