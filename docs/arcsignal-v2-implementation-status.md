# ArcSignal V2 implementation status

Status date: 2026-09-10

## Implemented locally

- Separate V2 factory, isolated markets, transferable 6-decimal YES/NO tokens, constant-product AMMs, category and oracle-policy registries, UMA OOv2 adapter boundary, versioned fee controller, and factory-bound deployers.
- Immutable market, metadata-schema, category, oracle-policy, fee, terms, source, and ancillary-data commitments.
- Explicit `OPEN`, `CLOSED`, `RESOLVED`, and `VOIDED` states with oracle request, proposal, dispute, and settlement substates.
- Role-controlled market creation, maintenance batching, global/market exposure pause controls, capped fees, delayed fee changes, delayed two-step treasury rotation, and atomic market-creation batches.
- V1/V2 additive database schema, feature-gated V2 event indexer, raw audit log, checkpoint replay, token-transfer ledger, collateral/liability reconciliation, authenticated keeper, diagnostics, deployment script, manifest schema, and deployment runbook.
- Versioned read APIs for market lists/details, oracle history, proof bundles, category and oracle-policy event histories, deployment manifests, and protocol health.
- Event ingestion for the factory, markets, AMMs, outcome tokens, oracle adapters, category registry, oracle-policy registry, fee controller, roles, and pauses.
- Unit, fuzz, invariant, scoring, aggregation, operations-auth, and indexer-helper tests.

## Current testnet activation

V2 is deployed and configured for ARC Testnet application integration.

- Factory: `0x567DDE97645B1f1beBdF46F219730618aA8c025a`
- Deployment block: `61403215`
- Testnet oracle shim: `0x56ac3eaebe28b7698de69fbe3088a3b05c8a00fb`
- Category registry: `0xb6b31a97ff6c5ad86ba5d47d25c39a7dde239ba5`
- Oracle policy registry: `0x8e4921cef368578e902f5390ebd5c36ae3d3dda8`
- Fee controller: `0x08aa20f724acafcac8611c883fa9792f637f1c63`
- UMA adapter boundary: `0xa226b9f400e12a687c882ca64c0a90e55692b393`

V1 stays available for existing markets and claims. New generated markets are routed to V2 unless `ARCSIGNAL_MARKET_CREATION_VERSION=1` is set.

## Testnet soak path

- Keep the V2 indexer in scheduled maintenance so market states, categories, oracle policies, fees, commitments, disputes, and outcomes are refreshed before reconciliation.
- Generate canary V2 markets across the supported categories, then index them from the V2 deployment block forward.
- Exercise open trading reads, close transitions, resolution requests, proposals, disputes, settlements, voids, and signal leaderboard reconciliation against resolved outcomes.
- Track the public `/status` page and `/api/v2/protocol/health` for index freshness, disputed markets, voided markets, and solvency drift.
- Do not treat this as mainnet-ready until the soak has run for the planned window and the oracle/administration/audit gates below are satisfied.

## External release gates

- Confirm a production optimistic oracle and real dispute/arbitration path on the target Arc network. A mock oracle is test-only.
- Supply approved multisig/admin, creator, keeper, pause guardian, treasury, oracle, category metadata, policy rules, bond, fee, and liveness values.
- Run the Arc Testnet canary, failure drills, reconciliation monitoring, and the planned 30-day soak.
- Complete independent contract and economic/oracle audits, remediate findings, publish verified source and signed deployment artifacts, establish incident operations, legal review, and a bug bounty.
- Wait for official Arc mainnet parameters and supported mainnet Agent Wallet/oracle dependencies before any mainnet release.

The local implementation passing automated tests is engineering evidence. It is not an audit, production-oracle confirmation, testnet soak, or mainnet deployment.
