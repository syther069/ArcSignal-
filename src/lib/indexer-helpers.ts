export type IndexerProjection =
  | { kind: 'stake'; marketId: string; user: string; side: number; amount: bigint }
  | { kind: 'claim'; marketId: string; user: string; amount: bigint }
  | { kind: 'event'; marketId?: string };

export function readPositiveInteger(value: string | undefined, fallback: number, name: string): number {
  if (value === undefined || value.trim() === '') return fallback;
  if (!/^\d+$/.test(value)) throw new Error(`${name} must be a positive integer`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) throw new Error(`${name} must be a positive integer`);
  return parsed;
}

export function finalizedBlock(latestBlock: bigint, confirmations: bigint): bigint {
  return latestBlock > confirmations ? latestBlock - confirmations : 0n;
}

export function chunkEnd(fromBlock: bigint, finalizedHead: bigint, chunkSize: bigint): bigint {
  const candidate = fromBlock + chunkSize - 1n;
  return candidate < finalizedHead ? candidate : finalizedHead;
}

function requiredString(args: Record<string, unknown>, key: string, eventName: string): string {
  const value = args[key];
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${eventName} event is missing ${key}`);
  }
  return value;
}

function requiredBigInt(args: Record<string, unknown>, key: string, eventName: string): bigint {
  const value = args[key];
  if (typeof value !== 'bigint') throw new Error(`${eventName} event is missing ${key}`);
  return value;
}

export function projectionForEvent(eventName: string, args: Record<string, unknown>): IndexerProjection {
  const marketId = typeof args.marketId === 'string' && args.marketId.length > 0
    ? args.marketId
    : undefined;

  if (eventName === 'Staked') {
    const side = Number(args.side);
    if (side !== 0 && side !== 1) throw new Error('Staked event has an invalid side');
    return {
      kind: 'stake',
      marketId: requiredString(args, 'marketId', eventName),
      user: requiredString(args, 'user', eventName).toLowerCase(),
      side,
      amount: requiredBigInt(args, 'amount', eventName),
    };
  }

  if (eventName === 'Claimed') {
    return {
      kind: 'claim',
      marketId: requiredString(args, 'marketId', eventName),
      user: requiredString(args, 'user', eventName).toLowerCase(),
      amount: requiredBigInt(args, 'amount', eventName),
    };
  }

  return { kind: 'event', marketId };
}