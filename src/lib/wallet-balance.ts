import { formatUnits, type Address } from 'viem';
import { ARCSIGNAL_ADDRESS, publicClient, USDC_ABI, USDC_ADDRESS } from './contracts';

export function isWalletAddress(value: string): value is Address {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

export async function readArcWalletUsdc(address: Address) {
  const [nativeWei, erc20Raw, allowanceRaw] = await Promise.all([
    publicClient.getBalance({ address }),
    publicClient.readContract({
      address: USDC_ADDRESS,
      abi: USDC_ABI,
      functionName: 'balanceOf',
      args: [address],
    }),
    publicClient.readContract({
      address: USDC_ADDRESS,
      abi: USDC_ABI,
      functionName: 'allowance',
      args: [address, ARCSIGNAL_ADDRESS],
    }),
  ]);

  return {
    nativeWei,
    erc20Raw: erc20Raw as bigint,
    allowanceRaw: allowanceRaw as bigint,
  };
}

export function serializeArcWalletUsdc(value: Awaited<ReturnType<typeof readArcWalletUsdc>>) {
  return {
    nativeWei: value.nativeWei.toString(),
    erc20Raw: value.erc20Raw.toString(),
    allowanceRaw: value.allowanceRaw.toString(),
    usdc: formatUnits(value.erc20Raw, 6),
    nativeUsdc: formatUnits(value.nativeWei, 18),
  };
}
