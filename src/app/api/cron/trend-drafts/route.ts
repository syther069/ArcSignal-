import { NextResponse } from 'next/server';
import { authorizeCronRequest } from '@/lib/cron-auth';
import { xaiConfigured } from '@/lib/xai';
import { draftedWithin, generateDrafts, intervalHours, rejectExpiredDrafts } from '@/lib/trend-drafts';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 90;

/** Scheduled: Grok drafts up to 3 market ideas from X trends. Drafts wait for an operator. */
async function run(request: Request) {
  const authorization = authorizeCronRequest(request);
  if (!authorization.ok) return authorization.response;
  if (process.env.ENABLE_TREND_DRAFTS !== 'true') return NextResponse.json({ skipped: true, reason: 'ENABLE_TREND_DRAFTS is not true' });
  if (!xaiConfigured()) return NextResponse.json({ error: 'XAI_API_KEY is not configured' }, { status: 503 });
  try {
    await rejectExpiredDrafts().catch(() => 0);
    const hours = intervalHours();
    if (await draftedWithin(hours)) return NextResponse.json({ skipped: true, reason: `Drafted within the last ${hours} hours` });
    const { stored, rejected } = await generateDrafts();
    return NextResponse.json({ created: stored.length, rejected });
  } catch (error) {
    return NextResponse.json({ error: 'Trend drafts failed', message: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function GET(request: Request) { return run(request); }
export async function POST(request: Request) { return run(request); }
