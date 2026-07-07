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
    let needsMaintenance = hasExpiredPending || chainMarkets.length === 0;

    if (!needsMaintenance) {
      const pendingActive = chainMarkets.filter(m => !m.resolved && m.resolutionTime > now);
      const cryptoPending = pendingActive.filter(m => m.category === 'CRYPTO');
      const timeframes = ['5m', '15m', '1h', '4h', '24h'];

      if (cryptoPending.length === 0) {
        needsMaintenance = true;
      } else {
        for (const tf of timeframes) {
          const tfCount = cryptoPending.filter(m => m.marketId.includes(`-PRICE-${tf}-`)).length;
          if (tfCount === 0) {
            needsMaintenance = true;
            break;
          }
        }
      }
    }

    if (needsMaintenance) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      fetch(`${appUrl}/api/cron/maintain`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.CRON_SECRET}`
        }
      }).catch(err => console.error('Failed to trigger background maintenance:', err));
    }
  } catch (error) {
    markets = [];
  }

  return <DashboardClient markets={markets} aiAccuracy={aiAccuracy} />;
}
