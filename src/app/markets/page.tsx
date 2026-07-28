import MarketsClient from './MarketsClient';
import { getMarketsFromChain, serializeMarket, type SerializableMarket } from '@/lib/markets';

export const dynamic = 'force-dynamic';

export default async function MarketsPage() {
  let markets: SerializableMarket[] = [];
  try {
    const chainMarkets = await getMarketsFromChain();
    const now = Date.now() / 1000;

    markets = chainMarkets.map(serializeMarket);
    
    // Page-load maintenance only resolves due markets. Generation is explicit and append-only.
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
    console.error("Error fetching markets from chain:", error);
    markets = [];
  }

  return <MarketsClient markets={markets} />;
}
