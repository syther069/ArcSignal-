import type { AIAgent, AISignal, AgentLeaderboardEntry, BinaryResult, ScoringMetrics } from './types';

export function validProbability(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}
export function scorePrediction(probability: number, result: BinaryResult) {
  if (!validProbability(probability) || (result !== 'YES' && result !== 'NO')) {
    throw new Error('A finite probability in [0, 1] and a YES/NO result are required');
  }
  const actual = result === 'YES' ? 1 : 0;
  const p = Math.max(0.001, Math.min(0.999, probability));
  return {
    accuracy: Number((probability >= 0.5) === (actual === 1)),
    brierScore: (probability - actual) ** 2,
    logLoss: -(actual * Math.log(p) + (1 - actual) * Math.log(1 - p)),
  };
}
export function isScorable(signal: AISignal): boolean {
  return signal.status === 'resolved' && validProbability(signal.probability)
    && (signal.finalResult === 'YES' || signal.finalResult === 'NO')
    && signal.resolvedAt !== null && Number.isFinite(Date.parse(signal.resolvedAt))
    && Number.isFinite(Date.parse(signal.generatedAt))
    && Date.parse(signal.generatedAt) < Date.parse(signal.resolvedAt);
}
export function aggregateSignals(signals: AISignal[]): ScoringMetrics {
  const resolved = signals.filter(isScorable);
  const scores = resolved.map(s => scorePrediction(s.probability, s.finalResult!));
  const mean = (values: number[]) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  const calibration = Array.from({ length: 10 }, (_, index) => {
    // Half-open intervals, with 100% included in the final bucket.
    const bucket = resolved.filter(s => Math.min(9, Math.floor(s.probability * 10)) === index);
    return { lower: index / 10, upper: (index + 1) / 10, count: bucket.length,
      predicted: mean(bucket.map(s => s.probability)),
      observed: mean(bucket.map(s => Number(s.finalResult === 'YES'))) };
  });
  const pending = signals.filter(s => s.status === 'pending').length;
  return {
    total: signals.length, resolved: resolved.length, pending,
    excluded: signals.length - resolved.length - pending,
    accuracy: mean(scores.map(s => s.accuracy)), brierScore: mean(scores.map(s => s.brierScore)),
    logLoss: mean(scores.map(s => s.logLoss)),
    // Expected calibration error, weighted by bucket population. Lower is better.
    calibrationScore: resolved.length ? calibration.reduce((sum, b) => sum + b.count * Math.abs((b.predicted ?? 0) - (b.observed ?? 0)), 0) / resolved.length : null,
    // Self-reported model confidence, normalized to [0,1], on scored predictions only.
    averageConfidence: mean(resolved.map(s => s.confidence).filter(validProbability)), calibration,
  };
}
export function buildLeaderboard(agents: AIAgent[], signals: AISignal[]): AgentLeaderboardEntry[] {
  const entries = agents.map(agent => {
    const own = signals.filter(s => s.agentId === agent.id);
    const group = (key: 'category' | 'timeHorizon') => Object.fromEntries(
      [...new Set(own.map(s => s[key]))].sort().map(value => [value, aggregateSignals(own.filter(s => s[key] === value))]),
    );
    const dates = own.flatMap(s => [s.generatedAt, ...(s.resolvedAt ? [s.resolvedAt] : [])])
      .filter(date => Number.isFinite(Date.parse(date))).sort((a, b) => Date.parse(a) - Date.parse(b));
    const predictions = [...own].sort((a, b) => Date.parse(b.generatedAt) - Date.parse(a.generatedAt)).slice(0, 5)
      .map(({ id, marketId, question, generatedAt, probability, status, finalResult }) => ({ id, marketId, question, generatedAt, probability, status, finalResult }));
    return { agent, ...aggregateSignals(own), rank: null as number | null,
      updatedAt: dates.at(-1) ?? null, byCategory: group('category'), byTimeHorizon: group('timeHorizon'), predictions };
  }).sort((a, b) => (a.brierScore ?? Infinity) - (b.brierScore ?? Infinity) || b.resolved - a.resolved || a.agent.id.localeCompare(b.agent.id));
  let previousScore: number | null = null;
  let rank = 0;
  return entries.map((entry, index) => {
    if (entry.resolved) {
      if (entry.brierScore !== previousScore) rank = index + 1;
      entry.rank = rank;
      previousScore = entry.brierScore;
    }
    return entry;
  });
}
