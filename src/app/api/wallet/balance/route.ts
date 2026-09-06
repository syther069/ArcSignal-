import { NextResponse } from 'next/server';
import { isWalletAddress, readArcWalletUsdc, serializeArcWalletUsdc } from '@/lib/wallet-balance';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const address = new URL(req.url).searchParams.get('address') ?? '';
  if (!isWalletAddress(address)) {
    return NextResponse.json({ error: 'Valid wallet address is required' }, { status: 400 });
  }

  try {
    const snapshot = serializeArcWalletUsdc(await readArcWalletUsdc(address));
    return NextResponse.json(snapshot, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    console.error('Wallet USDC balance unavailable:', error);
    return NextResponse.json(
      { error: 'USDC balance is temporarily unavailable' },
      {
        status: 503,
        headers: {
          'Cache-Control': 'private, no-store',
          'Retry-After': '15',
        },
      },
    );
  }
}
