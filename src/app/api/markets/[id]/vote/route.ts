import { NextResponse } from 'next/server';
import { clearMarketCache } from '@/lib/markets';
import { revalidatePath } from 'next/cache';
import { publicClient, ARCSIGNAL_ADDRESS } from '@/lib/contracts';
import { parseAbiItem, type Address } from 'viem';

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
