/**
 * xAI (Grok) client. Server-only.
 *
 * Two entry points:
 * - `xaiChat` for plain JSON forecasts (chat completions), used by the scored Grok agent fallback.
 * - `grokSearch` for answers grounded in live X and web posts (Responses API with the
 *   server-side `x_search` / `web_search` tools). Every claim comes back with citations.
 *
 * Post text from X is untrusted. Callers must tell the model to treat it as data and must never
 * let it affect settlement.
 */

export const DEFAULT_XAI_MODEL = 'grok-4.7';
const BASE_URL = 'https://api.x.ai/v1';
const RETRY_DELAYS = [1000, 2000, 4000];

export class XaiError extends Error {
  constructor(message: string, public status?: number) {
    super(`[xAI] ${message}`);
    this.name = 'XaiError';
  }
}

export function xaiModel(): string {
  return process.env.XAI_MODEL?.trim() || DEFAULT_XAI_MODEL;
}

export function xaiConfigured(): boolean {
  return Boolean(process.env.XAI_API_KEY);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** POST with retries on network errors, 429 and 5xx. 4xx (bad request, auth) fail at once. */
export async function xaiPost(path: string, body: unknown, retries = RETRY_DELAYS.length): Promise<any> {
  const key = process.env.XAI_API_KEY;
  if (!key) throw new XaiError('XAI_API_KEY is not configured');
  let lastError: unknown;
  for (let attempt = 0; attempt < Math.max(1, retries); attempt++) {
    try {
      const response = await fetch(`${BASE_URL}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify(body),
      });
      if (response.ok) return await response.json();
      const text = (await response.text()).slice(0, 300);
      const error = new XaiError(`API error ${response.status}: ${text}`, response.status);
      if (response.status < 500 && response.status !== 429) throw error;
      lastError = error;
    } catch (error) {
      if (error instanceof XaiError && error.status && error.status < 500 && error.status !== 429) throw error;
      lastError = error;
    }
    if (attempt < retries - 1) await sleep(RETRY_DELAYS[attempt] ?? 4000);
  }
  throw lastError instanceof Error ? lastError : new XaiError(String(lastError));
}

export type GrokCitation = { url: string; title: string | null; kind: 'x' | 'web' };

export type GrokSearchResult = {
  text: string;
  citations: GrokCitation[];
  model: string;
  responseId: string | null;
  usage: unknown;
};

export function citationKind(url: string): 'x' | 'web' {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return host === 'x.com' || host === 'twitter.com' ? 'x' : 'web';
  } catch {
    return 'web';
  }
}

/** Reads the Responses API output: message text plus url_citation annotations (deduped). */
export function parseResponsesOutput(json: any): { text: string; citations: GrokCitation[] } {
  const texts: string[] = [];
  const seen = new Map<string, GrokCitation>();
  const add = (url: unknown, title: unknown) => {
    if (typeof url !== 'string' || !/^https?:\/\//.test(url) || seen.has(url)) return;
    // Titles are sometimes just "1" (a marker) or the URL itself; neither is a real title.
    const real = typeof title === 'string' && title.length > 2 && title !== url;
    seen.set(url, { url, title: real ? title : null, kind: citationKind(url) });
  };
  for (const item of Array.isArray(json?.output) ? json.output : []) {
    if (item?.type !== 'message') continue;
    for (const part of Array.isArray(item.content) ? item.content : []) {
      if (part?.type !== 'output_text' || typeof part.text !== 'string') continue;
      texts.push(part.text);
      for (const a of Array.isArray(part.annotations) ? part.annotations : []) {
        if (a?.type === 'url_citation') add(a.url, a.title);
      }
    }
  }
  // Some responses also carry a flat list of every source consulted.
  for (const url of Array.isArray(json?.citations) ? json.citations : []) add(url, null);
  return { text: texts.join('\n').trim(), citations: [...seen.values()] };
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Ask Grok with live X and/or web search. `lookbackDays` bounds X search to recent posts.
 * `maxTurns` caps how many search rounds the model may run, which caps cost.
 */
export async function grokSearch(input: {
  prompt: string;
  sources?: ('x' | 'web')[];
  lookbackDays?: number;
  maxTurns?: number;
  now?: Date;
}): Promise<GrokSearchResult> {
  const sources = input.sources ?? ['x', 'web'];
  const now = input.now ?? new Date();
  const from = new Date(now.getTime() - (input.lookbackDays ?? 3) * 86_400_000);
  const tomorrow = new Date(now.getTime() + 86_400_000);
  const tools: Record<string, unknown>[] = [];
  if (sources.includes('x')) tools.push({ type: 'x_search', from_date: isoDay(from), to_date: isoDay(tomorrow) });
  if (sources.includes('web')) tools.push({ type: 'web_search' });
  const json = await xaiPost('/responses', {
    model: xaiModel(),
    input: [{ role: 'user', content: input.prompt }],
    tools,
    max_turns: input.maxTurns ?? 3,
  });
  const { text, citations } = parseResponsesOutput(json);
  if (!text) throw new XaiError('Grok returned no answer text');
  return { text, citations, model: String(json?.model ?? xaiModel()), responseId: json?.id ? String(json.id) : null, usage: json?.usage ?? null };
}

/** Pulls the first JSON object out of a model reply (handles ```json fences and citation markers). */
export function extractJson<T = unknown>(text: string): T {
  const cleaned = text.replace(/```(?:json)?/gi, '');
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end <= start) throw new XaiError('No JSON object in Grok reply');
  // Inline citation links like [[1]](https://…) can land inside strings; strip them before parsing.
  const body = cleaned.slice(start, end + 1).replace(/\[\[\d+\]\]\([^)]*\)/g, '');
  try {
    return JSON.parse(body) as T;
  } catch (error) {
    throw new XaiError(`Invalid JSON from Grok: ${error instanceof Error ? error.message : String(error)}`);
  }
}
