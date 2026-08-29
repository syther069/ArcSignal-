import { getSql } from './db';

export async function getIndexedAnalytics(limit = 160) {
  const sql = getSql();
  const rows = await sql`
    select market_id, category, question, resolution_time, follow_pool, fade_pool,
           resolved, outcome, analysis_json
    from markets_index
    order by resolution_time desc
    limit ${limit}
  `;
  if (rows.length === 0) return null;

  const markets = rows.map((row) => {
    let analysis: Record<string, unknown> = {};
    try {
      analysis = typeof row.analysis_json === 'object'
        ? row.analysis_json as Record<string, unknown>
        : row.analysis_json
          ? JSON.parse(String(row.analysis_json))
          : {};
    } catch {
      // Tolerate malformed legacy data without transferring it to the client.
    }

    return {
      marketId: String(row.market_id),
      category: String(row.category),
      title: row.question,
      resolutionTime: Number(row.resolution_time),
      // Keep dashboard values in human-readable USDC units. The index stores
      // six-decimal token amounts as numeric strings.
      followPool: Number(row.follow_pool) / 1e6,
      fadePool: Number(row.fade_pool) / 1e6,
      resolved: Boolean(row.resolved),
      outcome: Number(row.outcome) === 1 ? 'FOLLOW' : Number(row.outcome) === 2 ? 'FADE' : 'PENDING',
      confidence: Number(analysis.confidence ?? 0),
    };
  });

  const totalFollow = markets.reduce((sum, market) => sum + market.followPool, 0);
  const totalFade = markets.reduce((sum, market) => sum + market.fadePool, 0);
  const resolved = markets.filter((market) => market.resolved);
  const cancelled = resolved.filter((market) => market.outcome === 'PENDING');
  const cryptoResolved = resolved.filter((market) => market.category === 'CRYPTO');
  const footballResolved = resolved.filter((market) => market.category === 'FOOTBALL');
  const cryptoCorrect = cryptoResolved.filter((market) => market.outcome === 'FOLLOW').length;
  const footballCorrect = footballResolved.filter((market) => market.outcome === 'FOLLOW').length;

  let runningCryptoTotal = 0;
  let runningCryptoCorrect = 0;
  let runningFootballTotal = 0;
  let runningFootballCorrect = 0;

  const resolvedWithAccuracy = [...resolved]
    .sort((a, b) => a.resolutionTime - b.resolutionTime)
    .map((market) => {
    if (market.category === 'CRYPTO') {
      runningCryptoTotal += 1;
      if (market.outcome === 'FOLLOW') runningCryptoCorrect += 1;
    } else if (market.category === 'FOOTBALL') {
      runningFootballTotal += 1;
      if (market.outcome === 'FOLLOW') runningFootballCorrect += 1;
    }

      return {
        ...market,
        resolutionDate: new Date(market.resolutionTime * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        cryptoAccuracy: runningCryptoTotal > 0
          ? Math.round((runningCryptoCorrect / runningCryptoTotal) * 100)
          : null,
        footballAccuracy: runningFootballTotal > 0
          ? Math.round((runningFootballCorrect / runningFootballTotal) * 100)
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
      cancelledCount: cancelled.length,
      averageLiquidity: markets.length ? totalVolume / markets.length : 0,
      dataAsOf: new Date().toISOString(),
      dataSource: 'NEON INDEX',
      followPercent: totalVolume ? Math.round((totalFollow / totalVolume) * 100) : 0,
      fadePercent: totalVolume ? Math.round((totalFade / totalVolume) * 100) : 0,
      aiAccuracy: resolved.length ? Math.round(((cryptoCorrect + footballCorrect) / resolved.length) * 100) : null,
    },
  };
}
