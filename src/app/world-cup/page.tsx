import { Market } from '@/types';
import { getMarketsFromChain, serializeMarket } from '@/lib/markets';
import { toUiMarket } from '@/lib/ui-market';
import WorldCupClient from './WorldCupClient';

export const dynamic = 'force-dynamic';

export default async function WorldCupPage() {
  let upcomingFixtures: { homeTeam: string; awayTeam: string; league: string }[] = [];
  let liveMatches: { homeTeam: string; awayTeam: string; homeScore: number; awayScore: number; minute: number }[] = [];
  let footballMarkets: Market[] = [];

  try {
    const chainMarkets = await getMarketsFromChain();
    footballMarkets = chainMarkets
      .map(serializeMarket)
      .filter((market) => market.category === 'FOOTBALL')
      .map(toUiMarket);
  } catch {
    footballMarkets = [];
  }

  return (
    <WorldCupClient
      upcomingFixtures={upcomingFixtures}
      liveMatches={liveMatches}
      footballMarkets={footballMarkets}
    />
  );
}
