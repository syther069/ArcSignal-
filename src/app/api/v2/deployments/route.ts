import { NextResponse } from 'next/server';
import { V2_CACHE_HEADERS } from '@/lib/v2-api';
import { getV2Deployments, v2Availability } from '@/lib/v2-repository';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const deployments = await getV2Deployments();
    return NextResponse.json({ ...v2Availability(), deployments }, { headers: V2_CACHE_HEADERS });
  } catch (error) {
    console.error('V2 deployments API failed:', error);
    return NextResponse.json({ error: 'V2 deployment registry is unavailable' }, { status: 503 });
  }
}
