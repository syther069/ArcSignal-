# ArcSignal V2 deployment and migration runbook

This runbook turns the V2 design into a gated release. It does not assert that Arc mainnet or a production optimistic-oracle deployment exists. Every address must come from current official Arc, Circle, and oracle documentation and must be verified on the target chain immediately before deployment.

## Release artifacts

- `ArcSignalFactoryV2`: authorized creation, deterministic market deployment, bounded batch operations, and exposure pause controls.
- `ArcSignalMarketDeployerV2`, `PredictionMarketAMMDeployerV2`: factory-bound deterministic deployment helpers that keep runtime bytecode below EIP-170 limits and permanently renounce their bootstrap ownership after binding.
- `ArcSignalMarketV2`: immutable market/category/oracle/fee bindings, explicit lifecycle, collateral accounting, resolution, void fallback, and redemption.
- `OutcomeTokenV2`: transferable, 6-decimal YES and NO claims controlled only by their market.
- `PredictionMarketAMMV2`: constant-product YES/NO exchange, LP shares, slippage limits, and version-pinned fees.
- `CategoryRegistryV2`, `OraclePolicyRegistryV2`: append-only policy versions that can be disabled only for future markets.
- `UMAOracleAdapterV2`: optimistic-oracle request/callback boundary.
- `ProtocolFeeControllerV2`: capped versioned fees, delayed treasury rotation, and fee custody.

## Required deployment variables

`DEPLOYER_PRIVATE_KEY`, `EXPECTED_CHAIN_ID`, `USDC_ADDRESS`, `OPTIMISTIC_ORACLE_ADDRESS`, `PROTOCOL_ADMIN`, `MARKET_CREATOR`, `RESOLUTION_OPERATOR`, `PAUSE_GUARDIAN`, `PROTOCOL_TREASURY`, `PROTOCOL_FEE_BPS`, `LP_FEE_BPS`, `ORACLE_IDENTIFIER`, `ORACLE_MIN_LIVENESS`, `ORACLE_MAX_LIVENESS`, `ORACLE_MIN_BOND`, `ORACLE_RULES_HASH`, `ORACLE_RULES_URI`, and `CATEGORY_METADATA_BASE_URI` are mandatory.

Use separate multisig or policy-controlled accounts for the protocol admin and pause guardian. The market creator can be an automation wallet with a narrow Circle Agent Wallet policy. The resolution operator only schedules oracle maintenance and cannot choose an outcome.

## Testnet deployment

1. Pin the compiler, dependency lockfile, commit SHA, official chain ID, RPC, USDC address, oracle address, and oracle identifier in the release record.
2. Publish category JSON and resolution-policy text to content-addressed storage. Calculate every hash from the exact published bytes.
3. Run `forge fmt --check`, `forge test`, `npm run typecheck`, `npm run lint`, `npm run test`, and `npm run build` from a clean checkout.
4. Simulate the deployment script against a fork. Inspect the role grants and all constructor arguments.
5. Deploy with `forge script script/DeployArcSignalV2.s.sol:DeployArcSignalV2 --rpc-url "$ARC_RPC_URL" --broadcast`. Verify each contract using the target explorer's current documented verification flow; do not assume a verifier API or chain identifier.
6. Save deployed addresses, transaction hashes, block number, bytecode hashes, compiler settings, role membership, category versions, policy versions, fee version, and published metadata hashes in a signed release manifest.
7. Create canary markets for YES, NO, disputed, undetermined, and oracle-timeout outcomes. Exercise position transfer, liquidity removal, fee collection, pause/unpause, winning redemption, and void redemption.
8. Keep V1 visible and claimable throughout the V2 canary period.

## V1 to V2 migration

V1 markets are immutable legacy records. Do not copy stakes or invent equivalent V2 positions. The application should use a dual reader:

- route V1 IDs to the existing parimutuel contract and retain its claim UI;
- route V2 IDs from `MarketCreatedV2` to each market contract and its AMM;
- label the protocol version on every market, transaction, portfolio position, and settlement record;
- stop V1 creation only after V2 canaries pass; and
- keep the V1 indexer and resolver alive until all V1 markets are terminal and all available claims have had a documented claim period.

The indexer starts from the V2 factory deployment block, persists block hash and log index, and can reset V2 projections if a checkpoint does not match. `MarketInitialized`, `MarketPolicyCommitted`, `MarketTermsCommitted`, `MarketCreatedV2`, `MarketVersionBindings`, lifecycle events, oracle adapter events, registry events, AMM events, role changes, pauses, and fee events form the audit trail. Database uniqueness uses `(chain_id, contract_address, transaction_hash, log_index)`.

## Mainnet promotion gates

Promotion requires all of the following evidence:

- official Arc mainnet chain/RPC/explorer/USDC references are public and independently verified;
- the chosen optimistic oracle and identifier are deployed, supported, and tested on Arc mainnet;
- threat model, independent audit, fuzz/invariant suite, Slither review, and remediation record are complete;
- multisig owners, timelock policy, pause runbook, treasury controls, monitoring, alerting, and incident contacts are live;
- indexer reorg handling and reconciliation show no unexplained collateral-liability difference during the canary period;
- Circle wallet policies enforce target contracts, method selectors, per-transaction limits, daily limits, and no arbitrary approvals;
- public terms accurately describe custodial, oracle, contract, liquidity, smart-contract, and regulatory risks; and
- a rollback decision can disable new exposure while preserving trading exit, settlement, LP removal, and redemption.

Mainnet deployment is blocked if any required official address is guessed, an oracle is mocked or manually substituted, privileged keys are held by one hot wallet, an audit has unresolved critical/high findings, or V2 liabilities cannot be reconciled to collateral.
