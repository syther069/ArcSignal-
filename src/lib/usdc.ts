import { formatUnits, parseUnits, type Address, type PublicClient, type WalletClient } from 'viem';
import { ARCSIGNAL_ADDRESS, USDC_ABI, USDC_ADDRESS } from './contracts';

export { ARCSIGNAL_ADDRESS, USDC_ABI, USDC_ADDRESS };
export const ArcSignal_ADDRESS = ARCSIGNAL_ADDRESS;

export async function getUSDCBalance(
  address: Address,
  publicClient: PublicClient,
) {
  const balance = await publicClient.readContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: [address],
  });

  return formatUnits(balance, 6);
}

export async function approveUSDC(
  amount: string | number | bigint,
  walletClient: WalletClient,
) {
  if (!walletClient.account) {
    throw new Error('Wallet client account is required to approve USDC');
  }

  const parsedAmount =
    typeof amount === 'bigint' ? amount : parseUnits(amount.toString(), 6);

  return walletClient.writeContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'approve',
    args: [ARCSIGNAL_ADDRESS, parsedAmount],
    account: walletClient.account,
    chain: walletClient.chain,
  });
}
