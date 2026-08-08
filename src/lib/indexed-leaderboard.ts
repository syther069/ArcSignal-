import { getSql } from './db';

export interface IndexedLeaderboardEntry {
  address: string;
  totalStaked: string;
  correctPredictions: number;
  totalPredictions: number;
  winRate: number;
  totalPayout: string;
  resolvedStaked: string;
  netPnl: number;
  roi: number;
}

/**
 * Builds one prediction per wallet/market, rather than one prediction per
 * Staked event. A wallet that adds stake to the same market is still counted
 * once, while both sides are retained so hedged positions are handled safely.
 */
export async function getIndexedLeaderboard(limit = 100) {
  const sql = getSql();
  const rows = await sql`
    with market_positions as (
      select
        lower(p.wallet_address) as wallet_address,
        p.market_id,
        sum(p.amount)::numeric as total_staked,
        sum(case when p.side = 0 then p.amount else 0 end)::numeric as follow_staked,
        sum(case when p.side = 1 then p.amount else 0 end)::numeric as fade_staked
      from positions_index p
      group by lower(p.wallet_address), p.market_id
    ),
    trader_stats as (
      select
        mp.wallet_address,
        sum(mp.total_staked)::numeric as total_staked,
        sum(case when m.resolved and m.outcome in (1, 2) then mp.total_staked else 0 end)::numeric as resolved_staked,
        sum(case
          when m.resolved and m.outcome = 1 then mp.follow_staked + (mp.follow_staked * m.fade_pool / nullif(m.follow_pool, 0))
          when m.resolved and m.outcome = 2 then mp.fade_staked + (mp.fade_staked * m.follow_pool / nullif(m.fade_pool, 0))
          else 0
        end)::numeric as total_payout,
        count(*) filter (where m.resolved and m.outcome in (1, 2))::int as total_predictions,
        count(*) filter (
          where m.resolved and (
            (m.outcome = 1 and mp.follow_staked > 0) or
            (m.outcome = 2 and mp.fade_staked > 0)
          )
        )::int as correct_predictions
      from market_positions mp
      join markets_index m on m.market_id = mp.market_id
      group by mp.wallet_address
    )
    select wallet_address, total_staked, resolved_staked, total_payout, total_predictions, correct_predictions
    from trader_stats
    order by
      (total_predictions >= 5) desc,
      case when total_predictions > 0 then correct_predictions::numeric / total_predictions else 0 end desc,
      total_staked desc
    limit ${limit}
  `;

  return rows.map((row) => {
    const totalPredictions = Number(row.total_predictions ?? 0);
    const correctPredictions = Number(row.correct_predictions ?? 0);
    const totalPayout = String(row.total_payout ?? '0');
    const resolvedStaked = String(row.resolved_staked ?? '0');
    const netPnl = (Number(totalPayout) - Number(resolvedStaked)) / 1e6;
    const roi = Number(resolvedStaked) > 0 ? (netPnl / (Number(resolvedStaked) / 1e6)) * 100 : 0;
    return {
      address: String(row.wallet_address),
      totalStaked: String(row.total_staked ?? '0'),
      correctPredictions,
      totalPredictions,
      winRate: totalPredictions > 0 ? Math.round((correctPredictions / totalPredictions) * 100) : 0,
      totalPayout,
      resolvedStaked,
      netPnl,
      roi: Math.round(roi * 10) / 10,
    } satisfies IndexedLeaderboardEntry;
  });
}
