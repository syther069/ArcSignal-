import { fetchUpcomingFixtures, fetchLiveMatches } from '@/lib/apifootball';
import { Market } from '@/types';
import WorldCupClient from './WorldCupClient';

export const revalidate = 60;

export default async function WorldCupPage() {
  let upcomingFixtures: { homeTeam: string; awayTeam: string; league: string }[] = [];
  let liveMatches: { homeTeam: string; awayTeam: string; homeScore: number; awayScore: number; minute: number }[] = [];
  let footballMarkets: Market[] = [];

  try {
    const [fixtures, live, marketsRes] = await Promise.all([
      fetchUpcomingFixtures(),
      fetchLiveMatches(),
      fetch('http://localhost:3000/api/markets', { cache: 'no-store' }),
    ]);
    const data = await marketsRes.json();
    const markets: Market[] = data.markets || [];
    footballMarkets = markets.filter(m => m.category.toLowerCase() === 'football' || m.category.toLowerCase() === 'sports');
    upcomingFixtures = fixtures.map((fixture) => ({
      homeTeam: fixture.homeTeam,
      awayTeam: fixture.awayTeam,
      league: fixture.leagueName,
    }));
    liveMatches = live;
    footballMarkets = markets;
  } catch (error) {
    console.error('Failed to fetch World Cup data:', error);
  }

  return (
    <WorldCupClient
      upcomingFixtures={upcomingFixtures}
      liveMatches={liveMatches}
      footballMarkets={footballMarkets}
    />
  );
}
