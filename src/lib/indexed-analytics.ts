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
      // Keep dashboard values in human-readable USDC units. The index stores
      // six-decimal token amounts as numeric strings.
      followPool: Number(row.follow_pool) / 1e6,
      fadePool: Number(row.fade_pool) / 1e6,
      resolved: Boolean(row.resolved),
      outcome: Number(row.outcome) === 1 ? 'FOLLOW' : Number(row.outcome) === 2 ? 'FADE' : 'PENDING',
      confidence: Number(analysis.confidence ?? 0),
      probability: Number(analysis.probability ?? 0),
      aiSignal: analysis.prediction ?? 'PENDING',
      analysis,
    };
  });

  const totalFollow = markets.reduce((sum, market) => sum + market.followPool, 0);
  const totalFade = markets.reduce((sum, market) => sum + market.fadePool, 0);
  const resolved = markets.filter((market) => market.resolved);
  const cryptoResolved = resolved.filter((market) => market.category === 'CRYPTO');
  const footballResolved = resolved.filter((market) => market.category === 'FOOTBALL');
  const cryptoCorrect = cryptoResolved.filter((market) => market.outcome === 'FOLLOW').length;
  const footballCorrect = footballResolved.filter((market) => market.outcome === 'FOLLOW').length;
  const resolvedWithAccuracy = resolved.map((market, index) => {
    const cryptoResolvedBefore = resolved.slice(0, index + 1).filter((item) => item.category === 'CRYPTO');
    const footballResolvedBefore = resolved.slice(0, index + 1).filter((item) => item.category === 'FOOTBALL');
    return {
      ...market,
      resolutionDate: new Date(market.resolutionTime * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      cryptoAccuracy: cryptoResolvedBefore.length
        ? Math.round((cryptoResolvedBefore.filter((item) => item.outcome === 'FOLLOW').length / cryptoResolvedBefore.length) * 100)
        : null,
      footballAccuracy: footballResolvedBefore.length
        ? Math.round((footballResolvedBefore.filter((item) => item.outcome === 'FOLLOW').length / footballResolvedBefore.length) * 100)
        : null,
    };
  });
  const totalVolume = totalFollow + totalFade;
  const avgConfidence = markets.length > 0 ? Math.round(markets.reduce((sum, market) => sum + market.confidence, 0) / markets.length) : 0;

  return {
    markets,
    resolvedMarkets: resolvedWithAccuracy,
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
      .map((market) => ({ name: market.title.slice(0, 20), volume: market.followPool + market.fadePool })),
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
      aiAccuracy: resolved.length ? Math.round(((cryptoCorrect + footballCorrect) / resolved.length) * 100) : null,
    },
  };
}
