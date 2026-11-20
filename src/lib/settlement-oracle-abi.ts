import { parseAbi } from 'viem';

/** ABI for ArcSignalSettlementOracleV2 (src/contracts/v2/ArcSignalSettlementOracleV2.sol). */
export const SETTLEMENT_ORACLE_V2_ABI = parseAbi([
  'function oracle() view returns (address)',
  'function proposer() view returns (address)',
  'function arbiter() view returns (address)',
  'function owner() view returns (address)',
  'function treasury() view returns (address)',
  'function bondToken() view returns (address)',
  'function getRequest(bytes32 requestKey) view returns ((address market,bytes32 marketId,bytes32 identifier,address rewardCurrency,uint256 reward,uint128 bond,uint64 liveness,uint64 requestedAt,uint64 proposedAt,uint8 state,int256 proposedPrice,int256 settledPrice,address disputer))',
  'function proposeOutcome(bytes32 requestKey,int256 price)',
  'function disputeOutcome(bytes32 requestKey)',
  'function settle(bytes32 requestKey) returns (int256)',
  'function closeVoided(bytes32 requestKey)',
  'error Unauthorized()',
  'error InvalidPrice()',
  'error InvalidRequest()',
  'error InvalidState()',
  'error LivenessNotExpired()',
  'error LivenessExpired()',
]);

/** Matches the contract's RequestState enum. */
export const SETTLEMENT_REQUEST_STATE = ['NONE', 'REQUESTED', 'PROPOSED', 'DISPUTED', 'SETTLED'] as const;
export type SettlementRequestState = (typeof SETTLEMENT_REQUEST_STATE)[number];

export const ORACLE_YES_PRICE = 10n ** 18n;
export const ORACLE_NO_PRICE = 0n;
export const ORACLE_UNDETERMINED_PRICE = 5n * 10n ** 17n;

/** Market functions the keeper and the settlement UI use. */
export const MARKET_SETTLEMENT_ABI = parseAbi([
  'function oracleAdapter() view returns (address)',
  'function oracleRequestKey() view returns (bytes32)',
  'function oracleState() view returns (uint8)',
  'function settleResolution()',
]);

export type SettlementRequest = {
  market: `0x${string}`;
  bond: bigint;
  liveness: bigint;
  proposedAt: bigint;
  state: number;
  proposedPrice: bigint;
  settledPrice: bigint;
  disputer: `0x${string}`;
};
