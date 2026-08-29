import { createPublicClient, http, parseAbi } from 'viem';

const fallbackArcChainId = 5042002;
const browserRpcUrl =
  process.env.NEXT_PUBLIC_ARC_TESTNET_RPC_URL ??
  'https://rpc.testnet.arc.network';
const serverRpcUrl =
  process.env.ARC_RPC_URL ??
  process.env.ARC_TESTNET_RPC_URL ??
  browserRpcUrl;

export const arcTestnet = {
  id: Number(process.env.NEXT_PUBLIC_ARC_TESTNET_CHAIN_ID ?? fallbackArcChainId),
  name: 'ARC Testnet',
  network: 'arc-testnet',
  nativeCurrency: { name: 'ARC', symbol: 'ARC', decimals: 18 },
  rpcUrls: {
    default: { http: [browserRpcUrl] },
    public: { http: [browserRpcUrl] },
  },
  blockExplorers: {
    default: { name: 'ARC Explorer', url: 'https://testnet.arcscan.app' },
  },
  contracts: {
    multicall3: {
      address: '0xca11bde05977b3631167028862be2a173976ca11',
    },
  },
  testnet: true,
} as const;

export const publicClient = createPublicClient({
  chain: arcTestnet,
  transport: http(serverRpcUrl, {
    retryCount: 2,
    retryDelay: 200,
    fetchOptions: {
      cache: 'no-store',
    },
  }),
});

// The UI and resolver must share the same ARC Testnet contract. Do not allow a
// stale Vercel environment variable to silently point reads and writes at an
// older deployment, which makes current markets appear to be missing.
export const ARCSIGNAL_ADDRESS = '0x4f33115a18fe6a181be98610ddde3fab71efabed' as `0x${string}`;

export const USDC_ADDRESS = '0x3600000000000000000000000000000000000000' as `0x${string}`;

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
