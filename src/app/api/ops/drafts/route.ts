import { NextResponse } from 'next/server';
import { authorizeOpsRequest } from '@/lib/ops-auth';
import { xaiConfigured } from '@/lib/xai';
import { generateDrafts, listDrafts, livePriceMap, rejectExpiredDrafts } from '@/lib/trend-drafts';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 90;

/** Drafts (ranked) plus live prices so the page can show how far each price has moved. */
export async function GET(request: Request) {
  const denied = authorizeOpsRequest(request);
  if (denied) return denied;
  try {
    const [drafts, prices] = await Promise.all([listDrafts(), livePriceMap().catch(() => ({}))]);
    return NextResponse.json({ drafts, prices });
  } catch {
    return NextResponse.json({ error: 'Drafts are unavailable. Have migrations 007 and 008 been applied?' }, { status: 503 });
  }
}

/** `{ "action": "generate" }` asks Grok for fresh ideas now; `{ "action": "reject-expired" }` clears stale drafts. */
export async function POST(request: Request) {
  const denied = authorizeOpsRequest(request);
  if (denied) return denied;
  const body = await request.json().catch(() => ({})) as { action?: string };
  if (body.action === 'reject-expired') {
    return NextResponse.json({ rejected: await rejectExpiredDrafts() });
  }
  if (!xaiConfigured()) return NextResponse.json({ error: 'XAI_API_KEY is not configured' }, { status: 503 });
  try {
    const { stored, rejected } = await generateDrafts();
    return NextResponse.json({ created: stored.length, rejected });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Draft generation failed' }, { status: 502 });
  }
}
