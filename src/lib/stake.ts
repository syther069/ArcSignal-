import { parseUnits, type Address, type WalletClient } from 'viem';
import { arcTestnet, ARCSIGNAL_ABI, ARCSIGNAL_ADDRESS, publicClient, USDC_ABI, USDC_ADDRESS } from './contracts';
import { approveUSDC } from './usdc';

export async function stakeOnMarket(
  marketId: string,
  side: 0 | 1,
  amountUSDC: string | number,
  userAddress: Address,
  walletClient: WalletClient,
) {
  const amount = parseUnits(amountUSDC.toString(), 6);

  const balance = await publicClient.readContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: [userAddress],
  });

  if (balance < amount) {
    throw new Error('Insufficient USDC balance');
  }

  const allowance = await publicClient.readContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'allowance',
    args: [userAddress, ARCSIGNAL_ADDRESS],
  });

  if (allowance < amount) {
    const approvalHash = await approveUSDC(amount, walletClient);
    await publicClient.waitForTransactionReceipt({ hash: approvalHash });
  }

  return walletClient.writeContract({
    address: ARCSIGNAL_ADDRESS,
    abi: ARCSIGNAL_ABI,
    functionName: 'stake',
    args: [marketId, side, amount],
    account: userAddress,
    chain: arcTestnet,
  });
}
