import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { acceptObservation, decideCryptoProposal, decideFootballProposal, needsObservation, toOraclePrice } from '@/lib/v2-settlement-keeper';
import { v2DisputeBond } from '@/lib/v2-settlement-readiness';
import type { CryptoOracleSpec } from '@/lib/oracle-policy';

const CLOSE = 1_800_000_000;
const spec = { version: 2, settlementModel: 'ai-agreement-v1', provider: 'coingecko', symbol: 'BTC', targetPrice: 60_000,
  comparator: 'gte', resolutionTimestamp: CLOSE, maxObservationDelaySeconds: 300 } as unknown as CryptoOracleSpec;
const obs = (price: number, at: number) => ({ provider: 'coingecko' as const, symbol: 'BTC', price, observedAt: at });

describe('V2 result decisions', () => {
  it('maps YES and NO to oracle prices', () => {
    expect(toOraclePrice('YES')).toBe(10n ** 18n);
    expect(toOraclePrice('NO')).toBe(0n);
  });
  it('proposes from a price observed right after close', () => {
    expect(decideCryptoProposal(spec, obs(60_000, CLOSE + 10), CLOSE + 600)).toMatchObject({ action: 'propose', questionResult: 'YES', price: 10n ** 18n });
    expect(decideCryptoProposal(spec, obs(59_999, CLOSE + 10), CLOSE + 600)).toMatchObject({ action: 'propose', questionResult: 'NO', price: 0n });
  });
  it('never proposes from late, early or missing price data', () => {
    expect(decideCryptoProposal(spec, obs(61_000, CLOSE + 400), CLOSE + 600).action).toBe('manual-review');
    expect(decideCryptoProposal(spec, obs(61_000, CLOSE - 5), CLOSE + 600).action).toBe('manual-review');
    expect(decideCryptoProposal(spec, null, CLOSE + 600)).toMatchObject({ action: 'manual-review', reason: expect.stringContaining('no price') });
    expect(decideCryptoProposal(spec, null, CLOSE - 60).action).toBe('wait');
  });
  it('proposes football only at full time', () => {
    expect(decideFootballProposal(1, { status: 'FT', homeScore: 2, awayScore: 1 })).toMatchObject({ action: 'propose', questionResult: 'YES' });
    expect(decideFootballProposal(1, { status: 'FT', homeScore: 1, awayScore: 1 })).toMatchObject({ action: 'propose', questionResult: 'NO' });
    expect(decideFootballProposal(1, { status: '2H', homeScore: 1, awayScore: 0 }).action).toBe('wait');
    expect(decideFootballProposal(1, { status: 'PST', homeScore: null, awayScore: null }).action).toBe('manual-review');
    expect(decideFootballProposal(1, null).action).toBe('manual-review');
  });
  it('knows when to watch a close and which observations count', () => {
    expect(needsObservation(CLOSE, CLOSE - 200, 270, 300)).toBe(true);
    expect(needsObservation(CLOSE, CLOSE - 400, 270, 300)).toBe(false);
    expect(needsObservation(CLOSE, CLOSE + 301, 270, 300)).toBe(false);
    expect(acceptObservation(CLOSE + 299, CLOSE, 300)).toBe(true);
    expect(acceptObservation(CLOSE - 1, CLOSE, 300)).toBe(false);
  });
  it('reads the dispute bond setting safely', () => {
    expect(v2DisputeBond({})).toBe(25_000_000n);
    expect(v2DisputeBond({ ARCSIGNAL_V2_DISPUTE_BOND_USDC: '50' })).toBe(50_000_000n);
    expect(v2DisputeBond({ ARCSIGNAL_V2_DISPUTE_BOND_USDC: '0' })).toBe(25_000_000n);
  });
});

const m = vi.hoisted(() => ({
  markets: vi.fn(), getObs: vi.fn(), storeObs: vi.fn(), record: vi.fn(),
  readContract: vi.fn(), simulate: vi.fn(), write: vi.fn(), wait: vi.fn(),
}));
vi.mock('@/lib/v2-settlement-store', () => ({
  getV2SettlementMarkets: m.markets, getCloseObservation: m.getObs, storeCloseObservation: m.storeObs, recordSettlementAttempt: m.record,
}));
vi.mock('@/lib/coingecko', () => ({ fetchFreshCryptoPrices: vi.fn().mockResolvedValue([]) }));
vi.mock('@/lib/apifootball', () => ({ fetchFixtureById: vi.fn() }));
vi.mock('viem', async (orig) => ({
  ...(await orig<typeof import('viem')>()),
  createPublicClient: () => ({ readContract: m.readContract, simulateContract: m.simulate, waitForTransactionReceipt: m.wait }),
  createWalletClient: () => ({ writeContract: m.write }),
}));

const KEY = '0x' + '1'.repeat(64);
const PROPOSER = '0x19E7E376E7C213B7E7e7e46cc70A5dD086DAff2A'; // address of KEY
const REQUEST_KEY = '0x' + 'c'.repeat(64);
const analysis = JSON.stringify({ oracle: { version: 2, settlementModel: 'ai-agreement-v1', provider: 'coingecko', symbol: 'BTC',
  targetPrice: 60_000, comparator: 'gte', resolutionTimestamp: CLOSE, maxObservationDelaySeconds: 300 } });
const market = { marketId: 'm1', marketAddress: '0x' + 'a'.repeat(40), closeTime: CLOSE, oracleState: 'REQUESTED', category: 'CRYPTO', analysisJson: analysis };

async function run() {
  const { POST } = await import('@/app/api/cron/settle-v2/route');
  return (await POST(new Request('http://localhost/x', { method: 'POST', headers: { authorization: 'Bearer s' } }))).json();
}

function chain(requestState: number, proposer = PROPOSER) {
  m.readContract.mockImplementation(async ({ functionName }: { functionName: string }) => {
    if (functionName === 'oracleAdapter') return '0x' + 'b'.repeat(40);
    if (functionName === 'proposer') return proposer;
    if (functionName === 'oracleRequestKey') return REQUEST_KEY;
    if (functionName === 'getRequest') return { state: requestState };
    throw new Error(functionName);
  });
}

describe('settle-v2 job', () => {
  // The job reads the real clock: pretend it is 10 minutes after close (only Date is faked).
  afterEach(() => vi.useRealTimers());
  beforeEach(() => {
    vi.useFakeTimers({ now: (CLOSE + 600) * 1000, toFake: ['Date'] });
    vi.clearAllMocks();
    vi.stubEnv('CRON_SECRET', 's');
    vi.stubEnv('ENABLE_V2_SETTLEMENT', 'true');
    vi.stubEnv('RESOLVER_PRIVATE_KEY', KEY);
    m.markets.mockResolvedValue([market]);
    m.simulate.mockResolvedValue({ request: {} });
    m.write.mockResolvedValue('0xtx');
    m.wait.mockResolvedValue({ status: 'success' });
    m.record.mockResolvedValue(undefined);
  });

  it('does nothing unless switched on', async () => {
    vi.stubEnv('ENABLE_V2_SETTLEMENT', 'false');
    expect((await run()).skipped).toBe(true);
    expect(m.markets).not.toHaveBeenCalled();
  });

  it('proposes YES from the stored close observation', async () => {
    chain(1);
    m.getObs.mockResolvedValue(obs(61_000, CLOSE + 5));
    const body = await run();
    expect(m.simulate).toHaveBeenCalledWith(expect.objectContaining({ functionName: 'proposeOutcome', args: [REQUEST_KEY, 10n ** 18n] }));
    expect(body.results[0]).toMatchObject({ status: 'proposed', txHash: '0xtx' });
  });

  it('never proposes on manual review, and logs it', async () => {
    chain(1);
    m.getObs.mockResolvedValue(null);
    const body = await run();
    expect(m.write).not.toHaveBeenCalled();
    expect(m.record).toHaveBeenCalledWith(expect.objectContaining({ status: 'MANUAL_REVIEW' }));
    expect(body.results[0].status).toBe('manual-review');
  });

  it('does not propose twice or with the wrong key', async () => {
    chain(2);
    m.getObs.mockResolvedValue(obs(61_000, CLOSE + 5));
    expect((await run()).results[0].reason).toContain('no longer waiting');
    chain(1, '0x' + '9'.repeat(40));
    expect((await run()).results[0].reason).toContain('not the oracle proposer');
    expect(m.write).not.toHaveBeenCalled();
  });
});
