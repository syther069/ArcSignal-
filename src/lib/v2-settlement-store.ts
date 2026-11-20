import { getSql } from '@/lib/db';
import type { CryptoPriceObservation } from '@/lib/oracle-policy';

export type V2SettlementMarket = {
  marketId: string;
  marketAddress: `0x${string}`;
  closeTime: number;
  oracleState: string;
  category: string;
  analysisJson: string;
};

/** Open or awaiting-result V2 markets on this chain, joined with their indexed terms. */
export async function getV2SettlementMarkets(chainId: number): Promise<V2SettlementMarket[]> {
  const rows = await getSql()`
    select v.market_id, v.market_address, v.close_time, v.oracle_state, m.category, m.analysis_json
    from markets_v2 v join markets_index m on m.market_id = v.market_id
    where v.chain_id = ${chainId} and v.market_state in ('OPEN', 'CLOSED')
      and v.oracle_state in ('NONE', 'REQUESTED')
      and v.close_time > extract(epoch from now()) - 6 * 3600
      and v.close_time < extract(epoch from now()) + 600
    order by v.close_time asc limit 60
  `;
  return rows.map((r) => ({
    marketId: String(r.market_id), marketAddress: String(r.market_address) as `0x${string}`, closeTime: Number(r.close_time),
    oracleState: String(r.oracle_state), category: String(r.category).toUpperCase(), analysisJson: JSON.stringify(r.analysis_json ?? {}),
  }));
}

export async function getCloseObservation(marketId: string): Promise<CryptoPriceObservation | null> {
  const [r] = await getSql()`select symbol, price, observed_at, provider from close_observations where market_id = ${marketId}`;
  return r ? { provider: r.provider as 'coingecko', symbol: String(r.symbol), price: Number(r.price), observedAt: Number(r.observed_at) } : null;
}

/** First valid observation wins; later attempts never overwrite it. */
export async function storeCloseObservation(marketId: string, closeTime: number, o: CryptoPriceObservation): Promise<boolean> {
  const rows = await getSql()`
    insert into close_observations (market_id, symbol, price, observed_at, provider, close_time)
    values (${marketId}, ${o.symbol.toUpperCase()}, ${o.price}, ${o.observedAt}, ${o.provider}, ${closeTime})
    on conflict (market_id) do nothing returning market_id`;
  return rows.length > 0;
}

export async function recordSettlementAttempt(input: {
  marketId: string; status: 'PROPOSED' | 'SKIPPED' | 'MANUAL_REVIEW' | 'FAILED';
  reason: string; txHash?: string | null; questionResult?: 'YES' | 'NO' | null; observation?: CryptoPriceObservation | null;
}) {
  await getSql()`
    insert into oracle_attempts (market_id, status, transaction_hash, error_message, provider, observed_value, observed_at, decision_reason, question_result)
    values (${input.marketId}, ${`V2_${input.status}`}, ${input.txHash ?? null}, ${input.status === 'FAILED' ? input.reason.slice(0, 500) : null},
      ${input.observation?.provider ?? null}, ${input.observation ? String(input.observation.price) : null},
      ${input.observation ? new Date(input.observation.observedAt * 1000).toISOString() : null}, ${input.reason.slice(0, 500)}, ${input.questionResult ?? null})`;
}
