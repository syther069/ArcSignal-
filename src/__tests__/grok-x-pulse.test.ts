import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { citationKind, extractJson, grokSearch, parseResponsesOutput } from '@/lib/xai';
import { parsePulseReply, pulseAgeLabel, summarizePulse } from '@/lib/x-pulse-shared';
import { XPulseCard } from '@/components/signals/SignalIntelligence';

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('xAI Responses parsing', () => {
  it('collects message text and deduped url citations, tagging X posts', () => {
    const out = parseResponsesOutput({ output: [
      { type: 'web_search_call' },
      { type: 'message', content: [{ type: 'output_text', text: 'Hello', annotations: [
        { type: 'url_citation', url: 'https://x.com/i/status/9', title: '1' },
        { type: 'url_citation', url: 'https://x.com/i/status/9', title: '1' },
        { type: 'url_citation', url: 'javascript:alert(1)', title: 'bad' },
      ] }] },
    ], citations: ['https://example.com/a'] });
    expect(out.text).toBe('Hello');
    expect(out.citations).toEqual([
      { url: 'https://x.com/i/status/9', title: null, kind: 'x' },
      { url: 'https://example.com/a', title: null, kind: 'web' },
    ]);
  });
  it('classifies hosts', () => {
    expect(citationKind('https://twitter.com/a')).toBe('x');
    expect(citationKind('https://www.reuters.com/a')).toBe('web');
  });
  it('extracts JSON from fenced replies with inline citation links', () => {
    expect(extractJson('Sure:\n```json\n{"a":"b [[1]](https://x.com/i/status/1)"}\n```')).toEqual({ a: 'b ' });
    expect(() => extractJson('no json here')).toThrow();
  });
  it('sends date-bounded x_search and caps search turns', async () => {
    vi.stubEnv('XAI_API_KEY', 'test-only');
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'r1', model: 'grok-x', output: [{ type: 'message', content: [{ type: 'output_text', text: 'ok' }] }] })));
    vi.stubGlobal('fetch', fetchMock);
    const result = await grokSearch({ prompt: 'q', sources: ['x'], lookbackDays: 1, maxTurns: 2, now: new Date('2026-11-19T12:00:00Z') });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.tools).toEqual([{ type: 'x_search', from_date: '2026-11-18', to_date: '2026-11-20' }]);
    expect(body.max_turns).toBe(2);
    expect(result).toMatchObject({ text: 'ok', model: 'grok-x', responseId: 'r1' });
  });
  it('does not retry a bad request', async () => {
    vi.stubEnv('XAI_API_KEY', 'test-only');
    const fetchMock = vi.fn().mockResolvedValue(new Response('bad', { status: 400 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(grokSearch({ prompt: 'q' })).rejects.toThrow(/400/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('X Pulse rules', () => {
  it('accepts a valid reply and rejects off-contract ones', () => {
    expect(parsePulseReply({ mood: 'yes', lean: 0.7, volume: 'Active', summary: ' Mostly bullish. ' }))
      .toEqual({ mood: 'YES', lean: 0.7, volume: 'active', summary: 'Mostly bullish.' });
    expect(parsePulseReply({ mood: 'QUIET', lean: 0.9, volume: 'quiet', summary: 'Little chatter.' }).lean).toBeNull();
    expect(() => parsePulseReply({ mood: 'MAYBE', volume: 'active', summary: 's' })).toThrow();
    expect(() => parsePulseReply({ mood: 'YES', lean: 1.5, volume: 'active', summary: 's' })).toThrow();
    expect(() => parsePulseReply({ mood: 'YES', lean: 0.5, volume: 'active', summary: '' })).toThrow();
  });
  it('compares the crowd with the price and the AI in plain words', () => {
    expect(summarizePulse({ mood: 'YES', lean: 0.8, volume: 'active' }, 0.55, 0.6))
      .toBe('X leans 80% YES, the market prices 55% and the AI says 60%. X is more bullish on YES than the price by 25 points. Loud does not mean right.');
    expect(summarizePulse({ mood: 'SPLIT', lean: 0.5, volume: 'active' }, 0.52, null)).toContain('roughly agree');
    expect(summarizePulse({ mood: 'QUIET', lean: null, volume: 'quiet' }, 0.5, 0.5)).toContain('quiet');
  });
  it('labels age simply', () => {
    const now = Date.parse('2026-11-19T12:00:00Z');
    expect(pulseAgeLabel('2026-11-19T11:55:00Z', now)).toBe('5 min ago');
    expect(pulseAgeLabel('2026-11-19T11:00:00Z', now)).toBe('1 hour ago');
  });
  it('renders the card with links and the honesty note', () => {
    const html = renderToStaticMarkup(createElement(XPulseCard, {
      pulse: { id: 'p', marketId: 'm', mood: 'NO', lean: 0.3, volume: 'surging', summary: 'Doubts after the ETF news.',
        citations: [{ url: 'https://x.com/i/status/1', title: null, kind: 'x' }], model: 'grok', createdAt: new Date().toISOString() },
      marketYes: 0.5, aiYes: null,
    }));
    for (const text of ['X Pulse', 'Leaning NO', '30% YES', 'Surging', 'Doubts after the ETF news.', 'Post 1 on X', 'never affects how a market settles']) expect(html).toContain(text);
  });
});

const m = vi.hoisted(() => ({ getPulseCandidates: vi.fn(), generatePulse: vi.fn(), storePulse: vi.fn() }));
vi.mock('@/lib/x-pulse', () => ({ getPulseCandidates: m.getPulseCandidates, generatePulse: m.generatePulse, storePulse: m.storePulse }));
const call = async () => {
  const { POST } = await import('@/app/api/cron/x-pulse/route');
  return POST(new Request('http://localhost/api/cron/x-pulse', { method: 'POST', headers: { authorization: 'Bearer test-secret' } }));
};

describe('x-pulse cron', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('CRON_SECRET', 'test-secret');
    vi.stubEnv('ENABLE_X_PULSE', 'true');
    vi.stubEnv('XAI_API_KEY', 'test-only');
  });
  it('skips when disabled', async () => {
    vi.stubEnv('ENABLE_X_PULSE', 'false');
    expect((await (await call()).json()).skipped).toBe(true);
    expect(m.getPulseCandidates).not.toHaveBeenCalled();
  });
  it('respects the per-run cap and stores only successful reads', async () => {
    vi.stubEnv('XAI_PULSE_MAX_MARKETS', '2');
    m.getPulseCandidates.mockResolvedValue([{ marketId: 'a', question: 'A?', closesAt: 1 }, { marketId: 'b', question: 'B?', closesAt: 1 }]);
    m.generatePulse.mockResolvedValueOnce({ id: 'p1' }).mockRejectedValueOnce(new Error('xAI down'));
    const body = await (await call()).json();
    expect(m.getPulseCandidates).toHaveBeenCalledWith(2);
    expect(body.refreshed).toBe(1);
    expect(m.storePulse).toHaveBeenCalledTimes(1);
    expect(body.results[1].status).toContain('xAI down');
  });
});
