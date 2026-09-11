import { NextResponse } from 'next/server';
import { authorizeCronRequest } from '@/lib/cron-auth';
import { generateMarketSignals } from '@/lib/signal-intelligence/generation';
import { reconcileSignals } from '@/lib/signal-intelligence/resolution';
import { generateScheduledSignals } from '@/lib/signal-intelligence/operations';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;
export async function POST(request: Request) {
  const auth = authorizeCronRequest(request);
  if (!auth.ok) return auth.response;
  let body: { marketId?: unknown; action?: unknown; maxMarkets?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Expected a JSON body' }, { status: 400 }); }
  if (body.action !== 'generate' && body.action !== 'generate-scheduled' && body.action !== 'reconcile') return NextResponse.json({ error: 'Choose generate, generate-scheduled, or reconcile' }, { status: 400 });
  if (body.action === 'generate' && (typeof body.marketId !== 'string' || !body.marketId || body.marketId.length > 200)) return NextResponse.json({ error: 'A valid marketId is required' }, { status: 400 });
  try {
    if (body.action === 'generate') return NextResponse.json({ results: await generateMarketSignals(body.marketId as string) });
    if (body.action === 'generate-scheduled') {
      const maxMarkets = typeof body.maxMarkets === 'number' ? body.maxMarkets : 1;
      return NextResponse.json(await generateScheduledSignals({ maxMarkets, deadline: Date.now() + 240_000 }));
    }
    return NextResponse.json(await reconcileSignals());
  } catch {
    return NextResponse.json({ error: 'Signal operation failed. Check database migration, provider availability, and market cutoff. Successful prior records are retained; retry is safe.' }, { status: 503 });
  }
}
