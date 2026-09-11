import { describe, expect, it } from 'vitest';
import { modelVersionExplanation, modelVersionLabel, providerModelIdentity } from '@/lib/signal-intelligence/model-identity';

describe('provider model provenance', () => {
  it('records the real Gemini transport version and response identifier', () => {
    const identity = providerModelIdentity('gemini-test-alias', { modelVersion: 'gemini-test-001', responseId: 'test-response' });
    expect(identity.modelVersion).toBe('gemini-test-001');
    expect(identity.modelVersionSource).toBe('provider-version');
    expect(identity.providerResponseId).toBe('test-response');
    expect(modelVersionLabel(identity)).toBe('Model version: gemini-test-001');
  });
  it('keeps a Groq model ID distinct from a backend fingerprint', () => {
    const identity = providerModelIdentity('test-provider/model', { id: 'test-response', system_fingerprint: 'fp_test' });
    expect(identity.modelVersion).toBe('test-provider/model');
    expect(identity.modelVersionSource).toBe('provider-model-id');
    expect(identity.systemFingerprint).toBe('fp_test');
    expect(modelVersionLabel(identity)).toBe('Provider model ID: test-provider/model');
    expect(modelVersionExplanation(identity)).toContain('without a separate weight revision');
  });
  it('handles historical records without inventing model versions or demo status', () => {
    const legacy = { modelName: 'recorded-model', modelVersion: null };
    expect(modelVersionLabel(legacy)).toBe('Provider model ID: recorded-model');
    expect(modelVersionExplanation(legacy)).toContain('Historical record');
    expect(legacy.modelVersion).toBeNull();
  });
  it('rejects empty or non-string version metadata', () => {
    expect(providerModelIdentity('actual-model', { modelVersion: ' ', model_version: 123 }).modelVersionSource).toBe('provider-model-id');
  });
});
