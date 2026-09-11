export const V2_MARKET_STATES = ['OPEN', 'CLOSED', 'RESOLVED', 'VOIDED'] as const;
export const V2_ORACLE_STATES = ['NONE', 'REQUESTED', 'PROPOSED', 'DISPUTED', 'SETTLED'] as const;
export const V2_OUTCOMES = [null, 'YES', 'NO', 'UNDETERMINED'] as const;

export function v2MarketStateLabel(value: number) {
  const label = V2_MARKET_STATES[value];
  if (!label) throw new Error(`Unknown V2 market state: ${value}`);
  return label;
}

export function v2OracleStateLabel(value: number) {
  const label = V2_ORACLE_STATES[value];
  if (!label) throw new Error(`Unknown V2 oracle state: ${value}`);
  return label;
}

export function v2OutcomeLabel(value: number) {
  if (!Number.isInteger(value) || value < 0 || value >= V2_OUTCOMES.length) {
    throw new Error(`Unknown V2 outcome: ${value}`);
  }
  return V2_OUTCOMES[value];
}

export function serializeV2EventArgs(args: unknown): string {
  return JSON.stringify(args, (_key, value) => typeof value === 'bigint' ? value.toString() : value);
}

export function v2ChunkEnd(fromBlock: bigint, finalizedHead: bigint, chunkSize: bigint) {
  if (fromBlock < 0n || finalizedHead < 0n || chunkSize <= 0n) throw new Error('Invalid V2 index range');
  const candidate = fromBlock + chunkSize - 1n;
  return candidate < finalizedHead ? candidate : finalizedHead;
}
