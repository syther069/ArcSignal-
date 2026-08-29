import { Market } from '@/types';
import { serializeMarket } from '@/lib/markets';
import { getIndexedMarkets } from '@/lib/indexed-markets';
import { toUiMarket } from '@/lib/ui-market';
import { fetchUpcomingFixtures, fetchLiveMatches } from '@/lib/apifootball';
import WorldCupClient from './WorldCupClient';

export const dynamic = 'force-dynamic';

export default async function WorldCupPage() {
  let upcomingFixtures: { homeTeam: string; awayTeam: string; league: string }[] = [];
  let liveMatches: { homeTeam: string; awayTeam: string; homeScore: number; awayScore: number; minute: number }[] = [];
  let footballMarkets: Market[] = [];

  const [marketsResult, fixturesResult, liveMatchesResult] = await Promise.allSettled([
    getIndexedMarkets(160, 0),
    process.env.API_FOOTBALL_KEY ? fetchUpcomingFixtures() : Promise.resolve([]),
    process.env.API_FOOTBALL_KEY ? fetchLiveMatches() : Promise.resolve([]),
  ]);

  if (marketsResult.status === 'fulfilled') {
    footballMarkets = marketsResult.value
      .map(serializeMarket)
      .filter((market) => market.category === 'FOOTBALL')
      .map(toUiMarket);
  } else {
    console.error('Football market index unavailable:', marketsResult.reason);
  }

  if (fixturesResult.status === 'fulfilled') {
    upcomingFixtures = fixturesResult.value.slice(0, 6).map((fixture) => ({
      homeTeam: fixture.homeTeam,
      awayTeam: fixture.awayTeam,
      league: fixture.leagueName,
    }));
  } else {
    console.warn('Failed to load upcoming football fixtures:', fixturesResult.reason);
  }

  if (liveMatchesResult.status === 'fulfilled') {
    liveMatches = liveMatchesResult.value;
  } else {
    console.warn('Failed to load live football matches:', liveMatchesResult.reason);
  }

  return (
    <WorldCupClient
      upcomingFixtures={upcomingFixtures}
      liveMatches={liveMatches}
      footballMarkets={footballMarkets}
    />
  );
}
