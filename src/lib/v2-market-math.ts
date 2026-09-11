export const BPS = 10_000n;

export function quoteV2ExactInput(input: {
  amountIn: bigint;
  reserveIn: bigint;
  reserveOut: bigint;
  protocolFeeBps: bigint;
  lpFeeBps: bigint;
}): bigint {
  const { amountIn, reserveIn, reserveOut, protocolFeeBps, lpFeeBps } = input;
  if (amountIn < 0n || reserveIn < 0n || reserveOut < 0n) throw new Error('Amounts cannot be negative');
  if (protocolFeeBps < 0n || lpFeeBps < 0n || protocolFeeBps + lpFeeBps >= BPS) {
    throw new Error('Invalid fee configuration');
  }
  if (amountIn === 0n || reserveIn === 0n || reserveOut === 0n) return 0n;
  const effectiveInput = amountIn * (BPS - protocolFeeBps - lpFeeBps) / BPS;
  return reserveOut * effectiveInput / (reserveIn + effectiveInput);
}

export function protocolFeeForInput(amountIn: bigint, protocolFeeBps: bigint): bigint {
  if (amountIn < 0n || protocolFeeBps < 0n || protocolFeeBps > BPS) throw new Error('Invalid fee input');
  return amountIn * protocolFeeBps / BPS;
}

export function liquidityShares(input: {
  yesAmount: bigint;
  noAmount: bigint;
  yesReserve: bigint;
  noReserve: bigint;
  totalSupply: bigint;
}): bigint {
  const { yesAmount, noAmount, yesReserve, noReserve, totalSupply } = input;
  if ([yesAmount, noAmount, yesReserve, noReserve, totalSupply].some((value) => value < 0n)) {
    throw new Error('Amounts cannot be negative');
  }
  if (totalSupply === 0n) return integerSquareRoot(yesAmount * noAmount);
  if (yesReserve === 0n || noReserve === 0n) throw new Error('Invalid reserves');
  const yesShares = yesAmount * totalSupply / yesReserve;
  const noShares = noAmount * totalSupply / noReserve;
  return yesShares < noShares ? yesShares : noShares;
}

export function voidPayout(yesAmount: bigint, noAmount: bigint): bigint {
  if (yesAmount < 0n || noAmount < 0n) throw new Error('Amounts cannot be negative');
  return (yesAmount + noAmount) / 2n;
}

export function integerSquareRoot(value: bigint): bigint {
  if (value < 0n) throw new Error('Cannot take the square root of a negative value');
  if (value < 2n) return value;
  let x = value;
  let y = (x + 1n) / 2n;
  while (y < x) {
    x = y;
    y = (x + value / x) / 2n;
  }
  return x;
}
