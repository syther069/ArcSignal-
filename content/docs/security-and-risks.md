## Testnet status

ArcSignal is experimental software running on ARC Testnet. Test tokens have no monetary value, the chain or deployment can reset, and addresses or behavior may change between releases.

## Smart contract risk

:::security Unaudited contracts
No professional security audit is included. Bugs can lock or misdirect test assets. The current cancellation flow has no participant refund method, and the contract uses direct ERC-20 calls rather than `SafeERC20` wrappers.
:::

Tests and code review can reduce risk but do not replace an independent audit, formal threat model, or staged deployment process.

## Administrative risk

The owner can create, resolve, and cancel markets. Users depend on the owner key being available, uncompromised, and operated correctly. This is a centralized trust assumption.

The resolver private key is server-side operational infrastructure. If it is compromised, an attacker with the relevant owner authority could submit outcomes. If it is lost or unavailable, resolution can be delayed.

## Data and AI risk

AI analyses and resolution jobs depend on external providers. Incorrect, stale, unavailable, or ambiguous data can affect market framing or the outcome submitted by the resolver. The contract does not independently validate that external evidence.

## Market risk

Pool-based returns change as new stakes arrive. Displayed probabilities are not fixed prices. A correct view can still produce a smaller return than expected, and a losing view loses the full stake.

## Wallet and approval risk

Users sign USDC approvals and contract transactions. A wrong chain, token, spender, or malicious wallet prompt can expose assets. Confirm every address and keep approvals limited to the amount needed when practical.

## Operational and indexing risk

The interface uses indexed data for speed with chain fallbacks. A delayed index, RPC inconsistency, database outage, or provider failure can make the UI appear stale even when the chain transaction succeeded.

:::important Source of truth
Use the wallet receipt and ARC Testnet explorer to confirm a transaction. The contract state is authoritative; UI caches and indexed records are conveniences.
:::

## Before any mainnet consideration

At minimum, ArcSignal would need an audited contract revision, a tested cancellation refund path, hardened ownership and resolver controls, documented incident procedures, deployment verification, and a clear oracle security model.

