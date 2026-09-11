import { NextResponse } from 'next/server';
import { getSignalCoverage, getSignals } from '@/lib/signal-intelligence/repository';
export const dynamic = 'force-dynamic';
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id || id.length > 200) return NextResponse.json({ error: 'Invalid market ID' }, { status: 400 });
  try {
    const [signals, coverage] = await Promise.all([getSignals(id), getSignalCoverage(id)]);
    return NextResponse.json({ signals, coverage: coverage[0] ?? null });
  }
  catch { return NextResponse.json({ error: 'Signal records are temporarily unavailable.' }, { status: 503 }); }
}
