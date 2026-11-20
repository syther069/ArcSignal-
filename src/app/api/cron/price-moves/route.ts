import { NextResponse } from 'next/server';
import { createPublicClient, http, type Address } from 'viem';
import { authorizeCronRequest } from '@/lib/cron-auth';
import { arcTestnet } from '@/lib/contracts';
import { resolveArcRpcUrl } from '@/lib/arc-network';
import { PREDICTION_MARKET_AMM_V2_ABI } from '@/lib/contracts-v2';
import { v2YesProbability } from '@/lib/market-insight';
import { xaiConfigured } from '@/lib/xai';
import { detectMove } from '@/lib/price-moves-shared';
import { explainMove, getOpenV2Markets, getRecentPoints, hasRecentNote, prunePricePoints, recordPricePoint, storeMoveNote } from '@/lib/price-moves';
import { freezeBaselines } from '@/lib/signal-intelligence/baselines';
import { getLatestPulse } from '@/lib/x-pulse';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;

const MAX_NOTES_PER_RUN = 3;
const BASELINE_WINDOW_SECONDS = 20 * 60;

/**
 * Every run: record each open V2 market's price, explain big moves with Grok, and freeze the
 * X-crowd / market-price baselines for markets about to close.
 */
async function run(request: Request) {
  const authorization = authorizeCronRequest(request);
  if (!authorization.ok) return authorization.response;
  if (process.env.ENABLE_PRICE_MOVES !== 'true') {
    return NextResponse.json({ skipped: true, reason: 'ENABLE_PRICE_MOVES is not true' });
  }
  try {
    const publicClient = createPublicClient({ chain: arcTestnet, transport: http(resolveArcRpcUrl(), { retryCount: 2, retryDelay: 250, timeout: 8_000 }) });
    const markets = await getOpenV2Markets(arcTestnet.id);
    const now = Date.now();
    let notes = 0;
    const results: { marketId: string; pYes: number | null; note?: string; baselines?: string[]; error?: string }[] = [];
    for (const market of markets) {
      try {
        const [yes, no] = await publicClient.readContract({ address: market.ammAddress as Address, abi: PREDICTION_MARKET_AMM_V2_ABI, functionName: 'reserves' });
        const pYes = v2YesProbability(yes, no);
        const row: (typeof results)[number] = { marketId: market.marketId, pYes };
        if (pYes !== null) {
          await recordPricePoint(market.marketId, pYes);
          const move = detectMove(await getRecentPoints(market.marketId), now);
          if (move && notes < MAX_NOTES_PER_RUN && xaiConfigured() && !(await hasRecentNote(market.marketId))) {
            notes++;
            const note = await explainMove(market.marketId, market.question, move.fromP, move.toP, move.windowMinutes);
            await storeMoveNote(note);
            row.note = note.note;
          }
        }
        if (market.closesAt - now / 1000 <= BASELINE_WINDOW_SECONDS) {
          const pulse = await getLatestPulse(market.marketId).catch(() => null);
          row.baselines = await freezeBaselines(market, pYes, pulse);
        }
        results.push(row);
      } catch (error) {
        results.push({ marketId: market.marketId, pYes: null, error: error instanceof Error ? error.message.slice(0, 160) : 'error' });
      }
    }
    await prunePricePoints().catch(() => undefined);
    return NextResponse.json({ markets: markets.length, notes, results });
  } catch (error) {
    console.error('Price-move job failed:', error);
    return NextResponse.json({ error: 'Price-move job failed', message: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function GET(request: Request) { return run(request); }
export async function POST(request: Request) { return run(request); }
