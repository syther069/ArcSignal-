import { NextResponse } from 'next/server';
import { validMarketId, V2_CACHE_HEADERS, v2UnavailableResponse } from '@/lib/v2-api';
import { getV2Market, v2Availability } from '@/lib/v2-repository';

export const dynamic = 'force-dynamic';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!v2Availability().enabled) return v2UnavailableResponse();
  const { id } = await params;
  if (!validMarketId(id)) return NextResponse.json({ error: 'Invalid V2 market ID' }, { status: 400 });
  try {
    const market = await getV2Market(id);
    if (!market) return NextResponse.json({ error: 'V2 market not found' }, { status: 404 });
    return NextResponse.json({ ...v2Availability(), market }, { headers: V2_CACHE_HEADERS });
  } catch (error) {
    console.error('V2 market API failed:', error);
    return NextResponse.json({ error: 'V2 market index is unavailable' }, { status: 503 });
  }
}
