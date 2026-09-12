import { NextResponse } from 'next/server';
import { authorizeCronRequest } from '@/lib/cron-auth';
import {
  ensureExternalSettlementSchema,
  listExternalSettlementsForReconciliation,
  updateExternalSettlementOutcome,
} from '@/lib/markets/externalSettlement';
import type { LiveMarketSource } from '@/lib/markets/liveMarketTypes';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

type OutcomeState =
  | { status: 'pending'; evidence: unknown }
  | { status: 'resolved'; outcome: 'YES' | 'NO' | 'UNDETERMINED'; evidence: unknown }
  | { status: 'ambiguous'; evidence: unknown; message: string };

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }
  return undefined;
}

function parseJsonArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function terminalLabel(raw: unknown): 'YES' | 'NO' | 'UNDETERMINED' | null {
  const value = asString(raw)?.trim().toUpperCase();
  if (!value) return null;
  if (['YES', 'TRUE', '1', 'Y'].includes(value)) return 'YES';
  if (['NO', 'FALSE', '0', 'N'].includes(value)) return 'NO';
  if (['CANCEL', 'CANCELLED', 'CANCELED', 'N/A', 'NA', 'MKT', 'VOID', 'UNDETERMINED'].includes(value)) return 'UNDETERMINED';
  return null;
}

function inferGenericOutcome(payload: Record<string, unknown>) {
  const directKeys = ['resolution', 'outcome', 'result', 'resolvedOutcome', 'winningOutcome', 'winner', 'answer', 'settlement_value'];
  for (const key of directKeys) {
    const label = terminalLabel(payload[key]);
    if (label) return label;
  }
  const settlementValue = asNumber(payload.settlement_value ?? payload.settlementValue);
  if (settlementValue !== undefined) {
    if (settlementValue >= 99 || settlementValue === 1) return 'YES';
    if (settlementValue <= 1 || settlementValue === 0) return 'NO';
  }
  return null;
}

function inferPolymarketOutcome(payload: Record<string, unknown>): OutcomeState {
  const closed = asBoolean(payload.closed) ?? asBoolean(payload.resolved) ?? false;
  const generic = inferGenericOutcome(payload);
  if (generic) return { status: 'resolved', outcome: generic, evidence: payload };
  const outcomes = parseJsonArray(payload.outcomes).map((outcome) => String(outcome).toUpperCase());
  const prices = parseJsonArray(payload.outcomePrices).map(asNumber);
  if (closed && outcomes.length >= 2 && prices.length >= 2) {
    const max = Math.max(...prices.filter((price): price is number => price !== undefined));
    const index = prices.findIndex((price) => price === max);
    const label = terminalLabel(outcomes[index]);
    if (label && max >= 0.99) return { status: 'resolved', outcome: label, evidence: payload };
  }
  return closed ? { status: 'ambiguous', evidence: payload, message: 'Polymarket market is closed but no binary final outcome was exposed by Gamma.' } : { status: 'pending', evidence: payload };
}

function inferKalshiOutcome(payload: Record<string, unknown>): OutcomeState {
  const market = (payload.market && typeof payload.market === 'object' ? payload.market : payload) as Record<string, unknown>;
  const status = asString(market.status)?.toLowerCase();
  const generic = inferGenericOutcome(market);
  if (generic && ['settled', 'resolved', 'finalized', 'closed'].includes(status ?? 'settled')) {
    return { status: 'resolved', outcome: generic, evidence: payload };
  }
  if (status && ['settled', 'resolved', 'finalized'].includes(status)) {
    return { status: 'ambiguous', evidence: payload, message: 'Kalshi market is terminal but no YES/NO settlement value was exposed.' };
  }
  return { status: 'pending', evidence: payload };
}

function inferManifoldOutcome(payload: Record<string, unknown>): OutcomeState {
  const resolved = asBoolean(payload.isResolved) ?? asBoolean(payload.resolved) ?? false;
  const generic = inferGenericOutcome(payload);
  if (resolved && generic) return { status: 'resolved', outcome: generic, evidence: payload };
  if (resolved) return { status: 'ambiguous', evidence: payload, message: 'Manifold market is resolved but no binary YES/NO result was exposed.' };
  return { status: 'pending', evidence: payload };
}

function sourceUrls(source: LiveMarketSource, externalMarketId: string) {
  if (source === 'polymarket') {
    return [
      `https://gamma-api.polymarket.com/markets/${encodeURIComponent(externalMarketId)}`,
      `https://gamma-api.polymarket.com/markets?id=${encodeURIComponent(externalMarketId)}`,
      `https://gamma-api.polymarket.com/markets?condition_id=${encodeURIComponent(externalMarketId)}`,
    ];
  }
  if (source === 'kalshi') return [`https://external-api.kalshi.com/trade-api/v2/markets/${encodeURIComponent(externalMarketId)}`];
  if (source === 'manifold') return [`https://api.manifold.markets/v0/market/${encodeURIComponent(externalMarketId)}`];
  return [];
}

async function fetchJson(url: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(url, {
      headers: { accept: 'application/json', 'user-agent': 'ArcSignal external-settlement/1.0' },
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return await response.json() as unknown;
  } finally {
    clearTimeout(timer);
  }
}

function unwrapPayload(payload: unknown): Record<string, unknown> {
  if (Array.isArray(payload)) return (payload[0] && typeof payload[0] === 'object' ? payload[0] : {}) as Record<string, unknown>;
  if (payload && typeof payload === 'object') return payload as Record<string, unknown>;
  return {};
}

function inferOutcome(source: LiveMarketSource, payload: Record<string, unknown>): OutcomeState {
  if (source === 'polymarket') return inferPolymarketOutcome(payload);
  if (source === 'kalshi') return inferKalshiOutcome(payload);
  if (source === 'manifold') return inferManifoldOutcome(payload);
  return { status: 'ambiguous', evidence: payload, message: 'Unsupported external source.' };
}

async function readSourceOutcome(source: LiveMarketSource, externalMarketId: string): Promise<OutcomeState> {
  const errors: string[] = [];
  for (const url of sourceUrls(source, externalMarketId)) {
    try {
      const payload = unwrapPayload(await fetchJson(url));
      return inferOutcome(source, payload);
    } catch (error) {
      errors.push(`${url}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return { status: 'ambiguous', evidence: { errors }, message: 'Unable to fetch the committed external source.' };
}

async function settleExternalMarkets(request: Request) {
  const authorization = authorizeCronRequest(request);
  if (!authorization.ok) return authorization.response;
  await ensureExternalSettlementSchema();
  const url = new URL(request.url);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? 60)));
  const candidates = await listExternalSettlementsForReconciliation(limit);
  const results = [];

  for (const candidate of candidates) {
    const outcome = await readSourceOutcome(candidate.source, candidate.externalMarketId);
    if (outcome.status === 'resolved') {
      const record = await updateExternalSettlementOutcome({
        liveMarketId: candidate.liveMarketId,
        status: 'SOURCE_RESOLVED',
        sourceOutcome: outcome.outcome,
        evidence: outcome.evidence,
      });
      results.push({ liveMarketId: candidate.liveMarketId, status: 'SOURCE_RESOLVED', sourceOutcome: outcome.outcome, arcMarketId: record?.arcMarketId });
    } else if (outcome.status === 'ambiguous') {
      const record = await updateExternalSettlementOutcome({
        liveMarketId: candidate.liveMarketId,
        status: 'SOURCE_AMBIGUOUS',
        evidence: outcome.evidence,
        errorMessage: outcome.message,
      });
      results.push({ liveMarketId: candidate.liveMarketId, status: 'SOURCE_AMBIGUOUS', message: outcome.message, arcMarketId: record?.arcMarketId });
    } else {
      const record = await updateExternalSettlementOutcome({
        liveMarketId: candidate.liveMarketId,
        status: 'SOURCE_PENDING',
        evidence: outcome.evidence,
      });
      results.push({ liveMarketId: candidate.liveMarketId, status: 'SOURCE_PENDING', arcMarketId: record?.arcMarketId });
    }
  }

  return NextResponse.json({ reconciled: results.length, results });
}

export async function GET(request: Request) { return settleExternalMarkets(request); }
export async function POST(request: Request) { return settleExternalMarkets(request); }
