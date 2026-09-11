import { NextResponse } from 'next/server';
import { V2_CACHE_HEADERS } from '@/lib/v2-api';
import { getV2Health, v2Availability } from '@/lib/v2-repository';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!v2Availability().enabled) {
    return NextResponse.json({ ...v2Availability(), status: 'not-configured' }, { headers: V2_CACHE_HEADERS });
  }
  try {
    const health = await getV2Health();
    const status = health.reconciliation?.insolventCount ? 'critical' : health.checkpoint ? 'operational' : 'indexing';
    return NextResponse.json({ status, ...health }, { headers: V2_CACHE_HEADERS });
  } catch (error) {
    console.error('V2 health API failed:', error);
    return NextResponse.json({ ...v2Availability(), status: 'unavailable' }, { status: 503 });
  }
}
