import { NextResponse } from 'next/server';
import { v2Availability } from './v2-repository';

export const V2_CACHE_HEADERS = { 'Cache-Control': 'public, max-age=0, s-maxage=10, stale-while-revalidate=30' };

export function v2UnavailableResponse() {
  return NextResponse.json({ ...v2Availability(), data: null, reason: 'ArcSignal V2 is not deployed/configured' }, {
    status: 503,
    headers: { 'Cache-Control': 'no-store', 'Retry-After': '60' },
  });
}

export function validMarketId(value: string) {
  return /^0x[0-9a-fA-F]{64}$/.test(value);
}

export function boundedInteger(value: string | null, fallback: number, maximum: number) {
  if (!value || !/^\d+$/.test(value)) return fallback;
  return Math.min(Number(value), maximum);
}
