import { NextResponse } from 'next/server';
import { clearMarketCache } from '@/lib/markets';
import { revalidatePath } from 'next/cache';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Clear the memory cache in the Node process
    clearMarketCache();

    // Revalidate paths so Next.js server components fetch fresh data
    revalidatePath('/portfolio');
    revalidatePath('/analytics');
    revalidatePath('/leaderboard');
    revalidatePath('/profile');
    revalidatePath('/markets');
    revalidatePath('/', 'layout');

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Vote tracking error:', err);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
