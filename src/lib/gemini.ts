import { GoogleGenerativeAI } from '@google/generative-ai';
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

function parseGeminiJson(raw: string): AIAnalysis {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  const parsed = JSON.parse(cleaned) as Partial<AIAnalysis>;

  const required: (keyof AIAnalysis)[] = [
    'probability',
    'confidence',
    'prediction',
    'summary',
    'bullCase',
    'bearCase',
    'keyFactors',
    'riskFactors',
    'sources',
    'generatedAt',
  ];

  for (const field of required) {
    if (parsed[field] === undefined || parsed[field] === null) {
      throw new GeminiAnalysisError(`Gemini response missing required field: ${field}`);
    }
  }

  if (
    typeof parsed.probability !== 'number' ||
    parsed.probability < 0 ||
    parsed.probability > 100
  ) {
    throw new GeminiAnalysisError('Invalid probability value');
  }

  if (
    typeof parsed.confidence !== 'number' ||
    parsed.confidence < 0 ||
    parsed.confidence > 100
  ) {
    throw new GeminiAnalysisError('Invalid confidence value');
  }

  if (parsed.prediction !== 'YES' && parsed.prediction !== 'NO') {
    throw new GeminiAnalysisError('Invalid prediction value');
  }

  if (
    typeof parsed.summary !== 'string' ||
    typeof parsed.bullCase !== 'string' ||
    typeof parsed.bearCase !== 'string' ||
    typeof parsed.generatedAt !== 'string'
  ) {
    throw new GeminiAnalysisError('Gemini response has invalid text fields');
  }

  if (
    !Array.isArray(parsed.keyFactors) ||
    !Array.isArray(parsed.riskFactors) ||
    !Array.isArray(parsed.sources)
  ) {
    throw new GeminiAnalysisError('keyFactors, riskFactors, sources must be arrays');
  }

  return parsed as AIAnalysis;
}

function buildCryptoPrompt(
  question: string,
  resolutionCriteria: string,
  resolutionTime: string,
  cryptoData: MarketContext,
) {
  return `You are an institutional-grade financial analyst and prediction market specialist.

Given the following real-time cryptocurrency data:
${JSON.stringify(cryptoData, null, 2)}

Generate a prediction market analysis for the following question:
"${question}"

Resolution criteria: ${resolutionCriteria}
Resolution time: ${resolutionTime}

Return ONLY a valid JSON object with this exact structure, no markdown, no preamble:
{
  "probability": <integer 0-100 based on your analysis>,
  "confidence": <integer 0-100 representing your confidence in this estimate>,
  "prediction": <"YES" or "NO">,
  "summary": <2-3 sentence analysis summary>,
  "bullCase": <strongest argument for YES outcome>,
  "bearCase": <strongest argument for NO outcome>,
  "keyFactors": [<3-5 specific data-driven factors influencing this prediction>],
  "riskFactors": [<2-4 specific risks that could invalidate this prediction>],
  "sources": ["CoinGecko real-time data", <any other data sources used in reasoning>],
  "generatedAt": "${new Date().toISOString()}"
}

Base your probability and confidence on the actual data provided. Do not guess. If data is insufficient, set confidence below 40 and explain in summary.`;
}

function buildFootballPrompt(
  question: string,
  resolutionCriteria: string,
  matchTime: string,
  fixtureData: MarketContext,
) {
  return `You are a professional football analyst and prediction market specialist with expertise in tournament statistics.

Given the following match data:
${JSON.stringify(fixtureData, null, 2)}

Generate a prediction market analysis for:
"${question}"

Resolution criteria: ${resolutionCriteria}
Match time: ${matchTime}

Return ONLY a valid JSON object, no markdown:
{
  "probability": <integer 0-100>,
  "confidence": <integer 0-100>,
  "prediction": <"YES" or "NO">,
  "summary": <2-3 sentence analysis>,
  "bullCase": <strongest case for YES>,
  "bearCase": <strongest case for NO>,
  "keyFactors": [<3-5 factors>],
  "riskFactors": [<2-4 risks>],
  "sources": ["API-Football fixture data", <other sources>],
  "generatedAt": "${new Date().toISOString()}"
}`;
}

async function generateAnalysis(prompt: string): Promise<AIAnalysis> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiAnalysisError('GEMINI_API_KEY is not configured');
  }

  const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
    model: 'gemini-2.5-flash',
  });

  let lastError: unknown;

  for (let attempt = 0; attempt < retryDelays.length; attempt += 1) {
    try {
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.4,
        },
      });

      const raw = result.response.text();
      if (!raw) {
        throw new GeminiAnalysisError('Gemini returned an empty response');
      }

      return parseGeminiJson(raw);
    } catch (error) {
      lastError = error;
      if (attempt < retryDelays.length - 1) {
        await delay(retryDelays[attempt]);
      }
    }
  }

  throw new GeminiAnalysisError(
    `Gemini analysis failed after ${retryDelays.length} attempts: ${
      lastError instanceof Error ? lastError.message : 'Unknown error'
    }`,
  );
}

export async function generateCryptoAnalysis(input: {
  question: string;
  resolutionCriteria: string;
  resolutionTime: string;
  cryptoData: MarketContext;
}) {
  return generateAnalysis(
    buildCryptoPrompt(
      input.question,
      input.resolutionCriteria,
      input.resolutionTime,
      input.cryptoData,
    ),
  );
}

export async function generateFootballAnalysis(input: {
  question: string;
  resolutionCriteria: string;
  matchTime: string;
  fixtureData: MarketContext;
}) {
  return generateAnalysis(
    buildFootballPrompt(
      input.question,
      input.resolutionCriteria,
      input.matchTime,
      input.fixtureData,
    ),
  );
}

export { parseGeminiJson };
