import { getSql } from './db';

export interface ResolutionEvidence {
  provider: string | null;
  observedValue: string | null;
  observedAt: string | null;
  decisionReason: string | null;
  questionResult: 'YES' | 'NO' | null;
  prediction: 'YES' | 'NO' | null;
  outcome: number | null;
  transactionHash: string | null;
  recordedAt: string;
}

export async function getResolutionEvidence(marketId: string): Promise<ResolutionEvidence | null> {
  try {
    const sql = getSql();
    const rows = await sql`
      select provider, observed_value, observed_at, decision_reason,
             question_result, prediction, outcome, transaction_hash, attempted_at
      from oracle_attempts
      where market_id = ${marketId} and status = 'CONFIRMED'
      order by attempted_at desc
      limit 1
    `;
    const row = rows[0];
    if (!row) return null;

    const questionResult = String(row.question_result ?? '').toUpperCase();
    const prediction = String(row.prediction ?? '').toUpperCase();
    return {
      provider: row.provider ? String(row.provider) : null,
      observedValue: row.observed_value ? String(row.observed_value) : null,
      observedAt: row.observed_at ? new Date(String(row.observed_at)).toISOString() : null,
      decisionReason: row.decision_reason ? String(row.decision_reason) : null,
      questionResult: questionResult === 'YES' || questionResult === 'NO' ? questionResult : null,
      prediction: prediction === 'YES' || prediction === 'NO' ? prediction : null,
      outcome: row.outcome == null ? null : Number(row.outcome),
      transactionHash: row.transaction_hash ? String(row.transaction_hash) : null,
      recordedAt: new Date(String(row.attempted_at)).toISOString(),
    };
  } catch (error) {
    console.warn(`Resolution evidence unavailable for ${marketId}:`, error);
    return null;
  }
}
