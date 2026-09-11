import { NextResponse } from 'next/server';
import { boundedInteger, V2_CACHE_HEADERS, v2UnavailableResponse } from '@/lib/v2-api';
import { getV2Markets, v2Availability } from '@/lib/v2-repository';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const availability = v2Availability();
  if (!availability.enabled) return v2UnavailableResponse();
  const url = new URL(request.url);
  const limit = Math.max(1, boundedInteger(url.searchParams.get('limit'), 50, 100));
  const offset = boundedInteger(url.searchParams.get('offset'), 0, 10_000);
  try {
    const markets = await getV2Markets(limit, offset);
    return NextResponse.json({ ...availability, markets, limit, offset }, { headers: V2_CACHE_HEADERS });
  } catch (error) {
    console.error('V2 markets API failed:', error);
    return NextResponse.json({ error: 'V2 market index is unavailable' }, { status: 503 });
  }
}
