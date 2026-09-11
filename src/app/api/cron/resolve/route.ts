import { NextResponse } from 'next/server';
import { createWalletClient, decodeEventLog, http, createPublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arcTestnet, ARCSIGNAL_ABI, ARCSIGNAL_ADDRESS } from '@/lib/contracts';
import { fetchFreshCryptoPrices } from '@/lib/coingecko';
import { fetchFixtureById } from '@/lib/apifootball';
import { authorizeCronRequest } from '@/lib/cron-auth';
import { isMarketAutomationEnabled } from '@/lib/automation-policy';
import { getSql } from '@/lib/db';
import {
  decideCryptoResolution,
  parseFootballOracleSpec,
  parseCryptoOracleSpec,
  parseMarketPrediction,
  parseMarketTimeframe,
  resolvedOutcomeForPrediction,
} from '@/lib/oracle-policy';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CONTRACT_ADDRESS = ARCSIGNAL_ADDRESS;

// Use env RPC or fallback
const RPC_URL = process.env.ARC_RPC_URL
  ?? process.env.ARC_TESTNET_RPC_URL
  ?? process.env.NEXT_PUBLIC_ARC_TESTNET_RPC_URL
  ?? 'https://rpc.testnet.arc.io';

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

type OracleEvidence = {
  provider: string;
  observedValue: string;
  observedAt: number;
  decisionReason: string;
  questionResult: 'YES' | 'NO';
  prediction: 'YES' | 'NO';
};

async function recordOracleAttempt(
  marketId: string,
  status: 'SUBMITTED' | 'CONFIRMED' | 'SKIPPED' | 'FAILED',
  outcome?: number,
  transactionHash?: string,
  errorMessage?: string,
  evidence?: OracleEvidence,
) {
  try {
    const sql = getSql();
    const indexed = await sql`
      select 1 from markets_index
      where market_id = ${marketId} and coalesce(protocol_version, 1) = 1
      limit 1
    `;
    if (indexed.length === 0) return;
    await sql`
      insert into oracle_attempts (
        market_id, outcome, status, transaction_hash, error_message,
        provider, observed_value, observed_at, decision_reason, question_result, prediction
      ) values (
        ${marketId}, ${outcome ?? null}, ${status}, ${transactionHash ?? null}, ${errorMessage ?? null},
        ${evidence?.provider ?? null}, ${evidence?.observedValue ?? null},
        ${evidence ? new Date(evidence.observedAt * 1000).toISOString() : null},
        ${evidence?.decisionReason ?? null}, ${evidence?.questionResult ?? null}, ${evidence?.prediction ?? null}
      )
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
  const authorization = authorizeCronRequest(req);
  if (!authorization.ok) return authorization.response;

  if (!isMarketAutomationEnabled(process.env.ENABLE_MARKET_AUTOMATION)) {
    return NextResponse.json({ error: 'Market automation is disabled' }, { status: 503 });
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
  if (!privateKey || !/^0x[a-fA-F0-9]{64}$/.test(privateKey)) {
    return NextResponse.json({ error: 'Resolver wallet is not configured' }, { status: 503 });
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const contractOwner = await resolvePublicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: ARCSIGNAL_ABI,
    functionName: 'owner',
  });
  if (String(contractOwner).toLowerCase() !== account.address.toLowerCase()) {
    return NextResponse.json({ error: 'Resolver wallet is not the ArcSignal owner' }, { status: 503 });
  }
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
  const targetIds = new Set<string>();
  try {
    const sql = getSql();
    const queued = await sql`
      select market_id
      from markets_index
      where coalesce(protocol_version, 1) = 1 and resolved = false and resolution_time <= ${now}
      order by resolution_time asc
      limit ${RESOLUTION_SCAN_LIMIT}
    `;
    for (const row of queued) {
      const marketId = String(row.market_id);
      if (!timeframe || parseMarketTimeframe(marketId) === timeframe) targetIds.add(marketId);
    }
  } catch (error) {
    console.warn('Durable resolution queue unavailable; falling back to recent chain scan:', error);
  }
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
        if (timeframe && parseMarketTimeframe(marketId) !== timeframe) {
          skipped.push(`${marketId}: skipped by timeframe filter (${timeframe})`);
          await sleep(100);
          continue;
        }
        targetIds.add(marketId);
        await sleep(250);
      } catch (err) {
        errors.push(`index ${index}: failed to read market id - ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  } catch (err) {
    errors.push(`Failed to read market count: ${err instanceof Error ? err.message : String(err)}`);
    if (targetIds.size === 0) {
      return NextResponse.json({ error: errors[errors.length - 1], contractUsed: CONTRACT_ADDRESS }, { status: 500 });
    }
  }

  if (targetIds.size === 0) {
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
  let coins: Awaited<ReturnType<typeof fetchFreshCryptoPrices>> = [];
  try {
    coins = await fetchFreshCryptoPrices();
  } catch (err) {
    errors.push(`CoinGecko fetch failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  // ── 4. Loop through all markets. ─────────────────────────────────────────
  for (const marketId of targetIds) {
    let expectedOutcome: 1 | 2 | undefined;
    let evidence: OracleEvidence | undefined;
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
        let policy;
        try {
          policy = parseCryptoOracleSpec(market.analysisJson, Number(market.resolutionTime));
        } catch (policyError) {
          skipped.push(`${marketId}: reason=manual_review (${policyError instanceof Error ? policyError.message : String(policyError)})`);
          await recordOracleAttempt(marketId, 'SKIPPED');
          continue;
        }

        const coin = coins.find((candidate) => candidate.symbol.toUpperCase() === policy.symbol);
        if (!coin) {
          skipped.push(`${marketId}: reason=coin_not_found (symbol="${policy.symbol}")`);
          await recordOracleAttempt(marketId, 'SKIPPED');
          continue;
        }

        const prediction = parseMarketPrediction(market.analysisJson);
        const decision = decideCryptoResolution(policy, {
          provider: coin.price_source,
          symbol: coin.symbol,
          price: coin.current_price,
          observedAt: coin.price_observed_at,
        }, now);
        if (decision.action !== 'resolve') {
          skipped.push(`${marketId}: reason=${decision.action} (${decision.reason})`);
          await recordOracleAttempt(marketId, 'SKIPPED');
          continue;
        }
        shouldResolveNow = true;
        outcome = resolvedOutcomeForPrediction(prediction, decision.questionResult);
        outcomeReason = decision.reason;
        evidence = {
          provider: coin.price_source,
          observedValue: coin.current_price.toString(),
          observedAt: coin.price_observed_at,
          decisionReason: decision.reason,
          questionResult: decision.questionResult,
          prediction,
        };

      } else if (categoryNorm === 'FOOTBALL') {
        if (isExpired) {
          const policy = parseFootballOracleSpec(market.analysisJson, Number(market.resolutionTime));
          const prediction = parseMarketPrediction(market.analysisJson);
          const fixture = await fetchFixtureById(policy.fixtureId);
          if (fixture?.status === 'FT' && fixture.homeScore !== null && fixture.awayScore !== null) {
            const questionResult = fixture.homeScore > fixture.awayScore ? 'YES' : 'NO';
            shouldResolveNow = true;
            outcome = resolvedOutcomeForPrediction(prediction, questionResult);
            outcomeReason = `fixture ${policy.fixtureId}: ${fixture.homeScore}-${fixture.awayScore}; question=${questionResult}; prediction=${prediction}`;
            evidence = {
              provider: policy.provider,
              observedValue: `${fixture.homeScore}-${fixture.awayScore}`,
              observedAt: now,
              decisionReason: outcomeReason,
              questionResult,
              prediction,
            };
          } else {
            skipped.push(`${marketId}: reason=fixture_not_final (fixtureId=${policy.fixtureId})`);
          }
        }
      }

      if (!shouldResolveNow) {
        skipped.push(`${marketId}: not yet due or oracle data missing`);
        await recordOracleAttempt(marketId, 'SKIPPED');
        continue;
      }
      expectedOutcome = outcome;

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

      await recordOracleAttempt(marketId, 'SUBMITTED', outcome, hash, undefined, evidence);

      const receipt = await resolvePublicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== 'success') {
        throw new Error(`resolveMarket transaction reverted: ${hash}`);
      }
      const resolvedEvent = receipt.logs.some((log) => {
        try {
          const decoded = decodeEventLog({ abi: ARCSIGNAL_ABI, data: log.data, topics: log.topics });
          const args = decoded.args as { marketId?: string; outcome?: number };
          return decoded.eventName === 'MarketResolved'
            && args.marketId === marketId
            && Number(args.outcome) === outcome;
        } catch {
          return false;
        }
      });
      if (!resolvedEvent) {
        throw new Error(`MarketResolved event missing or mismatched for ${marketId}`);
      }
      await recordOracleAttempt(marketId, 'CONFIRMED', outcome, hash, undefined, evidence);
      // Score immediately from the verified receipt, even if the market index is
      // still behind. The indexer retries independently after database outages.
      try {
        const { reconcileSignals } = await import('@/lib/signal-intelligence/resolution');
        await reconcileSignals(Date.now() + 12_000, { marketId, transactionHash: hash });
      } catch {
        console.warn(`Signal scoring deferred to indexer for ${marketId}`);
      }
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

        if (currentMarket.resolved && expectedOutcome !== undefined) {
          if (Number(currentMarket.outcome) === expectedOutcome) {
            skipped.push(`${marketId}: already resolved by another run with matching outcome`);
            await recordOracleAttempt(marketId, 'SKIPPED', expectedOutcome, undefined, undefined, evidence);
          } else {
            const message = `critical outcome mismatch: expected ${expectedOutcome}, chain has ${currentMarket.outcome}`;
            errors.push(`${marketId}: ${message}`);
            await recordOracleAttempt(marketId, 'FAILED', expectedOutcome, undefined, message, evidence);
          }
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
    scanned: targetIds.size,
    resolved,
    skipped,
    errors,
  });
}
