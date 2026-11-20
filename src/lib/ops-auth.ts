import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';

/**
 * Operator-only routes (draft review). Requires `Authorization: Bearer <OPS_ADMIN_SECRET>`.
 * Without a configured secret every request is refused.
 */
export function authorizeOpsRequest(request: Request): NextResponse | null {
  const secret = process.env.OPS_ADMIN_SECRET?.trim();
  if (!secret || secret.length < 16) return NextResponse.json({ error: 'Operator access is not configured' }, { status: 503 });
  const header = request.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const a = Buffer.from(token);
  const b = Buffer.from(secret);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return null;
}
