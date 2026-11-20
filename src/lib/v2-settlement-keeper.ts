/**
 * Pure decisions for the V2 settlement job. Nothing here talks to the chain or the database.
 *
 * The job proposes a result only when the existing settlement rules say "resolve". Anything else
 * (too early, late or mismatched price data, a match not finished) becomes manual review and is
 * never proposed automatically.
 */
import { decideCryptoResolution, type CryptoOracleSpec, type CryptoPriceObservation } from '@/lib/oracle-policy';
import { ORACLE_NO_PRICE, ORACLE_YES_PRICE } from '@/lib/settlement-oracle-abi';

export type ProposalDecision =
  | { action: 'propose'; questionResult: 'YES' | 'NO'; price: bigint; reason: string }
  | { action: 'wait'; reason: string }
  | { action: 'manual-review'; reason: string };

export function toOraclePrice(questionResult: 'YES' | 'NO'): bigint {
  return questionResult === 'YES' ? ORACLE_YES_PRICE : ORACLE_NO_PRICE;
}

export function decideCryptoProposal(spec: CryptoOracleSpec, observation: CryptoPriceObservation | null, now: number): ProposalDecision {
  if (!observation) {
    return now < spec.resolutionTimestamp
      ? { action: 'wait', reason: 'market has not closed yet' }
      : { action: 'manual-review', reason: 'no price was observed at close' };
  }
  const decision = decideCryptoResolution(spec, observation, now);
  if (decision.action === 'resolve') {
    return { action: 'propose', questionResult: decision.questionResult, price: toOraclePrice(decision.questionResult), reason: decision.reason };
  }
  return decision;
}

export type FixtureResult = { status: string; homeScore: number | null; awayScore: number | null } | null;

/** Only a finished match (FT) is proposed: home win = YES, draw or away win = NO. */
export function decideFootballProposal(fixtureId: number, fixture: FixtureResult): ProposalDecision {
  if (!fixture) return { action: 'manual-review', reason: `fixture ${fixtureId} not found` };
  if (fixture.status !== 'FT') {
    return ['NS', '1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE'].includes(fixture.status)
      ? { action: 'wait', reason: `fixture ${fixtureId} is ${fixture.status}` }
      : { action: 'manual-review', reason: `fixture ${fixtureId} ended as ${fixture.status}, not a normal full time` };
  }
  if (fixture.homeScore === null || fixture.awayScore === null) return { action: 'manual-review', reason: 'final score missing' };
  const questionResult = fixture.homeScore > fixture.awayScore ? 'YES' : 'NO';
  return { action: 'propose', questionResult, price: toOraclePrice(questionResult), reason: `fixture ${fixtureId}: ${fixture.homeScore}-${fixture.awayScore}` };
}

/**
 * Which markets need a close-time price observation now: open markets closing within `aheadSeconds`
 * (the job waits for them) and markets that closed less than `maxDelaySeconds` ago without one.
 */
export function needsObservation(closeTime: number, now: number, aheadSeconds: number, maxDelaySeconds: number): boolean {
  return closeTime - now <= aheadSeconds && now - closeTime < maxDelaySeconds;
}

/** The first observation at or after close, inside the policy's window, or null. */
export function acceptObservation(observedAt: number, closeTime: number, maxDelaySeconds: number): boolean {
  return observedAt >= closeTime && observedAt - closeTime <= maxDelaySeconds;
}
