import { describe, expect, it } from 'vitest';
import {
  assignLiveMarketCategory,
  attachLiveSignal,
  filterLiveMarkets,
  normalizePolymarketMarket,
} from '@/lib/markets/liveMarketAggregator';
import type { ArcSignalLiveMarket } from '@/lib/markets/liveMarketTypes';

describe('live market intelligence aggregator', () => {
  it('classifies politics, technology and economics markets from question keywords', () => {
    expect(assignLiveMarketCategory({ question: 'Will the senate pass the AI policy bill?' })).toBe('politics');
    expect(assignLiveMarketCategory({ question: 'Will OpenAI launch a new model before Apple?' })).toBe('technology');
    expect(assignLiveMarketCategory({ question: 'Will the Fed cut interest rates after CPI?' })).toBe('economics');
  });

  it('does not classify boilerplate description text as economics just because it says market', () => {
    expect(assignLiveMarketCategory({
      question: 'Will a celebrity release an album this year?',
      description: 'This market resolves according to the source rules.',
    })).toBeNull();
  });

  it('normalizes Polymarket Gamma binary YES/NO markets into ArcSignalLiveMarket', () => {
    const market = normalizePolymarketMarket({
      id: '123',
      conditionId: '0xabc',
      slug: 'will-fed-cut-rates',
      question: 'Will the Fed cut interest rates in September?',
      description: 'Resolves based on the FOMC target rate announcement.',
      outcomes: '["Yes", "No"]',
      outcomePrices: '["0.62", "0.38"]',
      volumeNum: '100000',
      liquidityNum: '25000',
      endDate: '2026-09-30T00:00:00Z',
      resolutionSource: 'Federal Reserve statement',
    });

    expect(market).toMatchObject({
      id: 'polymarket:0xabc',
      source: 'polymarket',
      category: 'economics',
      outcomes: ['YES', 'NO'],
      marketProbability: 0.62,
      yesPrice: 0.62,
      noPrice: 0.38,
      volume: 100000,
      liquidity: 25000,
      sourceUrl: 'https://polymarket.com/event/will-fed-cut-rates',
      resolutionSource: 'Federal Reserve statement',
    });
    expect(market?.aiSuggestedSide).toMatch(/YES|NO/);
    expect(market?.aiSuggestedWager).toBeLessThanOrEqual(5);
  });

  it('filters normalized live markets by selected category', () => {
    const politics = attachLiveSignal(baseMarket('p', 'politics'));
    const technology = attachLiveSignal(baseMarket('t', 'technology'));
    expect(filterLiveMarkets([politics, technology], 'politics')).toEqual([politics]);
    expect(filterLiveMarkets([politics, technology], 'all')).toHaveLength(2);
  });
});

function baseMarket(id: string, category: ArcSignalLiveMarket['category']): Omit<ArcSignalLiveMarket, 'aiConfidence' | 'signalEdge' | 'aiSuggestedSide' | 'aiSuggestedWager' | 'aiRiskLevel' | 'aiReason'> {
  return {
    id,
    source: 'polymarket',
    category,
    title: `${category} test`,
    question: `${category} test question`,
    outcomes: ['YES', 'NO'],
    marketProbability: 0.55,
    volume: 10_000,
    liquidity: 10_000,
    sourceUrl: 'https://polymarket.com/event/test',
  };
}

