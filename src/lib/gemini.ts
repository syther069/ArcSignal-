import Groq from 'groq-sdk';
import type { AIAnalysis } from '@/lib/types';

type MarketContext = Record<string, unknown>;

export class AIAnalysisError extends Error {
  constructor(message: string, public provider?: 'gemini' | 'groq') {
    super(provider ? `[AI Provider: ${provider}] ${message}` : message);
    this.name = 'AIAnalysisError';
  }
}

const retryDelays = [1000, 2000, 4000];

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseAnalysisJson(raw: string, provider?: 'gemini' | 'groq'): AIAnalysis {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  let parsed: Partial<AIAnalysis>;
  try {
    parsed = JSON.parse(cleaned) as Partial<AIAnalysis>;
  } catch (err) {
    throw new AIAnalysisError(`Invalid JSON formatting: ${err instanceof Error ? err.message : String(err)}`, provider);
  }

  const required: (keyof AIAnalysis)[] = [
    'probability', 'confidence', 'prediction', 'summary',
    'bullCase', 'bearCase', 'keyFactors', 'riskFactors', 'sources', 'generatedAt',
  ];

  for (const field of required) {
    if (parsed[field] === undefined || parsed[field] === null) {
      throw new AIAnalysisError(`Response missing required field: ${field}`, provider);
    }
  }

  if (typeof parsed.probability !== 'number' || parsed.probability < 0 || parsed.probability > 100) {
    throw new AIAnalysisError('Invalid probability value', provider);
  }
  if (typeof parsed.confidence !== 'number' || parsed.confidence < 0 || parsed.confidence > 100) {
    throw new AIAnalysisError('Invalid confidence value', provider);
  }
  if (parsed.prediction !== 'YES' && parsed.prediction !== 'NO') {
    throw new AIAnalysisError('Invalid prediction value', provider);
  }
  if (!Array.isArray(parsed.keyFactors) || !Array.isArray(parsed.riskFactors) || !Array.isArray(parsed.sources)) {
    throw new AIAnalysisError('keyFactors, riskFactors, sources must be arrays', provider);
  }

  return parsed as AIAnalysis;
}

async function callGemini(apiKey: string, prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
      },
    }),
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new AIAnalysisError(`Gemini API error ${response.status}: ${errText}`, 'gemini');
  }
  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new AIAnalysisError('Gemini API returned empty text', 'gemini');
  return text;
}

async function generateAnalysis(prompt: string): Promise<AIAnalysis> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;

  if (!geminiKey && !groqKey) {
    throw new AIAnalysisError('Neither GEMINI_API_KEY nor GROQ_API_KEY is configured in environment');
  }

  let lastError: unknown;

  // Try Gemini first if key is present and looks valid (AIzaSy...)
  if (geminiKey && geminiKey.startsWith('AIzaSy')) {
    for (let attempt = 0; attempt < retryDelays.length; attempt++) {
      try {
        const raw = await callGemini(geminiKey, prompt);
        return parseAnalysisJson(raw, 'gemini');
      } catch (error) {
        lastError = error;
        if (attempt < retryDelays.length - 1) {
          await delay(retryDelays[attempt]);
        }
      }
    }
    console.warn(`[AI Provider] Gemini failed: ${lastError instanceof Error ? lastError.message : String(lastError)}. Falling back to Groq...`);
  }

  // Fallback / primary Groq provider
  if (groqKey) {
    for (let attempt = 0; attempt < retryDelays.length; attempt++) {
      try {
        const groq = new Groq({ apiKey: groqKey });
        const completion = await groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.4,
          max_tokens: 1000,
          response_format: { type: 'json_object' },
        });

        const raw = completion.choices[0]?.message?.content;
        if (!raw) throw new AIAnalysisError('Groq returned empty response', 'groq');
        return parseAnalysisJson(raw, 'groq');
      } catch (error) {
        lastError = error;
        if (attempt < retryDelays.length - 1) {
          await delay(retryDelays[attempt]);
        }
      }
    }
  }

  throw new AIAnalysisError(
    `Analysis failed after all provider attempts: ${lastError instanceof Error ? lastError.message : String(lastError)}`
  );
}

function buildCryptoPrompt(
  question: string,
  resolutionCriteria: string,
  resolutionTime: string,
  cryptoData: MarketContext,
): string {
  return `You are an institutional-grade financial analyst and prediction market specialist.

Given the following real-time cryptocurrency data:
${JSON.stringify(cryptoData, null, 2)}

Generate a prediction market analysis for:
"${question}"

Resolution criteria: ${resolutionCriteria}
Resolution time: ${resolutionTime}

Return ONLY a valid JSON object with this exact structure:
{
  "probability": <integer 0-100 based on your analysis>,
  "confidence": <integer 0-100>,
  "prediction": <"YES" or "NO">,
  "summary": "<2-3 sentence analysis>",
  "bullCase": "<strongest argument for YES>",
  "bearCase": "<strongest argument for NO>",
  "keyFactors": ["<factor 1>", "<factor 2>", "<factor 3>"],
  "riskFactors": ["<risk 1>", "<risk 2>"],
  "sources": ["CoinGecko real-time data"],
  "generatedAt": "${new Date().toISOString()}"
}`;
}

function buildFootballPrompt(
  question: string,
  resolutionCriteria: string,
  matchTime: string,
  fixtureData: MarketContext,
): string {
  return `You are a professional football analyst and prediction market specialist.

Given the following match data:
${JSON.stringify(fixtureData, null, 2)}

Generate a prediction market analysis for:
"${question}"

Resolution criteria: ${resolutionCriteria}
Match time: ${matchTime}

Return ONLY a valid JSON object with this exact structure:
{
  "probability": <integer 0-100>,
  "confidence": <integer 0-100>,
  "prediction": <"YES" or "NO">,
  "summary": "<2-3 sentence analysis>",
  "bullCase": "<strongest case for YES>",
  "bearCase": "<strongest case for NO>",
  "keyFactors": ["<factor 1>", "<factor 2>", "<factor 3>"],
  "riskFactors": ["<risk 1>", "<risk 2>"],
  "sources": ["API-Football fixture data"],
  "generatedAt": "${new Date().toISOString()}"
}`;
}

export async function generateCryptoAnalysis(input: {
  question: string;
  resolutionCriteria: string;
  resolutionTime: string;
  cryptoData: MarketContext;
}): Promise<AIAnalysis> {
  return generateAnalysis(
    buildCryptoPrompt(input.question, input.resolutionCriteria, input.resolutionTime, input.cryptoData)
  );
}

export async function generateFootballAnalysis(input: {
  question: string;
  resolutionCriteria: string;
  matchTime: string;
  fixtureData: MarketContext;
}): Promise<AIAnalysis> {
  return generateAnalysis(
    buildFootballPrompt(input.question, input.resolutionCriteria, input.matchTime, input.fixtureData)
  );
}

export { parseAnalysisJson as parseGeminiJson };
