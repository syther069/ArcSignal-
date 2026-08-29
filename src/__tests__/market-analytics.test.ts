import { describe, expect, it } from 'vitest';
import { buildMarketAnalytics } from '@/lib/market-analytics';

describe('market analytics links', () => {
  it('preserves market IDs in current and resolved market rows', () => {
    const analytics = buildMarketAnalytics({
      source: 'arc-chain',
      complete: false,
      fetchedAt: '2026-08-29T00:00:00.000Z',
      markets: [{
        marketId: 'BTC-TEST-1',
        category: 'CRYPTO',
        question: 'Will BTC close higher?',
        resolutionTime: 1_800_000_000,
        followPool: 1_000_000n,
        fadePool: 2_000_000n,
        resolved: true,
        outcome: 'FOLLOW',
        status: 'RESOLVED',
      }],
    });

    expect(analytics.markets[0].marketId).toBe('BTC-TEST-1');
    expect(analytics.resolvedMarkets[0].marketId).toBe('BTC-TEST-1');
  });
});