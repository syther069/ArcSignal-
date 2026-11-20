import { describe, expect, it } from 'vitest';
import { planSell, quoteV2ExactInput } from '@/lib/v2-market-math';

const U = 1_000_000n;
const pool = { protocolFeeBps: 50n, lpFeeBps: 100n, slippageBps: 250n };

describe('planSell', () => {
  it('sells YES: swap part, merge the rest, and the swap output covers the merge', () => {
    const p = planSell({ amount: 10n * U, reserveHeld: 1000n * U, reserveOther: 1000n * U, ...pool })!;
    expect(p.swapIn + p.pairs).toBe(10n * U);
    const out = quoteV2ExactInput({ amountIn: p.swapIn, reserveIn: 1000n * U, reserveOut: 1000n * U, protocolFeeBps: 50n, lpFeeBps: 100n });
    expect(out * 9750n / 10000n).toBeGreaterThanOrEqual(p.pairs);
    expect(p.minOut).toBe(p.pairs);
    // ~50% pool: 10 tokens sell for a bit under 5 USDC after fees and cushion.
    expect(Number(p.pairs) / 1e6).toBeGreaterThan(4.7);
    expect(Number(p.pairs) / 1e6).toBeLessThan(5);
  });
  it('a likely token sells for more than an unlikely one', () => {
    // Few YES in the pool => YES is pricey (~80%).
    const pricey = planSell({ amount: 10n * U, reserveHeld: 200n * U, reserveOther: 800n * U, ...pool })!;
    const cheap = planSell({ amount: 10n * U, reserveHeld: 800n * U, reserveOther: 200n * U, ...pool })!;
    expect(pricey.pairs).toBeGreaterThan(cheap.pairs);
    expect(Number(pricey.pairs) / 1e6).toBeGreaterThan(7);
  });
  it('returns null for nothing to sell or an empty pool', () => {
    expect(planSell({ amount: 0n, reserveHeld: U, reserveOther: U, ...pool })).toBeNull();
    expect(planSell({ amount: U, reserveHeld: 0n, reserveOther: U, ...pool })).toBeNull();
  });
  it('dust amounts that round to nothing are refused', () => {
    expect(planSell({ amount: 1n, reserveHeld: 1000n * U, reserveOther: 1000n * U, ...pool })).toBeNull();
  });
});
import { DEFAULT_QUICK_BET, aiMarketGap, aiPicksYes, questionOutcome, normalizeQuickBet, payoutMultiple, sideBuysYes, positionPreview, summarizeResolution, summarizeTrackRecord, v2YesProbability } from '@/lib/market-insight';

describe('v2YesProbability', () => {
  it('prices the scarcer token higher', () => {
    // Few YES tokens left in the pool => YES is expensive => high probability.
    expect(v2YesProbability(2_000_000n, 8_000_000n)).toBeCloseTo(0.8);
    expect(v2YesProbability(8_000_000n, 2_000_000n)).toBeCloseTo(0.2);
  });
  it('is 50% for a balanced pool and null for an empty one', () => {
    expect(v2YesProbability(5n, 5n)).toBeCloseTo(0.5);
    expect(v2YesProbability(0n, 5n)).toBeNull();
  });
});

describe('payoutMultiple', () => {
  it('inverts the price', () => {
    expect(payoutMultiple(0.25)).toBeCloseTo(4);
    expect(payoutMultiple(0)).toBeNull();
    expect(payoutMultiple(1)).toBeNull();
  });
});

describe('aiMarketGap', () => {
  it('reports agreement inside 5 points', () => {
    expect(aiMarketGap(0.62, 0.58)?.kind).toBe('aligned');
  });
  it('reports direction and size of a gap', () => {
    const gap = aiMarketGap(0.7, 0.5);
    expect(gap?.kind).toBe('ai-higher');
    expect(gap?.points).toBe(20);
    expect(aiMarketGap(0.3, 0.5)?.kind).toBe('ai-lower');
  });
  it('rejects invalid input', () => {
    expect(aiMarketGap(NaN, 0.5)).toBeNull();
    expect(aiMarketGap(1.2, 0.5)).toBeNull();
  });
});

describe('positionPreview', () => {
  it('computes profit and loss', () => {
    expect(positionPreview(10, 18)).toEqual({ ifRight: 18, profitIfRight: 8, ifWrong: 10 });
    expect(positionPreview(0, 0)).toBeNull();
  });
});

describe('summarizeResolution', () => {
  it('states the operator trust honestly for V2', () => {
    const s = summarizeResolution({ isV2: true, category: 'crypto', livenessSeconds: 7200, voidAfterSeconds: 172800 });
    expect(s.disputeWindow).toContain('2 hours');
    expect(s.ifUnclear).toContain('2 days of closing');
    expect(s.trustNote).toContain('trusted');
  });
  it('uses singular units and hides raw hashes', () => {
    const s = summarizeResolution({ isV2: true, category: 'crypto', livenessSeconds: 3600, resolutionSource: 'Committed source 0x6f7c0a45abcdef' });
    expect(s.disputeWindow).toContain('1 hour after');
    expect(s.source).toBe('CoinGecko / Binance prices (exact source is committed on-chain)');
  });
  it('falls back to a sensible source', () => {
    expect(summarizeResolution({ isV2: false, category: 'football' }).source).toBe('API-Football');
  });
});

describe('normalizeQuickBet', () => {
  it('accepts only the preset limits', () => {
    expect(normalizeQuickBet('25')).toBe(25);
    expect(normalizeQuickBet(50)).toBe(50);
    expect(normalizeQuickBet('9999')).toBe(DEFAULT_QUICK_BET);
    expect(normalizeQuickBet(null)).toBe(DEFAULT_QUICK_BET);
    expect(normalizeQuickBet('abc')).toBe(DEFAULT_QUICK_BET);
  });
});

describe('summarizeTrackRecord', () => {
  it('says there is no record when nothing is scored', () => {
    const r = summarizeTrackRecord([{ resolved: 0, accuracy: null, brierScore: null }]);
    expect(r.maturity).toBe('none');
    expect(r.accuracy).toBeNull();
  });
  it('flags a single call as far too few', () => {
    const r = summarizeTrackRecord([{ resolved: 1, accuracy: 1, brierScore: 0.0144 }]);
    expect(r.maturity).toBe('tiny');
    expect(r.caveat).toContain('far too few');
  });
  it('weights agents by how many calls they resolved', () => {
    const r = summarizeTrackRecord([
      { resolved: 30, accuracy: 0.6, brierScore: 0.2 },
      { resolved: 10, accuracy: 1, brierScore: 0.1 },
    ]);
    expect(r.resolved).toBe(40);
    expect(r.accuracy).toBeCloseTo(0.7);
    expect(r.brierScore).toBeCloseTo(0.175);
    expect(r.maturity).toBe('early');
  });
});

describe('sideBuysYes', () => {
  it('Follow buys the AI side, Fade the opposite', () => {
    expect(sideBuysYes('FOLLOW', 'YES')).toBe(true);
    expect(sideBuysYes('FADE', 'YES')).toBe(false);
    expect(sideBuysYes('FOLLOW', 'NO')).toBe(false);
    expect(sideBuysYes('FADE', 'NO')).toBe(true);
  });
  it('treats an unknown AI pick as YES, matching the page default', () => {
    expect(sideBuysYes('FOLLOW', undefined)).toBe(true);
  });
});

describe('aiPicksYes', () => {
  it('is one rule for every caller', () => {
    expect(aiPicksYes('YES')).toBe(true);
    expect(aiPicksYes('yes')).toBe(true);
    expect(aiPicksYes('NO')).toBe(false);
    expect(aiPicksYes('FADE')).toBe(false);
    expect(aiPicksYes(undefined)).toBe(true);
  });
});

describe('questionOutcome (which token winners claim)', () => {
  it('AI picked YES: follow won = YES, fade won = NO', () => {
    expect(questionOutcome(1, true)).toBe(1);
    expect(questionOutcome(2, true)).toBe(2);
  });
  it('AI picked NO: follow won = NO, fade won = YES', () => {
    expect(questionOutcome(1, false)).toBe(2);
    expect(questionOutcome(2, false)).toBe(1);
  });
  it('stays 0 when there is no result', () => {
    expect(questionOutcome(0, true)).toBe(0);
    expect(questionOutcome(0, false)).toBe(0);
  });
});
