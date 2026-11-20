import { afterEach, describe, expect, it, vi } from 'vitest';
const create = vi.hoisted(() => vi.fn());
vi.mock('groq-sdk', () => ({ default: class { chat = { completions: { create } }; } }));
import { generateAnalysis } from '@/lib/gemini';
const analysis = JSON.stringify({ probability: 60, confidence: 70, confidenceRange: [50, 80], prediction: 'YES', summary: 'Test analysis', bullCase: 'Test support', bearCase: 'Test risk', keyFactors: [], riskFactors: [], sources: [], generatedAt: '2000-01-01' });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.clearAllMocks(); });
describe('analysis provider transport metadata', () => {
  it('captures Groq response identity rather than model-authored timestamps', async () => {
    vi.stubEnv('GEMINI_API_KEY', ''); vi.stubEnv('GROQ_API_KEY', 'test-only');
    create.mockResolvedValue({ model: 'actual-test-model', id: 'response-test', system_fingerprint: 'fp_test', choices: [{ message: { content: analysis } }] });
    const result = await generateAnalysis('test prompt', true);
    expect(result.provenance).toMatchObject({ model: 'actual-test-model', version: 'actual-test-model', versionSource: 'provider-model-id', systemFingerprint: 'fp_test', responseId: 'response-test', raw: analysis });
    expect(result.provenance?.generatedAt).not.toBe('2000-01-01');
  });
  it('preserves Gemini modelVersion returned with the generated response', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'AIzaSy-test-only'); vi.stubEnv('GROQ_API_KEY', '');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ modelVersion: 'gemini-test-001', responseId: 'response-test', candidates: [{ content: { parts: [{ text: analysis }] } }] }))));
    expect((await generateAnalysis('test prompt', true)).provenance).toMatchObject({ version: 'gemini-test-001', versionSource: 'provider-version', responseId: 'response-test' });
  });
  it('keeps added transport metadata out of the existing trading analysis payload', async () => {
    vi.stubEnv('GEMINI_API_KEY', ''); vi.stubEnv('GROQ_API_KEY', 'test-only');
    create.mockResolvedValue({ model: 'actual-test-model', choices: [{ message: { content: analysis } }] });
    expect((await generateAnalysis('test prompt')).provenance).toBeUndefined();
  });
});
describe('xAI (Grok) provider', () => {
  it('records xAI provenance and the live X/web sources Grok cited', async () => {
    vi.stubEnv('XAI_API_KEY', 'test-only'); vi.stubEnv('XAI_MODEL', '');
    const body = { id: 'xai-response', model: 'grok-test', output: [
      { type: 'x_search_call' },
      { type: 'message', content: [{ type: 'output_text', text: `Evidence [[1]](https://x.com/i/status/1). ${analysis}`,
        annotations: [{ type: 'url_citation', url: 'https://x.com/i/status/1', title: '1' }, { type: 'url_citation', url: 'https://www.coindesk.com/a', title: 'CoinDesk story' }] }] },
    ] };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(body)));
    vi.stubGlobal('fetch', fetchMock);
    const result = await generateAnalysis('test prompt', true, 'xai');
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.x.ai/v1/responses');
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sent.tools.map((t: { type: string }) => t.type)).toEqual(['x_search', 'web_search']);
    expect(sent.tools[0].from_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.provenance).toMatchObject({ provider: 'xAI', model: 'grok-test', responseId: 'xai-response' });
    expect(result.citations).toEqual([
      { url: 'https://x.com/i/status/1', title: null, kind: 'x' },
      { url: 'https://www.coindesk.com/a', title: 'CoinDesk story', kind: 'web' },
    ]);
    expect(result.probability).toBe(60);
  });
  it('never falls back to another provider under the Grok name', async () => {
    vi.useFakeTimers();
    vi.stubEnv('XAI_API_KEY', 'test-only'); vi.stubEnv('GROQ_API_KEY', 'test-only');
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => new Response('down', { status: 503 })));
    const pending = generateAnalysis('test prompt', true, 'xai');
    const assertion = expect(pending).rejects.toThrow(/xAI/);
    await vi.runAllTimersAsync();
    await assertion;
    expect(create).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
