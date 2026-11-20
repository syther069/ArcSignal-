import { NextResponse } from 'next/server';
import { getEvidencePack } from '@/lib/evidence';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id || id.length > 200) return NextResponse.json({ error: 'Invalid market ID' }, { status: 400 });
  const evidence = await getEvidencePack(id).catch(() => null);
  return NextResponse.json({ evidence }, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } });
}
