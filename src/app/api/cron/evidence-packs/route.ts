import { NextResponse } from 'next/server';
import { authorizeCronRequest } from '@/lib/cron-auth';
import { xaiConfigured } from '@/lib/xai';
import { buildEvidencePack, getEvidenceCandidates, storeEvidencePack } from '@/lib/evidence';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;

/** After close: Grok gathers public evidence for the result. Advisory only; never settles anything. */
async function run(request: Request) {
  const authorization = authorizeCronRequest(request);
  if (!authorization.ok) return authorization.response;
  if (process.env.ENABLE_EVIDENCE_PACKS !== 'true') return NextResponse.json({ skipped: true, reason: 'ENABLE_EVIDENCE_PACKS is not true' });
  if (!xaiConfigured()) return NextResponse.json({ error: 'XAI_API_KEY is not configured' }, { status: 503 });
  try {
    const results: { marketId: string; status: string }[] = [];
    for (const market of await getEvidenceCandidates(3)) {
      try {
        await storeEvidencePack(await buildEvidencePack(market.marketId, market.question, market.rules, market.closesAt));
        results.push({ marketId: market.marketId, status: 'recorded' });
      } catch (error) {
        results.push({ marketId: market.marketId, status: `failed: ${error instanceof Error ? error.message.slice(0, 120) : 'error'}` });
      }
    }
    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json({ error: 'Evidence packs failed', message: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function GET(request: Request) { return run(request); }
export async function POST(request: Request) { return run(request); }
