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

export type SellPlan = {
  /** Tokens of the held side swapped into the other side. */
  swapIn: bigint;
  /** Minimum other-side tokens the swap must return (exactly what we redeem). */
  minOut: bigint;
  /** YES+NO pairs merged back into USDC; equals the USDC received. */
  pairs: bigint;
};

/**
 * Sell `amount` of one outcome token: swap part of it for the other side, then merge
 * pairs 1:1 back into USDC (`redeemPairs`). Picks the smallest swap whose output, after
 * the slippage cushion, still covers the remaining tokens, so USDC received is maximal.
 * The user's existing tokens of the other side are never touched.
 */
export function planSell(input: {
  amount: bigint;
  reserveHeld: bigint;
  reserveOther: bigint;
  protocolFeeBps: bigint;
  lpFeeBps: bigint;
  slippageBps: bigint;
}): SellPlan | null {
  const { amount, reserveHeld, reserveOther, protocolFeeBps, lpFeeBps, slippageBps } = input;
  if (amount <= 0n || reserveHeld <= 0n || reserveOther <= 0n) return null;
  if (slippageBps < 0n || slippageBps >= BPS) throw new Error('Invalid slippage');
  const cushionedOut = (swapIn: bigint) => quoteV2ExactInput({
    amountIn: swapIn, reserveIn: reserveHeld, reserveOut: reserveOther, protocolFeeBps, lpFeeBps,
  }) * (BPS - slippageBps) / BPS;
  // Smallest s in [0, amount] with cushionedOut(s) >= amount - s (true at s = amount).
  let lo = 0n;
  let hi = amount;
  while (lo < hi) {
    const mid = (lo + hi) / 2n;
    if (cushionedOut(mid) >= amount - mid) hi = mid;
    else lo = mid + 1n;
  }
  const pairs = amount - lo;
  if (pairs <= 0n || lo === 0n) return null;
  return { swapIn: lo, minOut: pairs, pairs };
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
