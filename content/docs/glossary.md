## Protocol terms

:::definitions
AI thesis | The stored YES or NO prediction and supporting analysis generated off-chain for a market.
Follow | A stake agreeing with the AI thesis. Encoded as stake side 0.
Fade | A stake disagreeing with the AI thesis. Encoded as stake side 1.
Follow pool | The total USDC recorded for all Follow stakes in a market.
Fade pool | The total USDC recorded for all Fade stakes in a market.
Pari-mutuel | A payout model where winners divide the losing pool in proportion to their share of the winning pool.
Market ID | The unique string used to identify a market in contract storage.
Resolution time | The on-chain timestamp after which new stakes are rejected. It is not a guaranteed resolution moment.
Resolved | A market state where the owner has recorded a final outcome or cancellation.
Outcome | The stored result: 1 for Follow, 2 for Fade, or 0 for cancellation when resolved.
Claim | A user-signed transaction that transfers an eligible winning payout from the contract.
Owner | The address with permission to create, resolve, and cancel markets.
Resolver | The off-chain operator that evaluates data and submits an owner-authorized resolution transaction.
Indexer | An off-chain service that reconstructs market and position views from contract events for faster application reads.
ARC | The native gas currency configured for ARC Testnet.
USDC | The six-decimal ERC-20 test token used for stakes and payouts in the current deployment.
:::

## Status labels

:::definitions
Implemented | Present in the current repository or deployed contract interface.
Testnet | Available only as experimental functionality using test assets.
Planned | Proposed but not available as a supported workflow.
Risk | A material limitation, authority, or failure mode.
Reference | Canonical explanatory material rather than a feature status.
:::

## Terms ArcSignal does not currently claim

**Decentralized oracle resolution** is not the current model. **Node operator** is not an implemented role. **Public API** does not mean the internal Next.js routes; no supported, versioned developer API is currently offered.

