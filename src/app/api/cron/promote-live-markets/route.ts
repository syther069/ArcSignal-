import { NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, decodeEventLog, http, type Address, type Hash } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { authorizeCronRequest } from '@/lib/cron-auth';
import { arcTestnet } from '@/lib/contracts';
import {
  ARCSIGNAL_FACTORY_V2_ABI,
  ARCSIGNAL_V2_ENABLED,
  ARCSIGNAL_V2_FACTORY_ADDRESS,
} from '@/lib/contracts-v2';
import { upsertGeneratedMarketIndex } from '@/lib/indexed-markets';
import { getLiveMarketIntelligence } from '@/lib/markets/liveMarketAggregator';
import type { ArcSignalLiveMarket, LiveMarketCategory } from '@/lib/markets/liveMarketTypes';
import {
  buildExternalMarketCommitment,
  ensureExternalSettlementSchema,
  getExternalSettlementsByLiveIds,
  markExternalSettlementFailure,
  upsertExternalSettlementPromotion,
} from '@/lib/markets/externalSettlement';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

const RPC_URL = process.env.ARC_RPC_URL
  ?? process.env.ARC_TESTNET_RPC_URL
  ?? process.env.NEXT_PUBLIC_ARC_TESTNET_RPC_URL
  ?? 'https://rpc.testnet.arc.io';

const V2_METADATA_SCHEMA_VERSION = 1;
const V2_CATEGORY_VERSION = 1;
const V2_ORACLE_POLICY_ID = 1;
const V2_ORACLE_POLICY_VERSION = 1;
const V2_LIVENESS_SECONDS = 3_600n;
const V2_VOID_GRACE_SECONDS = 7_200n;
const V2_PROPOSER_BOND = 1_000_000n;
const V2_ORACLE_REWARD = 0n;
const ALLOWED_CATEGORIES: LiveMarketCategory[] = ['politics', 'technology', 'economics'];

function parseLimit(value: string | null) {
  if (!value) return 6;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > 20) return 6;
  return parsed;
}

function parseCategory(value: string | null): LiveMarketCategory | 'all' {
  if (!value || value === 'all') return 'all';
  const normalized = value.toLowerCase() as LiveMarketCategory;
  return ALLOWED_CATEGORIES.includes(normalized) ? normalized : 'all';
}

function parseInitialLiquidity() {
  const raw = process.env.ARCSIGNAL_V2_EXTERNAL_INITIAL_LIQUIDITY_USDC;
  if (!raw) return 0n;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error('Invalid ARCSIGNAL_V2_EXTERNAL_INITIAL_LIQUIDITY_USDC');
  return BigInt(Math.round(parsed * 1_000_000));
}

function closeTimeForMarket(market: ArcSignalLiveMarket) {
  const fallback = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
  const candidate = market.endDate ?? market.resolutionDate;
  if (!candidate) return BigInt(fallback);
  const parsed = Math.floor(Date.parse(candidate) / 1000);
  if (!Number.isSafeInteger(parsed) || parsed <= Math.floor(Date.now() / 1000) + 900) return BigInt(fallback);
  return BigInt(parsed);
}

function analysisForMarket(market: ArcSignalLiveMarket) {
  return {
    provenance: {
      provider: 'ArcSignal external intelligence',
      model: 'deterministic-live-market-signal',
      version: 'external-settlement-v1',
      raw: market.source,
      generatedAt: new Date().toISOString(),
      versionSource: 'demo-metadata',
    },
    probability: Math.round(market.marketProbability * 100),
    confidence: market.aiConfidence ?? 50,
    prediction: market.aiSuggestedSide === 'NO' ? 'NO' : 'YES',
    summary: `ArcSignal mirrored this ${market.source} market into V2 with an on-chain source commitment.`,
    bullCase: market.aiSuggestedSide === 'YES' ? market.aiReason ?? 'External market intelligence favors YES.' : 'YES exposure follows the committed source outcome.',
    bearCase: market.aiSuggestedSide === 'NO' ? market.aiReason ?? 'External market intelligence favors NO.' : 'NO exposure follows the committed source outcome.',
    keyFactors: [
      `${market.source} probability ${Math.round(market.marketProbability * 100)}%`,
      `Signal edge ${market.signalEdge ?? 0} pts`,
      `Resolution source: ${market.resolutionSource ?? 'not reported by source API'}`,
    ],
    sources: [market.sourceUrl, ...(market.contextSources ?? []).map((source) => source.url)],
    generatedAt: new Date().toISOString(),
    oracle: {
      version: 2,
      settlementModel: 'ArcSignal V2 external-source commitment plus optimistic oracle settlement',
      provider: market.source,
      sourceUrl: market.sourceUrl,
      resolutionSource: market.resolutionSource ?? null,
    },
  };
}

function selectMarkets(markets: ArcSignalLiveMarket[], category: LiveMarketCategory | 'all', limit: number) {
  return markets
    .filter((market) => ALLOWED_CATEGORIES.includes(market.category))
    .filter((market) => category === 'all' || market.category === category)
    .filter((market) => market.source !== 'internal' && market.sourceUrl && market.sourceUrl !== '#')
    .filter((market) => (market.signalEdge ?? 0) >= Number(process.env.ARCSIGNAL_V2_EXTERNAL_MIN_SIGNAL_EDGE ?? 0))
    .slice(0, limit);
}

async function promoteLiveMarkets(request: Request) {
  const authorization = authorizeCronRequest(request);
  if (!authorization.ok) return authorization.response;
  if (!ARCSIGNAL_V2_ENABLED || !ARCSIGNAL_V2_FACTORY_ADDRESS) {
    return NextResponse.json({ promoted: false, skipped: true, reason: 'ArcSignal V2 is not deployed/configured' }, { status: 503 });
  }
  if (process.env.ENABLE_LIVE_MARKET_PROMOTION !== 'true') {
    return NextResponse.json({ promoted: false, skipped: true, reason: 'ENABLE_LIVE_MARKET_PROMOTION is not true' });
  }
  const privateKey = process.env.RESOLVER_PRIVATE_KEY;
  if (!privateKey || !/^0x[0-9a-fA-F]{64}$/.test(privateKey)) {
    return NextResponse.json({ error: 'RESOLVER_PRIVATE_KEY missing or invalid' }, { status: 503 });
  }

  const url = new URL(request.url);
  const limit = parseLimit(url.searchParams.get('limit'));
  const category = parseCategory(url.searchParams.get('category'));
  const dryRun = url.searchParams.get('dryRun') === 'true';
  const requestedId = url.searchParams.get('id')?.trim();

  const live = await getLiveMarketIntelligence();
  const candidates = requestedId
    ? live.markets.filter((market) => market.id === requestedId || market.externalMarketId === requestedId)
    : selectMarkets(live.markets, category, limit);

  if (dryRun) {
    return NextResponse.json({ promoted: false, dryRun: true, requestedId: requestedId ?? null, candidates: candidates.map((market) => ({ id: market.id, question: market.question, category: market.category, source: market.source })) });
  }

  await ensureExternalSettlementSchema();
  const existing = await getExternalSettlementsByLiveIds(candidates.map((market) => market.id));
  const pending = candidates.filter((market) => !existing.has(market.id));

  const account = privateKeyToAccount(privateKey as Hash);
  const transport = http(RPC_URL, { retryCount: 2, retryDelay: 250, timeout: 8_000 });
  const publicClient = createPublicClient({ chain: arcTestnet, transport });
  const walletClient = createWalletClient({ chain: arcTestnet, transport, account });
  const creatorRole = await publicClient.readContract({
    address: ARCSIGNAL_V2_FACTORY_ADDRESS,
    abi: ARCSIGNAL_FACTORY_V2_ABI,
    functionName: 'MARKET_CREATOR_ROLE',
  });
  const canCreate = await publicClient.readContract({
    address: ARCSIGNAL_V2_FACTORY_ADDRESS,
    abi: ARCSIGNAL_FACTORY_V2_ABI,
    functionName: 'hasRole',
    args: [creatorRole, account.address],
  });
  if (!canCreate) return NextResponse.json({ error: 'Resolver wallet does not have the V2 market creator role' }, { status: 503 });

  const initialLiquidity = parseInitialLiquidity();
  const results: Array<Record<string, unknown>> = [];
  for (const market of pending) {
    const commitment = buildExternalMarketCommitment(market);
    const closeTime = closeTimeForMarket(market);
    const voidAfter = closeTime + V2_LIVENESS_SECONDS + V2_VOID_GRACE_SECONDS;
    try {
      const existingAddress = await publicClient.readContract({
        address: ARCSIGNAL_V2_FACTORY_ADDRESS,
        abi: ARCSIGNAL_FACTORY_V2_ABI,
        functionName: 'marketById',
        args: [commitment.marketId],
      }) as Address;
      if (existingAddress !== '0x0000000000000000000000000000000000000000') {
        const record = await upsertExternalSettlementPromotion({
          liveMarket: market,
          arcMarketId: commitment.marketId,
          arcMarketAddress: existingAddress,
          status: 'PROMOTED',
        });
        results.push({ id: market.id, status: 'already-promoted', arcMarketId: record.arcMarketId, marketAddress: existingAddress });
        continue;
      }

      const { request: simulated } = await publicClient.simulateContract({
        account,
        address: ARCSIGNAL_V2_FACTORY_ADDRESS,
        abi: ARCSIGNAL_FACTORY_V2_ABI,
        functionName: 'createMarket',
        args: [{
          marketId: commitment.marketId,
          metadataSchemaVersion: V2_METADATA_SCHEMA_VERSION,
          categoryId: commitment.categoryId,
          categoryVersion: V2_CATEGORY_VERSION,
          oraclePolicyId: V2_ORACLE_POLICY_ID,
          oraclePolicyVersion: V2_ORACLE_POLICY_VERSION,
          closeTime,
          liveness: V2_LIVENESS_SECONDS,
          voidAfter,
          proposerBond: V2_PROPOSER_BOND,
          oracleReward: V2_ORACLE_REWARD,
          termsHash: commitment.termsHash,
          resolutionSourceHash: commitment.resolutionSourceHash,
          ancillaryData: commitment.ancillaryData,
          metadataURI: commitment.metadataURI,
          thesisPredictsYes: market.aiSuggestedSide !== 'NO',
          initialLiquidity,
        }],
      });
      const hash = await walletClient.writeContract(simulated);
      const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 1, timeout: 30_000 });
      if (receipt.status !== 'success') throw new Error(`createMarket transaction reverted: ${hash}`);

      let marketAddress: Address | undefined;
      let ammAddress: Address | undefined;
      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({ abi: ARCSIGNAL_FACTORY_V2_ABI, data: log.data, topics: log.topics });
          if (decoded.eventName !== 'MarketCreatedV2') continue;
          const args = decoded.args as { marketId?: Hash; market?: Address; amm?: Address };
          if (String(args.marketId).toLowerCase() !== commitment.marketId.toLowerCase()) continue;
          marketAddress = args.market;
          ammAddress = args.amm;
        } catch {
          // Different contract event in the same transaction.
        }
      }
      if (!marketAddress) throw new Error(`MarketCreatedV2 event missing for ${market.id}`);

      const analysis = analysisForMarket(market);
      await upsertGeneratedMarketIndex({
        marketId: commitment.marketId,
        category: market.category.toUpperCase(),
        question: market.question,
        analysisJson: JSON.stringify(analysis),
        resolutionTime: closeTime,
        createdBlock: receipt.blockNumber ?? 0n,
        protocolVersion: 2,
        contractAddress: marketAddress,
        categoryId: commitment.categoryId,
        categoryVersion: V2_CATEGORY_VERSION,
        oraclePolicyId: V2_ORACLE_POLICY_ID,
        oraclePolicyVersion: V2_ORACLE_POLICY_VERSION,
        termsHash: commitment.termsHash,
        resolutionSourceHash: commitment.resolutionSourceHash,
      });

      const record = await upsertExternalSettlementPromotion({
        liveMarket: market,
        arcMarketId: commitment.marketId,
        arcMarketAddress: marketAddress,
        ammAddress,
        createTxHash: hash,
        status: 'PROMOTED',
      });
      results.push({ id: market.id, status: 'promoted', arcMarketId: record.arcMarketId, marketAddress, ammAddress, transactionHash: hash });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await markExternalSettlementFailure(market, commitment.marketId, message);
      results.push({ id: market.id, status: 'failed', error: message });
    }
  }

  return NextResponse.json({
    promoted: results.some((result) => result.status === 'promoted' || result.status === 'already-promoted'),
    category,
    requestedId: requestedId ?? null,
    selected: candidates.length,
    skippedExisting: existing.size,
    attempted: pending.length,
    results,
  });
}

export async function GET(request: Request) { return promoteLiveMarkets(request); }
export async function POST(request: Request) { return promoteLiveMarkets(request); }


