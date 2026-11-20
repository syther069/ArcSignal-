import { NextResponse } from 'next/server';
import { grokSearch, xaiConfigured } from '@/lib/xai';
import { buildAskPrompt, cleanAnswer, validateQuestion } from '@/lib/ask-grok-shared';
import { clientIp, consumeAskQuota, loadAskContext } from '@/lib/ask-grok';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (process.env.ENABLE_ASK_GROK !== 'true' || !xaiConfigured()) {
    return NextResponse.json({ error: 'Ask Grok is not available right now.' }, { status: 503 });
  }
  const { id } = await params;
  if (!id || id.length > 200) return NextResponse.json({ error: 'Invalid market ID' }, { status: 400 });

  let question: string;
  try {
    const body = await request.json().catch(() => ({}));
    question = validateQuestion((body as { question?: unknown }).question);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid question' }, { status: 400 });
  }

  try {
    const context = await loadAskContext(id);
    if (!context) return NextResponse.json({ error: 'Market not found' }, { status: 404 });
    const limited = await consumeAskQuota(clientIp(request));
    if (limited) return NextResponse.json({ error: limited }, { status: 429 });
    // Questions are never stored; only aggregate usage counts are kept.
    const result = await grokSearch({ prompt: buildAskPrompt(context, question), sources: ['x', 'web'], lookbackDays: 7, maxTurns: 3 });
    return NextResponse.json({ answer: cleanAnswer(result.text), citations: result.citations.slice(0, 6), model: result.model });
  } catch (error) {
    console.error('Ask Grok failed:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Grok could not answer right now. Please try again in a moment.' }, { status: 502 });
  }
}
