import { NextResponse } from 'next/server';
import { authorizeCronRequest } from '@/lib/cron-auth';
import { xaiConfigured } from '@/lib/xai';
import { generatePulse, getPulseCandidates, storePulse } from '@/lib/x-pulse';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;

function maxMarkets(): number {
  const n = Number(process.env.XAI_PULSE_MAX_MARKETS ?? 5);
  return Number.isFinite(n) ? Math.max(1, Math.min(20, Math.floor(n))) : 5;
}

async function runPulse(request: Request) {
  const authorization = authorizeCronRequest(request);
  if (!authorization.ok) return authorization.response;
  if (process.env.ENABLE_X_PULSE !== 'true') {
    return NextResponse.json({ refreshed: 0, skipped: true, reason: 'ENABLE_X_PULSE is not true' });
  }
  if (!xaiConfigured()) return NextResponse.json({ error: 'XAI_API_KEY is not configured' }, { status: 503 });

  try {
    const candidates = await getPulseCandidates(maxMarkets());
    const results: { marketId: string; status: string }[] = [];
    // Sequential: bounds xAI spend and rate. One market failing never blocks the rest.
    for (const market of candidates) {
      try {
        const pulse = await generatePulse(market.marketId, market.question, market.closesAt);
        await storePulse(pulse);
        results.push({ marketId: market.marketId, status: 'recorded' });
      } catch (error) {
        results.push({ marketId: market.marketId, status: `failed: ${error instanceof Error ? error.message.slice(0, 120) : 'error'}` });
      }
    }
    return NextResponse.json({ refreshed: results.filter((r) => r.status === 'recorded').length, results });
  } catch (error) {
    console.error('X Pulse failed:', error);
    return NextResponse.json({ error: 'X Pulse failed', message: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function GET(request: Request) { return runPulse(request); }
export async function POST(request: Request) { return runPulse(request); }
