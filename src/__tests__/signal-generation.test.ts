import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ query: vi.fn(), getSignals: vi.fn(), storeSignal: vi.fn(), fetchCryptoMarkets: vi.fn(), fetchFreshCryptoPrices: vi.fn(), generateAnalysis: vi.fn() }));
vi.mock('@/lib/db', () => ({ getSql: () => mocks.query }));
vi.mock('@/lib/signal-intelligence/repository', () => ({ getSignals: mocks.getSignals, storeSignal: mocks.storeSignal }));
vi.mock('@/lib/coingecko', () => ({ fetchCryptoMarkets: mocks.fetchCryptoMarkets, fetchFreshCryptoPrices: mocks.fetchFreshCryptoPrices }));
vi.mock('@/lib/gemini', () => ({ generateAnalysis: mocks.generateAnalysis }));
vi.mock('@/lib/apifootball', () => ({ fetchFixtureById: vi.fn() }));
import { generateMarketSignals, timeHorizon } from '@/lib/signal-intelligence/generation';
import { validateAnalysis } from '@/lib/signal-intelligence/audit';
beforeEach(() => vi.clearAllMocks());
describe('signal generation preconditions', () => {
  it('persists all three real provider identities with hashed snapshots and factors', async () => {
    const now = Math.floor(Date.now() / 1000);
    const generatedAt = new Date().toISOString();
    mocks.query.mockResolvedValue([{ question: 'Test BTC question', category: 'CRYPTO', resolution_time: now + 3600,
      analysis_json: { oracle: { version: 2, settlementModel: 'ai-agreement-v1', provider: 'coingecko', symbol: 'BTC', targetPrice: 100000, comparator: 'gte', resolutionTimestamp: now + 3600, maxObservationDelaySeconds: 120 } } }]);
    mocks.getSignals.mockResolvedValue([]);
    mocks.fetchCryptoMarkets.mockResolvedValue([{ id: 'bitcoin', symbol: 'btc', price_source: 'coingecko', price_observed_at: now - 1, current_price: 99000 }]);
    mocks.generateAnalysis.mockResolvedValue({ probability: 60, confidence: 70, confidenceRange: [50, 80], keyFactors: ['Test support'], riskFactors: ['Test risk'],
      provenance: { provider: 'Fixture provider', model: 'actual-test-model', version: 'test-model-001', versionSource: 'provider-version', systemFingerprint: 'fp_test', responseId: 'response-test', raw: '{"summary":"test raw provider output"}', generatedAt } });
    expect((await generateMarketSignals('test-market')).every(row => row.status === 'recorded')).toBe(true);
    expect(mocks.storeSignal).toHaveBeenCalledTimes(3);
    for (const [agent, signal] of mocks.storeSignal.mock.calls) {
      expect(agent.modelVersion).toBe('test-model-001');
      expect(signal).toMatchObject({ modelVersion: 'test-model-001', modelVersionSource: 'provider-version', systemFingerprint: 'fp_test', providerResponseId: 'response-test', probability: 0.6, confidenceRange: [0.5, 0.8] });
      expect(() => validateAnalysis(signal)).not.toThrow();
    }
  });
  it('returns completed records without querying source/model providers, even after cutoff', async () => {
    mocks.query.mockResolvedValue([]);
    mocks.getSignals.mockResolvedValue(['macro', 'technical', 'contrarian'].map(style => ({ agentId: `${style}-test` })));
    expect((await generateMarketSignals('test-market')).map(r => r.status)).toEqual(['already recorded', 'already recorded', 'already recorded']);
    expect(mocks.fetchCryptoMarkets).not.toHaveBeenCalled(); expect(mocks.generateAnalysis).not.toHaveBeenCalled(); expect(mocks.storeSignal).not.toHaveBeenCalled();
  });
  it('refreshes an old aggregate observation before recording a signal', async () => {
    const now = Math.floor(Date.now() / 1000);
    mocks.query.mockResolvedValue([{ question: 'Test BTC question', category: 'CRYPTO', resolution_time: now + 3600,
      analysis_json: { oracle: { version: 2, settlementModel: 'ai-agreement-v1', provider: 'coingecko', symbol: 'BTC', targetPrice: 100000, comparator: 'gte', resolutionTimestamp: now + 3600, maxObservationDelaySeconds: 120 } } }]);
    mocks.getSignals.mockResolvedValue([]);
    mocks.fetchCryptoMarkets.mockResolvedValue([{ id: 'bitcoin', symbol: 'btc', price_source: 'coingecko', price_observed_at: now - 500, current_price: 98_000 }]);
    mocks.fetchFreshCryptoPrices.mockResolvedValue([{ id: 'bitcoin', symbol: 'btc', price_source: 'coingecko', price_observed_at: now - 1, current_price: 99_000 }]);
    mocks.generateAnalysis.mockResolvedValue({ probability: 60, confidence: 70, confidenceRange: [50, 80], keyFactors: ['Test support'], riskFactors: ['Test risk'],
      provenance: { provider: 'Fixture provider', model: 'actual-test-model', version: 'test-model-001', raw: '{}', generatedAt: new Date().toISOString() } });
    await generateMarketSignals('test-market');
    expect(mocks.fetchFreshCryptoPrices).toHaveBeenCalledOnce();
    expect(mocks.storeSignal.mock.calls[0][1].snapshot.coin.current_price).toBe(99_000);
  });
  it('rejects new predictions for closed or unindexed markets', async () => {
    mocks.query.mockResolvedValue([]); mocks.getSignals.mockResolvedValue([]);
    await expect(generateMarketSignals('missing')).rejects.toThrow('open, indexed market');
    expect(mocks.generateAnalysis).not.toHaveBeenCalled();
  });
  it('groups forecast horizons at the expected boundaries', () => {
    expect([60, 86400, 604800, 2678400, 31536000].map(timeHorizon)).toEqual(['Intraday', '1 day', '1 week', '1 month', 'Long-term']);
  });
});
