import { NextResponse } from 'next/server';
import { createWalletClient, http, createPublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arcTestnet, ARCSIGNAL_ABI, ARCSIGNAL_ADDRESS } from '@/lib/contracts';
import { fetchCryptoMarkets } from '@/lib/coingecko';
import { fetchCompletedFixtures } from '@/lib/apifootball';
import { getSql } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CONTRACT_ADDRESS = ARCSIGNAL_ADDRESS;

// Use env RPC or fallback
const RPC_URL = process.env.ARC_RPC_URL ?? process.env.NEXT_PUBLIC_ARC_TESTNET_RPC_URL ?? 'https://rpc.testnet.arc.network';

const resolvePublicClient = createPublicClient({
  chain: arcTestnet,
  transport: http(RPC_URL, {
    retryCount: 3,
    retryDelay: 600,
    fetchOptions: {
      cache: 'no-store',
    },
  }),
});

const RESOLUTION_SCAN_LIMIT = Number(process.env.RESOLUTION_SCAN_LIMIT ?? 40);
const VALID_TIMEFRAMES = new Set(['5m', '15m', '1h', '4h', '24h']);

async function recordOracleAttempt(
  marketId: string,
  status: 'SUBMITTED' | 'CONFIRMED' | 'SKIPPED' | 'FAILED',
  outcome?: number,
  transactionHash?: string,
  errorMessage?: string,
) {
  try {
    const sql = getSql();
    await sql`
      insert into oracle_attempts (market_id, outcome, status, transaction_hash, error_message)
      values (${marketId}, ${outcome ?? null}, ${status}, ${transactionHash ?? null}, ${errorMessage ?? null})
    `;
  } catch (error) {
    console.warn(`Unable to record oracle attempt for ${marketId}:`, error);
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readWithRetry<T>(label: string, read: () => Promise<T>): Promise<T> {
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      return await read();
    } catch (err) {
      if (attempt === 5) throw err;
      const message = err instanceof Error ? err.message : String(err);
      const isRateLimit = message.includes('429') || message.toLowerCase().includes('rate limit');
      await sleep(isRateLimit ? 1000 * attempt * attempt : 300 * attempt);
    }
  }

  throw new Error(`Failed to read ${label}`);
}

export async function POST(req: Request) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const timeframeParam = url.searchParams.get('timeframe')?.trim();
  const timeframe = timeframeParam && timeframeParam !== 'all' ? timeframeParam : null;

  if (timeframe && !VALID_TIMEFRAMES.has(timeframe)) {
    return NextResponse.json({
      error: `Invalid timeframe "${timeframe}". Use one of: 5m, 15m, 1h, 4h, 24h, all.`,
    }, { status: 400 });
  }

  const privateKey = process.env.RESOLVER_PRIVATE_KEY;
  if (!privateKey) return NextResponse.json({ error: 'No resolver private key configured' }, { status: 500 });

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const walletClient = createWalletClient({
    account,
    chain: arcTestnet,
    transport: http(RPC_URL),
  });

  const now = Math.floor(Date.now() / 1000);
  const resolved: string[] = [];
  const errors: string[] = [];
  const skipped: string[] = [];

  // ── 1. Fetch recent market IDs without the large getAllMarketIds payload ──
  let marketCount = 0;
  let targetIds: string[] = [];
  try {
    const count = await readWithRetry('getMarketCount', () => resolvePublicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: ARCSIGNAL_ABI,
      functionName: 'getMarketCount',
    }) as Promise<bigint>);
    marketCount = Number(count);

    const scanCount = Math.min(marketCount, RESOLUTION_SCAN_LIMIT);
    for (let i = 0; i < scanCount; i++) {
      const index = BigInt(marketCount - 1 - i);
      try {
        const marketId = await readWithRetry(`getMarketIdByIndex ${index}`, () => resolvePublicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: ARCSIGNAL_ABI,
          functionName: 'getMarketIdByIndex',
          args: [index],
        }) as Promise<string>);
        if (timeframe && !marketId.includes(`-${timeframe}-`)) {
          skipped.push(`${marketId}: skipped by timeframe filter (${timeframe})`);
          await sleep(100);
          continue;
        }
        targetIds.push(marketId);
        await sleep(250);
      } catch (err) {
        errors.push(`index ${index}: failed to read market id - ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  } catch (err) {
    return NextResponse.json({
      error: `Failed to read market count: ${err instanceof Error ? err.message : String(err)}`,
      contractUsed: CONTRACT_ADDRESS,
    }, { status: 500 });
  }

  if (targetIds.length === 0) {
    return NextResponse.json({
      resolved: [],
      skipped,
      errors: [],
      message: timeframe ? `No ${timeframe} markets found in recent scan` : 'No markets found',
      contractUsed: CONTRACT_ADDRESS,
      timeframe: timeframe ?? 'all',
    });
  }

  // ── 2. Pre-fetch live crypto prices once ─────────────────────────────────
  let coins: Awaited<ReturnType<typeof fetchCryptoMarkets>> = [];
  try {
    coins = await fetchCryptoMarkets();
  } catch (err) {
    errors.push(`CoinGecko fetch failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  // ── 3. Pre-fetch completed football fixtures ──────────────────────────────
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  let completedFixtures: Awaited<ReturnType<typeof fetchCompletedFixtures>> = [];
  try {
    completedFixtures = await fetchCompletedFixtures(1, 2026, yesterday, today);
  } catch (err) {
    errors.push(`Football fixtures fetch failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  // ── 4. Loop through all markets. ─────────────────────────────────────────
  for (const marketId of targetIds) {
    let market: {
      marketId: string;
      category: string;
      question: string;
      analysisJson: string;
      resolutionTime: bigint;
      followPool: bigint;
      fadePool: bigint;
      resolved: boolean;
      outcome: number;
    };

    try {
      const raw = await readWithRetry(`getMarket ${marketId}`, () => resolvePublicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: ARCSIGNAL_ABI,
        functionName: 'getMarket',
        args: [marketId],
      }));
      market = raw as typeof market;
      await sleep(250);
    } catch (err) {
      errors.push(`${marketId}: failed to read market — ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }

    if (market.resolved) {
      skipped.push(`${marketId}: already resolved`);
      await recordOracleAttempt(marketId, 'SKIPPED');
      continue;
    }

    const isExpired = Number(market.resolutionTime) <= now;

    // ── 5. Determine outcome safely (never resolve if oracle data is missing) ─
    try {
      let outcome: 1 | 2 = 1;
      let outcomeReason = '';
      let shouldResolveNow = false;

      const categoryNorm = market.category.toUpperCase();

      if (categoryNorm === 'CRYPTO') {
        const priceMatch = market.question.match(/\$?([\d,]+(?:\.\d+)?)/);
        if (priceMatch) {
          const targetPrice = parseFloat(priceMatch[1].replace(/,/g, ''));
          const symbolRaw = marketId.split('-')[0].toLowerCase();
          const coin = coins.find(
            (c) => c.symbol.toLowerCase() === symbolRaw || c.id.toLowerCase() === symbolRaw
          );

          if (coin) {
            const is5m = marketId.includes('-5m-');

            if (is5m) {
              // 5m timeframe: "hold above" target.
              if (coin.current_price < targetPrice) {
                shouldResolveNow = true;
                outcome = 2; // Fade wins if it drops below support
                outcomeReason = `Dropped below support $${targetPrice} to $${coin.current_price}`;
              } else if (isExpired) {
                shouldResolveNow = true;
                outcome = 1; // Follow wins if it held above until expiry
                outcomeReason = `Held above $${targetPrice} until expiry (current $${coin.current_price})`;
              }
            } else {
              // 15m, 1h, 4h, 24h timeframe: "reach" or "break above" target.
              if (coin.current_price >= targetPrice) {
                shouldResolveNow = true;
                outcome = 1; // Follow wins if it hits target early
                outcomeReason = `Hit target $${targetPrice} early (current $${coin.current_price})`;
              } else if (isExpired) {
                shouldResolveNow = true;
                outcome = 2; // Fade wins if it never reached target by expiry
                outcomeReason = `Failed to reach $${targetPrice} by expiry (current $${coin.current_price})`;
              }
            }
          } else {
            skipped.push(`${marketId}: reason=coin_not_found (symbol="${symbolRaw}")`);
          }
        } else {
          skipped.push(`${marketId}: reason=target_unparseable (question="${market.question}")`);
        }

      } else if (categoryNorm === 'FOOTBALL') {
        if (isExpired) {
          const parts = marketId.split('-');
          const fixtureId = parseInt(parts[1]);
          if (!isNaN(fixtureId)) {
            const fixture = completedFixtures.find((f) => f.fixtureId === fixtureId);
            if (fixture && fixture.homeScore !== null && fixture.awayScore !== null) {
              shouldResolveNow = true;
              outcome = fixture.homeScore > fixture.awayScore ? 1 : 2;
              outcomeReason = `fixture ${fixtureId}: ${fixture.homeScore}-${fixture.awayScore} → ${outcome === 1 ? 'Home wins (Follow)' : 'Away/Draw (Fade)'}`;
            } else {
              skipped.push(`${marketId}: reason=fixture_not_completed (fixtureId=${fixtureId})`);
            }
          } else {
            skipped.push(`${marketId}: reason=invalid_fixture_id`);
          }
        }
      }

      if (!shouldResolveNow) {
        skipped.push(`${marketId}: not yet due or oracle data missing`);
        await recordOracleAttempt(marketId, 'SKIPPED');
        continue;
      }

      // Re-read immediately before submitting. This makes repeated or
      // overlapping cron runs safe: only an unresolved market may be sent.
      const latestMarket = await readWithRetry(`getMarket ${marketId} before resolve`, () => resolvePublicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: ARCSIGNAL_ABI,
        functionName: 'getMarket',
        args: [marketId],
      })) as typeof market;

      if (latestMarket.resolved) {
        skipped.push(`${marketId}: already resolved before submission`);
        continue;
      }

      // ── 6. Call resolveMarket on-chain ────────────────────────────────────
      const hash = await walletClient.writeContract({
        account,
        chain: arcTestnet,
        address: CONTRACT_ADDRESS,
        abi: ARCSIGNAL_ABI,
        functionName: 'resolveMarket',
        args: [marketId, outcome],
      });

      await recordOracleAttempt(marketId, 'SUBMITTED', outcome, hash);

      await resolvePublicClient.waitForTransactionReceipt({ hash });
      await recordOracleAttempt(marketId, 'CONFIRMED', outcome, hash);
      resolved.push(`${marketId}: outcome=${outcome} (${outcomeReason}) tx=${hash}`);
      await new Promise(r => setTimeout(r, 500));

    } catch (err) {
      // Another cron invocation may have resolved the market between the
      // preflight read and the transaction submission. Treat that race as an
      // idempotent skip instead of reporting a failed resolution.
      try {
        const currentMarket = await readWithRetry(`getMarket ${marketId} after resolve error`, () => resolvePublicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: ARCSIGNAL_ABI,
          functionName: 'getMarket',
          args: [marketId],
        })) as typeof market;

        if (currentMarket.resolved) {
          skipped.push(`${marketId}: already resolved by another run`);
          await recordOracleAttempt(marketId, 'SKIPPED');
        } else {
          const message = err instanceof Error ? err.message : String(err);
          errors.push(`${marketId}: ${message}`);
          await recordOracleAttempt(marketId, 'FAILED', undefined, undefined, message);
        }
      } catch (verificationError) {
        const message = `${err instanceof Error ? err.message : String(err)}; verification failed: ${verificationError instanceof Error ? verificationError.message : String(verificationError)}`;
        errors.push(`${marketId}: ${message}`);
        await recordOracleAttempt(marketId, 'FAILED', undefined, undefined, message);
      }
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  return NextResponse.json({
    contractUsed: CONTRACT_ADDRESS,
    timeframe: timeframe ?? 'all',
    marketCount,
    scanned: targetIds.length,
    resolved,
    skipped,
    errors,
  });
}
