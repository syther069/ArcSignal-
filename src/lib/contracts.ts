import { createPublicClient, http, parseAbi } from 'viem';

const fallbackArcChainId = 5042002;

export const arcTestnet = {
  id: Number(process.env.NEXT_PUBLIC_ARC_TESTNET_CHAIN_ID ?? fallbackArcChainId),
  name: 'ARC Testnet',
  network: 'arc-testnet',
  nativeCurrency: { name: 'ARC', symbol: 'ARC', decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.NEXT_PUBLIC_ARC_TESTNET_RPC_URL ?? 'https://rpc.testnet.arc.network'] },
    public: { http: [process.env.NEXT_PUBLIC_ARC_TESTNET_RPC_URL ?? 'https://rpc.testnet.arc.network'] },
  },
  blockExplorers: {
    default: { name: 'ARC Explorer', url: 'https://explorer.testnet.arc.network' },
  },
  testnet: true,
} as const;

export const publicClient = createPublicClient({
  chain: arcTestnet,
  transport: http(process.env.NEXT_PUBLIC_ARC_TESTNET_RPC_URL),
});

// Hardcoded to the currently deployed contract. The env var is kept as a named
// fallback so that local overrides still work — but the hardcoded address is
// always used in production to prevent the wrong contract being called.
export const ARCSIGNAL_ADDRESS = (
  process.env.NEXT_PUBLIC_ARCSIGNAL_CONTRACT_ADDRESS ?? '0x1321B81F0608A7166062d6AcABC2b64646D80bC1'
) as `0x${string}`;

export const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_CONTRACT_ADDRESS as `0x${string}`;

export const ARCSIGNAL_ABI = parseAbi([
  'function createMarket(string marketId, string category, string question, string analysisJson, uint256 resolutionTime) external',
  'function stake(string marketId, uint8 side, uint256 amount) external',
  'function resolveMarket(string marketId, uint8 outcome) external',
  'function cancelMarket(string marketId) external',
  'function claimWinnings(string marketId) external',
  'function getMarket(string marketId) external view returns ((string marketId, string category, string question, string analysisJson, uint256 resolutionTime, uint256 followPool, uint256 fadePool, bool resolved, uint8 outcome))',
  'function getMarketCount() external view returns (uint256)',
  'function getMarketIdByIndex(uint256 index) external view returns (string)',
  'function getAllMarketIds() external view returns (string[])',
  'function followStakes(string marketId, address user) external view returns (uint256)',
  'function fadeStakes(string marketId, address user) external view returns (uint256)',
  'function claimed(string marketId, address user) external view returns (bool)',
  'function setProfile(string username, string bio, string avatarUrl) external',
  'function getAddressByUsername(string username) external view returns (address)',
  'function getProfile(address user) external view returns ((string username, string bio, string avatarUrl))',
  'event MarketCreated(string marketId, string category, string question, uint256 resolutionTime)',
  'event Staked(string marketId, address user, uint8 side, uint256 amount)',
  'event MarketResolved(string marketId, uint8 outcome)',
  'event Claimed(string marketId, address user, uint256 amount)',
  'event ProfileUpdated(address indexed user, string username, string bio, string avatarUrl)',
]);

export const USDC_ABI = parseAbi([
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function transfer(address to, uint256 amount) external returns (bool)',
]);
