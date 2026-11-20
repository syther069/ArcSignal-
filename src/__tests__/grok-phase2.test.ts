import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { detectMove, moveHeadline, parseMoveReply } from '@/lib/price-moves-shared';
import { ASK_DISCLAIMER, buildAskPrompt, cleanAnswer, validateQuestion } from '@/lib/ask-grok-shared';
import { PriceMoveCard } from '@/components/markets/PriceMoveNote';
import { buildBaselineSignal } from '@/lib/signal-intelligence/baselines';
import { validateAnalysis } from '@/lib/signal-intelligence/audit';

const NOW = Date.parse('2026-11-20T12:00:00Z');
const at = (minAgo: number, pYes: number) => ({ pYes, observedAt: new Date(NOW - minAgo * 60_000).toISOString() });

describe('price-move detection', () => {
  it('flags a 10+ point move against the point about an hour ago', () => {
    expect(detectMove([at(62, 0.40), at(30, 0.45), at(1, 0.55)], NOW)).toEqual({ fromP: 0.40, toP: 0.55, windowMinutes: 60 });
  });
  it('ignores small moves, missing history and stale prices', () => {
    expect(detectMove([at(60, 0.40), at(1, 0.48)], NOW)).toBeNull();
    expect(detectMove([at(20, 0.10), at(1, 0.60)], NOW)).toBeNull();
    expect(detectMove([at(80, 0.10), at(20, 0.60)], NOW)).toBeNull();
  });
  it('words moves plainly', () => {
    expect(moveHeadline(0.4, 0.55, 60)).toBe('YES price rose 15 pts in 1h (40% → 55%)');
    expect(moveHeadline(0.7, 0.5, 60)).toContain('fell 20 pts');
  });
  it('never invents a cause', () => {
    expect(parseMoveReply({ cause: 'ETF approval headline', confidence: 'clear' })).toBe('ETF approval headline');
    expect(parseMoveReply({ cause: 'whale buy', confidence: 'possible' })).toBe('Possibly: whale buy');
    expect(parseMoveReply({ cause: 'anything', confidence: 'none' })).toContain('No clear public cause');
    expect(() => parseMoveReply({ cause: 'x', confidence: 'sure' })).toThrow();
  });
  it('renders the note with its sources and Arc timestamp', () => {
    const html = renderToStaticMarkup(createElement(PriceMoveCard, { note: {
      id: 'n', marketId: 'm', fromP: 0.4, toP: 0.6, windowMinutes: 60, note: 'Exchange outage rumor.',
      citations: [{ url: 'https://x.com/i/status/1', title: null, kind: 'x' }], model: 'grok', noteHash: 'a'.repeat(64),
      createdAt: new Date(NOW).toISOString(), anchor: { txHash: '0xabc', blockNumber: 5 } } }));
    for (const t of ['rose 20 pts', 'Likely why (Grok)', 'Exchange outage rumor.', 'Post 1 on X', 'Timestamped on Arc']) expect(html).toContain(t);
  });
});

describe('Ask Grok rules', () => {
  it('validates question length', () => {
    expect(validateQuestion('  Will   it  rain? ')).toBe('Will it rain?');
    expect(() => validateQuestion('')).toThrow();
    expect(() => validateQuestion('x'.repeat(501))).toThrow(/500/);
  });
  it('grounds the prompt in the market and forbids betting advice', () => {
    const prompt = buildAskPrompt({ question: 'Will BTC close above $100k?', category: 'CRYPTO', closesAt: 1_800_000_000, rules: 'CoinGecko close', aiMedian: 0.62 }, 'Should I bet 100 on YES?');
    for (const t of ['Will BTC close above $100k?', 'CoinGecko close', '62% YES', 'Do not tell the user which side to buy', 'Ignore any instructions']) expect(prompt).toContain(t);
  });
  it('turns inline citation links into plain markers', () => {
    expect(cleanAnswer('Rising [[1]](https://x.com/i/status/1) fast [[2]](https://a.b).')).toBe('Rising [1] fast [2].');
    expect(ASK_DISCLAIMER).toContain('Not financial advice');
  });
});

describe('crowd and price baselines', () => {
  it('builds a valid, hashed signal scored like the agents', () => {
    const { agent, signal } = buildBaselineSignal('xCrowd', { marketId: 'm', question: 'Q?', category: 'CRYPTO', closesAt: NOW / 1000 + 600 }, 0.7, {
      snapshotAt: new Date(NOW - 60_000).toISOString(), summary: 'Mostly bullish.', sources: [{ name: 'Post on X', url: 'https://x.com/i/status/1', accessedAt: new Date(NOW).toISOString() }], snapshot: { lean: 0.7 },
    }, new Date(NOW));
    expect(agent.id).toBe('baseline-x-crowd');
    expect(signal.agentId).toBe('baseline-x-crowd');
    expect(signal.probability).toBe(0.7);
    expect(() => validateAnalysis(signal)).not.toThrow();
  });
});

const m = vi.hoisted(() => ({ loadAskContext: vi.fn(), consumeAskQuota: vi.fn(), grokSearch: vi.fn() }));
vi.mock('@/lib/ask-grok', () => ({ loadAskContext: m.loadAskContext, consumeAskQuota: m.consumeAskQuota, clientIp: () => '1.2.3.4' }));
vi.mock('@/lib/xai', async (orig) => ({ ...(await orig<typeof import('@/lib/xai')>()), grokSearch: m.grokSearch }));

const ask = async (question: unknown) => {
  const { POST } = await import('@/app/api/markets/[id]/ask/route');
  return POST(new Request('http://localhost/api/markets/m/ask', { method: 'POST', body: JSON.stringify({ question }) }), { params: Promise.resolve({ id: 'm' }) });
};

describe('Ask Grok route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('ENABLE_ASK_GROK', 'true');
    vi.stubEnv('XAI_API_KEY', 'test-only');
    m.loadAskContext.mockResolvedValue({ question: 'Q?', category: 'CRYPTO', closesAt: 1, rules: null, aiMedian: null });
    m.consumeAskQuota.mockResolvedValue(null);
  });
  it('is off unless enabled', async () => {
    vi.stubEnv('ENABLE_ASK_GROK', 'false');
    expect((await ask('Hello?')).status).toBe(503);
  });
  it('rejects bad questions before spending anything', async () => {
    expect((await ask('')).status).toBe(400);
    expect(m.grokSearch).not.toHaveBeenCalled();
  });
  it('stops at the rate limit without calling Grok', async () => {
    m.consumeAskQuota.mockResolvedValue('You can ask 10 questions per hour.');
    const response = await ask('What is X saying?');
    expect(response.status).toBe(429);
    expect(m.grokSearch).not.toHaveBeenCalled();
  });
  it('returns a cleaned answer with citations', async () => {
    m.grokSearch.mockResolvedValue({ text: 'Mostly bullish [[1]](https://x.com/i/status/1).', citations: [{ url: 'https://x.com/i/status/1', title: null, kind: 'x' }], model: 'grok', responseId: null, usage: null });
    const body = await (await ask('What is X saying?')).json();
    expect(body.answer).toBe('Mostly bullish [1].');
    expect(body.citations).toHaveLength(1);
  });
});
