const NATIVE_TO_ERC20_DECIMAL_SCALE = 1_000_000_000_000n;
const MINIMUM_GAS_RESERVE_USDC = 10_000n; // 0.01 USDC
const APPROVAL_AND_STAKE_GAS_UNITS = 300_000n;
const STAKE_ONLY_GAS_UNITS = 200_000n;

function ceilDiv(value: bigint, divisor: bigint) {
  return (value + divisor - 1n) / divisor;
}

export function calculateArcGasReserveUsdc(gasPrice: bigint, needsApproval: boolean) {
  const gasUnits = needsApproval ? APPROVAL_AND_STAKE_GAS_UNITS : STAKE_ONLY_GAS_UNITS;
  const dynamicReserve = ceilDiv(gasPrice * gasUnits, NATIVE_TO_ERC20_DECIMAL_SCALE);
  return dynamicReserve > MINIMUM_GAS_RESERVE_USDC
    ? dynamicReserve
    : MINIMUM_GAS_RESERVE_USDC;
}

export function calculateMaxArcStakeUsdc(
  balance: bigint,
  gasPrice: bigint,
  needsApproval: boolean,
) {
  const reserve = calculateArcGasReserveUsdc(gasPrice, needsApproval);
  return {
    reserve,
    maxStake: balance > reserve ? balance - reserve : 0n,
  };
}

export function calculateMaxArcStakeForAllowance(
  balance: bigint,
  allowance: bigint,
  gasPrice: bigint,
) {
  const stakeOnly = calculateMaxArcStakeUsdc(balance, gasPrice, false);
  return calculateMaxArcStakeUsdc(
    balance,
    gasPrice,
    allowance < stakeOnly.maxStake,
  );
}