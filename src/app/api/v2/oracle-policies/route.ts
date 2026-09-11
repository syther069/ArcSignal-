import { NextResponse } from 'next/server';
import { V2_CACHE_HEADERS, v2UnavailableResponse } from '@/lib/v2-api';
import { getV2ProtocolEvents, v2Availability } from '@/lib/v2-repository';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!v2Availability().enabled) return v2UnavailableResponse();
  try {
    const events = await getV2ProtocolEvents(['OraclePolicyVersionRegistered', 'OraclePolicyVersionStatusChanged']);
    return NextResponse.json({ ...v2Availability(), events }, { headers: V2_CACHE_HEADERS });
  } catch (error) {
    console.error('V2 oracle policies API failed:', error);
    return NextResponse.json({ error: 'V2 oracle policy index is unavailable' }, { status: 503 });
  }
}
