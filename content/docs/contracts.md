## Current deployment

These addresses are the constants currently used by the application for ARC Testnet.

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
claimWinnings | Sends a winning caller's pari-mutuel payout once.
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

`MarketCreated`, `Staked`, `MarketResolved`, `Claimed`, and `ProfileUpdated` allow the application indexer to reconstruct a faster read model. The chain remains authoritative if the index is delayed or unavailable.

## Authority and upgrade assumptions

The current contract inherits `Ownable`. Market creation, resolution, and cancellation depend on that owner. The deployed contract is not presented here as audited or trustless.

:::security Contract review status
No professional audit report is included in this repository. The cancellation path lacks a participant refund method, and ERC-20 transfers do not use `SafeERC20`. Treat the contract as experimental testnet software.
:::

