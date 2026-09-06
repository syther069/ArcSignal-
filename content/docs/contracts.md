## Current deployment

This legacy address is the application's default on ARC Testnet. Operators can select a separately deployed contract with `NEXT_PUBLIC_ARCSIGNAL_CONTRACT_ADDRESS`.

:::address ARCSignal contract
0x4f33115a18fe6a181be98610ddde3fab71efabed
:::

:::address Testnet USDC
0x3600000000000000000000000000000000000000
:::

:::testnet Verify before use
Addresses can change between test deployments. Compare this page with the live application configuration and ARC Testnet explorer before signing. Test assets have no monetary value.
:::

## Public write methods

:::definitions
createMarket | Owner-only. Creates a unique market and stores its analysis and deadline.
stake | Transfers USDC into Follow side 0 or Fade side 1.
resolveMarket | Owner-only. Records Follow outcome 1 or Fade outcome 2.
cancelMarket | Owner-only. Marks the market resolved with outcome 0.
claimWinnings | Sends a winning caller's pari-mutuel payout once. In the checked-in revision, the same call refunds both sides when a market is cancelled.
setProfile | Stores a username, bio, and avatar URL for the caller.
:::

## Public read methods

The contract exposes market lookups, market count and IDs, per-address Follow and Fade stakes, claim status, and profile lookups. The frontend ABI in `src/lib/contracts.ts` is the integration surface currently used by the app.

```solidity
function getMarket(string marketId) external view returns (Market memory);
function followStakes(string marketId, address user) external view returns (uint256);
function fadeStakes(string marketId, address user) external view returns (uint256);
function claimed(string marketId, address user) external view returns (bool);
```

## Events

`MarketCreated`, `Staked`, `MarketResolved`, `Claimed`, and `ProfileUpdated` allow the application indexer to reconstruct a faster read model. The checked-in revision also emits `MarketCancelled`, `Refunded`, `Paused`, and `Unpaused`. The chain remains authoritative if the index is delayed or unavailable.

## Authority and upgrade assumptions

The current contract inherits `Ownable`. Market creation, resolution, and cancellation depend on that owner. The deployed contract is not presented here as audited or trustless.

:::security Contract review status
No professional audit report is included in this repository. The legacy default deployment lacks cancellation refunds and uses direct ERC-20 transfers. The checked-in revision adds refunds, `SafeERC20`, pausing, transfer-balance checks, input limits, and reentrancy protection, but those changes do not alter the legacy deployed bytecode. Treat every version as experimental testnet software until its deployment and audit status are independently verified.
:::

