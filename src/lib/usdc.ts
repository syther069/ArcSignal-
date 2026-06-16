import { formatUnits, parseUnits, type Address, type PublicClient, type WalletClient } from 'viem';

export const USDC_ABI = [
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'allowance',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'decimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    type: 'function',
    name: 'transfer',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

export const USDC_ADDRESS = process.env
  .NEXT_PUBLIC_USDC_CONTRACT_ADDRESS as Address;

export const MATCHMIND_ADDRESS = process.env
  .NEXT_PUBLIC_ARCSIGNAL_CONTRACT_ADDRESS as Address;

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
    args: [MATCHMIND_ADDRESS, parsedAmount],
    account: walletClient.account,
    chain: walletClient.chain,
  });
}
