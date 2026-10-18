import { createPublicClient, http, parseAbi } from 'viem';
import { activeArcNetwork } from './arc-network';

const parsedChainId = Number(activeArcNetwork.testnet
  ? (process.env.NEXT_PUBLIC_ARC_CHAIN_ID
    ?? process.env.NEXT_PUBLIC_ARC_TESTNET_CHAIN_ID
    ?? activeArcNetwork.chainId)
  : (process.env.NEXT_PUBLIC_ARC_CHAIN_ID ?? activeArcNetwork.chainId));
const arcChainId = Number.isFinite(parsedChainId) && parsedChainId > 0
  ? parsedChainId
  : activeArcNetwork.chainId;

const browserRpcUrl = activeArcNetwork.testnet
  ? (process.env.NEXT_PUBLIC_ARC_RPC_URL
    ?? process.env.NEXT_PUBLIC_ARC_TESTNET_RPC_URL
    ?? activeArcNetwork.rpcUrl)
  : (process.env.NEXT_PUBLIC_ARC_RPC_URL ?? activeArcNetwork.rpcUrl);
const serverRpcUrl = activeArcNetwork.testnet
  ? (process.env.ARC_RPC_URL ?? process.env.ARC_TESTNET_RPC_URL ?? browserRpcUrl)
  : (process.env.ARC_RPC_URL ?? browserRpcUrl);

export const arcChain = {
  id: arcChainId,
  name: activeArcNetwork.name,
  network: activeArcNetwork.network,
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: {
    default: { http: [browserRpcUrl] },
    public: { http: [browserRpcUrl] },
  },
  blockExplorers: {
    default: { name: 'Arc Explorer', url: activeArcNetwork.explorer },
  },
  contracts: {
    multicall3: {
      address: '0xca11bde05977b3631167028862be2a173976ca11',
    },
  },
  testnet: activeArcNetwork.testnet,
} as const;

export const arcTestnet = arcChain;
export const activeArcChain = arcChain;

export async function assertArcChainReady(client: { getChainId: () => Promise<number> }) {
  const currentChainId = await client.getChainId();
  if (currentChainId !== arcChainId) {
    throw new Error(
      `Chain ID mismatch: connected to ${currentChainId}, expected ${arcChainId} (${activeArcNetwork.name})`,
    );
  }
  return true;
}

export const publicClient = createPublicClient({
  chain: arcChain,
  transport: http(serverRpcUrl, {
    retryCount: 2,
    retryDelay: 200,
    fetchOptions: {
      cache: 'no-store',
    },
  }),
});

// Do not read NEXT_PUBLIC_ARCSIGNAL_CONTRACT_ADDRESS. Testnet stays on the
// verified 0x4f33115… deployment. Mainnet stays unset until a new deploy is
// written into src/lib/arc-network.ts after on-chain verification.
export const ARCSIGNAL_ADDRESS = (
  activeArcNetwork.arcsignal ?? '0x0000000000000000000000000000000000000000'
) as `0x${string}`;

// The checked-in contract revision supports cancelled-market refunds. The
// currently deployed legacy address does not. Enable this only after deploying
// and verifying the refund-capable revision at ARCSIGNAL_ADDRESS.
export const CANCELLATION_REFUNDS_ENABLED =
  process.env.NEXT_PUBLIC_ARCSIGNAL_CANCEL_REFUNDS === 'true';

export const USDC_ADDRESS = activeArcNetwork.usdc;

export const ARCSIGNAL_ABI = parseAbi([
  'function createMarket(string marketId, string category, string question, string analysisJson, uint256 resolutionTime) external',
  'function stake(string marketId, uint8 side, uint256 amount) external',
  'function resolveMarket(string marketId, uint8 outcome) external',
  'function cancelMarket(string marketId) external',
  'function claimWinnings(string marketId) external',
  'function paused() external view returns (bool)',
  'function owner() external view returns (address)',
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
  'event MarketCancelled(string marketId)',
  'event Claimed(string marketId, address user, uint256 amount)',
  'event Refunded(string marketId, address user, uint256 amount)',
  'event ProfileUpdated(address indexed user, string username, string bio, string avatarUrl)',
  'event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)',
  'event Paused(address account)',
  'event Unpaused(address account)',
]);

export const USDC_ABI = parseAbi([
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function transfer(address to, uint256 amount) external returns (bool)',
]);
