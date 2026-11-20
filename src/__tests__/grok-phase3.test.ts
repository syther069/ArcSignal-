import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { draftCriteria, draftQuestion, roundThreshold, validateDraftIdea } from '@/lib/trend-drafts-shared';
import { EVIDENCE_NOTE, evidencePrompt, parseEvidenceReply } from '@/lib/evidence-shared';
import { EvidencePackCard } from '@/components/markets/EvidencePack';
import { buildShareText, shareUrl } from '@/components/markets/ShareOnX';
import { authorizeOpsRequest } from '@/lib/ops-auth';

afterEach(() => vi.unstubAllEnvs());
const prices = { BTC: 100_000, ETH: 3_000 };

describe('X trend drafts', () => {
  it('accepts a supported, near-price, bounded idea and rounds the threshold', () => {
    const r = validateDraftIdea({ symbol: 'eth', threshold: 3123, horizonHours: 24, reason: 'Debate about $3.1k support.' }, prices);
    expect(r).toEqual({ ok: true, value: { symbol: 'ETH', threshold: 3100, horizonHours: 24, reason: 'Debate about $3.1k support.', referencePrice: 3000 } });
  });
  it('rejects anything the oracle cannot settle or that is far from the price', () => {
    expect(validateDraftIdea({ symbol: 'DOGE', threshold: 1, horizonHours: 24, reason: 'x' }, prices)).toMatchObject({ ok: false });
    expect(validateDraftIdea({ symbol: 'BTC', threshold: 200_000, horizonHours: 24, reason: 'x' }, prices)).toMatchObject({ ok: false, reason: expect.stringContaining('25%') });
    expect(validateDraftIdea({ symbol: 'BTC', threshold: 101_000, horizonHours: 100, reason: 'x' }, prices)).toMatchObject({ ok: false });
    expect(validateDraftIdea({ symbol: 'BTC', threshold: 101_000, horizonHours: 1.5, reason: 'x' }, prices)).toMatchObject({ ok: false });
    expect(validateDraftIdea({ symbol: 'BTC', threshold: 101_000, horizonHours: 2, reason: '' }, prices)).toMatchObject({ ok: false });
    expect(validateDraftIdea({ symbol: 'ETH', threshold: 3000, horizonHours: 2, reason: 'x' }, {})).toMatchObject({ ok: false });
  });
  it('writes the question and rules the way the oracle settles them', () => {
    const at = new Date('2026-11-21T12:00:00Z');
    expect(roundThreshold(98_765)).toBe(99_000);
    expect(draftQuestion('BTC', 100_000, at)).toBe('Will BTC be at or above $100,000 on Sat, 21 Nov 2026 12:00:00 GMT?');
    expect(draftCriteria('BTC', 100_000, at)).toContain('CoinGecko is at or above $100,000');
  });
});

describe('evidence pack', () => {
  it('parses Grok replies strictly', () => {
    expect(parseEvidenceReply({ likelyResult: 'yes', summary: 'CoinGecko shows 101k at close.' })).toEqual({ likelyResult: 'YES', summary: 'CoinGecko shows 101k at close.' });
    expect(() => parseEvidenceReply({ likelyResult: 'MAYBE', summary: 's' })).toThrow();
    expect(() => parseEvidenceReply({ likelyResult: 'NO', summary: '' })).toThrow();
  });
  it('asks for the official source first and allows UNCLEAR', () => {
    const prompt = evidencePrompt('Q?', 'CoinGecko close', 1_800_000_000);
    expect(prompt).toContain('official source named in the rules first');
    expect(prompt).toContain('UNCLEAR');
  });
  it('always says it is advisory', () => {
    const html = renderToStaticMarkup(createElement(EvidencePackCard, { pack: { marketId: 'm', likelyResult: 'UNCLEAR', summary: 'Sources disagree.',
      citations: [{ url: 'https://www.coingecko.com/x', title: null, kind: 'web' }], model: 'grok', evidenceHash: 'a'.repeat(64), createdAt: new Date().toISOString() } }));
    for (const t of ['Evidence gathered by Grok (advisory)', 'Evidence is unclear so far', 'Sources disagree.', 'coingecko.com', EVIDENCE_NOTE]) expect(html).toContain(t);
  });
});

describe('share to X', () => {
  it('builds a short factual post and an intent link', () => {
    const text = buildShareText({ question: 'Will BTC be at or above $100,000?', aiPick: 'YES', aiConfidence: 70, marketYes: 0.55 });
    expect(text).toBe('Will BTC be at or above $100,000?\n\nArcSignal AI picks YES (70% confidence), market prices 55% YES.\n\nFollow or fade the AI on Arc:');
    expect(buildShareText({ question: 'Q?', aiPick: null, aiConfidence: null, marketYes: null })).toBe('Q?\n\nFollow or fade the AI on Arc:');
    expect(shareUrl('a b', 'https://x.test/m/1')).toBe('https://x.com/intent/post?text=a%20b&url=https%3A%2F%2Fx.test%2Fm%2F1');
  });
});

describe('operator auth', () => {
  const req = (auth?: string) => new Request('http://localhost/api/ops/drafts', { headers: auth ? { authorization: auth } : {} });
  it('refuses everything when no secret is configured', () => {
    vi.stubEnv('OPS_ADMIN_SECRET', '');
    expect(authorizeOpsRequest(req('Bearer anything'))?.status).toBe(503);
  });
  it('accepts only the exact secret', () => {
    vi.stubEnv('OPS_ADMIN_SECRET', 'a-very-long-test-secret');
    expect(authorizeOpsRequest(req())?.status).toBe(401);
    expect(authorizeOpsRequest(req('Bearer wrong'))?.status).toBe(401);
    expect(authorizeOpsRequest(req('Bearer a-very-long-test-secret'))).toBeNull();
  });
});

const m = vi.hoisted(() => ({ decideDraft: vi.fn(), generateDrafts: vi.fn(), draftedWithin: vi.fn() }));
vi.mock('@/lib/trend-drafts', () => ({ decideDraft: m.decideDraft, generateDrafts: m.generateDrafts, draftedWithin: m.draftedWithin, listDrafts: vi.fn(), intervalHours: () => 2, rejectExpiredDrafts: async () => 0, livePriceMap: async () => ({}) }));

describe('draft review and drafting jobs', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.stubEnv('OPS_ADMIN_SECRET', 'a-very-long-test-secret'); });
  const decide = async (decision: unknown) => {
    const { POST } = await import('@/app/api/ops/drafts/[id]/route');
    return POST(new Request('http://localhost/x', { method: 'POST', headers: { authorization: 'Bearer a-very-long-test-secret' }, body: JSON.stringify({ decision }) }), { params: Promise.resolve({ id: 'd1' }) });
  };
  it('only accepts approve or reject, and only once', async () => {
    expect((await decide('publish-now')).status).toBe(400);
    m.decideDraft.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    expect((await decide('approved')).status).toBe(200);
    expect((await decide('approved')).status).toBe(409);
  });
  it('the scheduled job asks Grok at most every 6 hours', async () => {
    vi.stubEnv('CRON_SECRET', 's'); vi.stubEnv('ENABLE_TREND_DRAFTS', 'true'); vi.stubEnv('XAI_API_KEY', 'k');
    m.draftedWithin.mockResolvedValue(true);
    const { POST } = await import('@/app/api/cron/trend-drafts/route');
    const body = await (await POST(new Request('http://localhost/x', { method: 'POST', headers: { authorization: 'Bearer s' } }))).json();
    expect(body.skipped).toBe(true);
    expect(m.generateDrafts).not.toHaveBeenCalled();
  });
});
