import { formatUnits } from 'viem';
import type { MarketSnapshot } from './market-source';

export function buildMarketAnalytics(snapshot: MarketSnapshot) {
  const markets = snapshot.markets.map((market) => ({
    marketId: market.marketId,
    category: market.category,
    title: market.question ?? market.marketId,
    resolutionTime: market.resolutionTime,
    followPool: Number(formatUnits(market.followPool, 6)),
    fadePool: Number(formatUnits(market.fadePool, 6)),
    resolved: market.resolved,
    outcome: market.outcome,
    confidence: market.analysis?.confidence ?? 0,
  }));

  const totalFollow = markets.reduce((sum, market) => sum + market.followPool, 0);
  const totalFade = markets.reduce((sum, market) => sum + market.fadePool, 0);
  const totalVolume = totalFollow + totalFade;
  const resolved = markets.filter((market) => market.resolved);
  const validResolved = resolved.filter(
    (market) => market.outcome === 'FOLLOW' || market.outcome === 'FADE',
  );
  const cancelled = resolved.filter(
    (market) => market.outcome !== 'FOLLOW' && market.outcome !== 'FADE',
  );
  const cryptoResolved = validResolved.filter((market) => market.category === 'CRYPTO');
  const footballResolved = validResolved.filter((market) => market.category === 'FOOTBALL');
  const cryptoCorrect = cryptoResolved.filter((market) => market.outcome === 'FOLLOW').length;
  const footballCorrect = footballResolved.filter((market) => market.outcome === 'FOLLOW').length;

  let runningCryptoTotal = 0;
  let runningCryptoCorrect = 0;
  let runningFootballTotal = 0;
  let runningFootballCorrect = 0;
  const resolvedMarkets = [...resolved]
    .sort((a, b) => a.resolutionTime - b.resolutionTime)
    .map((market) => {
      if (market.category === 'CRYPTO' && market.outcome !== 'CANCELLED') {
        runningCryptoTotal += 1;
        if (market.outcome === 'FOLLOW') runningCryptoCorrect += 1;
      } else if (market.category === 'FOOTBALL' && market.outcome !== 'CANCELLED') {
        runningFootballTotal += 1;
        if (market.outcome === 'FOLLOW') runningFootballCorrect += 1;
      }

      return {
        ...market,
        resolutionDate: new Date(market.resolutionTime * 1000).toLocaleDateString(
          'en-US',
          { month: 'short', day: 'numeric' },
        ),
        cryptoAccuracy: runningCryptoTotal > 0
          ? Math.round((runningCryptoCorrect / runningCryptoTotal) * 100)
          : null,
        footballAccuracy: runningFootballTotal > 0
          ? Math.round((runningFootballCorrect / runningFootballTotal) * 100)
          : null,
      };
    });

  return {
    markets,
    resolvedMarkets,
    agentWinRates: [
      {
        category: 'Football',
        rate: footballResolved.length
          ? Math.round((footballCorrect / footballResolved.length) * 100)
          : 0,
      },
      {
        category: 'Crypto',
        rate: cryptoResolved.length
          ? Math.round((cryptoCorrect / cryptoResolved.length) * 100)
          : 0,
      },
    ],
    volumeData: [],
    ratioData: [
      { name: 'Follow AI', value: totalFollow, color: '#34d399' },
      { name: 'Fade AI', value: totalFade, color: '#f87171' },
    ],
    topMarketsData: [...markets]
      .sort((a, b) => b.followPool + b.fadePool - a.followPool - a.fadePool)
      .slice(0, 5)
      .map((market) => ({
        name: market.title.length > 20 ? `${market.title.slice(0, 20)}...` : market.title,
        volume: market.followPool + market.fadePool,
      })),
    stats: {
      totalVolume,
      totalStakedUsdc: totalVolume,
      avgConfidence: markets.length
        ? Math.round(markets.reduce((sum, market) => sum + market.confidence, 0) / markets.length)
        : 0,
      activeMarkets: markets.filter((market) => !market.resolved).length,
      totalStakes: 0,
      totalMarkets: markets.length,
      pendingCount: markets.filter((market) => !market.resolved).length,
      resolvedCount: resolved.length,
      cancelledCount: cancelled.length,
      averageLiquidity: markets.length ? totalVolume / markets.length : 0,
      dataAsOf: snapshot.fetchedAt,
      dataSource: snapshot.source === 'neon'
        ? 'NEON INDEX'
        : snapshot.complete
          ? 'ARC CHAIN'
          : 'ARC CHAIN — LATEST 60',
      dataComplete: snapshot.complete,
      followPercent: totalVolume ? Math.round((totalFollow / totalVolume) * 100) : 0,
      fadePercent: totalVolume ? Math.round((totalFade / totalVolume) * 100) : 0,
      aiAccuracy: validResolved.length
        ? Math.round(((cryptoCorrect + footballCorrect) / validResolved.length) * 100)
        : null,
    },
  };
}