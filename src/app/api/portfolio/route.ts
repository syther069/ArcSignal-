import { NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { publicClient, ARCSIGNAL_ADDRESS, ARCSIGNAL_ABI } from '@/lib/contracts';
import { getMarketsFromChain } from '@/lib/markets';
import { decodeEventLog, type Address } from 'viem';
import { calculateParimutuelPnL, deriveMarketStatus, mapCategory } from '@/lib/parimutuel-math';

export const dynamic = 'force-dynamic';

function isAddress(value: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

type ChainMarket = {
  marketId: string;
  category: string;
  question: string;
  resolutionTime: bigint;
  followPool: bigint;
  fadePool: bigint;
  resolved: boolean;
  outcome: number;
};

function positionFromChain(
  market: ChainMarket,
  side: 0 | 1,
  stakeRaw: bigint,
  claimed: boolean,
) {
  const outcome = Number(market.outcome);
  const pnl = calculateParimutuelPnL({
    side,
    stakeRaw,
    resolved: market.resolved,
    outcome,
    followPool: market.followPool,
    fadePool: market.fadePool,
  });

  const status = deriveMarketStatus({
    resolved: market.resolved,
    outcome,
    resolutionTime: Number(market.resolutionTime),
  });

  return {
    marketId: market.marketId,
    side,
    stakeRaw: String(stakeRaw),
    stakeUsdc: pnl.stakeUsdc,
    claimed,
    isResolved: market.resolved,
    outcome,
    status,
    userWon: pnl.userWon,
    payout: pnl.payout,
    netPnl: pnl.netPnl,
    market: {
      marketId: market.marketId,
      category: mapCategory(market.category),
      question: market.question,
      resolutionTime: Number(market.resolutionTime),
      followPool: String(market.followPool),
      fadePool: String(market.fadePool),
      resolved: market.resolved,
      outcome,
      status,
    },
  };
}

async function readPositionFromTransaction(txHash: string, address: string) {
  const receipt = await publicClient.getTransactionReceipt({ hash: txHash as `0x${string}` });
  if (receipt.status !== 'success' || receipt.to?.toLowerCase() !== ARCSIGNAL_ADDRESS.toLowerCase()) {
    throw new Error('The stake transaction is not confirmed successfully on the ArcSignal contract.');
  }

  const stakedLog = receipt.logs.find((log) => {
    try {
      const decoded = decodeEventLog({ abi: ARCSIGNAL_ABI, data: log.data, topics: log.topics });
      if (decoded.eventName !== 'Staked') return false;
      const args = decoded.args as { marketId?: string; user?: string };
      return args.user?.toLowerCase() === address.toLowerCase();
    } catch {
      return false;
    }
  });

  if (!stakedLog) throw new Error('No matching stake event was found in the transaction.');

  const decoded = decodeEventLog({ abi: ARCSIGNAL_ABI, data: stakedLog.data, topics: stakedLog.topics });
  const args = decoded.args as { marketId: string; user: Address; side: number; amount: bigint };
  const market = await publicClient.readContract({
    address: ARCSIGNAL_ADDRESS,
    abi: ARCSIGNAL_ABI,
    functionName: 'getMarket',
    args: [args.marketId],
  }) as ChainMarket;
  const side = Number(args.side) as 0 | 1;
  const claimed = market.resolved
    ? await publicClient.readContract({
        address: ARCSIGNAL_ADDRESS,
        abi: ARCSIGNAL_ABI,
        functionName: 'claimed',
        args: [args.marketId, address as Address],
      }) as boolean
    : false;

  return positionFromChain(market, side, args.amount, claimed);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const address = url.searchParams.get('address') ?? '';
  if (!isAddress(address)) return NextResponse.json({ error: 'Valid wallet address is required' }, { status: 400 });

  // A freshly confirmed trade can arrive before Neon/background indexing. Read
  // the receipt directly when the client supplies the transaction hash so the
  // portfolio does not briefly show a false empty state.
  const txHash = url.searchParams.get('txHash')?.trim();
  if (txHash) {
    if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
      return NextResponse.json({ error: 'Valid transaction hash is required' }, { status: 400 });
    }
    try {
      const position = await readPositionFromTransaction(txHash, address);
      return NextResponse.json({ source: 'onchain', complete: true, positions: [position], txHash });
    } catch (error) {
      return NextResponse.json({
        source: 'onchain',
        complete: false,
        error: error instanceof Error ? error.message : 'Trade is not available yet',
      }, { status: 409 });
    }
  }

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
          const followPool = BigInt(String(row.follow_pool ?? 0));
          const fadePool = BigInt(String(row.fade_pool ?? 0));

          const pnl = calculateParimutuelPnL({
            side,
            stakeRaw,
            resolved,
            outcome,
            followPool,
            fadePool,
          });

          const status = deriveMarketStatus({
            resolved,
            outcome,
            statusString: String(row.status ?? ''),
            resolutionTime: Number(row.resolution_time),
          });

          return {
            marketId: row.market_id,
            side,
            stakeRaw: String(stakeRaw),
            stakeUsdc: pnl.stakeUsdc,
            claimed: Boolean(row.claimed),
            isResolved: resolved,
            outcome,
            status,
            userWon: pnl.userWon,
            payout: pnl.payout,
            netPnl: pnl.netPnl,
            market: {
              marketId: row.market_id,
              category: mapCategory(String(row.category)),
              question: row.question,
              resolutionTime: Number(row.resolution_time),
              followPool: String(followPool),
              fadePool: String(fadePool),
              resolved,
              outcome,
              status,
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
      return NextResponse.json({
        source: 'chain',
        complete: false,
        positions: [],
        error: 'No chain markets were available for this read',
      });
    }

    let failedReads = 0;
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

          for (const [side, stakeRaw] of [
            [0, followRaw],
            [1, fadeRaw],
          ] as Array<[0 | 1, bigint]>) {
            if (stakeRaw === 0n) continue;
            const pnl = calculateParimutuelPnL({
              side,
              stakeRaw,
              resolved: m.resolved,
              outcome: rawOutcome,
              followPool: m.followPool,
              fadePool: m.fadePool,
            });

            positionsForMarket.push({
              marketId: m.marketId,
              side,
              stakeRaw: String(stakeRaw),
              stakeUsdc: pnl.stakeUsdc,
              claimed,
              isResolved: m.resolved,
              outcome: rawOutcome,
              status: m.status,
              userWon: pnl.userWon,
              payout: pnl.payout,
              netPnl: pnl.netPnl,
              market: {
                marketId: m.marketId,
                category: mapCategory(m.category),
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
          failedReads += 1;
          return null;
        }
      })
    );

    const flatPositions = stakeReads.filter(Boolean).flat();
    return NextResponse.json({
      source: 'chain',
      complete: failedReads === 0,
      failedReads,
      positions: flatPositions,
    });
  } catch (chainErr) {
    console.error('Server-side chain portfolio query failed:', chainErr);
    return NextResponse.json({
      source: 'fallback',
      complete: false,
      positions: [],
      error: 'Portfolio chain read is temporarily unavailable',
    }, { status: 503 });
  }
}
