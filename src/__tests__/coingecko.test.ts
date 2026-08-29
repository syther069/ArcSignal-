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

  it('uses the uncached current-price endpoint for generation observations', async () => {
    const observedAt = Math.floor(Date.now() / 1000);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        bitcoin: {
          usd: 101_000,
          last_updated_at: observedAt,
        },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { fetchFreshCryptoPrices } = await import('@/lib/coingecko');
    const fresh = await fetchFreshCryptoPrices();

    expect(fresh).toEqual([{
      id: 'bitcoin',
      symbol: 'btc',
      current_price: 101_000,
      price_source: 'coingecko',
      price_observed_at: observedAt,
    }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain('/simple/price?');
    expect(fetchMock.mock.calls[0][0]).toContain('include_last_updated_at=true');
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ cache: 'no-store' });
    expect(fetchMock.mock.calls[0][1]).not.toHaveProperty('next');
  });
});