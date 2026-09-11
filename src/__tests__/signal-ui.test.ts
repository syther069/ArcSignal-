import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { generationMessage, SignalCard, summarizeSignals } from '@/components/signals/SignalIntelligence';
import AILeaderboard, { sampleLabel } from '@/components/signals/AILeaderboard';
import { buildLeaderboard } from '@/lib/signal-intelligence/scoring';
import type { AIAgent, AISignal } from '@/lib/signal-intelligence/types';

// Synthetic data is confined to tests; it is never seeded into the product.
const agent: AIAgent = { id: 'test-agent', name: 'Fixture agent', description: 'Test description', reasoningStyle: 'Test style', modelProvider: 'Test provider', modelName: 'Test model', modelVersion: 'test-model-001', modelVersionSource: 'provider-version', status: 'active', createdAt: '2026-01-01T00:00:00Z' };
const signal: AISignal = { id: 'test-signal', marketId: 'test-market', agentId: agent.id, agentName: agent.name, modelProvider: agent.modelProvider, modelName: agent.modelName, modelVersion: agent.modelVersion,
  modelVersionSource: 'provider-version', generatedAt: '2026-01-01T01:00:00.123Z', snapshotAt: '2026-01-01T00:59:00Z', question: 'Fixture question?', category: 'Crypto', timeHorizon: 'Intraday', probability: 0.8, confidenceRange: [0.6, 0.9], confidence: 0.7, supportingFactors: ['Fixture support'], contradictingFactors: ['Fixture contradiction'], sources: [{ name: 'Fixture source', url: 'https://example.com/test', accessedAt: '2026-01-01T00:59:00Z' }], previousSignalId: 'test-previous', originalAnalysis: 'Fixture original analysis', snapshot: {}, analysisHash: 'test-audit-hash', status: 'resolved', finalResult: 'YES', resolvedAt: '2026-01-02T00:00:00Z', resolutionSourceUrl: 'https://example.com/result', settlementTransactionHash: null };
describe('Signal Intelligence rendered content', () => {
  it('includes all required card metadata and the resolved result', () => {
    const html = renderToStaticMarkup(createElement(SignalCard, { signal }));
    for (const value of ['Fixture agent', 'Test provider', 'Test model', 'test-model-001', '2026-01-01 01:00:00 UTC', '2026-01-01 00:59:00 UTC', '80.0%', '60.0%', '90.0%', 'Fixture support', 'Fixture contradiction', 'Fixture source', 'test-audit-hash', 'Fixture original analysis', 'Final result:', 'YES', 'correct']) expect(html).toContain(value);
    expect(html).toContain('/market/test-market#signal-test-previous');
  });
  it('renders real category/horizon metrics, all calibration buckets and the audit link', () => {
    const entries = buildLeaderboard([agent], [signal]);
    const html = renderToStaticMarkup(createElement(AILeaderboard, { entries }));
    for (const value of ['By category', 'By time horizon', 'Crypto', 'Intraday', '0.040', '0.223', '100.0%', '80', '90', 'Recent prediction records']) expect(html).toContain(value);
    expect(html).toContain('/market/test-market#signal-test-signal');
    expect(entries[0].calibration).toHaveLength(10);
  });
  it('explains why pending-only records have no performance scores', () => {
    const entries = buildLeaderboard([agent], [{ ...signal, status: 'pending', finalResult: null, resolvedAt: null }]);
    const html = renderToStaticMarkup(createElement(AILeaderboard, { entries }));
    expect(html).toContain('No scored outcomes yet'); expect(html).toContain('pending predictions');
    expect(entries[0].accuracy).toBeNull();
  });
  it('summarizes agent estimates and labels small samples honestly', () => {
    const summary = summarizeSignals([
      { ...signal, agentName: 'Macro Agent', probability: 0.2 },
      { ...signal, id: 'two', agentName: 'Technical Agent', probability: 0.5 },
      { ...signal, id: 'three', agentName: 'Contrarian Agent', probability: 0.8 },
    ]);
    expect(summary).toMatchObject({ median: 0.5, minimum: 0.2, maximum: 0.8 });
    expect(summary?.estimates).toHaveLength(3);
    expect(sampleLabel(1)).toBe('Early result');
    expect(sampleLabel(5)).toBe('Limited sample');
    expect(sampleLabel(20)).toBe('Established history');
  });
  it('uses lifecycle-specific empty-state copy', () => {
    expect(generationMessage(undefined).title).toBe('Signal generation scheduled');
    expect(generationMessage({ generationStatus: 'retrying', nextAttemptAt: '2026-01-01T00:00:00Z' } as never).title).toContain('retrying');
    expect(generationMessage({ generationStatus: 'predates' } as never).title).toContain('predates');
    expect(generationMessage({ generationStatus: 'skipped' } as never).title).toContain('cutoff');
  });
});
