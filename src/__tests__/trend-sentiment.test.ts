import { describe, expect, it, vi, afterEach } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { draftScore, draftSymbols, isExpired, sameMarket, trendInfo, validateDraftIdea, validateSentiment } from '@/lib/trend-drafts-shared';
import TrendingBadge, { TrendingChip } from '@/components/markets/TrendingBadge';
import { priceDrift } from '@/app/ops/drafts/DraftReview';

afterEach(() => vi.unstubAllEnvs());

describe('sentiment on drafts', () => {
  it('accepts valid sentiment and scores it', () => {
    const r = validateSentiment({ buzz: 'Surging', lean: 0.5, postCount: 120 });
    expect(r).toEqual({ ok: true, value: { buzz: 'surging', lean: 0.5, postCount: 120, score: 29 } });
  });
  it('rejects bad or thin sentiment', () => {
    expect(validateSentiment({ buzz: 'viral', lean: 0.5, postCount: 10 })).toMatchObject({ ok: false });
    expect(validateSentiment({ buzz: 'active', lean: 1.4, postCount: 10 })).toMatchObject({ ok: false });
    expect(validateSentiment({ buzz: 'active', lean: 0.5, postCount: 2.5 })).toMatchObject({ ok: false });
    expect(validateSentiment({ buzz: 'active', lean: 0.5, postCount: 3 })).toMatchObject({ ok: false, reason: expect.stringContaining('Too few') });
  });
  it('ranks louder first, then a more divided crowd', () => {
    expect(draftScore('surging', 0.9)).toBeGreaterThan(draftScore('active', 0.5));
    expect(draftScore('active', 0.5)).toBeGreaterThan(draftScore('active', 0.8));
    expect(draftScore('active', 0.2)).toBe(draftScore('active', 0.8));
  });
});

describe('duplicates and expiry', () => {
  const base = { symbol: 'BTC', threshold: 60_000, closesAt: 1_800_000_000 };
  it('matches the same coin, level within 2% and close within 6h', () => {
    expect(sameMarket(base, { symbol: 'BTC', threshold: 61_000, closesAt: 1_800_000_000 + 5 * 3600 })).toBe(true);
    expect(sameMarket(base, { symbol: 'ETH', threshold: 60_000, closesAt: 1_800_000_000 })).toBe(false);
    expect(sameMarket(base, { symbol: 'BTC', threshold: 62_000, closesAt: 1_800_000_000 })).toBe(false);
    expect(sameMarket(base, { symbol: 'BTC', threshold: 60_000, closesAt: 1_800_000_000 + 7 * 3600 })).toBe(false);
  });
  it('expires drafts after 12 hours', () => {
    const now = Date.parse('2026-11-20T12:00:00Z');
    expect(isExpired('2026-11-19T23:00:00Z', now)).toBe(true);
    expect(isExpired('2026-11-20T01:00:00Z', now)).toBe(false);
  });
  it('shows price drift since drafting', () => {
    expect(priceDrift(100, 104)).toBe(4);
    expect(priceDrift(100, undefined)).toBeNull();
  });
});

describe('extra coins', () => {
  it('are off by default and only allowed with the flag', () => {
    expect(draftSymbols(false)).not.toContain('DOGE');
    expect(draftSymbols(true)).toContain('DOGE');
    const prices = { DOGE: 0.2 };
    expect(validateDraftIdea({ symbol: 'DOGE', threshold: 0.2, horizonHours: 4, reason: 'x' }, prices, draftSymbols(false))).toMatchObject({ ok: false });
    expect(validateDraftIdea({ symbol: 'DOGE', threshold: 0.2, horizonHours: 4, reason: 'x' }, prices, draftSymbols(true))).toMatchObject({ ok: true });
  });
});

describe('Trending on X on published markets', () => {
  const analysis = { subType: 'x-trend', trendReason: 'Traders debate the 60k floor.', trendBuzz: 'surging', trendLean: 0.45,
    trendPosts: ['https://x.com/i/status/1', 'javascript:alert(1)', 'https://evil.example/x'] };
  it('reads only safe, valid trend details', () => {
    expect(trendInfo(analysis)).toEqual({ reason: 'Traders debate the 60k floor.', buzz: 'surging', lean: 0.45, posts: ['https://x.com/i/status/1'] });
    expect(trendInfo({ subType: 'price' })).toBeNull();
    expect(trendInfo(undefined)).toBeNull();
  });
  it('renders the panel and the card chip', () => {
    const html = renderToStaticMarkup(createElement(TrendingBadge, { trend: trendInfo(analysis) }));
    for (const t of ['Trending on X', 'surging', '45% YES', 'Traders debate the 60k floor.', 'Post 1 on X', 'approved by the ArcSignal operator']) expect(html).toContain(t);
    expect(renderToStaticMarkup(createElement(TrendingChip, { trend: trendInfo(analysis) }))).toContain('Trending on X');
    expect(renderToStaticMarkup(createElement(TrendingBadge, { trend: null }))).toBe('');
  });
});
