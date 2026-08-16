import { Market } from '@/types';
import { getMarketsFromChain, serializeMarket } from '@/lib/markets';
import { toUiMarket } from '@/lib/ui-market';
import { fetchUpcomingFixtures, fetchLiveMatches } from '@/lib/apifootball';
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

  if (process.env.API_FOOTBALL_KEY) {
    try {
      const fixtures = await fetchUpcomingFixtures();
      upcomingFixtures = fixtures.slice(0, 6).map((f) => ({
        homeTeam: f.homeTeam,
        awayTeam: f.awayTeam,
        league: f.leagueName,
      }));
    } catch (e) {
      console.warn('Failed to load upcoming football fixtures:', e);
    }

    try {
      liveMatches = await fetchLiveMatches();
    } catch (e) {
      console.warn('Failed to load live football matches:', e);
    }
  }

  return (
    <WorldCupClient
      upcomingFixtures={upcomingFixtures}
      liveMatches={liveMatches}
      footballMarkets={footballMarkets}
    />
  );
}
