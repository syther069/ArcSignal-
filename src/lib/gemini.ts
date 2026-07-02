import Groq from 'groq-sdk';
import type { AIAnalysis } from '@/lib/types';

type MarketContext = Record<string, unknown>;

export class GeminiAnalysisError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeminiAnalysisError';
  }
}

const retryDelays = [1000, 2000, 4000];

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseAnalysisJson(raw: string): AIAnalysis {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  const parsed = JSON.parse(cleaned) as Partial<AIAnalysis>;

  const required: (keyof AIAnalysis)[] = [
    'probability', 'confidence', 'prediction', 'summary',
    'bullCase', 'bearCase', 'keyFactors', 'riskFactors', 'sources', 'generatedAt',
  ];

  for (const field of required) {
    if (parsed[field] === undefined || parsed[field] === null) {
      throw new GeminiAnalysisError(`Response missing required field: ${field}`);
    }
  }

  if (typeof parsed.probability !== 'number' || parsed.probability < 0 || parsed.probability > 100) {
    throw new GeminiAnalysisError('Invalid probability value');
  }
  if (typeof parsed.confidence !== 'number' || parsed.confidence < 0 || parsed.confidence > 100) {
    throw new GeminiAnalysisError('Invalid confidence value');
  }
  if (parsed.prediction !== 'YES' && parsed.prediction !== 'NO') {
    throw new GeminiAnalysisError('Invalid prediction value');
  }
  if (!Array.isArray(parsed.keyFactors) || !Array.isArray(parsed.riskFactors) || !Array.isArray(parsed.sources)) {
    throw new GeminiAnalysisError('keyFactors, riskFactors, sources must be arrays');
  }

  return parsed as AIAnalysis;
}

async function generateAnalysis(prompt: string): Promise<AIAnalysis> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new GeminiAnalysisError('GROQ_API_KEY is not configured');
  }

  const groq = new Groq({ apiKey });
  let lastError: unknown;

  for (let attempt = 0; attempt < retryDelays.length; attempt++) {
    try {
      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4,
        max_tokens: 1000,
        response_format: { type: 'json_object' },
      });

      const raw = completion.choices[0]?.message?.content;
      if (!raw) throw new GeminiAnalysisError('Groq returned empty response');

      return parseAnalysisJson(raw);
    } catch (error) {
      lastError = error;
      if (attempt < retryDelays.length - 1) {
        await delay(retryDelays[attempt]);
      }
    }
  }

  throw new GeminiAnalysisError(
    `Analysis failed after ${retryDelays.length} attempts: ${lastError instanceof Error ? lastError.message : String(lastError)}`
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
