import { NextResponse } from 'next/server';
import { getLatestMoveNote } from '@/lib/price-moves';
export const dynamic = 'force-dynamic';
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id || id.length > 200) return NextResponse.json({ error: 'Invalid market ID' }, { status: 400 });
  // Optional extra: a missing table or DB hiccup just means "no note".
  const note = await getLatestMoveNote(id).catch(() => null);
  return NextResponse.json({ note }, { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120' } });
}
