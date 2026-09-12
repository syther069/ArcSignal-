import { describe, expect, it } from 'vitest';
import {
  buildExternalMarketCommitment,
  categoryIdForLiveMarket,
  externalArcMarketId,
} from '@/lib/markets/externalSettlement';
import type { ArcSignalLiveMarket } from '@/lib/markets/liveMarketTypes';

describe('external market settlement commitments', () => {
  it('uses stable deterministic Arc V2 market IDs for external sources', () => {
    const market = baseMarket();
    expect(externalArcMarketId(market)).toBe(externalArcMarketId({ ...market }));
    expect(externalArcMarketId(market)).toMatch(/^0x[a-fA-F0-9]{64}$/);
    expect(externalArcMarketId({ ...market, externalMarketId: 'other' })).not.toBe(externalArcMarketId(market));
  });

  it('maps live intelligence categories to V2 category identifiers', () => {
    expect(categoryIdForLiveMarket('politics')).toBe(3);
    expect(categoryIdForLiveMarket('technology')).toBe(4);
    expect(categoryIdForLiveMarket('economics')).toBe(5);
  });

  it('commits source URL and settlement rules into V2-compatible hashes and ancillary data', () => {
    const commitment = buildExternalMarketCommitment(baseMarket());
    expect(commitment.marketId).toMatch(/^0x[a-fA-F0-9]{64}$/);
    expect(commitment.termsHash).toMatch(/^0x[a-fA-F0-9]{64}$/);
    expect(commitment.resolutionSourceHash).toMatch(/^0x[a-fA-F0-9]{64}$/);
    expect(commitment.ancillaryData).toMatch(/^0x[0-9a-f]+$/i);
    expect(commitment.metadataURI).toContain('arcsignal://v2/external/polymarket/');
    expect(commitment.ancillaryPayload).toMatchObject({
      kind: 'arcsignal.external-settlement.v1',
      source: 'polymarket',
      externalMarketId: 'pm-1',
      sourceUrl: 'https://polymarket.com/event/test',
    });
  });
});

function baseMarket(): ArcSignalLiveMarket {
  return {
    id: 'polymarket:pm-1',
    source: 'polymarket',
    externalMarketId: 'pm-1',
    category: 'politics',
    title: 'Will the bill pass?',
    question: 'Will the senate pass the AI bill?',
    outcomes: ['YES', 'NO'],
    marketProbability: 0.61,
    sourceUrl: 'https://polymarket.com/event/test',
    resolutionSource: 'Official congressional record',
    signalEdge: 11.5,
  };
}
