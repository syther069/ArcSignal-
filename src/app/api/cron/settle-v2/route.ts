import { NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, http, type Address, type Hash } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { authorizeCronRequest } from '@/lib/cron-auth';
import { arcTestnet } from '@/lib/contracts';
import { resolveArcRpcUrl } from '@/lib/arc-network';
import { fetchFreshCryptoPrices } from '@/lib/coingecko';
import { fetchFixtureById } from '@/lib/apifootball';
import { parseCryptoOracleSpec, parseFootballOracleSpec, type CryptoPriceObservation } from '@/lib/oracle-policy';
import { MARKET_SETTLEMENT_ABI, SETTLEMENT_ORACLE_V2_ABI } from '@/lib/settlement-oracle-abi';
import { acceptObservation, decideCryptoProposal, decideFootballProposal, needsObservation, type ProposalDecision } from '@/lib/v2-settlement-keeper';
import { getCloseObservation, getV2SettlementMarkets, recordSettlementAttempt, storeCloseObservation, type V2SettlementMarket } from '@/lib/v2-settlement-store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const OBSERVE_AHEAD_SECONDS = 270;
const BUDGET_MS = 280_000;
const POLL_MS = 10_000;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Polls CoinGecko until it reports a price updated at or after close (inside the policy window). */
async function observeAtClose(symbol: string, closeTime: number, maxDelay: number, deadline: number): Promise<CryptoPriceObservation | null> {
  const wait = closeTime * 1000 + 3_000 - Date.now();
  if (wait > 0) {
    if (Date.now() + wait > deadline) return null;
    await sleep(wait);
  }
  while (Date.now() < deadline && Date.now() / 1000 - closeTime <= maxDelay) {
    const price = (await fetchFreshCryptoPrices().catch(() => [])).find((p) => p.symbol.toUpperCase() === symbol.toUpperCase());
    if (price && acceptObservation(price.price_observed_at, closeTime, maxDelay)) {
      return { provider: 'coingecko', symbol: symbol.toUpperCase(), price: price.current_price, observedAt: price.price_observed_at };
    }
    await sleep(POLL_MS);
  }
  return null;
}

async function decide(market: V2SettlementMarket, now: number): Promise<{ decision: ProposalDecision; observation: CryptoPriceObservation | null }> {
  if (market.category === 'FOOTBALL') {
    const spec = parseFootballOracleSpec(market.analysisJson, market.closeTime);
    return { decision: decideFootballProposal(spec.fixtureId, await fetchFixtureById(spec.fixtureId)), observation: null };
  }
  const spec = parseCryptoOracleSpec(market.analysisJson, market.closeTime);
  const observation = await getCloseObservation(market.marketId);
  return { decision: decideCryptoProposal(spec, observation, now), observation };
}

/**
 * V2 settlement job, every ~5 minutes:
 * 1. Observe the CoinGecko price right at each crypto market's close (waits for closes due soon).
 * 2. For markets whose result was requested (maintain-v2 does that), propose YES/NO with the
 *    resolver key, but only when the settlement rules say "resolve". Everything else is logged
 *    for manual review and never proposed. maintain-v2 settles after the dispute window.
 */
async function run(request: Request) {
  const authorization = authorizeCronRequest(request);
  if (!authorization.ok) return authorization.response;
  if (process.env.ENABLE_V2_SETTLEMENT !== 'true') {
    return NextResponse.json({ skipped: true, reason: 'ENABLE_V2_SETTLEMENT is not true' });
  }
  // A dedicated proposer key is preferred; falls back to the resolver key.
  const privateKey = process.env.SETTLEMENT_PROPOSER_PRIVATE_KEY?.trim() || process.env.RESOLVER_PRIVATE_KEY;
  if (!privateKey || !/^0x[0-9a-fA-F]{64}$/.test(privateKey)) {
    return NextResponse.json({ error: 'Proposer key is not configured' }, { status: 503 });
  }
  const deadline = Date.now() + BUDGET_MS;
  try {
    const account = privateKeyToAccount(privateKey as Hash);
    const transport = http(resolveArcRpcUrl(), { retryCount: 2, retryDelay: 250, timeout: 8_000 });
    const publicClient = createPublicClient({ chain: arcTestnet, transport });
    const walletClient = createWalletClient({ chain: arcTestnet, transport, account });
    const markets = await getV2SettlementMarkets(arcTestnet.id);
    const observed: string[] = [];
    const results: { marketId: string; status: string; reason: string; txHash?: Hash }[] = [];

    // 1. Observe at close (crypto only), soonest close first.
    for (const market of markets.filter((m) => m.category !== 'FOOTBALL')) {
      const now = Math.floor(Date.now() / 1000);
      let spec;
      try { spec = parseCryptoOracleSpec(market.analysisJson, market.closeTime); } catch { continue; }
      if (!needsObservation(market.closeTime, now, OBSERVE_AHEAD_SECONDS, spec.maxObservationDelaySeconds)) continue;
      if (await getCloseObservation(market.marketId)) continue;
      const observation = await observeAtClose(spec.symbol, market.closeTime, spec.maxObservationDelaySeconds, deadline);
      if (observation && await storeCloseObservation(market.marketId, market.closeTime, observation)) observed.push(market.marketId);
    }

    // 2. Propose for requested markets.
    for (const market of markets.filter((m) => m.oracleState === 'REQUESTED')) {
      if (Date.now() > deadline) break;
      const now = Math.floor(Date.now() / 1000);
      try {
        const adapter = await publicClient.readContract({ address: market.marketAddress, abi: MARKET_SETTLEMENT_ABI, functionName: 'oracleAdapter' }) as Address;
        const proposer = await publicClient.readContract({ address: adapter, abi: SETTLEMENT_ORACLE_V2_ABI, functionName: 'proposer' }).catch(() => null);
        if (!proposer) { results.push({ marketId: market.marketId, status: 'skipped', reason: 'market oracle is not a settlement oracle' }); continue; }
        if (String(proposer).toLowerCase() !== account.address.toLowerCase()) {
          results.push({ marketId: market.marketId, status: 'skipped', reason: 'configured key is not the oracle proposer' });
          continue;
        }
        const key = await publicClient.readContract({ address: market.marketAddress, abi: MARKET_SETTLEMENT_ABI, functionName: 'oracleRequestKey' }) as Hash;
        const onChain = await publicClient.readContract({ address: adapter, abi: SETTLEMENT_ORACLE_V2_ABI, functionName: 'getRequest', args: [key] }) as { state: number };
        if (Number(onChain.state) !== 1) { results.push({ marketId: market.marketId, status: 'skipped', reason: 'request is no longer waiting for a proposal' }); continue; }

        const { decision, observation } = await decide(market, now);
        if (decision.action !== 'propose') {
          if (decision.action === 'manual-review') await recordSettlementAttempt({ marketId: market.marketId, status: 'MANUAL_REVIEW', reason: decision.reason, observation });
          results.push({ marketId: market.marketId, status: decision.action, reason: decision.reason });
          continue;
        }
        const { request: simulated } = await publicClient.simulateContract({
          account, address: adapter, abi: SETTLEMENT_ORACLE_V2_ABI, functionName: 'proposeOutcome', args: [key, decision.price],
        });
        const txHash = await walletClient.writeContract(simulated);
        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash, confirmations: 1, timeout: 30_000 });
        if (receipt.status !== 'success') throw new Error(`proposeOutcome reverted: ${txHash}`);
        await recordSettlementAttempt({ marketId: market.marketId, status: 'PROPOSED', reason: decision.reason, txHash, questionResult: decision.questionResult, observation });
        results.push({ marketId: market.marketId, status: 'proposed', reason: `${decision.questionResult}: ${decision.reason}`, txHash });
      } catch (error) {
        const reason = error instanceof Error ? error.message.slice(0, 300) : String(error);
        await recordSettlementAttempt({ marketId: market.marketId, status: 'FAILED', reason }).catch(() => undefined);
        results.push({ marketId: market.marketId, status: 'failed', reason });
      }
    }
    return NextResponse.json({ markets: markets.length, observed, results });
  } catch (error) {
    console.error('V2 settlement job failed:', error);
    return NextResponse.json({ error: 'V2 settlement job failed', message: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function GET(request: Request) { return run(request); }
export async function POST(request: Request) { return run(request); }
