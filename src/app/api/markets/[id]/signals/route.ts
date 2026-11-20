import { NextResponse } from 'next/server';
import { getSignalCoverage, getSignals } from '@/lib/signal-intelligence/repository';
import { getMarketAnchors } from '@/lib/signal-intelligence/anchors';
import { getLatestPulse } from '@/lib/x-pulse';
export const dynamic = 'force-dynamic';
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id || id.length > 200) return NextResponse.json({ error: 'Invalid market ID' }, { status: 400 });
  try {
    const [signals, coverage, anchors, pulse] = await Promise.all([
      getSignals(id),
      getSignalCoverage(id),
      // Anchors and X Pulse are optional extras; never let them break the signal panel.
      getMarketAnchors(id).catch(() => []),
      getLatestPulse(id).catch(() => null),
    ]);
    return NextResponse.json({ signals, coverage: coverage[0] ?? null, anchors, pulse });
  }
  catch { return NextResponse.json({ error: 'Signal records are temporarily unavailable.' }, { status: 503 }); }
}
