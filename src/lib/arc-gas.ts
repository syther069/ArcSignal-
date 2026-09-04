const NATIVE_TO_ERC20_DECIMAL_SCALE = 1_000_000_000_000n;
const NATIVE_WEI_PER_USDC = 1_000_000_000_000_000_000n;
const NATIVE_WEI_PER_CENT = 10_000_000_000_000_000n;
const MINIMUM_GAS_RESERVE_USDC = 10_000n; // 0.01 USDC
const APPROVAL_AND_STAKE_GAS_UNITS = 300_000n;
const STAKE_ONLY_GAS_UNITS = 200_000n;

export const ARC_NETWORK_FEE_HELPER = 'Paid in native USDC on Arc.';

function nativeFeeWei(gasLimit: bigint, maxFeePerGas: bigint) {
  return gasLimit * maxFeePerGas;
}

function formatNativeWeiAsUsdc(wei: bigint) {
  const whole = wei / NATIVE_WEI_PER_USDC;
  const frac = wei % NATIVE_WEI_PER_USDC;
  if (frac === 0n) return whole.toString();
  const fracStr = frac.toString().padStart(18, '0').replace(/0+$/, '');
  return `${whole.toString()}.${fracStr}`;
}

/** Format native Arc gas (18-decimal USDC wei) as a USD-style fee for UI. */
export function formatArcNetworkFee(gasLimit: bigint, maxFeePerGas: bigint) {
  const feeWei = nativeFeeWei(gasLimit, maxFeePerGas);
  if (feeWei < NATIVE_WEI_PER_CENT) return '< $0.01';
  const cents = feeWei / NATIVE_WEI_PER_CENT;
  const dollars = cents / 100n;
  const remainder = cents % 100n;
  return `~$${dollars.toString()}.${remainder.toString().padStart(2, '0')}`;
}

/** Format native Arc gas (18-decimal USDC wei) as a USDC amount for UI. */
export function formatArcNetworkFeeUsdc(gasLimit: bigint, maxFeePerGas: bigint) {
  return `~${formatNativeWeiAsUsdc(nativeFeeWei(gasLimit, maxFeePerGas))} USDC`;
}

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