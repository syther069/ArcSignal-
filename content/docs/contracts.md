## Current deployment

ArcSignal now runs in migration mode on ARC Testnet. Existing V1 markets remain visible as legacy history. New generated markets are created through the V2 factory when `NEXT_PUBLIC_ARCSIGNAL_V2_FACTORY_ADDRESS` and `NEXT_PUBLIC_ARCSIGNAL_V2_DEPLOYMENT_BLOCK` are configured.

:::address V1 legacy ARCSignal contract
0x4f33115a18fe6a181be98610ddde3fab71efabed
:::

:::address V2 ArcSignal factory
0x567DDE97645B1f1beBdF46F219730618aA8c025a
:::

:::address Testnet USDC
0x3600000000000000000000000000000000000000
:::

:::testnet Verify before use
Addresses can change between test deployments. Compare this page with the live application configuration and ARC Testnet explorer before signing. Test assets have no monetary value.
:::

## V2 factory write methods

:::definitions
createMarket | Role-gated. Creates one V2 market with category policy, oracle policy, close time, liveness, void deadline, source commitment, terms hash, ancillary data, and optional AMM seed liquidity.
createMarkets | Role-gated batch creation, capped by the V2 factory.
batchRequestResolution | Resolution-operator batch request after markets close.
batchSettleResolution | Batch settlement after oracle proposal/dispute flow.
batchSyncState | Updates closed state from time and current market state.
batchVoidExpired | Resolution-operator batch void for markets past their delayed-resolution deadline.
:::

## V1 legacy write methods

:::definitions
createMarket | Owner-only. Creates a unique market and stores its analysis and deadline.
stake | Transfers USDC into Follow side 0 or Fade side 1.
resolveMarket | Owner-only. Records Follow outcome 1 or Fade outcome 2.
cancelMarket | Owner-only. Marks the market resolved with outcome 0.
claimWinnings | Sends a winning caller's pari-mutuel payout once. In the checked-in revision, the same call refunds both sides when a market is cancelled.
setProfile | Stores a username, bio, and avatar URL for the caller.
:::

## Public read methods

V2 markets expose market IDs, explicit `OPEN`, `CLOSED`, `RESOLVED`, and `VOIDED` states, oracle substates, category and oracle-policy versions, fee version, close time, liveness, void deadline, source and terms commitments, YES/NO token addresses, AMM address, and collateral liability. V1 exposes market lookups, market count and IDs, per-address Follow and Fade stakes, claim status, and profile lookups.

```solidity
function getMarket(string marketId) external view returns (Market memory);
function followStakes(string marketId, address user) external view returns (uint256);
function fadeStakes(string marketId, address user) external view returns (uint256);
function claimed(string marketId, address user) external view returns (bool);
```

## Events

V2 emits stronger index data through `MarketCreatedV2`, `MarketVersionBindings`, market policy and terms commitment events, AMM/token transfer events, oracle request/proposal/dispute/settlement events, pause events, and role events. V1 emits `MarketCreated`, `Staked`, `MarketResolved`, `Claimed`, and `ProfileUpdated`; the checked-in V1 revision also emits `MarketCancelled`, `Refunded`, `Paused`, and `Unpaused`. The chain remains authoritative if the index is delayed or unavailable.

## Authority and upgrade assumptions

V2 uses role-based creation, resolution, pause, and admin controls. V1 inherits `Ownable`; market creation, resolution, and cancellation depend on that owner. Neither deployment is presented here as audited or trustless.

:::security Contract review status
No professional audit report is included in this repository. The V2 factory is deployed on ARC Testnet for product integration and soak testing. The legacy default deployment lacks cancellation refunds and uses direct ERC-20 transfers. Treat every version as experimental testnet software until its deployment, oracle path, operational runbook, and audit status are independently verified.
:::

