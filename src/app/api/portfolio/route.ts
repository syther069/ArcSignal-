import { NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { publicClient } from '@/lib/contracts';

export const dynamic = 'force-dynamic';

function isAddress(value: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

export async function GET(req: Request) {
  const address = new URL(req.url).searchParams.get('address') ?? '';
  if (!isAddress(address)) return NextResponse.json({ error: 'Valid wallet address is required' }, { status: 400 });

  try {
    const sql = getSql();
    const rows = await sql`
      select
        p.market_id,
        p.side,
        p.amount,
        m.category,
        m.question,
        m.resolution_time,
        m.follow_pool,
        m.fade_pool,
        m.resolved,
        m.outcome,
        m.status,
        case when c.market_id is null and r.market_id is null then false else true end as claimed
      from positions_index p
      join markets_index m on m.market_id = p.market_id
      left join claims_index c
        on c.market_id = p.market_id and lower(c.wallet_address) = lower(${address})
      left join refunds_index r
        on r.market_id = p.market_id and lower(r.wallet_address) = lower(${address})
      where lower(p.wallet_address) = lower(${address}) and p.amount > 0
      order by p.last_staked_block desc nulls last
    `;

    // An empty database result is not authoritative while the event indexer is
    // still catching up. Signal the client to use its bounded on-chain
    // fallback instead of rendering an empty portfolio.
    const [stateRows, latestBlock] = await Promise.all([
      sql`select last_block from sync_state where id = 'arc-main' limit 1`,
      publicClient.getBlockNumber(),
    ]);
    const lastScannedBlock = stateRows.length > 0 ? BigInt(String(stateRows[0].last_block)) : 0n;
    const indexerLagging = latestBlock > lastScannedBlock + 1_000n;
    if (rows.length === 0 && indexerLagging) {
      return NextResponse.json({
        error: 'Portfolio indexer is catching up',
        lastScannedBlock: lastScannedBlock.toString(),
        latestBlock: latestBlock.toString(),
      }, { status: 503 });
    }

    return NextResponse.json({
      source: 'neon',
      positions: rows.map((row) => {
        const side = Number(row.side) as 0 | 1;
        const stakeRaw = BigInt(String(row.amount));
        const resolved = Boolean(row.resolved);
        const outcome = Number(row.outcome);
        const isVoided = String(row.status ?? '') === 'VOIDED' || (resolved && outcome === 0);
        const winningSide = outcome === 1 ? 0 : outcome === 2 ? 1 : -1;
        const userWon = resolved && !isVoided && winningSide >= 0 ? side === winningSide : null;
        const winPool = winningSide === 0 ? BigInt(String(row.follow_pool)) : BigInt(String(row.fade_pool));
        const losePool = winningSide === 0 ? BigInt(String(row.fade_pool)) : BigInt(String(row.follow_pool));
        const stakeUsdc = Number(stakeRaw) / 1e6;
        const payout = resolved && userWon ? stakeUsdc + Number((stakeRaw * losePool) / (winPool || 1n)) / 1e6 : 0;
        const netPnl = resolved && !isVoided && userWon === true ? payout - stakeUsdc : resolved && !isVoided ? -stakeUsdc : 0;

        return {
          marketId: row.market_id,
          side,
          stakeRaw: String(stakeRaw),
          stakeUsdc,
          claimed: Boolean(row.claimed),
          isResolved: resolved,
          isVoided,
          outcome,
          status: row.status,
          userWon,
          payout,
          netPnl,
          market: {
          marketId: row.market_id,
          category: row.category === 'FOOTBALL' ? 'FOOTBALL' : 'CRYPTO',
          question: row.question,
          resolutionTime: Number(row.resolution_time),
          followPool: String(row.follow_pool),
          fadePool: String(row.fade_pool),
          resolved,
          outcome,
          status: row.status,
        },
        };
      }),
    });
  } catch (error) {
    console.error('Indexed portfolio query failed:', error);
    return NextResponse.json({ error: 'Indexed portfolio is not ready' }, { status: 503 });
  }
}
