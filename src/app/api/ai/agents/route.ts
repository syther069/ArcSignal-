import { NextResponse } from 'next/server';
import { getAgents } from '@/lib/signal-intelligence/repository';
export const dynamic = 'force-dynamic';
export async function GET() {
  try { return NextResponse.json({ agents: await getAgents() }); }
  catch { return NextResponse.json({ error: 'Agent records are temporarily unavailable.' }, { status: 503 }); }
}
