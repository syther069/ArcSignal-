import { createPublicClient, decodeEventLog, http } from 'viem';
import { ARCSIGNAL_ABI, ARCSIGNAL_ADDRESS, arcTestnet } from '@/lib/contracts';
import { getSql } from '@/lib/db';
import { parseMarketPrediction } from '@/lib/oracle-policy';
import { getSignals, storeResolution } from './repository';
import type { BinaryResult, SignalResolution } from './types';

export function questionResult(prediction: BinaryResult, outcome: number): BinaryResult | null {
  if (prediction !== 'YES' && prediction !== 'NO') return null;
  if (outcome === 1) return prediction;
  if (outcome === 2) return prediction === 'YES' ? 'NO' : 'YES';
  return null;
}

// Read-only chain verification. This function never submits a wallet transaction.
// Retryable reconciliation handles a DB outage after settlement without re-settling markets.
export async function reconcileSignals(deadline = Date.now() + 45_000, confirmed?: { marketId: string; transactionHash: `0x${string}` }) {
  const publicClient = createPublicClient({ chain: arcTestnet, transport: http(
    process.env.ARC_RPC_URL ?? process.env.ARC_TESTNET_RPC_URL ?? process.env.NEXT_PUBLIC_ARC_TESTNET_RPC_URL ?? 'https://rpc.testnet.arc.io',
    { timeout: 2_000, retryCount: 0 },
  ) });
  const candidates = confirmed ? [{ market_id: confirmed.marketId }] : await getSql()`select distinct s.market_id from ai_signals s
    join signal_scores r on r.signal_id = s.id join markets_index m on m.market_id = s.market_id
    where r.status = 'pending' and (m.resolved or m.resolution_time <= extract(epoch from now()))
    order by s.market_id limit 40`;
  const marketIds = candidates.map(row => String(row.market_id));
  let updated = 0;
  const failures: string[] = [];
  for (const marketId of marketIds) {
    // Leave headroom for the three bounded RPC reads and database writes.
    // Indexing retains its existing run budget even during RPC degradation.
    if (Date.now() + 8_000 >= deadline) break;
    try {
      const signals = (await getSignals(marketId)).filter(s => s.status === 'pending');
      if (!signals.length) continue;
      const market = await publicClient.readContract({ address: ARCSIGNAL_ADDRESS, abi: ARCSIGNAL_ABI, functionName: 'getMarket', args: [marketId] });
      if (!market.resolved) continue;
      if (Number(market.outcome) === 0) {
        for (const signal of signals.filter(s => s.marketId === marketId)) {
          await storeResolution(signal, { status: 'cancelled', finalResult: null, resolvedAt: null,
            resolutionSourceUrl: null, settlementTransactionHash: null });
          updated++;
        }
        continue;
      }
      const rows = await getSql()`select transaction_hash, provider from oracle_attempts
        where market_id = ${marketId} and status in ('CONFIRMED', 'SUBMITTED', 'INDEXED')
          and transaction_hash is not null order by attempted_at desc limit 1`;
      const evidence = confirmed ? { ...rows[0], transaction_hash: confirmed.transactionHash } : rows[0];
      // Do not manufacture a settlement time or infer a final result from trading pools.
      if (!evidence || !/^0x[0-9a-fA-F]{64}$/.test(String(evidence.transaction_hash))) continue;
      const receipt = await publicClient.getTransactionReceipt({ hash: evidence.transaction_hash as `0x${string}` });
      if (receipt.status !== 'success') throw new Error('Settlement receipt failed');
      const matched = receipt.logs.some(log => {
        if (log.address.toLowerCase() !== ARCSIGNAL_ADDRESS.toLowerCase()) return false;
        try {
          const event = decodeEventLog({ abi: ARCSIGNAL_ABI, topics: log.topics, data: log.data });
          const args = event.args as { marketId?: string; outcome?: number };
          return event.eventName === 'MarketResolved' && args.marketId === marketId && Number(args.outcome) === Number(market.outcome);
        } catch { return false; }
      });
      if (!matched) throw new Error('Settlement event did not match this market and contract');
      const block = await publicClient.getBlock({ blockHash: receipt.blockHash });
      const result = questionResult(parseMarketPrediction(market.analysisJson), Number(market.outcome));
      if (!result) throw new Error('Unsupported binary market outcome');
      const originalMarketAnalysis = JSON.parse(market.analysisJson) as { oracle?: { provider?: string } };
      const provider = evidence.provider ?? originalMarketAnalysis.oracle?.provider;
      const resolution: SignalResolution = {
        status: result ? 'resolved' : 'cancelled', finalResult: result,
        resolvedAt: new Date(Number(block.timestamp) * 1000).toISOString(),
        resolutionSourceUrl: provider === 'coingecko' ? 'https://www.coingecko.com/' : provider === 'api-football' ? 'https://www.api-football.com/' : null,
        settlementTransactionHash: receipt.transactionHash,
      };
      for (const signal of signals.filter(s => s.marketId === marketId)) {
        const tooLate = Date.parse(signal.generatedAt) >= Number(market.resolutionTime) * 1000
          || Date.parse(signal.generatedAt) >= Number(block.timestamp) * 1000;
        await storeResolution(signal, { ...resolution, status: tooLate ? 'invalid' : resolution.status });
        updated++;
      }
    } catch { failures.push(marketId); }
  }
  return { updated, failedMarketIds: failures, candidateMarkets: marketIds.length };
}
