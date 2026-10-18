# ArcSignal Arc Mainnet migration plan

Status: proposed  
Prepared: 2026-09-20  
Target network: Arc Mainnet (`5042`)  

## Executive decision

ArcSignal should not perform an in-place RPC switch from Arc Testnet to Arc Mainnet. It should launch a new, independently configured mainnet deployment of ArcSignal V2, keep testnet available as a separate environment, and leave V1 testnet history read-only.

The network and USDC prerequisites now exist, but ArcSignal is **not yet approved for real-value deployment**. The hard blocker is a production-grade prediction-market arbitration path on Arc Mainnet. The current V2 deployment uses `TestnetOptimisticOracleV2`; the deploy script can instantiate that shim when `DEPLOY_TESTNET_ORACLE=true`. That path must be impossible in a mainnet build. Arc's oracle catalog lists production data-feed providers, but a price feed is not a substitute for subjective event arbitration, proposal bonds, challenges, and disputes.

Mainnet promotion also remains blocked until independent contract and economic audits, operational key custody, legal review, a completed public testnet soak, and production incident controls have passed the release gates below.

## Verified Arc Mainnet parameters

| Parameter | Mainnet value | ArcSignal use |
|---|---|---|
| Chain ID | `5042` (`0x13B2`) | Wallet, RPC, deployment and server-side write validation |
| Public RPC | `https://rpc.mainnet.arc.io` | Fallback/read-only access, not the only production provider |
| Explorer | `https://explorer.arc.io` | Source verification and transaction links |
| Native gas asset | USDC, 18-decimal gas accounting | Fee estimation and wallet display |
| USDC ERC-20 interface | `0x3600000000000000000000000000000000000000`, 6 decimals | Collateral, approvals, transfers and accounting |
| CCTP domain | `26` | Cross-chain USDC onboarding |
| CCTP TokenMessengerV2 | `0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d` | Bridge integration verification |
| CCTP MessageTransmitterV2 | `0x81D40F21F12A8F0E3252Bccb954D722d4c464B64` | Bridge integration verification |
| Gateway Wallet | `0x77777777Dcc4d5A8B6E418Fd04D8997ef11000eE` | Optional Unified Balance integration |
| Gateway Minter | `0x2222222d7164433c4C09B0b0D809a9b52C04C205` | Optional Unified Balance integration |

Sources: [Arc Mainnet launch](https://www.arc.io/blog/arc-economic-os-internet), [connect to Arc](https://docs.arc.io/arc/references/connect-to-arc), [contract addresses](https://docs.arc.io/arc/references/contract-addresses), and [gas and fees](https://docs.arc.io/arc/references/gas-and-fees).

Important accounting rule: native USDC and the ERC-20 interface represent one underlying balance but expose different precision. ArcSignal must keep all market amounts in the 6-decimal ERC-20 view and use the 18-decimal native view only for raw gas math. The UI must show one USDC balance, not two assets.

## Current repository assessment

### Already useful for mainnet

- `src/lib/arc-network.ts` contains the correct mainnet chain ID, RPC, explorer, USDC address, and CCTP TokenMessenger address.
- Mainnet intentionally has no ArcSignal address, preventing accidental reuse of the V1 testnet contract.
- V2 tables and event uniqueness are generally keyed by `chain_id`.
- V2 indexing stores block hashes, supports replay after checkpoint mismatch, and reconciles collateral against liabilities.
- The deployment script checks `EXPECTED_CHAIN_ID` and separates admin, creator, resolver, pause, and treasury roles.
- V2 has explicit lifecycle, oracle-policy, category, fee, terms and source commitments.
- The present baseline passes 159 Vitest tests, TypeScript type checking, and the Foundry suite (verified 2026-09-20).

### Mainnet blockers and migration defects

| Severity | Finding | Required correction |
|---|---|---|
| Blocker | `TestnetOptimisticOracleV2` is the active testnet arbitration shim; no verified production event-arbitration deployment is configured for Arc Mainnet. | Select, integrate and audit a real proposal/dispute/arbitration system. The mainnet deploy must revert if the oracle is zero, test-only, or on the wrong chain. |
| Blocker | No completed independent smart-contract and economic/oracle audits are recorded. | Complete two independent reviews, remediate all critical/high findings, and publish reports and fixes. |
| Blocker | Prediction markets using real value create jurisdiction-specific licensing, consumer-protection, sanctions, tax and access-control obligations. | Obtain written counsel for every launch jurisdiction; implement the required eligibility, geofencing, disclosures, monitoring and record retention before deposits open. |
| Critical | `sync_state` uses the environment-neutral ID `arc-v2`; V1 tables and several Signal Intelligence relationships are not chain-scoped. | Use a separate mainnet database/schema at launch. Then make every cursor, job, market, signal, score and projection key include `chain_id` before any future multi-network database is allowed. |
| Critical | The installed Bridge Kit `1.14.1` exposes only `Arc_Testnet`, while current `1.15.1` supports Arc Mainnet. | Upgrade and pin the current reviewed Circle packages; test discovery with `getSupportedChains({ isTestnet: false })`; remove the hardcoded testnet fallback. |
| Critical | Production writes still use server-side private keys and scheduled public HTTP cron endpoints. | Move privileged roles to multisig/policy-controlled custody; use a narrowly scoped automation signer, method and value allowlists, rotation and emergency revocation. |
| High | The code exports an active chain under the name `arcTestnet`, and many write paths pass `chain: arcTestnet`. | Rename it to `arcChain`/`activeArcChain`; use viem's built-in `arc` and `arcTestnet` definitions; add a build-time ban on testnet identifiers in a mainnet bundle. |
| High | Legacy RPC and chain variables (`*_TESTNET_*`) remain accepted as fallbacks. | Use an explicit environment schema. Mainnet must fail closed if any chain ID, RPC-reported chain, explorer, address or deployment block is absent or inconsistent. |
| High | `foundry.toml` uses ordinary Foundry settings and does not select Arc execution semantics. | Use Arc Foundry with an Arc profile, pin the supported Arc hardfork/EVM baseline from current docs, and test the exact mainnet bytecode on an Arc fork before broadcast. |
| High | The production index workflow advances every five minutes using one application endpoint and one primary RPC configuration. | Add provider failover, WebSocket/event streaming or a managed Arc indexer, lag/error/solvency alerts, replay drills and a second independent reconciliation reader. |
| High | Mainnet exposure limits are operational conventions rather than immutable launch constraints. | The V2 factory now enforces deployment-time limits for total outstanding market collateral, per-market collateral and initial liquidity. Fee ceilings, open-market count, maximum duration, oracle rewards and timelocked cap increases remain follow-up work. |
| High | The public docs and UI still contain testnet-only claims and links. | Make copy, explorer, funding, risk, oracle, version and contract badges derive from the active deployment manifest. Remove faucets from mainnet. |

## Target architecture

1. **Separate environments:** `testnet.arc-signal.xyz` and the production domain use separate Vercel projects or environment groups, databases, RPC credentials, cron secrets, monitoring, custody accounts and deployment manifests.
2. **Mainnet V2 only:** no V1 creation, resolution or legacy write routes in the mainnet build. V1 remains a testnet-only historical reader.
3. **Fail-closed configuration:** one validated server configuration object is the source of truth for chain, contracts, deployment blocks and feature flags. Startup fails on zero addresses, testnet chain IDs, RPC-chain mismatches, missing bytecode or bytecode-hash mismatches.
4. **Production oracle:** normal outcomes come only from the audited oracle adapter. Admin and guardian roles may pause new exposure or invoke a narrowly defined timeout/void path, but must not select YES or NO.
5. **Hardened custody:** multisig plus timelock controls administration and fee changes; a separate guardian can pause exposure; automation can call only keeper selectors; treasury cannot administer markets.
6. **Redundant reads:** at least two independent Arc RPC providers, with a managed index/stream option from Arc's catalog (Alchemy, Envio, Goldsky, Pinax or The Graph) and onchain reconciliation against a separate provider.
7. **Manifest-driven clients:** a signed deployment manifest binds chain ID, addresses, bytecode hashes, compiler settings, source commit, audit versions, roles, oracle policy, fees and deployment blocks. Browser and server reject unknown manifests.

## Delivery plan

### Phase 0 — launch policy and ownership (1–2 weeks)

- Decide launch jurisdictions, eligible users, market categories, maximum value at risk and prohibited market types with counsel.
- Name owners for protocol security, oracle operations, treasury, compliance, SRE and incident command.
- Freeze the mainnet release specification and threat model. Include oracle manipulation, ambiguous outcomes, market manipulation, MEV, compromised keepers, sanctions/blocklist behavior, RPC corruption, bridge failure and insolvency.
- Publish measurable go/no-go gates and require named sign-off; calendar dates cannot override failed gates.

Exit: signed product/legal scope, RACI, threat model and loss/exposure budget.

### Phase 1 — complete network and data isolation (1–2 weeks)

- Replace the `arcTestnet` active-chain alias with `arcChain`; import viem's built-in `arc` for mainnet and `arcTestnet` only in test/testnet modules.
- Add `NEXT_PUBLIC_ARC_CHAIN_ID=5042`; remove testnet-named fallbacks from a mainnet build.
- Before every server write, call `eth_chainId` and assert `5042`; also assert code exists at every configured protocol address and that `collateral()` is the canonical USDC address.
- Create a new mainnet database. Change sync IDs to `arc-v2:5042` (and equivalent per worker) and add `chain_id` to all legacy/global records before shared analytics is attempted.
- Split cron secrets and endpoints by environment. Add a hard mainnet feature flag that disables all V1 and test-oracle routes.

Exit: an automated contamination test proves a testnet event, address, market ID, cursor or job cannot appear in mainnet APIs.

### Phase 2 — Arc-native build and deployment pipeline (1–2 weeks)

- Install and pin Arc Foundry. Add an Arc profile (`network = "arc"`) and pin the currently supported Arc hardfork/EVM target instead of relying on the compiler default.
- Produce reproducible bytecode from a clean checkout; record compiler, optimizer, dependency commits and bytecode hashes.
- Fork Arc Mainnet and simulate the complete deployment and role handoff with the actual canonical USDC predeploy.
- Add CI checks for chain ID, forbidden testnet addresses/strings, code size, bytecode hash, storage layout, role membership, zero addresses and mainnet manifest schema.
- Verify contracts on Blockscout immediately after deployment and compare explorer bytecode with the release artifact.

Exit: two operators independently reproduce identical artifacts and a fork rehearsal passes without privileged deployer roles remaining.

### Phase 3 — production resolution design (dependency-critical; 3–6+ weeks)

- Obtain written confirmation that the selected oracle/arbitration contracts, identifier, bonds and callbacks are supported on Arc Mainnet.
- Do not treat Chainlink, Chronicle, Pyth, RedStone or Stork price feeds as general event arbitrators. They may resolve objectively specified price-at-time markets if feed address, heartbeat, timestamp, decimals and fallback rules are committed before trading.
- For non-price markets, use an audited optimistic assertion/dispute system with independent arbitration, or do not list those markets at launch.
- Set bonds from value at risk, not a fixed cosmetic amount. Define liveness, evidence format, ambiguity/undetermined rules, timeout-to-void behavior and repeat-dispute handling.
- Remove or compile out `TestnetOptimisticOracleV2` from the mainnet deployment target. Add a chain-aware oracle allowlist and runtime code-hash check.
- Run end-to-end YES, NO, disputed, undetermined, stale-data, oracle-unavailable, callback-failure and timeout/void scenarios.

Exit: production oracle path is independently reviewed, disputed outcomes cannot be chosen by ArcSignal operators, and every failure leaves collateral redeemable.

### Phase 4 — contract and economic hardening (4–8 weeks, overlaps Phase 3)

- Add immutable/timelocked launch caps: total collateral, per-market exposure, liquidity, fee ceiling, open markets, duration and oracle reward/bond ranges.
- Extend invariant and differential tests for conservation of collateral, fee accrual, LP accounting, rounding dust, token transfer edge cases, pause behavior, void redemption and hostile ERC-20/callback behavior.
- Run Arc-fork tests, fuzzing, invariant testing, Slither/static analysis, dependency reachability review and gas/batch-limit measurement under Arc rules.
- Review native-USDC blocklist behavior and no-receipt failure modes; make jobs idempotent and reconcile nonce/receipt state after ambiguous sends.
- Commission two independent audits plus an economic/oracle review. Publish reports, remediations and regression tests.
- Open a bug bounty before public deposits.

Exit: zero unresolved critical/high issues; accepted medium issues have written owners, mitigations and expiry dates.

### Phase 5 — custody, compliance and operations (2–4 weeks, overlaps audits)

- Put protocol administration and treasury behind separate multisigs. Add a timelock for fee, oracle-policy, category and cap increases.
- Keep pause authority separate and limited. Document what pause blocks and prove settlement, LP withdrawal and redemption remain available where safe.
- Replace raw server keys with a KMS/HSM or policy-controlled wallet. Allow only named contracts/selectors, bounded value, daily spend and expected chain `5042`.
- Add wallet/address screening and transaction monitoring from an Arc-supported compliance provider as required by counsel.
- Alert on RPC disagreement, index lag, failed keepers, unexpected role changes, new bytecode, oracle delays/disputes, insolvency, cap utilization, abnormal volume and treasury movement.
- Run lost-key, compromised-keeper, RPC outage, oracle outage, bridge failure, database restore, pause and insolvency tabletop drills.

Exit: drills meet recovery targets, every role has recovery/rotation procedures, and monitoring pages the correct owner.

### Phase 6 — mainnet funding and user experience (1–3 weeks)

- Upgrade Circle Bridge Kit from installed `1.14.1` to a reviewed release that exposes Arc Mainnet (`1.15.1` was current during this review), pin exact versions, and re-run dependency/reachability analysis.
- Discover Arc support programmatically rather than assuming a chain string. Test Ethereum, Base and Arbitrum to Arc routes, fee estimates, forwarder support, partial failure, retry and recovery with small amounts.
- Consider Arc App Kit Onramp for fiat-to-USDC and Unified Balance/Gateway for chain-abstracted USDC. Treat both as optional UX layers, not protocol dependencies.
- Display transaction fee estimates in USDC, reserve enough balance for gas, and show one combined USDC balance.
- Show chain ID, protocol version, contract, collateral, oracle, dispute deadline, audit status and explorer links on every market and transaction.
- Require an explicit real-money acknowledgement; remove faucet language and testnet banners from mainnet while retaining strong risk disclosures.

Exit: funded-wallet, unfunded-wallet, wrong-network, bridge-recovery, rejected-signature, blocklisted-address and insufficient-gas journeys pass across supported wallets.

### Phase 7 — shadow mainnet and deployment rehearsal (minimum 2 weeks)

- Deploy to an Arc Mainnet fork and run production services against replayed mainnet data with writes disabled.
- Conduct two full dress rehearsals from a clean environment, including contract verification, manifest publication, role handoff, index bootstrap, rollback and incident declaration.
- Complete the already-planned minimum 30-day Arc Testnet V2 soak with real dispute/void drills; a mock oracle can test mechanics but cannot validate production arbitration.
- Have auditors review any code or dependency changed after their reviewed commit.

Exit: signed release candidate, reproducible manifest, completed soak, no unexplained reconciliation drift and go/no-go approval from security, legal, operations and protocol owners.

### Phase 8 — capped mainnet canary (2–4 weeks)

- Deploy contracts but keep market creation disabled.
- Verify source, bytecode, role holders, USDC, oracle, fee version and policy hashes from two RPC providers and the explorer.
- Fund only deployment/keeper gas budgets. Create internal canary markets with the lowest caps and no public promotion.
- Exercise complete request, dispute, settlement, void, LP exit and redemption paths with small real USDC.
- Open public access gradually: allowlisted cohort, then small public cohort, then wider access. Increase caps only through timelock after a review period.

Exit: all canaries reconcile exactly, no severity-one incidents, oracle and keeper SLOs hold, and cap increases receive formal approval.

### Phase 9 — general availability and continuous controls

- Keep value caps and category allowlists; do not remove them simply because the canary passed.
- Publish a live status page, verified deployment manifest, audit reports, incident policy and oracle-resolution guide.
- Run daily collateral reconciliation, weekly role/config review, monthly incident drill, dependency update cadence and periodic re-audit after material changes.
- Maintain a one-way kill switch for **new exposure**. Never use upgrade or pause powers to strand claims or rewrite settled outcomes.

## Mainnet environment contract

The final names should be simplified, but the minimum effective values are:

```dotenv
NEXT_PUBLIC_ARC_NETWORK=mainnet
NEXT_PUBLIC_ARC_CHAIN_ID=5042
NEXT_PUBLIC_ARC_RPC_URL=https://<browser-safe-mainnet-provider>
ARC_RPC_URL=https://<private-mainnet-provider>
EXPECTED_CHAIN_ID=5042
USDC_ADDRESS=0x3600000000000000000000000000000000000000
NEXT_PUBLIC_ARCSIGNAL_V2_FACTORY_ADDRESS=0x<verified-mainnet-factory>
NEXT_PUBLIC_ARCSIGNAL_V2_DEPLOYMENT_BLOCK=<mainnet-deployment-block>
```

Mainnet startup must reject `5042002`, `rpc.testnet.arc.io`, `explorer.testnet.arc.io`, the V1 testnet address, the V2 testnet factory, the testnet oracle shim, missing deployment blocks, and any address whose runtime bytecode hash differs from the signed manifest. Secrets and role addresses are intentionally omitted here.

## Recommended product improvements for the mainnet upgrade

1. **Oracle transparency as a first-class screen:** show committed wording, source cutoff, evidence policy, proposal, bond, proposer, dispute deadline, dispute transactions and final settlement.
2. **Proof-carrying AI signals:** timestamp and hash the exact model input, source bundle, model/version and output before market close. Keep the AI thesis advisory and separate from oracle truth.
3. **Exposure-aware market quality:** require minimum liquidity, maximum spread/slippage, clear invalid/void criteria and category-specific market templates. Reject ambiguous questions before deployment.
4. **User protection controls:** per-wallet and per-market limits during canary, cooling-off for unusually large orders, explicit slippage/min-output, allowance minimization and approval revocation guidance.
5. **Better funding:** after the Bridge Kit upgrade, add Arc Mainnet CCTP funding and optionally Onramp/Unified Balance. Always provide recovery for partial bridge completion.
6. **Professional observability:** replace five-minute-only cron polling with streaming or managed indexing plus deterministic replay and independent reconciliation.
7. **Public trust artifacts:** machine-readable deployment manifest, verified source, bytecode hashes, role map, audit versions, oracle policy and incident history.
8. **Safe automation:** AI may research and draft markets, but cannot deploy, trade, resolve or move treasury funds without policy bounds and human approval during the mainnet canary.
9. **Operationally safe fees:** quote gas and protocol/LP fees separately in USDC; make fee changes timelocked and visible before they take effect.
10. **Mainnet-specific documentation:** replace testnet claims with active-manifest data and preserve a clearly separate testnet learning environment.

## Go/no-go checklist

Mainnet is a **NO-GO** if any answer is no:

- [ ] Is the oracle/arbitration path production-supported on Arc Mainnet and independently audited?
- [ ] Can no ArcSignal operator directly choose a normal market outcome?
- [ ] Do audits have zero unresolved critical/high findings?
- [ ] Has the minimum 30-day V2 testnet soak and all incident drills completed?
- [ ] Are mainnet and testnet databases, keys, secrets, RPCs and manifests isolated?
- [ ] Do all configured addresses and bytecode hashes match the signed mainnet manifest?
- [ ] Are admin, treasury, guardian and automation roles separated and recoverable?
- [ ] Does independent reconciliation prove every market solvent?
- [ ] Are exposure caps enforced onchain and increases timelocked?
- [ ] Has counsel approved jurisdictions, users, market categories and required controls?
- [ ] Are funding, wrong-network, dispute, void, pause, bridge recovery and redemption journeys tested with small real USDC?
- [ ] Can new exposure be stopped without preventing safe exits, settlement or redemption?

## Relevant Arc resources

- [Arc Mainnet launch and ecosystem](https://www.arc.io/blog/arc-economic-os-internet)
- [Arc developer documentation](https://docs.arc.io/)
- [Network connection and RPC providers](https://docs.arc.io/arc/references/connect-to-arc)
- [Canonical contract addresses](https://docs.arc.io/arc/references/contract-addresses)
- [Gas and fee behavior](https://docs.arc.io/arc/references/gas-and-fees)
- [Arc Foundry](https://github.com/circlefin/arc-foundry)
- [Arc App Kit supported chains and tokens](https://docs.arc.io/app-kit/references/supported-blockchains)
- [Bridge Kit](https://docs.arc.io/app-kit/bridge)
- [Data indexers](https://docs.arc.io/arc/tools/data-indexers)
- [Oracle providers](https://docs.arc.io/arc/tools/oracles)
- [Account abstraction and paymasters](https://docs.arc.io/arc/tools/account-abstraction)
- [Compliance providers](https://docs.arc.io/arc/tools/compliance-vendors)
- [Official Arc prediction-market sample](https://github.com/circlefin/arc-prediction-markets)

Documentation is changing quickly around the mainnet launch. The Arc docs index still contains some stale testnet-only wording, while the current network and contract-address pages contain live mainnet values. Re-verify every chain parameter, dependency capability and contract address against the canonical pages immediately before release.
