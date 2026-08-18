import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolveGroqModel, DEFAULT_GROQ_MODEL, DEPRECATED_GROQ_MODELS } from '@/lib/gemini';

describe('Groq Model Resolution & Fallback', () => {
  const originalEnv = process.env.GROQ_MODEL;

  beforeEach(() => {
    delete process.env.GROQ_MODEL;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.GROQ_MODEL = originalEnv;
    } else {
      delete process.env.GROQ_MODEL;
    }
  });

  it('uses default model openai/gpt-oss-120b when GROQ_MODEL is not set', () => {
    expect(resolveGroqModel()).toBe(DEFAULT_GROQ_MODEL);
    expect(resolveGroqModel(undefined)).toBe('openai/gpt-oss-120b');
    expect(resolveGroqModel('')).toBe('openai/gpt-oss-120b');
    expect(resolveGroqModel('   ')).toBe('openai/gpt-oss-120b');
  });

  it('allows valid configurable custom models', () => {
    expect(resolveGroqModel('openai/gpt-oss-120b')).toBe('openai/gpt-oss-120b');
    expect(resolveGroqModel('deepseek-r1-distill-llama-70b')).toBe('deepseek-r1-distill-llama-70b');
    expect(resolveGroqModel('qwen-2.5-32b')).toBe('qwen-2.5-32b');
  });

  it('ignores deprecated models (e.g. llama-3.3-70b-versatile) and falls back to default', () => {
    expect(resolveGroqModel('llama-3.3-70b-versatile')).toBe(DEFAULT_GROQ_MODEL);
    expect(resolveGroqModel('LLAMA-3.3-70B-VERSATILE')).toBe(DEFAULT_GROQ_MODEL);
    expect(resolveGroqModel('  llama-3.3-70b-versatile  ')).toBe(DEFAULT_GROQ_MODEL);
    
    for (const deprecated of DEPRECATED_GROQ_MODELS) {
      expect(resolveGroqModel(deprecated)).toBe(DEFAULT_GROQ_MODEL);
    }
  });

  it('respects process.env.GROQ_MODEL dynamically when no argument is passed', () => {
    process.env.GROQ_MODEL = 'custom-test-model';
    expect(resolveGroqModel()).toBe('custom-test-model');

    process.env.GROQ_MODEL = 'llama-3.3-70b-versatile';
    expect(resolveGroqModel()).toBe(DEFAULT_GROQ_MODEL);
  });
});
