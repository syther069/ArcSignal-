## How resolution works today

After a market reaches its resolution time, an off-chain resolver checks the relevant external data. Crypto markets use market data logic; football markets use completed fixture data. When it can determine the result, the resolver account submits `resolveMarket` to the contract.

The transaction succeeds only if its sender is the current contract owner. The contract itself does not verify the external data or the AI analysis.

:::security Owner-controlled outcome
The contract owner is the final on-chain authority for market outcomes in this version. This is not decentralized oracle resolution. A compromised, unavailable, or incorrect owner can delay or submit an incorrect result.
:::

## Outcome values

:::definitions
0 | Unresolved before resolution, or cancelled after `cancelMarket`
1 | Follow wins
2 | Fade wins
:::

The application and background jobs may store supporting resolution attempts or display indexed state, but the `resolved` and `outcome` values in the contract determine claim eligibility.

## Claiming winnings

Winning users call `claimWinnings(marketId)` from the address that originally staked. The contract checks that the market is resolved, the address has not already claimed, and the address has a stake on the winning side. On a deployment of the checked-in revision, outcome zero instead returns that address's combined Follow and Fade stakes.

It then marks the address as claimed before transferring the calculated USDC payout. This state-first ordering reduces re-entrant double-claim risk, although the contract has not been professionally audited.

## What the app does

The portfolio identifies resolved winning positions and presents a Claim action. The wallet still has to sign and submit the transaction. A successful resolution does not push funds to the wallet automatically.

## Cancellation risk

:::security Verify the selected contract version
The legacy default address records outcome zero but has no participant refund path. The checked-in revision makes `claimWinnings` return both sides of a wallet's stake after cancellation and emits `Refunded`. The interface enables that action only when `NEXT_PUBLIC_ARCSIGNAL_CANCEL_REFUNDS=true`; set it only for a verified deployment of the revised contract.
:::

Do not use real-value assets with either testnet deployment. Verify the selected address, source, bytecode, ownership, and refund behavior before signing.

