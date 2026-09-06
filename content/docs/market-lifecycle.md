## Created

Only the contract owner can call `createMarket`. The call stores a unique market ID, category, question, analysis JSON, and resolution time. Duplicate IDs are rejected.

:::security Permissioned creation
Markets are not currently user-generated or permissionless. Off-chain jobs prepare market data, but an owner-authorized transaction creates the on-chain market.
:::

## Open

A market accepts Follow and Fade stakes while it exists, remains unresolved, and the current block time is earlier than its resolution time.

Pool balances and individual stakes accumulate on-chain. The current contract does not allow participants to withdraw or transfer an open stake.

## Pending resolution

After the resolution time passes, new stakes are rejected. The application treats an unresolved, expired market as pending resolution while the resolver waits for sufficient event data and submits an outcome.

The resolution time is a staking deadline, not a guarantee that the outcome transaction will occur at that exact moment.

## Resolved

The owner calls `resolveMarket` with outcome `1` for Follow or `2` for Fade. A resolved market cannot be resolved again. Winners may then claim their calculated payout.

## Cancelled or voided

The owner can call `cancelMarket`, which sets `resolved` to true and `outcome` to zero. The interface maps that state to voided or cancelled.

:::security Cancellation behavior is versioned
The legacy default deployment has no participant-accessible recovery path after cancellation. In the checked-in revision, `claimWinnings` returns the caller's combined Follow and Fade stakes when outcome zero is recorded. The application must be configured for the matching address and behavior.
:::

Both versions remain testnet-only and must not be described as production-ready.

