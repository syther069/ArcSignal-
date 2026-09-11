import { beforeEach, describe, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({ query: vi.fn(), signals: vi.fn(), store: vi.fn(), read: vi.fn(), receipt: vi.fn(), block: vi.fn(), decode: vi.fn() }));
vi.mock('viem', () => ({ createPublicClient: () => ({ readContract: m.read, getTransactionReceipt: m.receipt, getBlock: m.block }), http: vi.fn(), decodeEventLog: m.decode }));
vi.mock('@/lib/contracts', () => ({ ARCSIGNAL_ABI: [], ARCSIGNAL_ADDRESS: '0xTestContract', arcTestnet: {} }));
vi.mock('@/lib/db', () => ({ getSql: () => m.query }));
vi.mock('@/lib/signal-intelligence/repository', () => ({ getSignals: m.signals, storeResolution: m.store }));
import { reconcileSignals } from '@/lib/signal-intelligence/resolution';
beforeEach(() => {
  vi.resetAllMocks();
  m.query.mockResolvedValueOnce([{ market_id: 'test-market' }]).mockResolvedValue([{ transaction_hash: `0x${'1'.repeat(64)}`, provider: 'coingecko' }]);
  m.signals.mockResolvedValue([{ id: 'test', marketId: 'test-market', status: 'pending', generatedAt: '2026-01-01T00:00:00Z', probability: 0.2 }]);
  m.read.mockResolvedValue({ resolved: true, outcome: 1, resolutionTime: 1767312000n, analysisJson: '{"prediction":"NO"}' });
  m.receipt.mockResolvedValue({ status: 'success', blockHash: 'test-block', transactionHash: `0x${'1'.repeat(64)}`, logs: [{ address: '0xTestContract', topics: [], data: '0x' }] });
  m.decode.mockReturnValue({ eventName: 'MarketResolved', args: { marketId: 'test-market', outcome: 1 } });
  m.block.mockResolvedValue({ timestamp: 1767312001n });
});
describe('trusted settlement reconciliation', () => {
  it('scores a confirmed settlement immediately without requiring an updated market index', async () => {
    m.query.mockReset().mockResolvedValue([]);
    const hash = `0x${'1'.repeat(64)}` as const;
    const result = await reconcileSignals(Date.now() + 45_000, { marketId: 'test-market', transactionHash: hash });
    expect(result.updated).toBe(1);
    expect(m.store).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ finalResult: 'NO', settlementTransactionHash: hash }));
  });
  it('excludes predictions generated after cutoff even when their receipt is valid', async () => {
    m.signals.mockResolvedValue([{ id: 'late', marketId: 'test-market', status: 'pending', probability: 0.8, generatedAt: '2026-01-02T00:00:00.500Z' }]);
    await reconcileSignals();
    expect(m.store).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ status: 'invalid' }));
  });
  it('rejects a successful receipt for another market', async () => {
    m.decode.mockReturnValue({ eventName: 'MarketResolved', args: { marketId: 'other-market', outcome: 1 } });
    await reconcileSignals(); expect(m.store).not.toHaveBeenCalled();
  });
  it('scores the question result from a matching verified receipt', async () => {
    expect((await reconcileSignals()).updated).toBe(1);
    expect(m.store).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ status: 'resolved', finalResult: 'NO', resolvedAt: '2026-01-02T00:00:01.000Z' }));
  });
  it('rejects a receipt emitted by another contract', async () => {
    m.receipt.mockResolvedValue({ status: 'success', logs: [{ address: '0xOtherContract' }] });
    expect((await reconcileSignals()).failedMarketIds).toEqual(['test-market']);
    expect(m.store).not.toHaveBeenCalled();
  });
  it('rejects a reverted receipt or mismatched market event', async () => {
    m.receipt.mockResolvedValue({ status: 'reverted' });
    await reconcileSignals(); expect(m.store).not.toHaveBeenCalled();
  });
  it('keeps predictions pending without confirmed receipt evidence', async () => {
    m.query.mockReset().mockResolvedValueOnce([{ market_id: 'test-market' }]).mockResolvedValue([]);
    expect((await reconcileSignals()).updated).toBe(0); expect(m.store).not.toHaveBeenCalled();
  });
  it('excludes chain cancellations without manufacturing timestamps', async () => {
    m.read.mockResolvedValue({ resolved: true, outcome: 0 });
    await reconcileSignals();
    expect(m.store).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ status: 'cancelled', finalResult: null, resolvedAt: null }));
    expect(m.receipt).not.toHaveBeenCalled();
  });
  it('respects the indexer deadline before starting chain work', async () => {
    await reconcileSignals(Date.now()); expect(m.read).not.toHaveBeenCalled();
  });
});
