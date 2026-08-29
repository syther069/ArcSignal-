import { beforeEach, describe, expect, it, vi } from 'vitest';

const multicall = vi.fn();
const getChainMarketSnapshot = vi.fn();

vi.mock('@/lib/db', () => ({
  getSql: () => {
    throw new Error('Neon unavailable');
  },
}));

vi.mock('@/lib/contracts', () => ({
  publicClient: { multicall },
  ARCSIGNAL_ADDRESS: '0x4f33115a18fe6a181be98610ddde3fab71efabed',
  ARCSIGNAL_ABI: [],
}));

vi.mock('@/lib/market-source', () => ({
  getChainMarketSnapshot,
}));

describe('portfolio ARC fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getChainMarketSnapshot.mockResolvedValue({
      source: 'arc-chain',
      complete: false,
      fetchedAt: '2026-08-29T00:00:00.000Z',
      markets: [{
        marketId: 'AVAX-TEST',
        category: 'CRYPTO',
        question: 'Will AVAX rise?',
        resolutionTime: 1_800_000_000,
        followPool: 5_000_000n,
        fadePool: 2_000_000n,
        resolved: false,
        outcome: 'PENDING',
        status: 'OPEN',
      }],
    });
  });

  it('returns real positions from one bounded multicall when Neon is unavailable', async () => {
    multicall.mockResolvedValue([
      { status: 'success', result: 1_000_000n },
      { status: 'success', result: 0n },
      { status: 'success', result: false },
    ]);
    const { GET } = await import('@/app/api/portfolio/route');
    const response = await GET(new Request(
      'https://arc-signal.xyz/api/portfolio?address=0x06C8b3EC1A1cD28F6F1f613da54200e23B1c7DA7',
    ));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.source).toBe('arc-chain');
    expect(body.complete).toBe(false);
    expect(body.coveredMarkets).toBe(1);
    expect(body.positions).toHaveLength(1);
    expect(body.positions[0]).toMatchObject({
      marketId: 'AVAX-TEST',
      side: 0,
      stakeRaw: '1000000',
      stakeUsdc: 1,
    });
    expect(multicall).toHaveBeenCalledOnce();
    expect(multicall.mock.calls[0][0].contracts).toHaveLength(3);
  });

  it('does not invent a position when all on-chain stake balances are zero', async () => {
    multicall.mockResolvedValue([
      { status: 'success', result: 0n },
      { status: 'success', result: 0n },
      { status: 'success', result: false },
    ]);
    const { GET } = await import('@/app/api/portfolio/route');
    const response = await GET(new Request(
      'https://arc-signal.xyz/api/portfolio?address=0x0000000000000000000000000000000000000001',
    ));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.positions).toEqual([]);
    expect(body.complete).toBe(false);
  });
});