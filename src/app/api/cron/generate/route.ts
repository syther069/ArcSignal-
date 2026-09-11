import { NextResponse } from 'next/server';
import { createWalletClient, decodeEventLog, http, keccak256, stringToHex, toBytes, type Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arcTestnet, publicClient, ARCSIGNAL_ABI, ARCSIGNAL_ADDRESS } from '@/lib/contracts';
import {
  ARCSIGNAL_FACTORY_V2_ABI,
  ARCSIGNAL_V2_ENABLED,
  ARCSIGNAL_V2_FACTORY_ADDRESS,
} from '@/lib/contracts-v2';
import {
  fetchCryptoMarkets,
  fetchFreshCryptoPrices,
  type CryptoData,
} from '@/lib/coingecko';
import { fetchUpcomingFixtures } from '@/lib/apifootball';
import { generateCryptoAnalysis, generateFootballAnalysis } from '@/lib/gemini';
import { authorizeCronRequest } from '@/lib/cron-auth';
import { isMarketAutomationEnabled } from '@/lib/automation-policy';
import type { Hash } from 'viem';
import {
  assertFreshGenerationObservation,
  ORACLE_POLICY_VERSION,
} from '@/lib/oracle-policy';
import { upsertGeneratedMarketIndex } from '@/lib/indexed-markets';
import { clearChainMarketSnapshotCache } from '@/lib/market-source';
import { clearMarketCache } from '@/lib/markets';

const CONTRACT_ADDRESS = ARCSIGNAL_ADDRESS;

const MARKET_CREATION_VERSION = process.env.ARCSIGNAL_MARKET_CREATION_VERSION;
const V2_METADATA_SCHEMA_VERSION = 1;
const V2_CATEGORY_VERSION = 1;
const V2_ORACLE_POLICY_ID = 1;
const V2_ORACLE_POLICY_VERSION = 1;
const V2_LIVENESS_SECONDS = 3_600n;
const V2_VOID_GRACE_SECONDS = 7_200n;
const V2_PROPOSER_BOND = 1_000_000n;
const V2_ORACLE_REWARD = 0n;
const V2_INITIAL_LIQUIDITY = 0n;

const V2_CATEGORY_IDS: Record<string, number> = {
  CRYPTO: 1,
  FOOTBALL: 2,
  SPORTS: 2,
  POLITICS: 3,
  TECHNOLOGY: 4,
  ECONOMICS: 5,
  CULTURE: 6,
};

type CryptoTimeframe = {
  label: '5m' | '15m' | '1h' | '4h' | '24h';
  minutes: number;
};

type CryptoMarketJob = {
  coin: CryptoData;
  timeframe: CryptoTimeframe;
  threshold: number;
  resolutionTime: bigint;
  resolutionDate: string;
  question: string;
  marketId: string;
};

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function v2MarketId(legacyMarketId: string): Hash {
  return keccak256(toBytes(`arcsignal:v2:${legacyMarketId}`));
}

function commitmentHash(value: unknown): Hash {
  return keccak256(toBytes(stableJson(value)));
}

function predictionIsYes(analysis: unknown) {
  return typeof analysis === 'object'
    && analysis !== null
    && String((analysis as { prediction?: unknown }).prediction ?? '').toUpperCase() === 'YES';
}

export const maxDuration = 60;
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function resolutionTimestamp(hoursFromNow: number): bigint {
  return BigInt(Math.floor(Date.now() / 1000) + hoursFromNow * 3600);
}

export async function POST(req: Request) {
  const authorization = authorizeCronRequest(req);
  if (!authorization.ok) return authorization.response;

  if (!isMarketAutomationEnabled(process.env.ENABLE_MARKET_AUTOMATION)) {
    return NextResponse.json({ error: 'Market automation is disabled' }, { status: 503 });
  }

  const privateKey = process.env.RESOLVER_PRIVATE_KEY;
  if (!privateKey || !/^0x[a-fA-F0-9]{64}$/.test(privateKey)) {
    return NextResponse.json({ error: 'RESOLVER_PRIVATE_KEY missing or invalid' }, { status: 500 });
  }

  const createOnV2 = Boolean(
    MARKET_CREATION_VERSION !== '1'
      && ARCSIGNAL_V2_ENABLED
      && ARCSIGNAL_V2_FACTORY_ADDRESS,
  );

  if (!createOnV2 && !/^0x[a-fA-F0-9]{40}$/.test(CONTRACT_ADDRESS)) {
    return NextResponse.json({ error: 'Contract address missing or invalid' }, { status: 500 });
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  if (createOnV2) {
    const creatorRole = await publicClient.readContract({
      address: ARCSIGNAL_V2_FACTORY_ADDRESS as Address,
      abi: ARCSIGNAL_FACTORY_V2_ABI,
      functionName: 'MARKET_CREATOR_ROLE',
    });
    const canCreate = await publicClient.readContract({
      address: ARCSIGNAL_V2_FACTORY_ADDRESS as Address,
      abi: ARCSIGNAL_FACTORY_V2_ABI,
      functionName: 'hasRole',
      args: [creatorRole, account.address],
    });
    if (!canCreate) {
      return NextResponse.json({ error: 'Resolver wallet does not have the V2 market creator role' }, { status: 503 });
    }
  } else {
    const contractOwner = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: ARCSIGNAL_ABI,
      functionName: 'owner',
    });
    if (String(contractOwner).toLowerCase() !== account.address.toLowerCase()) {
      return NextResponse.json({ error: 'Resolver wallet is not the ArcSignal owner' }, { status: 503 });
    }
  }
  const walletClient = createWalletClient({
    account,
    chain: arcTestnet,
    transport: http(
      process.env.ARC_RPC_URL
      ?? process.env.ARC_TESTNET_RPC_URL
      ?? process.env.NEXT_PUBLIC_ARC_TESTNET_RPC_URL
      ?? 'https://rpc.testnet.arc.io',
    ),
  });

  const created: string[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];
  const indexWarnings: string[] = [];
  let totalCombinations = 0;
  const now = Math.floor(Date.now() / 1000);

  async function createConfiguredMarket(input: {
    legacyMarketId: string;
    category: string;
    question: string;
    analysis: Record<string, unknown>;
    resolutionTime: bigint;
    resolutionCriteria: string;
  }) {
    const analysisJson = JSON.stringify(input.analysis);
    if (!createOnV2) {
      const hash: Hash = await walletClient.writeContract({
        account,
        chain: arcTestnet,
        address: CONTRACT_ADDRESS,
        abi: ARCSIGNAL_ABI,
        functionName: 'createMarket',
        args: [input.legacyMarketId, input.category, input.question, analysisJson, input.resolutionTime],
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== 'success') throw new Error(`createMarket transaction reverted: ${hash}`);
      const createdEvent = receipt.logs.some((log) => {
        try {
          const decoded = decodeEventLog({ abi: ARCSIGNAL_ABI, data: log.data, topics: log.topics });
          const args = decoded.args as { marketId?: string };
          return decoded.eventName === 'MarketCreated' && args.marketId === input.legacyMarketId;
        } catch {
          return false;
        }
      });
      if (!createdEvent) throw new Error(`MarketCreated event missing for ${input.legacyMarketId}`);
      return {
        marketId: input.legacyMarketId,
        hash,
        blockNumber: receipt.blockNumber,
        protocolVersion: 1 as const,
      };
    }

    const marketId = v2MarketId(input.legacyMarketId);
    const categoryId = V2_CATEGORY_IDS[input.category.toUpperCase()] ?? V2_CATEGORY_IDS.CRYPTO;
    const closeTime = input.resolutionTime;
    const voidAfter = closeTime + V2_LIVENESS_SECONDS + V2_VOID_GRACE_SECONDS;
    const termsHash = commitmentHash({
      marketId,
      question: input.question,
      category: input.category,
      resolutionCriteria: input.resolutionCriteria,
      resolutionTime: Number(input.resolutionTime),
      protocol: 'ArcSignal V2',
    });
    const resolutionSourceHash = commitmentHash({
      category: input.category,
      resolutionCriteria: input.resolutionCriteria,
      oracle: input.analysis.oracle ?? null,
    });
    const ancillaryJson = stableJson({
      marketId,
      question: input.question,
      category: input.category,
      resolutionCriteria: input.resolutionCriteria,
      resolutionTime: Number(input.resolutionTime),
      sourceHash: resolutionSourceHash,
    });
    if (toBytes(ancillaryJson).length > 4096) throw new Error(`Ancillary data too large for ${input.legacyMarketId}`);
    const ancillaryData = stringToHex(ancillaryJson);

    const hash: Hash = await walletClient.writeContract({
      account,
      chain: arcTestnet,
      address: ARCSIGNAL_V2_FACTORY_ADDRESS as Address,
      abi: ARCSIGNAL_FACTORY_V2_ABI,
      functionName: 'createMarket',
      args: [{
        marketId,
        metadataSchemaVersion: V2_METADATA_SCHEMA_VERSION,
        categoryId,
        categoryVersion: V2_CATEGORY_VERSION,
        oraclePolicyId: V2_ORACLE_POLICY_ID,
        oraclePolicyVersion: V2_ORACLE_POLICY_VERSION,
        closeTime,
        liveness: V2_LIVENESS_SECONDS,
        voidAfter,
        proposerBond: V2_PROPOSER_BOND,
        oracleReward: V2_ORACLE_REWARD,
        termsHash,
        resolutionSourceHash,
        ancillaryData,
        metadataURI: `arcsignal://v2/markets/${input.legacyMarketId}`,
        thesisPredictsYes: predictionIsYes(input.analysis),
        initialLiquidity: V2_INITIAL_LIQUIDITY,
      }],
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== 'success') throw new Error(`createMarket transaction reverted: ${hash}`);
    let marketAddress: Address | undefined;
    const createdEvent = receipt.logs.some((log) => {
      try {
        const decoded = decodeEventLog({ abi: ARCSIGNAL_FACTORY_V2_ABI, data: log.data, topics: log.topics });
        const args = decoded.args as { marketId?: Hash; market?: Address };
        const matched = decoded.eventName === 'MarketCreatedV2'
          && String(args.marketId).toLowerCase() === marketId.toLowerCase();
        if (matched) marketAddress = args.market;
        return matched;
      } catch {
        return false;
      }
    });
    if (!createdEvent || !marketAddress) throw new Error(`MarketCreatedV2 event missing for ${input.legacyMarketId}`);
    return {
      marketId,
      hash,
      blockNumber: receipt.blockNumber,
      protocolVersion: 2 as const,
      contractAddress: marketAddress,
      categoryId,
      categoryVersion: V2_CATEGORY_VERSION,
      oraclePolicyId: V2_ORACLE_POLICY_ID,
      oraclePolicyVersion: V2_ORACLE_POLICY_VERSION,
      termsHash,
      resolutionSourceHash,
    };
  }

  // CRYPTO MARKETS
  try {
    const requiredSymbols = ['BTC', 'ETH', 'SOL', 'XRP', 'SUI', 'AVAX'];
    let cryptoMarkets: CryptoData[] = [];
    let freshCryptoPrices: Awaited<ReturnType<typeof fetchFreshCryptoPrices>> = [];
    try {
      [cryptoMarkets, freshCryptoPrices] = await Promise.all([
        fetchCryptoMarkets(),
        fetchFreshCryptoPrices(),
      ]);
    } catch (e) {
      console.error('All live crypto price feeds failed:', e);
      throw new Error(`Live price feeds unavailable across all providers: ${e instanceof Error ? e.message : String(e)}`);
    }

    const marketsBySymbol = new Map(
      cryptoMarkets.map((coin) => [coin.symbol.toUpperCase(), coin]),
    );
    const freshPricesBySymbol = new Map(
      freshCryptoPrices.map((coin) => [coin.symbol.toUpperCase(), coin]),
    );
    if (cryptoMarkets.some((coin) => coin.price_source !== 'coingecko')) {
      throw new Error('CoinGecko is unavailable; refusing to create markets from a fallback oracle');
    }

    const selected: CryptoData[] = [];
    const observationCheckTime = Math.floor(Date.now() / 1000);
    for (const symbol of requiredSymbols) {
      const coin = marketsBySymbol.get(symbol);
      if (!coin) {
        errors.push(`[${symbol}] generation skipped: CoinGecko analysis data is missing`);
        continue;
      }
      const freshPrice = freshPricesBySymbol.get(symbol);
      if (!freshPrice) {
        errors.push(`[${symbol}] generation skipped: CoinGecko current-price observation is missing`);
        continue;
      }

      const generationCoin: CryptoData = {
        ...coin,
        current_price: freshPrice.current_price,
        price_source: freshPrice.price_source,
        price_observed_at: freshPrice.price_observed_at,
      };
      try {
        assertFreshGenerationObservation({
          provider: generationCoin.price_source,
          symbol: generationCoin.symbol,
          price: generationCoin.current_price,
          observedAt: generationCoin.price_observed_at,
        }, observationCheckTime);
        selected.push(generationCoin);
      } catch (error) {
        errors.push(
          `[${symbol}] generation skipped: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    if (selected.length === 0) {
      throw new Error('No fresh CoinGecko observations are available');
    }

    const url = new URL(req.url);
    let onlyTimeframe = url.searchParams.get('timeframe');
    if (!onlyTimeframe) {
      try {
        const body = await req.clone().json();
        onlyTimeframe = body?.timeframe;
      } catch {}
    }
    if (!onlyTimeframe) onlyTimeframe = '5m';

    const allTimeframes: CryptoTimeframe[] = [
      { label: '5m',  minutes: 5 },
      { label: '15m', minutes: 15 },
      { label: '1h',  minutes: 60 },
      { label: '4h',  minutes: 240 },
      { label: '24h', minutes: 1440 },
    ];

    const timeframes = onlyTimeframe === 'all'
      ? allTimeframes
      : allTimeframes.filter(t => t.label === onlyTimeframe);
    
    totalCombinations = selected.length * timeframes.length;

    function getPriceTarget(current: number, timeframe: string): number {
      const multipliers: Record<string, number> = {
        '5m':  1.000,
        '15m': 1.003,
        '1h':  1.010,
        '4h':  1.020,
        '24h': 1.035,
      };
      const mult = multipliers[timeframe] ?? 1.015;
      const raw = current * mult;
      const magnitude = Math.pow(10, Math.floor(Math.log10(raw)) - 1);
      return Math.round(raw / magnitude) * magnitude;
    }

    function getSupportLevel(current: number): number {
      const raw = current * 0.997;
      const magnitude = Math.pow(10, Math.floor(Math.log10(raw)) - 1);
      return Math.round(raw / magnitude) * magnitude;
    }

    function getQuestion(symbol: string, threshold: number, timeframe: string): string {
      const fmt = (n: number) => n.toLocaleString('en-US');
      return `Will ${symbol} be at or above $${fmt(threshold)} at the end of the next ${timeframe}?`;
    }

    function getResolutionCriteria(symbol: string, threshold: number, resolutionDate: string): string {
      const fmt = (n: number) => n.toLocaleString('en-US');
      return `Resolves YES if ${symbol}/USD on CoinGecko is at or above $${fmt(threshold)} at ${resolutionDate}; otherwise resolves NO.`;
    }

    const jobs: CryptoMarketJob[] = [];

    for (const coin of selected) {
      for (const timeframe of timeframes) {
        const symbolUpper = coin.symbol.toUpperCase();

        const target = getPriceTarget(coin.current_price, timeframe.label);
        const threshold = timeframe.label === '5m'
          ? getSupportLevel(coin.current_price)
          : target;
        const resolutionTime = BigInt(now + timeframe.minutes * 60);
        const resolutionDate = new Date(Number(resolutionTime) * 1000).toUTCString();
        const question = getQuestion(symbolUpper, threshold, timeframe.label);
        const marketId = `${symbolUpper}-PRICE-${timeframe.label}-${now}`;

        jobs.push({ coin, timeframe, threshold, resolutionTime, resolutionDate, question, marketId });
      }
    }

    if (jobs.length > 0) {
      console.log(`Generating ${jobs.length} crypto market analyses via Gemini in parallel...`);
      const analysisResults = await Promise.allSettled(
        jobs.map(async (job) => {
          const analysis = await generateCryptoAnalysis({
            question: job.question,
            resolutionCriteria: getResolutionCriteria(job.coin.symbol.toUpperCase(), job.threshold, job.resolutionDate),
            resolutionTime: job.resolutionDate,
            cryptoData: {
              id: job.coin.id,
              symbol: job.coin.symbol,
              current_price: job.coin.current_price,
              price_change_percentage_24h: job.coin.price_change_percentage_24h,
              market_cap: job.coin.market_cap,
              total_volume: job.coin.total_volume,
              high_24h: job.coin.high_24h,
              low_24h: job.coin.low_24h,
              target_price: job.threshold,
            },
          });
          return { job, analysis };
        })
      );

      for (const res of analysisResults) {
        if (res.status === 'fulfilled') {
          const { job, analysis } = res.value;
          const analysisWithSubType = {
            ...analysis,
            subType: job.timeframe.label,
            oracle: {
              version: ORACLE_POLICY_VERSION,
              settlementModel: 'ai-agreement-v1',
              provider: 'coingecko',
              symbol: job.coin.symbol.toUpperCase(),
              targetPrice: job.threshold,
              comparator: 'gte',
              resolutionTimestamp: Number(job.resolutionTime),
              maxObservationDelaySeconds: 120,
            },
          };
          const symbolUpper = job.coin.symbol.toUpperCase();

          try {
            const creation = await createConfiguredMarket({
              legacyMarketId: job.marketId,
              category: 'CRYPTO',
              question: job.question,
              analysis: analysisWithSubType as Record<string, unknown>,
              resolutionTime: job.resolutionTime,
              resolutionCriteria: getResolutionCriteria(job.coin.symbol.toUpperCase(), job.threshold, job.resolutionDate),
            });
            created.push(`[V${creation.protocolVersion} CRYPTO] ${job.question} (Tx: ${creation.hash})`);
            if (process.env.DATABASE_URL || process.env.POSTGRES_URL) {
              try {
                await upsertGeneratedMarketIndex({
                  marketId: creation.marketId,
                  category: 'CRYPTO',
                  question: job.question,
                  analysisJson: JSON.stringify(analysisWithSubType),
                  resolutionTime: job.resolutionTime,
                  createdBlock: creation.blockNumber,
                  protocolVersion: creation.protocolVersion,
                  contractAddress: creation.contractAddress,
                  categoryId: creation.categoryId,
                  categoryVersion: creation.categoryVersion,
                  oraclePolicyId: creation.oraclePolicyId,
                  oraclePolicyVersion: creation.oraclePolicyVersion,
                  termsHash: creation.termsHash,
                  resolutionSourceHash: creation.resolutionSourceHash,
                });
              } catch (indexError) {
                indexWarnings.push(
                  `[${creation.marketId}] immediate index update failed: ${indexError instanceof Error ? indexError.message : String(indexError)}`,
                );
              }
            }
            await new Promise(r => setTimeout(r, 1200));
          } catch (err) {
            errors.push(`[${symbolUpper}] ${job.timeframe.label}: ${err instanceof Error ? err.message : String(err)}`);
          }
        } else {
          errors.push(`Gemini generation failed: ${res.reason}`);
        }
      }
    }
  } catch (err) {
    errors.push(`[CRYPTO] Price fetch failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  // FOOTBALL MARKETS
  try {
    if (process.env.API_FOOTBALL_KEY) {
      const wcFixtures = await fetchUpcomingFixtures([1], 2026).catch(() => []);
      const fixtures = wcFixtures.length >= 3 ? wcFixtures : await fetchUpcomingFixtures().catch(() => []);
      const selected = fixtures.slice(0, 4);

      for (const fixture of selected) {
        const resolutionUnix = fixture.kickoffTime + 9000;
        const hoursFromNow = Math.max(1, Math.ceil((resolutionUnix - Date.now() / 1000) / 3600));
        const resolutionTime = resolutionTimestamp(hoursFromNow);
        const kickoffLabel = new Date(fixture.kickoffTime * 1000).toUTCString();
        const question = `Will ${fixture.homeTeam} beat ${fixture.awayTeam} on ${kickoffLabel}?`;
        const marketId = `MATCH-${fixture.fixtureId}-${now}`;

        try {
          const analysis = await generateFootballAnalysis({
            question,
            resolutionCriteria: `Resolves YES if ${fixture.homeTeam} wins at full time. Resolves NO if draw or ${fixture.awayTeam} wins.`,
            matchTime: kickoffLabel,
            fixtureData: {
              fixtureId: fixture.fixtureId,
              homeTeam: fixture.homeTeam,
              awayTeam: fixture.awayTeam,
              kickoffTime: kickoffLabel,
              round: fixture.round,
              leagueName: fixture.leagueName,
            },
          });
          const analysisWithOracle = {
            ...analysis,
            oracle: {
              version: ORACLE_POLICY_VERSION,
              settlementModel: 'ai-agreement-v1',
              provider: 'api-football',
              fixtureId: fixture.fixtureId,
              leagueId: fixture.leagueId,
              season: fixture.season,
              criterion: 'home-win-full-time',
              resolutionTimestamp: Number(resolutionTime),
            },
          };

          const creation = await createConfiguredMarket({
            legacyMarketId: marketId,
            category: 'FOOTBALL',
            question,
            analysis: analysisWithOracle as Record<string, unknown>,
            resolutionTime,
            resolutionCriteria: `Resolves YES if ${fixture.homeTeam} wins at full time. Resolves NO if draw or ${fixture.awayTeam} wins.`,
          });
          created.push(`[V${creation.protocolVersion} FOOTBALL] ${question} (Tx: ${creation.hash})`);
          if (process.env.DATABASE_URL || process.env.POSTGRES_URL) {
            try {
              await upsertGeneratedMarketIndex({
                marketId: creation.marketId,
                category: 'FOOTBALL',
                question,
                analysisJson: JSON.stringify(analysisWithOracle),
                resolutionTime,
                createdBlock: creation.blockNumber,
                protocolVersion: creation.protocolVersion,
                contractAddress: creation.contractAddress,
                categoryId: creation.categoryId,
                categoryVersion: creation.categoryVersion,
                oraclePolicyId: creation.oraclePolicyId,
                oraclePolicyVersion: creation.oraclePolicyVersion,
                termsHash: creation.termsHash,
                resolutionSourceHash: creation.resolutionSourceHash,
              });
            } catch (indexError) {
              indexWarnings.push(
                `[${creation.marketId}] immediate index update failed: ${indexError instanceof Error ? indexError.message : String(indexError)}`,
              );
            }
          }
        } catch (err) {
          errors.push(`[FOOTBALL] ${fixture.homeTeam} vs ${fixture.awayTeam}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }
  } catch (err) {
    errors.push(`[FOOTBALL] Fixtures generation skipped/failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (created.length > 0) {
    clearMarketCache();
    clearChainMarketSnapshotCache();
  }

  return NextResponse.json({
    created,
    skipped,
    errors,
    indexWarnings,
    summary: `${created.length} created, ${skipped.length} skipped, ${errors.length} failed`,
    totalCombinations,
  });
}
