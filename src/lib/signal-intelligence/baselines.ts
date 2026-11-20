import { randomUUID } from 'node:crypto';
import { getSql } from '@/lib/db';
import { hashAnalysis } from './audit';
import { storeSignal } from './repository';
import { timeHorizon } from './generation';
import type { AIAgent, SignalAnalysis } from './types';
import type { XPulse } from '@/lib/x-pulse-shared';

/**
 * Baselines answer "is the AI better than the crowd?". Just before a market closes we freeze
 * two non-AI forecasts and score them exactly like the agents:
 * - X crowd: Grok's latest X Pulse lean (share of posts expecting YES).
 * - Market price: the AMM's implied P(YES).
 * Their agent ids start with `baseline-` so market pages keep them out of the AI median and coverage.
 */
export const BASELINE_PREFIX = 'baseline-';
export const isBaseline = (agentId: string) => agentId.startsWith(BASELINE_PREFIX);

const AGENTS = {
  xCrowd: { id: 'baseline-x-crowd', name: 'X crowd (read by Grok)', description: 'Share of recent X posts expecting YES, frozen before close.',
    reasoningStyle: 'Not a model forecast: a measure of public mood on X.', modelProvider: 'xAI X search', modelName: 'x-pulse' },
  marketPrice: { id: 'baseline-market-price', name: 'Market price', description: 'The market\'s own implied YES price, frozen before close.',
    reasoningStyle: 'Not a model forecast: what traders priced in.', modelProvider: 'ArcSignal AMM', modelName: 'constant-product price' },
} as const;

type Market = { marketId: string; question: string; category: string; closesAt: number };

function category(c: string) {
  return c.toUpperCase() === 'FOOTBALL' ? 'Sports' : 'Crypto';
}

export function buildBaselineSignal(kind: keyof typeof AGENTS, market: Market, probability: number, evidence: {
  snapshotAt: string; summary: string; sources: SignalAnalysis['sources']; snapshot: unknown;
}, now = new Date()): { agent: AIAgent; signal: SignalAnalysis } {
  const a = AGENTS[kind];
  const generatedAt = now.toISOString();
  const agent: AIAgent = { id: a.id, name: a.name, description: a.description, reasoningStyle: a.reasoningStyle,
    modelProvider: a.modelProvider, modelName: a.modelName, modelVersion: 'v1', modelVersionSource: 'provider-model-id',
    status: 'active', createdAt: generatedAt };
  const original: Omit<SignalAnalysis, 'analysisHash'> = {
    id: randomUUID(), marketId: market.marketId, agentId: a.id, agentName: a.name, modelProvider: a.modelProvider,
    modelName: a.modelName, modelVersion: 'v1', modelVersionSource: 'provider-model-id', systemFingerprint: null, providerResponseId: null,
    generatedAt, snapshotAt: evidence.snapshotAt, question: market.question, category: category(market.category),
    timeHorizon: timeHorizon(market.closesAt - Date.parse(evidence.snapshotAt) / 1000),
    probability, confidence: 0.5, confidenceRange: [probability, probability],
    supportingFactors: [evidence.summary], contradictingFactors: [], sources: evidence.sources, previousSignalId: null,
    originalAnalysis: JSON.stringify({ kind, probability, summary: evidence.summary }), snapshot: evidence.snapshot,
  };
  return { agent, signal: { ...original, analysisHash: hashAnalysis(original) } };
}

export async function existingBaselines(marketId: string): Promise<Set<string>> {
  const rows = await getSql()`select agent_id from ai_signals where market_id = ${marketId} and agent_id like 'baseline-%'`;
  return new Set(rows.map((r) => String(r.agent_id)));
}

/** Freezes whichever baselines are missing. Each store is independent and idempotent per market. */
export async function freezeBaselines(market: Market, marketPYes: number | null, pulse: XPulse | null) {
  const have = await existingBaselines(market.marketId);
  const stored: string[] = [];
  if (marketPYes !== null && !have.has(AGENTS.marketPrice.id)) {
    const now = new Date().toISOString();
    const { agent, signal } = buildBaselineSignal('marketPrice', market, marketPYes, {
      snapshotAt: now, summary: `AMM price implied ${Math.round(marketPYes * 100)}% YES shortly before close.`,
      sources: [{ name: 'ArcSignal AMM reserves on Arc', url: null, accessedAt: now }], snapshot: { pYes: marketPYes },
    });
    await storeSignal(agent, signal);
    stored.push(agent.id);
  }
  if (pulse && pulse.lean !== null && !have.has(AGENTS.xCrowd.id)) {
    const { agent, signal } = buildBaselineSignal('xCrowd', market, pulse.lean, {
      snapshotAt: pulse.createdAt, summary: pulse.summary,
      sources: pulse.citations.map((c) => ({ name: 'Post on X', url: c.url, accessedAt: pulse.createdAt })),
      snapshot: { pulseId: pulse.id, mood: pulse.mood, volume: pulse.volume, lean: pulse.lean },
    });
    await storeSignal(agent, signal);
    stored.push(agent.id);
  }
  return stored;
}
