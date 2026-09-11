import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ query: vi.fn(), generate: vi.fn() }));
vi.mock('@/lib/db', () => ({ getSql: () => mocks.query }));
vi.mock('@/lib/signal-intelligence/generation', () => ({ generateMarketSignals: mocks.generate }));
import { generateScheduledSignals } from '@/lib/signal-intelligence/operations';

beforeEach(() => vi.clearAllMocks());

describe('scheduled signal generation', () => {
  it('leases a bounded job and marks complete after all agent records exist', async () => {
    mocks.query.mockResolvedValueOnce([{ market_id: 'market-1', attempt_count: 1 }]).mockResolvedValueOnce([]);
    mocks.generate.mockResolvedValue([
      { agent: 'Macro', status: 'recorded' },
      { agent: 'Technical', status: 'recorded' },
      { agent: 'Contrarian', status: 'recorded' },
    ]);
    const result = await generateScheduledSignals({ maxMarkets: 1, deadline: Date.now() + 60_000 });
    expect(mocks.generate).toHaveBeenCalledWith('market-1');
    expect(result).toMatchObject({ claimed: 1, completed: ['market-1'], maxMarkets: 1 });
    expect(mocks.query).toHaveBeenCalledTimes(2);
  });

  it('records a safe retry state when a provider call fails', async () => {
    mocks.query.mockResolvedValueOnce([{ market_id: 'market-2', attempt_count: 2 }]).mockResolvedValueOnce([{ status: 'retrying' }]);
    mocks.generate.mockRejectedValue(new Error('Provider token abc123 temporarily unavailable'));
    const result = await generateScheduledSignals({ maxMarkets: 99, deadline: Date.now() + 60_000 });
    expect(result.maxMarkets).toBe(3);
    expect(result.retrying).toHaveLength(1);
    expect(result.retrying[0].error).toContain('[redacted]');
    expect(result.completed).toEqual([]);
  });
});
