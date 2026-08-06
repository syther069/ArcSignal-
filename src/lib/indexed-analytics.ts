import { getSql } from './db';

export async function getIndexedAnalytics() {
  const sql = getSql();
  const rows = await sql`
    select market_id, category, question, resolution_time, follow_pool, fade_pool,
           resolved, outcome, analysis_json
    from markets_index
    order by resolution_time desc
  `;
  if (rows.length === 0) return null;

  const markets = rows.map((row) => {
    let analysis: Record<string, unknown> = {};
    try { analysis = row.analysis_json ? JSON.parse(String(row.analysis_json)) : {}; } catch { /* tolerate malformed legacy data */ }
    return {
      marketId: row.market_id,
      category: row.category,
      question: row.question,
      title: row.question,
      resolutionTime: Number(row.resolution_time),
      followPool: String(row.follow_pool),
      fadePool: String(row.fade_pool),
      resolved: Boolean(row.resolved),
      outcome: Number(row.outcome) === 1 ? 'FOLLOW' : Number(row.outcome) === 2 ? 'FADE' : 'PENDING',
      confidence: Number(analysis.confidence ?? 0),
      probability: Number(analysis.probability ?? 0),
      aiSignal: analysis.prediction ?? 'PENDING',
      analysis,
    };
  });

  const totalFollow = markets.reduce((sum, market) => sum + Number(market.followPool) / 1e6, 0);
  const totalFade = markets.reduce((sum, market) => sum + Number(market.fadePool) / 1e6, 0);
  const resolved = markets.filter((market) => market.resolved);
  const cryptoResolved = resolved.filter((market) => market.category === 'CRYPTO');
  const footballResolved = resolved.filter((market) => market.category === 'FOOTBALL');
  const cryptoCorrect = cryptoResolved.filter((market) => market.outcome === 'FOLLOW').length;
  const footballCorrect = footballResolved.filter((market) => market.outcome === 'FOLLOW').length;
  const totalVolume = totalFollow + totalFade;
  const avgConfidence = markets.length > 0 ? Math.round(markets.reduce((sum, market) => sum + market.confidence, 0) / markets.length) : 0;

  return {
    markets,
    resolvedMarkets: resolved,
    agentWinRates: [
      { category: 'Football', rate: footballResolved.length ? Math.round((footballCorrect / footballResolved.length) * 100) : 0 },
      { category: 'Crypto', rate: cryptoResolved.length ? Math.round((cryptoCorrect / cryptoResolved.length) * 100) : 0 },
    ],
    volumeData: [],
    ratioData: [
      { name: 'Follow AI', value: totalFollow, color: '#34d399' },
      { name: 'Fade AI', value: totalFade, color: '#f87171' },
    ],
    topMarketsData: [...markets]
      .sort((a, b) => Number(b.followPool) + Number(b.fadePool) - Number(a.followPool) - Number(a.fadePool))
      .slice(0, 5)
      .map((market) => ({ name: market.title.slice(0, 20), volume: (Number(market.followPool) + Number(market.fadePool)) / 1e6 })),
    stats: {
      totalVolume,
      totalStakedUsdc: totalVolume,
      avgConfidence,
      activeMarkets: markets.filter((market) => !market.resolved).length,
      totalStakes: 0,
      totalMarkets: markets.length,
      pendingCount: markets.filter((market) => !market.resolved).length,
      resolvedCount: resolved.length,
      followPercent: totalVolume ? Math.round((totalFollow / totalVolume) * 100) : 0,
      fadePercent: totalVolume ? Math.round((totalFade / totalVolume) * 100) : 0,
      aiAccuracy: cryptoResolved.length ? Math.round((cryptoCorrect / cryptoResolved.length) * 100) : 0,
    },
  };
}
