import { NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { publicClient, ARCSIGNAL_ADDRESS, ARCSIGNAL_ABI } from '@/lib/contracts';
import { getMarketsFromChain } from '@/lib/markets';
import { formatUnits } from 'viem';

export const dynamic = 'force-dynamic';

function isAddress(value: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

export async function GET(req: Request) {
  const address = new URL(req.url).searchParams.get('address') ?? '';
  if (!isAddress(address)) return NextResponse.json({ error: 'Valid wallet address is required' }, { status: 400 });

  // 1. Try Neon DB index first
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
        case when c.market_id is null then false else true end as claimed
      from positions_index p
      join markets_index m on m.market_id = p.market_id
      left join claims_index c
        on c.market_id = p.market_id and lower(c.wallet_address) = lower(${address})
      where lower(p.wallet_address) = lower(${address}) and p.amount > 0
      order by p.last_staked_block desc nulls last
    `;

    if (rows.length > 0) {
      return NextResponse.json({
        source: 'neon',
        positions: rows.map((row) => {
          const side = Number(row.side) as 0 | 1;
          const stakeRaw = BigInt(String(row.amount));
          const resolved = Boolean(row.resolved);
          const outcome = Number(row.outcome);
          const winningSide = outcome === 1 ? 0 : outcome === 2 ? 1 : -1;
          const userWon = resolved && winningSide >= 0 ? side === winningSide : null;
          const winPool = winningSide === 0 ? BigInt(String(row.follow_pool)) : BigInt(String(row.fade_pool));
          const losePool = winningSide === 0 ? BigInt(String(row.fade_pool)) : BigInt(String(row.follow_pool));
          const stakeUsdc = Number(stakeRaw) / 1e6;
          const payout = resolved && userWon ? stakeUsdc + Number((stakeRaw * losePool) / (winPool || 1n)) / 1e6 : 0;
          const netPnl = resolved && userWon === true ? payout - stakeUsdc : resolved ? -stakeUsdc : 0;

          return {
            marketId: row.market_id,
            side,
            stakeRaw: String(stakeRaw),
            stakeUsdc,
            claimed: Boolean(row.claimed),
            isResolved: resolved,
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
    }
  } catch {
    // Neon DB unavailable or not configured, proceed to on-chain read
  }

  // 2. Authoritative on-chain reader fallback: inspect active markets for user stakes
  try {
    const chainMarkets = await getMarketsFromChain();
    if (!chainMarkets || chainMarkets.length === 0) {
      return NextResponse.json({ source: 'chain', positions: [] });
    }

    const stakeReads = await Promise.all(
      chainMarkets.map(async (m) => {
        try {
          const [followRaw, fadeRaw] = await Promise.all([
            publicClient.readContract({
              address: ARCSIGNAL_ADDRESS,
              abi: ARCSIGNAL_ABI,
              functionName: 'followStakes',
              args: [m.marketId, address as `0x${string}`],
            }) as Promise<bigint>,
            publicClient.readContract({
              address: ARCSIGNAL_ADDRESS,
              abi: ARCSIGNAL_ABI,
              functionName: 'fadeStakes',
              args: [m.marketId, address as `0x${string}`],
            }) as Promise<bigint>,
          ]);

          const userHasFollow = followRaw > 0n;
          const userHasFade = fadeRaw > 0n;
          if (!userHasFollow && !userHasFade) return null;

          const claimed = m.resolved
            ? ((await publicClient.readContract({
                address: ARCSIGNAL_ADDRESS,
                abi: ARCSIGNAL_ABI,
                functionName: 'claimed',
                args: [m.marketId, address as `0x${string}`],
              }).catch(() => false)) as boolean)
            : false;

          const positionsForMarket = [];
          const rawOutcome = m.outcome === 'FOLLOW' ? 1 : m.outcome === 'FADE' ? 2 : 0;
          const winningSide = rawOutcome === 1 ? 0 : rawOutcome === 2 ? 1 : -1;

          for (const [side, stakeRaw] of [
            [0, followRaw],
            [1, fadeRaw],
          ] as Array<[0 | 1, bigint]>) {
            if (stakeRaw === 0n) continue;
            const stakeUsdc = Number(formatUnits(stakeRaw, 6));
            const userWon = m.resolved && winningSide >= 0 ? side === winningSide : null;
            let payout = 0;
            let netPnl = 0;

            if (m.resolved && userWon) {
              const winPool = winningSide === 0 ? m.followPool : m.fadePool;
              const losePool = winningSide === 0 ? m.fadePool : m.followPool;
              payout = stakeUsdc + (stakeUsdc * Number(losePool)) / Number(winPool || 1n);
              netPnl = payout - stakeUsdc;
            } else if (m.resolved && userWon === false) {
              netPnl = -stakeUsdc;
            }

            positionsForMarket.push({
              marketId: m.marketId,
              side,
              stakeRaw: String(stakeRaw),
              stakeUsdc,
              claimed,
              isResolved: m.resolved,
              outcome: rawOutcome,
              status: m.status,
              userWon,
              payout,
              netPnl,
              market: {
                marketId: m.marketId,
                category: m.category,
                question: m.question ?? m.marketId,
                resolutionTime: m.resolutionTime,
                followPool: String(m.followPool),
                fadePool: String(m.fadePool),
                resolved: m.resolved,
                outcome: rawOutcome,
                status: m.status,
              },
            });
          }

          return positionsForMarket;
        } catch {
          return null;
        }
      })
    );

    const flatPositions = stakeReads.filter(Boolean).flat();
    return NextResponse.json({ source: 'chain', positions: flatPositions });
  } catch (chainErr) {
    console.error('Server-side chain portfolio query failed:', chainErr);
    return NextResponse.json({ source: 'fallback', positions: [] });
  }
}
