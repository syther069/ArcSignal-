import { createPublicClient, http, parseAbi, type Address } from 'viem';

const fallbackArcChainId = 5042002;

export const arcTestnet = {
  id: Number(process.env.NEXT_PUBLIC_ARC_TESTNET_CHAIN_ID ?? fallbackArcChainId),
  name: 'ARC Testnet',
  network: 'arc-testnet',
  nativeCurrency: { name: 'ARC', symbol: 'ARC', decimals: 18 },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_ARC_TESTNET_RPC_URL ??
          'https://rpc.testnet.arc.network',
      ],
    },
    public: {
      http: [
        process.env.NEXT_PUBLIC_ARC_TESTNET_RPC_URL ??
          'https://rpc.testnet.arc.network',
      ],
    },
  },
  blockExplorers: {
    default: {
      name: 'ARC Explorer',
      url: 'https://explorer.testnet.arc.network',
    },
  },
  testnet: true,
} as const;

export const publicClient = createPublicClient({
  chain: arcTestnet,
  transport: http(process.env.NEXT_PUBLIC_ARC_TESTNET_RPC_URL),
});

export const ARCSIGNAL_ADDRESS = process.env
  .NEXT_PUBLIC_ARCSIGNAL_CONTRACT_ADDRESS as Address;

export const USDC_ADDRESS = process.env
  .NEXT_PUBLIC_USDC_CONTRACT_ADDRESS as Address;

export const ARCSIGNAL_ABI = parseAbi([
  'function createMarket(string question, string category, string subType, uint256 resolutionTime, string analysisJson) external returns (uint256)',
  'function stake(uint256 marketId, uint8 side, uint256 amount) external',
  'function resolveMarket(uint256 marketId, uint8 outcome) external',
  'function cancelMarket(uint256 marketId) external',
  'function claimWinnings(uint256 marketId) external',
  'function getMarket(uint256 marketId) external view returns (tuple(uint256 id, string question, string category, string subType, uint256 followPool, uint256 fadePool, uint256 resolutionTime, bool resolved, uint8 outcome, string analysisJson))',
  'function getUserStake(uint256 marketId, address user) external view returns (uint256 amount, uint8 side, bool claimed)',
  'function marketCount() external view returns (uint256)',
  'event MarketCreated(uint256 indexed marketId, string question, string category)',
  'event Staked(uint256 indexed marketId, address indexed user, uint8 side, uint256 amount)',
  'event MarketResolved(uint256 indexed marketId, uint8 outcome)',
  'event WinningsClaimed(uint256 indexed marketId, address indexed user, uint256 amount)',
]);

export const USDC_ABI = parseAbi([
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function transfer(address to, uint256 amount) external returns (bool)',
]);
