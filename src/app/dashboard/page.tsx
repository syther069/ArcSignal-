import DashboardClient from './DashboardClient';
import { getMarketsFromChain, serializeMarket, type SerializableMarket } from '@/lib/markets';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  let markets: SerializableMarket[] = [];
  let aiAccuracy: any[] = [];
  try {
    const chainMarkets = await getMarketsFromChain();
    markets = chainMarkets.map(serializeMarket);

    const now = Date.now() / 1000;
    const hasExpiredPending = chainMarkets.some(m => !m.resolved && m.resolutionTime <= now);

    if (hasExpiredPending) {
      const appUrl = process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}` 
        : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
      
      await fetch(`${appUrl}/api/cron/resolve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.CRON_SECRET}`
        },
        signal: AbortSignal.timeout(1_500),
      }).catch(err => console.error('Failed to trigger market resolution:', err));
    }
  } catch (error) {
    markets = [];
  }

  return <DashboardClient markets={markets} aiAccuracy={aiAccuracy} />;
}
