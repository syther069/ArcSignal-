import { createPublicClient, http, parseUnits, type Address, type WalletClient } from 'viem';
import { arcTestnet, arcTestnetConfig } from './arc';
import { approveUSDC, MATCHMIND_ADDRESS, USDC_ABI, USDC_ADDRESS } from './usdc';

const MATCHMIND_ABI = [
  {
    type: 'function',
    name: 'stake',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'marketId', type: 'string' },
      { name: 'side', type: 'uint8' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
] as const;

const publicClient = createPublicClient({
  chain: arcTestnet,
  transport: http(arcTestnetConfig.rpcUrl),
});

export async function stakeOnMarket(
  marketId: bigint | number | string,
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
    args: [userAddress, MATCHMIND_ADDRESS],
  });

  if (allowance < amount) {
    const approvalHash = await approveUSDC(amount, walletClient);
    await publicClient.waitForTransactionReceipt({ hash: approvalHash });
  }

  return walletClient.writeContract({
    address: MATCHMIND_ADDRESS,
    abi: MATCHMIND_ABI,
    functionName: 'stake',
    args: [marketId.toString(), side, amount],
    account: userAddress,
    chain: arcTestnet,
  });
}
