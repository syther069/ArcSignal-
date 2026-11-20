import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({
  getOpenV2Markets: vi.fn(), recordPricePoint: vi.fn(), getRecentPoints: vi.fn(), hasRecentNote: vi.fn(),
  explainMove: vi.fn(), storeMoveNote: vi.fn(), prunePricePoints: vi.fn(), freezeBaselines: vi.fn(), getLatestPulse: vi.fn(), readContract: vi.fn(),
}));
vi.mock('@/lib/price-moves', () => ({ getOpenV2Markets: m.getOpenV2Markets, recordPricePoint: m.recordPricePoint, getRecentPoints: m.getRecentPoints,
  hasRecentNote: m.hasRecentNote, explainMove: m.explainMove, storeMoveNote: m.storeMoveNote, prunePricePoints: m.prunePricePoints }));
vi.mock('@/lib/signal-intelligence/baselines', () => ({ freezeBaselines: m.freezeBaselines }));
vi.mock('@/lib/x-pulse', () => ({ getLatestPulse: m.getLatestPulse }));
vi.mock('viem', async (orig) => ({ ...(await orig<typeof import('viem')>()), createPublicClient: () => ({ readContract: m.readContract }) }));

const run = async () => {
  const { POST } = await import('@/app/api/cron/price-moves/route');
  return (await POST(new Request('http://localhost/x', { method: 'POST', headers: { authorization: 'Bearer s' } }))).json();
};
const AMM = `0x${'a'.repeat(40)}`;

describe('price-moves cron', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('CRON_SECRET', 's'); vi.stubEnv('ENABLE_PRICE_MOVES', 'true'); vi.stubEnv('XAI_API_KEY', 'k');
    m.prunePricePoints.mockResolvedValue(undefined);
    m.hasRecentNote.mockResolvedValue(false);
    m.readContract.mockResolvedValue([2_000_000n, 8_000_000n]); // P(YES) = 0.8
  });
  it('records the price and asks Grok only when the price really moved', async () => {
    const now = Date.now();
    m.getOpenV2Markets.mockResolvedValue([{ marketId: 'a', ammAddress: AMM, question: 'A?', category: 'CRYPTO', closesAt: now / 1000 + 86_400 }]);
    m.getRecentPoints.mockResolvedValue([{ pYes: 0.5, observedAt: new Date(now - 60 * 60_000).toISOString() }, { pYes: 0.8, observedAt: new Date(now).toISOString() }]);
    m.explainMove.mockResolvedValue({ note: 'Big buyer.' });
    const body = await run();
    expect(m.recordPricePoint).toHaveBeenCalledWith('a', 0.8);
    expect(m.storeMoveNote).toHaveBeenCalledTimes(1);
    expect(body.notes).toBe(1);
    expect(m.freezeBaselines).not.toHaveBeenCalled();
  });
  it('freezes baselines for a market about to close, and never re-explains within the hour', async () => {
    const now = Date.now();
    m.getOpenV2Markets.mockResolvedValue([{ marketId: 'b', ammAddress: AMM, question: 'B?', category: 'CRYPTO', closesAt: now / 1000 + 300 }]);
    m.getRecentPoints.mockResolvedValue([{ pYes: 0.5, observedAt: new Date(now - 60 * 60_000).toISOString() }, { pYes: 0.8, observedAt: new Date(now).toISOString() }]);
    m.hasRecentNote.mockResolvedValue(true);
    m.getLatestPulse.mockResolvedValue(null);
    m.freezeBaselines.mockResolvedValue(['baseline-market-price']);
    const body = await run();
    expect(m.explainMove).not.toHaveBeenCalled();
    expect(m.freezeBaselines).toHaveBeenCalledWith(expect.objectContaining({ marketId: 'b' }), 0.8, null);
    expect(body.results[0].baselines).toEqual(['baseline-market-price']);
  });
});
