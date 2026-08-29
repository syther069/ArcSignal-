import { NextResponse } from 'next/server';
import { clearMarketCache } from '@/lib/markets';
import { revalidatePath } from 'next/cache';
import { publicClient, ARCSIGNAL_ABI, ARCSIGNAL_ADDRESS } from '@/lib/contracts';
import { decodeEventLog, type Address } from 'viem';
import { getSql } from '@/lib/db';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const marketId = params?.id;
    if (!marketId || typeof marketId !== 'string' || marketId.length > 100) {
      return NextResponse.json({ success: false, error: 'Invalid marketId parameter' }, { status: 400 });
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Request body required' }, { status: 400 });
    }

    const { txHash, walletAddress, marketId: bodyMarketId } = body || {};

    // Validate payload consistency
    if (bodyMarketId && bodyMarketId !== marketId) {
      return NextResponse.json({ success: false, error: 'MarketId mismatch between route parameter and body' }, { status: 400 });
    }

    // Validate transaction hash format
    if (!txHash || typeof txHash !== 'string' || !/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
      return NextResponse.json({ success: false, error: 'Valid 64-byte txHash is required' }, { status: 400 });
    }

    // Validate wallet address format
    if (!walletAddress || typeof walletAddress !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json({ success: false, error: 'Valid walletAddress is required' }, { status: 400 });
    }

    // Fetch and verify transaction receipt on-chain
    let receipt;
    try {
      receipt = await publicClient.getTransactionReceipt({ hash: txHash as Address });
    } catch (err) {
      return NextResponse.json({
        success: false,
        error: `Transaction receipt not found: ${err instanceof Error ? err.message : String(err)}`,
      }, { status: 400 });
    }

    if (!receipt || receipt.status !== 'success') {
      return NextResponse.json({ success: false, error: 'Transaction failed or unconfirmed on-chain' }, { status: 400 });
    }

    if (!receipt.to || receipt.to.toLowerCase() !== ARCSIGNAL_ADDRESS.toLowerCase()) {
      return NextResponse.json({ success: false, error: 'Transaction recipient does not match ArcSignal contract' }, { status: 400 });
    }

    if (!receipt.logs || receipt.logs.length === 0) {
      return NextResponse.json({ success: false, error: 'No event logs found in transaction receipt' }, { status: 400 });
    }

    // The background indexer may be behind by millions of blocks. Index this
    // verified stake immediately so the trader's portfolio is available as
    // soon as the transaction is confirmed. Database failures must not turn a
    // successful on-chain trade into a failed UI confirmation.
    try {
      const stakedLog = receipt.logs.find((log) => {
        try {
          const decoded = decodeEventLog({ abi: ARCSIGNAL_ABI, data: log.data, topics: log.topics });
          if (decoded.eventName !== 'Staked') return false;
          const args = decoded.args as { marketId?: string; user?: string };
          return args.marketId === marketId && args.user?.toLowerCase() === walletAddress.toLowerCase();
        } catch {
          return false;
        }
      });

      if (!stakedLog) {
        return NextResponse.json({ success: false, error: 'Verified transaction does not contain the requested stake event' }, { status: 400 });
      }

      const decoded = decodeEventLog({ abi: ARCSIGNAL_ABI, data: stakedLog.data, topics: stakedLog.topics });
      const args = decoded.args as { marketId: string; user: Address; side: number; amount: bigint };
      const sql = getSql();
      const blockNumber = receipt.blockNumber;
      const transactionHash = receipt.transactionHash;
      const logIndex = Number(stakedLog.logIndex ?? 0n);

      const market = await publicClient.readContract({
        address: ARCSIGNAL_ADDRESS,
        abi: ARCSIGNAL_ABI,
        functionName: 'getMarket',
        args: [marketId],
      }) as {
        marketId: string; category: string; question: string; analysisJson: string;
        resolutionTime: bigint; followPool: bigint; fadePool: bigint; resolved: boolean; outcome: number;
      };

      await sql.transaction((tx) => [
        tx`
          insert into markets_index
            (market_id, category, question, analysis_json, resolution_time, follow_pool, fade_pool,
             resolved, outcome, created_block, updated_block)
          values
            (${market.marketId}, ${market.category}, ${market.question}, ${market.analysisJson || null},
             ${market.resolutionTime}, ${market.followPool}, ${market.fadePool}, ${market.resolved},
             ${market.outcome}, ${blockNumber}, ${blockNumber})
          on conflict (market_id) do update set
            category = excluded.category,
            question = excluded.question,
            analysis_json = excluded.analysis_json,
            resolution_time = excluded.resolution_time,
            follow_pool = excluded.follow_pool,
            fade_pool = excluded.fade_pool,
            resolved = excluded.resolved,
            outcome = excluded.outcome,
            created_block = case
              when markets_index.created_block = 0 then excluded.created_block
              else least(markets_index.created_block, excluded.created_block)
            end,
            updated_block = excluded.updated_block,
            updated_at = now()
          where excluded.updated_block >= markets_index.updated_block
        `,
        tx`
          with marker as (
            insert into indexed_events (transaction_hash, log_index, event_name, block_number)
            values (${transactionHash}, ${logIndex}, 'Staked', ${blockNumber})
            on conflict (transaction_hash, log_index) do nothing
            returning 1
          )
          insert into positions_index
            (market_id, wallet_address, side, amount, first_staked_block, last_staked_block)
          select ${args.marketId}, ${args.user.toLowerCase()}, ${Number(args.side)}, ${args.amount},
            ${blockNumber}, ${blockNumber}
          from marker
          on conflict (market_id, wallet_address, side) do update set
            amount = positions_index.amount + excluded.amount,
            last_staked_block = greatest(positions_index.last_staked_block, excluded.last_staked_block)
        `,
      ], { isolationLevel: 'Serializable' });
    } catch (indexError) {
      console.warn('Immediate portfolio indexing failed; background indexer will retry:', indexError);
    }

    // Clear the memory cache in the Node process
    clearMarketCache();

    // Revalidate paths so Next.js server components fetch fresh data
    revalidatePath('/portfolio');
    revalidatePath('/analytics');
    revalidatePath('/leaderboard');
    revalidatePath('/profile');
    revalidatePath('/markets');
    revalidatePath('/', 'layout');

    return NextResponse.json({ success: true, revalidated: true, txHash });
  } catch (err) {
    console.error('Vote tracking error:', err);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
