import { describe, expect, it, vi } from 'vitest';
import { aggregateSignals, buildLeaderboard, scorePrediction } from '@/lib/signal-intelligence/scoring';
import { hashAnalysis, validateAnalysis, verifyAnalysis } from '@/lib/signal-intelligence/audit';
import type { AIAgent, AISignal, SignalAnalysis } from '@/lib/signal-intelligence/types';

vi.mock('@/lib/contracts', () => ({ ARCSIGNAL_ABI: [], ARCSIGNAL_ADDRESS: '0x123', arcTestnet: {} }));
import { questionResult } from '@/lib/signal-intelligence/resolution';
const agent: AIAgent = { id: 'test', name: 'Test fixture', description: 'Test only', reasoningStyle: 'Test', modelProvider: 'Test', modelName: 'Test', modelVersion: null, status: 'active', createdAt: '2026-01-01T00:00:00.000Z' };
function original(): SignalAnalysis {
  const s: Omit<SignalAnalysis, 'analysisHash'> = { id: 'test-signal', marketId: 'test-market', agentId: 'test', agentName: 'Test fixture', modelProvider: 'Test', modelName: 'Test', modelVersion: null,
    generatedAt: '2026-01-01T01:00:00.000Z', snapshotAt: '2026-01-01T00:59:00.000Z', question: 'Test question?', category: 'Crypto', timeHorizon: 'Intraday', probability: 0.8, confidenceRange: [0.6, 0.9], confidence: 0.7,
    supportingFactors: ['Test evidence'], contradictingFactors: ['Test risk'], sources: [], previousSignalId: null, originalAnalysis: 'Test analysis', snapshot: { price: 10, symbol: 'TEST' } };
  return { ...s, analysisHash: hashAnalysis(s) };
}
function signal(overrides: Partial<AISignal> = {}): AISignal {
  return { ...original(), status: 'resolved', finalResult: 'YES', resolvedAt: '2026-01-02T00:00:00.000Z', resolutionSourceUrl: null, settlementTransactionHash: null, ...overrides };
}
describe('signal scoring', () => {
  it('moves a prediction from pending coverage to scored category, horizon and calibration metrics', () => {
    const pending = signal({ status: 'pending', finalResult: null, resolvedAt: null });
    const before = buildLeaderboard([agent], [pending])[0];
    expect(before.pending).toBe(1); expect(before.brierScore).toBeNull(); expect(before.rank).toBeNull();
    const after = buildLeaderboard([agent], [{ ...pending, status: 'resolved', finalResult: 'NO', resolvedAt: '2026-01-02T00:00:00Z' }])[0];
    expect(after.pending).toBe(0); expect(after.resolved).toBe(1); expect(after.rank).toBe(1);
    expect(after.accuracy).toBe(0); expect(after.brierScore).toBeCloseTo(0.64);
    expect(after.byCategory.Crypto.logLoss).toBeCloseTo(-Math.log(0.2));
    expect(after.byTimeHorizon.Intraday.resolved).toBe(1);
    expect(after.calibration[8]).toMatchObject({ count: 1, predicted: 0.8, observed: 0 });
    expect(after.predictions[0].finalResult).toBe('NO');
  });
  it('keeps pending confidence and other categories out of resolved averages', () => {
    const entries = buildLeaderboard([agent], [signal(), signal({ status: 'pending', probability: 1, confidence: 1, category: 'Sports', timeHorizon: '1 week' })]);
    expect(entries[0].averageConfidence).toBe(0.7);
    expect(entries[0].byCategory.Sports).toMatchObject({ pending: 1, resolved: 0, accuracy: null, averageConfidence: null });
    expect(entries[0].byTimeHorizon['1 week'].calibration.every(bucket => bucket.count === 0)).toBe(true);
  });
  it('uses the 50% boundary for binary accuracy', () => {
    expect(scorePrediction(0.5, 'YES').accuracy).toBe(1);
    expect(scorePrediction(0.5, 'NO').accuracy).toBe(0);
    expect(scorePrediction(0.49, 'NO').accuracy).toBe(1);
  });
  it('calculates Brier and natural log loss', () => {
    expect(scorePrediction(0.8, 'YES').brierScore).toBeCloseTo(0.04);
    expect(scorePrediction(0.8, 'YES').logLoss).toBeCloseTo(-Math.log(0.8));
    expect(scorePrediction(0.8, 'NO').logLoss).toBeCloseTo(-Math.log(0.2));
  });
  it.each([0, 1])('clamps log loss at probability %s without changing Brier', p => {
    for (const result of ['YES', 'NO'] as const) {
      expect(Number.isFinite(scorePrediction(p, result).logLoss)).toBe(true);
      expect(scorePrediction(p, result).brierScore).toBe((p - Number(result === 'YES')) ** 2);
    }
  });
  it.each([NaN, Infinity, -0.1, 1.1])('rejects invalid probability %s', p => expect(() => scorePrediction(p, 'YES')).toThrow());
  it('rejects missing and invalid results', () => {
    expect(() => scorePrediction(0.8, null as never)).toThrow();
    expect(() => scorePrediction(0.8, 'FOLLOW' as never)).toThrow();
    expect(aggregateSignals([signal({ finalResult: null }), signal({ finalResult: 'FOLLOW' as never })]).resolved).toBe(0);
  });
  it('assigns boundary values once, including 100%, with weighted calibration error', () => {
    const stats = aggregateSignals([signal({ probability: 0, finalResult: 'NO' }), signal({ probability: 0.1 }), signal({ probability: 1 })]);
    expect(stats.calibration.map(b => b.count)).toEqual([1, 1, 0, 0, 0, 0, 0, 0, 0, 1]);
    expect(stats.calibration[1].predicted).toBe(0.1);
    expect(stats.calibration[1].observed).toBe(1);
    expect(stats.calibrationScore).toBeCloseTo(0.3);
  });
  it('excludes pending, disputed, invalid, cancelled and invalid timestamps', () => {
    const stats = aggregateSignals([signal(), ...(['pending', 'disputed', 'invalid', 'cancelled'] as const).map(status => signal({ status })), signal({ resolvedAt: 'invalid' }), signal({ resolvedAt: '2025-01-01' })]);
    expect(stats.resolved).toBe(1); expect(stats.pending).toBe(1); expect(stats.excluded).toBe(5);
    expect(stats.accuracy).toBe(1); expect(stats.brierScore).toBeCloseTo(0.04);
  });
  it('uses null rather than zero for unavailable scores', () => {
    const stats = aggregateSignals([signal({ status: 'pending' })]);
    expect(stats.accuracy).toBeNull(); expect(stats.averageConfidence).toBeNull(); expect(stats.calibrationScore).toBeNull();
  });
  it('ranks by Brier and groups category/horizon performance', () => {
    const entries = buildLeaderboard([agent, { ...agent, id: 'better' }, { ...agent, id: 'pending' }], [signal(), signal({ agentId: 'better', probability: 1, category: 'Sports', timeHorizon: '1 week' }), signal({ agentId: 'pending', status: 'pending' })]);
    expect(entries.map(e => e.agent.id)).toEqual(['better', 'test', 'pending']);
    expect(entries.map(e => e.rank)).toEqual([1, 2, null]);
    expect(entries[0].byCategory.Sports.resolved).toBe(1);
    expect(entries[0].byTimeHorizon['1 week'].accuracy).toBe(1);
    expect(entries[1].averageConfidence).toBe(0.7);
  });
});
describe('audit integrity', () => {
  it('is stable across object key order', () => {
    const a = original();
    expect(verifyAnalysis(a)).toBe(true);
    expect(verifyAnalysis({ ...a, snapshot: { symbol: 'TEST', price: 10 } })).toBe(true);
  });
  it('detects changed reasoning, probability, sources and raw response', () => {
    const a = original();
    for (const change of [{ probability: 0.7 }, { originalAnalysis: 'changed' }, { supportingFactors: ['changed'] }, { sources: [{ name: 'changed', url: null, accessedAt: a.generatedAt }] }]) expect(verifyAnalysis({ ...a, ...change })).toBe(false);
    expect(() => validateAnalysis({ ...a, confidenceRange: [0.9, 1] })).toThrow();
  });
});
describe('FOLLOW/FADE settlement conversion', () => {
  it.each([['YES', 1, 'YES'], ['YES', 2, 'NO'], ['NO', 1, 'NO'], ['NO', 2, 'YES']] as const)('%s with outcome %s is %s', (pick, outcome, expected) => expect(questionResult(pick, outcome)).toBe(expected));
  it('does not score cancelled or unknown outcomes', () => {
    expect(questionResult('YES', 0)).toBeNull(); expect(questionResult('NO', 3)).toBeNull();
  });
});
