import { parseAbi } from 'viem';

const addressPattern = /^0x[0-9a-fA-F]{40}$/;

function optionalAddress(value: string | undefined): `0x${string}` | null {
  return value && addressPattern.test(value) ? value as `0x${string}` : null;
}

export const ARCSIGNAL_V2_FACTORY_ADDRESS = optionalAddress(
  process.env.NEXT_PUBLIC_ARCSIGNAL_V2_FACTORY_ADDRESS,
);

export const ARCSIGNAL_V2_DEPLOYMENT_BLOCK = (() => {
  const value = process.env.NEXT_PUBLIC_ARCSIGNAL_V2_DEPLOYMENT_BLOCK;
  if (!value || !/^\d+$/.test(value)) return null;
  return BigInt(value);
})();

export const ARCSIGNAL_V2_ENABLED =
  ARCSIGNAL_V2_FACTORY_ADDRESS !== null && ARCSIGNAL_V2_DEPLOYMENT_BLOCK !== null;

export const ARCSIGNAL_FACTORY_V2_ABI = parseAbi([
  'function PROTOCOL_VERSION() view returns (uint256)',
  'function collateral() view returns (address)',
  'function categoryRegistry() view returns (address)',
  'function oraclePolicyRegistry() view returns (address)',
  'function feeController() view returns (address)',
  'function marketById(bytes32 marketId) view returns (address)',
  'function marketCount() view returns (uint256)',
  'function marketAt(uint256 index) view returns (address)',
  'function globalExposurePaused() view returns (bool)',
  'function marketExposurePaused(address market) view returns (bool)',
  'function MARKET_CREATOR_ROLE() view returns (bytes32)',
  'function createMarket((bytes32 marketId,uint16 metadataSchemaVersion,uint32 categoryId,uint32 categoryVersion,uint32 oraclePolicyId,uint32 oraclePolicyVersion,uint64 closeTime,uint64 liveness,uint64 voidAfter,uint128 proposerBond,uint128 oracleReward,bytes32 termsHash,bytes32 resolutionSourceHash,bytes ancillaryData,string metadataURI,bool thesisPredictsYes,uint128 initialLiquidity) params) returns (address market,address amm)',
  'function createMarkets((bytes32 marketId,uint16 metadataSchemaVersion,uint32 categoryId,uint32 categoryVersion,uint32 oraclePolicyId,uint32 oraclePolicyVersion,uint64 closeTime,uint64 liveness,uint64 voidAfter,uint128 proposerBond,uint128 oracleReward,bytes32 termsHash,bytes32 resolutionSourceHash,bytes ancillaryData,string metadataURI,bool thesisPredictsYes,uint128 initialLiquidity)[] params) returns (address[] markets,address[] amms)',
  'function batchRequestResolution(address[] markets)',
  'function batchSettleResolution(address[] markets)',
  'function batchSyncState(address[] markets)',
  'function batchVoidExpired(address[] markets)',
  'function RESOLUTION_OPERATOR_ROLE() view returns (bytes32)',
  'function hasRole(bytes32 role,address account) view returns (bool)',
  'event MarketCreatedV2(bytes32 indexed marketId,address indexed market,address indexed creator,address amm,uint64 closeTime,uint64 voidAfter,uint256 initialLiquidity)',
  'event MarketVersionBindings(bytes32 indexed marketId,uint32 categoryId,uint32 categoryVersion,uint32 oraclePolicyId,uint32 oraclePolicyVersion,uint32 feeVersion,uint256 protocolVersion,uint16 metadataSchemaVersion)',
  'event GlobalExposurePauseChanged(bool paused,address indexed operator)',
  'event MarketExposurePauseChanged(address indexed market,bool paused,address indexed operator)',
  'event BatchResolutionAction(address indexed market,bytes4 indexed selector,bool success,bytes returnData)',
  'event RoleAdminChanged(bytes32 indexed role,bytes32 indexed previousAdminRole,bytes32 indexed newAdminRole)',
  'event RoleGranted(bytes32 indexed role,address indexed account,address indexed sender)',
  'event RoleRevoked(bytes32 indexed role,address indexed account,address indexed sender)',
]);

export const ARCSIGNAL_MARKET_V2_ABI = parseAbi([
  'function marketId() view returns (bytes32)',
  'function PROTOCOL_VERSION() view returns (uint16)',
  'function metadataSchemaVersion() view returns (uint16)',
  'function marketState() view returns (uint8)',
  'function oracleState() view returns (uint8)',
  'function outcome() view returns (uint8)',
  'function categoryId() view returns (uint32)',
  'function categoryVersion() view returns (uint32)',
  'function oraclePolicyId() view returns (uint32)',
  'function oraclePolicyVersion() view returns (uint32)',
  'function feeVersion() view returns (uint32)',
  'function closeTime() view returns (uint64)',
  'function liveness() view returns (uint64)',
  'function voidAfter() view returns (uint64)',
  'function collateral() view returns (address)',
  'function oracleAdapter() view returns (address)',
  'function termsHash() view returns (bytes32)',
  'function resolutionSourceHash() view returns (bytes32)',
  'function ancillaryDataHash() view returns (bytes32)',
  'function metadataURI() view returns (string)',
  'function collateralLiability() view returns (uint256)',
  'function oracleRequestKey() view returns (bytes32)',
  'function resolutionRequestedAt() view returns (uint64)',
  'function yesToken() view returns (address)',
  'function noToken() view returns (address)',
  'function amm() view returns (address)',
  'function mintPositions(uint256 amount,address recipient)',
  'function redeemPairs(uint256 amount,address recipient)',
  'function requestResolution() returns (bytes32)',
  'function settleResolution()',
  'function voidExpiredMarket()',
  'function redeemWinning(uint256 amount,address recipient)',
  'function redeemVoided(uint256 yesAmount,uint256 noAmount,address recipient)',
  'event MarketInitialized(bytes32 indexed marketId,address indexed market,address indexed factory,address collateral,address yesToken,address noToken,uint64 closeTime)',
  'event MarketPolicyCommitted(bytes32 indexed marketId,uint32 categoryId,uint32 categoryVersion,uint32 oraclePolicyId,uint32 oraclePolicyVersion,uint32 feeVersion,uint16 metadataSchemaVersion)',
  'event MarketTermsCommitted(bytes32 indexed marketId,bytes32 termsHash,bytes32 resolutionSourceHash,bytes32 ancillaryDataHash,string metadataURI)',
  'event AmmConfigured(bytes32 indexed marketId,address indexed amm)',
  'event PositionsMinted(bytes32 indexed marketId,address indexed payer,address indexed recipient,uint256 amount)',
  'event PairsRedeemed(bytes32 indexed marketId,address indexed account,uint256 amount)',
  'event MarketClosed(bytes32 indexed marketId,uint64 closedAt)',
  'event ResolutionRequested(bytes32 indexed marketId,bytes32 indexed requestKey,uint64 requestedAt)',
  'event ResolutionProposed(bytes32 indexed marketId,bytes32 indexed requestKey)',
  'event ResolutionDisputed(bytes32 indexed marketId,bytes32 indexed requestKey)',
  'event MarketResolved(bytes32 indexed marketId,bytes32 indexed requestKey,uint8 outcome,uint64 resolvedAt)',
  'event MarketVoided(bytes32 indexed marketId,uint64 voidedAt)',
  'event WinningsRedeemed(bytes32 indexed marketId,address indexed account,uint8 outcome,uint256 amount)',
  'event VoidRedemption(bytes32 indexed marketId,address indexed account,uint256 yesAmount,uint256 noAmount,uint256 payout)',
]);

export const PREDICTION_MARKET_AMM_V2_ABI = parseAbi([
  'function reserves() view returns (uint256 yesReserve,uint256 noReserve)',
  'function protocolFeeBps() view returns (uint16)',
  'function lpFeeBps() view returns (uint16)',
  'function quoteExactInput(bool yesForNo,uint256 amountIn) view returns (uint256)',
  'function addLiquidity(uint256 yesAmount,uint256 noAmount,uint256 minShares,address recipient) returns (uint256)',
  'function removeLiquidity(uint256 shares,uint256 minYes,uint256 minNo,address recipient) returns (uint256,uint256)',
  'function swapExactYesForNo(uint256 amountIn,uint256 minAmountOut,address recipient) returns (uint256)',
  'function swapExactNoForYes(uint256 amountIn,uint256 minAmountOut,address recipient) returns (uint256)',
  'event LiquidityAdded(address indexed provider,address indexed recipient,uint256 yesAmount,uint256 noAmount,uint256 shares)',
  'event LiquidityRemoved(address indexed provider,address indexed recipient,uint256 shares,uint256 yesAmount,uint256 noAmount)',
  'event Swap(address indexed trader,address indexed tokenIn,uint256 amountIn,uint256 amountOut,uint256 protocolFee)',
  'event ProtocolFeesCollected(address indexed token,uint256 amount)',
  'event Transfer(address indexed from,address indexed to,uint256 value)',
  'event Approval(address indexed owner,address indexed spender,uint256 value)',
]);

export const OUTCOME_TOKEN_V2_ABI = parseAbi([
  'function balanceOf(address account) view returns (uint256)',
  'function approve(address spender,uint256 amount) returns (bool)',
  'function allowance(address owner,address spender) view returns (uint256)',
  'function transfer(address recipient,uint256 amount) returns (bool)',
  'event Transfer(address indexed from,address indexed to,uint256 value)',
  'event Approval(address indexed owner,address indexed spender,uint256 value)',
]);

export const ORACLE_ADAPTER_V2_ABI = parseAbi([
  'event AdapterRequestCreated(bytes32 indexed requestKey,address indexed market,bytes32 indexed identifier,uint64 timestamp,uint64 liveness,uint128 bond,bytes32 ancillaryDataHash)',
  'event AdapterProposalObserved(bytes32 indexed requestKey)',
  'event AdapterDisputeObserved(bytes32 indexed requestKey)',
  'event AdapterSettlementObserved(bytes32 indexed requestKey,int256 settledPrice)',
]);

export const FEE_CONTROLLER_V2_ABI = parseAbi([
  'event FeeVersionRegistered(uint32 indexed version,uint16 protocolFeeBps,uint16 lpFeeBps)',
  'event FeeVersionProposed(uint16 protocolFeeBps,uint16 lpFeeBps,uint64 executableAt)',
  'event FeeVersionProposalCancelled(uint16 protocolFeeBps,uint16 lpFeeBps)',
  'event TreasuryChangeProposed(address indexed currentTreasury,address indexed proposedTreasury,uint64 executableAt)',
  'event TreasuryChangeCancelled(address indexed proposedTreasury)',
  'event TreasuryChanged(address indexed previousTreasury,address indexed newTreasury)',
  'event FeesAccrued(address indexed token,uint256 amount,uint256 totalAccrued)',
  'event FeesWithdrawn(address indexed token,address indexed treasury,uint256 amount)',
  'event RoleAdminChanged(bytes32 indexed role,bytes32 indexed previousAdminRole,bytes32 indexed newAdminRole)',
  'event RoleGranted(bytes32 indexed role,address indexed account,address indexed sender)',
  'event RoleRevoked(bytes32 indexed role,address indexed account,address indexed sender)',
]);

export const CATEGORY_REGISTRY_V2_ABI = parseAbi([
  'event CategoryVersionRegistered(uint32 indexed categoryId,uint32 indexed version,bytes32 nameHash,bytes32 schemaHash,string metadataURI)',
  'event CategoryVersionStatusChanged(uint32 indexed categoryId,uint32 indexed version,bool activeForNewMarkets)',
  'event RoleAdminChanged(bytes32 indexed role,bytes32 indexed previousAdminRole,bytes32 indexed newAdminRole)',
  'event RoleGranted(bytes32 indexed role,address indexed account,address indexed sender)',
  'event RoleRevoked(bytes32 indexed role,address indexed account,address indexed sender)',
]);

export const ORACLE_POLICY_REGISTRY_V2_ABI = parseAbi([
  'event OraclePolicyVersionRegistered(uint32 indexed policyId,uint32 indexed version,address indexed adapter,address oracle,address bondCurrency,bytes32 identifier,uint64 minLiveness,uint64 maxLiveness,uint128 minBond,bytes32 rulesHash,string rulesURI)',
  'event OraclePolicyVersionStatusChanged(uint32 indexed policyId,uint32 indexed version,bool activeForNewMarkets)',
  'event RoleAdminChanged(bytes32 indexed role,bytes32 indexed previousAdminRole,bytes32 indexed newAdminRole)',
  'event RoleGranted(bytes32 indexed role,address indexed account,address indexed sender)',
  'event RoleRevoked(bytes32 indexed role,address indexed account,address indexed sender)',
]);
