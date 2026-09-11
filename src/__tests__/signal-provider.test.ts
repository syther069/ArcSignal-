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
