import { NextResponse } from 'next/server';
import { authorizeOpsRequest } from '@/lib/ops-auth';
import { decideDraft } from '@/lib/trend-drafts';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Approve or reject one waiting draft. Approval only queues it; the market job publishes it. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = authorizeOpsRequest(request);
  if (denied) return denied;
  const { id } = await params;
  const body = await request.json().catch(() => ({})) as { decision?: string };
  if (body.decision !== 'approved' && body.decision !== 'rejected') {
    return NextResponse.json({ error: 'decision must be "approved" or "rejected"' }, { status: 400 });
  }
  const changed = await decideDraft(id, body.decision).catch(() => false);
  if (!changed) return NextResponse.json({ error: 'Draft not found or already decided' }, { status: 409 });
  return NextResponse.json({ id, status: body.decision });
}
