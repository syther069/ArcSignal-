# ArcSignal Arc and Circle Implementation Audit

## Executive assessment

ArcSignal is a working Arc Testnet application with native Arc chain configuration, browser-wallet transactions, ERC-20 USDC staking, on-chain pool settlement, Circle Bridge Kit onboarding, indexed market data, automated market operations, and an auditable AI Signal Intelligence layer. It is meaningfully Arc-native at the network, gas, collateral, transaction, and indexing layers.

It is not currently an implementation of the architecture described by Circle's Arc Prediction Markets sample. ArcSignal uses an owner-controlled pari-mutuel pool. The official sample uses collateral-backed transferable YES/NO position tokens, a constant-product AMM, and UMA Optimistic Oracle V2 request/propose/dispute/settle semantics.[^1][^2] ArcSignal's current contract has no UMA integration, no position-token contracts, no AMM, no permissionless outcome proposal, and no dispute window.

Circle Bridge Kit is genuinely integrated for bringing testnet USDC to Arc. Circle Agent Wallets, Circle CLI, Agent Marketplace discovery/payment, x402 nanopayments, wallet spending policies, and the Polymarket Marketplace service are not integrated into the application. ArcSignal's “AI agents” are analysis personas that call a conventional model provider; they are not Circle Agent Stack agents with wallets, budgets, paid services, or autonomous on-chain execution.

The project's proof-first UX is one of its strongest areas. It verifies wallet receipts and expected events, separates pending signals from scored predictions, shows model and snapshot metadata, preserves original analysis, displays a SHA-256 integrity hash, links settlement transactions, and avoids inventing legacy prediction history. That hash is stored off-chain and is correctly described in the UI as tamper detection rather than an on-chain timestamp or independent proof.

### Overall status

| Area | Status | Assessment |
|---|---|---|
| Arc Testnet and EVM integration | Implemented | Correct chain ID, RPC configuration, viem/wagmi interaction, Arc-native USDC gas labeling |
| USDC market collateral and payout | Implemented | ERC-20 USDC is transferred into the contract and paid to winners |
| USDC onboarding to Arc | Implemented, testnet | Circle Bridge Kit estimates, executes, retries, restores progress, and links transactions |
| Binary market lifecycle | Implemented with a different design | Owner-created, owner-resolved Follow/Fade pari-mutuel pools |
| Arc sample position tokens | Missing | No ERC-20 YES/NO positions |
| Arc sample constant-product AMM | Missing | No buy/sell AMM or transferable market positions |
| UMA-style optimistic resolution | Missing | No propose, bond, liveness, dispute, DVM, or permissionless settlement |
| Decentralized/trustless resolution | Missing | Contract owner is the final outcome authority |
| Circle passkey/modular user wallet | Missing | Only injected EVM connectors are configured |
| Circle Agent Wallet | Missing | No agent-wallet identity, authentication, custody, or policy layer |
| Circle CLI application workflow | Missing | CLI is not installed as a project dependency or invoked by the app |
| Agent Marketplace and x402 | Missing | No discovery, 402 handshake, signed USDC payment, or service receipt log |
| AI market analysis | Implemented | Structured Gemini/Groq analysis for crypto and football |
| Signal Intelligence and scoring | Implemented | Three perspectives, provenance, calibration, Brier/log-loss, resolved-only scoring |
| Autonomous AI trading | Missing | AI never approves, stakes, sells, claims, or controls a wallet |
| Proof-first UX | Substantially implemented | Strong receipt, event, source, timestamp, and status evidence; oracle proof remains absent |
| Production security readiness | Not ready | Unaudited contracts, deployed/source mismatch, centralized keys, dependency advisories |

## Reference architecture established by the official resources

Arc's prediction-market overview describes a collateralized market that issues long/YES and short/NO position tokens, trades those positions through an AMM, resolves through an oracle, and allows winning tokens to be redeemed for collateral. Arc contributes EVM compatibility, low-cost USDC-denominated gas, and deterministic finality.[^1]

The official Arc sample is more specific. It uses an `EventBasedPredictionMarket` contract, a `PredictionMarketAMM`, UMA Optimistic Oracle V2, collateral-backed position tokens, a proposal bond, a liveness period, dispute escalation, and permissionless settlement. The sample uses ARCT as test collateral while Arc Testnet USDC pays gas.[^2][^3] It explicitly states that its locally bootstrapped UMA infrastructure includes a mock DVM substitute and that the sample is educational and not production-ready.[^3]

Circle Agent Stack is a separate agent infrastructure layer. It provides agent wallets, USDC transactions, Circle CLI operations, spending policies, cross-chain actions, x402 service payments, and discovery through the Agent Marketplace.[^4][^5][^6][^7] Circle's trading-thesis tutorial demonstrates a research-first workflow: verify wallet and budget, discover paid market-data services, inspect price and schema, collect evidence, report supporting and conflicting signals, preserve a spend/receipt log, and avoid inventing unavailable data.[^8]

These are reference capabilities, not a checklist that every prediction-market product must copy. Claims must reflect the architecture actually deployed.

## Contract and market mechanics

### Implemented

The checked-in `ARCSignal` contract accepts an ERC-20 token address as immutable `usdc`, restricts market creation and resolution to the owner, accepts a binary side and USDC stake, records per-wallet stakes, and distributes the losing pool proportionally among winners. It uses `SafeERC20`, a balance-delta check against fee-on-transfer tokens, `ReentrancyGuard`, pausing for new risk, input-size limits, and a cancellation refund path. Contract evidence appears in `src/contracts/ArcSignal.sol`; four Foundry tests validate payout, cancellation refund, resolution timing/empty-pool rules, and claims while paused.

The current mechanism is pari-mutuel:

1. The owner creates a market.
2. A participant stakes USDC in Follow or Fade.
3. Pool totals change the estimated payout.
4. After the cutoff, the owner submits outcome 1 or 2.
5. Winners claim their stake plus a pro-rata share of the losing pool.

This is a legitimate prediction-pool design, but it does not implement the official sample's tokenized market or AMM. Users cannot mint equal YES/NO pairs, transfer positions, sell a position before resolution, provide AMM liquidity, or derive a spot price from AMM reserves.

### Missing relative to the Arc sample

| Official sample capability | ArcSignal evidence | Status |
|---|---|---|
| Collateral-backed ERC-20 YES and NO tokens | No position-token contract or token balance API exists | Missing |
| Mint/redeem paired positions | Only `stake` and `claimWinnings` exist | Missing |
| Constant-product `x*y=k` AMM | No AMM contract, reserves, swap, buy, or sell functions | Missing |
| Continuous exit before resolution | Stakes cannot be sold or transferred | Missing |
| AMM pricing where YES + NO = 1 | UI odds come from pool shares and AI estimates | Missing |
| Permissionless custom market deployment | `createMarket` is `onlyOwner`; generation is a privileged server job | Missing |
| Permissionless oracle settlement | `resolveMarket` is `onlyOwner` | Missing |

### Deployed contract verification

Read-only Arc Testnet RPC checks against `0x4f33115a18fe6a181be98610ddde3fab71efabed` confirmed:

- Contract bytecode exists.
- `getMarketCount()` returned 1,145.
- `owner()` returned `0xA53Ad24909d9E5f4eE015b90EAA0fbA5C0B9A9a5`.
- `usdc()` returned `0x3600000000000000000000000000000000000000`.
- `paused()` reverted or was unavailable.

The last result is material. The checked-in contract inherits `Pausable` and exposes `paused()`, while the deployed address does not. The repository itself labels the selected address as a legacy deployment without the checked-in cancellation-refund behavior. Therefore the hardened checked-in Solidity revision must not be represented as the deployed contract. Cancellation refunds remain disabled by feature flag unless a compatible deployment is verified.

There is no reproducible current deployment script in the primary Foundry `script/` directory, and no deployment manifest tying compiler settings, constructor arguments, commit, deployed bytecode, and explorer verification together. Legacy JavaScript deployment helpers exist, but they do not establish reproducible provenance for a future production contract.

## UMA-style optimistic resolution

### Current ArcSignal behavior

Resolution is centralized. The background resolver reads CoinGecko for crypto markets or API-Football for match markets, derives an outcome, and sends `resolveMarket` from the configured owner wallet. The contract verifies only that the market exists, has reached its cutoff, is unresolved, has a valid outcome, and has a non-empty winning pool. It cannot verify external facts or the evidence used by the server.

The indexer records resolution attempts and transaction hashes, and Signal Intelligence reconciliation verifies the settlement receipt and matching `MarketResolved` event before scoring predictions. This provides operational evidence after the owner acts, but it does not remove the owner's power to choose an outcome.

### Required elements that are absent

An honest “UMA-style optimistic resolution” claim requires, at minimum:

- an on-chain data request with unambiguous ancillary data;
- permissionless outcome proposal;
- proposer bond and reward rules;
- a visible liveness deadline;
- a dispute transaction path with a matching bond;
- escalation to a defined arbitration/DVM mechanism;
- settlement only after the liveness/dispute process;
- contract callbacks or verified settlement state that control redemption;
- UI states for requested, proposed, disputable, disputed, resolved, and settled;
- indexed proposal, dispute, bond, and settlement events.

None of these exists in ArcSignal V1. “Oracle” fields in the off-chain analysis JSON are deterministic provider policies used by the centralized resolver. They are not an optimistic oracle protocol.

The official Arc sample bootstraps UMA OOv2 components because UMA was not natively deployed on Arc Testnet at the time documented, and uses `MockOracleAncillary` as a DVM substitute.[^3] That is suitable for learning and testnet demonstrations. A mock admin-pushed DVM must not be described as production trustless arbitration.

## Arc network integration

### Implemented

ArcSignal configures Arc Testnet chain ID `5042002`, official default RPC `https://rpc.testnet.arc.io`, native currency USDC with 18-decimal gas accounting, and an ERC-20 USDC address with 6-decimal token accounting. The distinction is reflected in the staking UI, which reserves native USDC for gas while parsing ERC-20 stake amounts at six decimals.

The application uses viem and wagmi for reads, approvals, writes, receipts, chain switching, and event decoding. Stake ingestion verifies the transaction receipt, target contract, event name, market ID, user, side, and amount before storing an indexed activity record. The indexer treats Arc contract state and events as authoritative and Neon as a read model.

The GitHub workflow runs every five minutes to apply additive index migrations, advance the Arc event index, resolve due markets, reconcile signal scores, and generate bounded Signal Intelligence coverage. This is an operationally useful Arc integration.

### Gaps

- The application is Arc Testnet-only.
- There is no verified V2 deployment or dual-contract migration layer.
- There is no contract source verification workflow.
- The current diagnostics command for owner verification imports a missing module and fails; a manual read-only RPC query was needed.
- Contract event indexing is custom polling rather than a managed webhook/event-monitor product.
- There is no compliance screening integration despite Arc documentation identifying screening integration points for regulated products.[^1]

## USDC settlement and onboarding

### Market collateral and settlement: implemented

ArcSignal stakes and pays an ERC-20 token explicitly configured as Arc Testnet USDC. Approvals are amount-aware, receipts are checked, winning claims are user-initiated, and the UI explains that Arc gas is also paid in native USDC. This is more directly USDC-denominated than the official sample, which uses ARCT as market collateral and Arc Testnet USDC only for gas.[^2][^3]

### Circle Bridge Kit onboarding: implemented

The project includes `@circle-fin/bridge-kit` and `@circle-fin/adapter-viem-v2`. The funding modal supports Ethereum Sepolia, Base Sepolia, and Arbitrum Sepolia as sources and Arc Testnet as the destination. It:

- creates a viem adapter from the connected browser wallet;
- estimates protocol, forwarding, application, and network fees;
- enables forwarding so a new Arc wallet can receive destination USDC without already holding Arc gas;
- executes a USDC bridge;
- displays step-level status and explorer links;
- recognizes retryable failures;
- stores pending/error recovery state for 24 hours and restores it only for the same wallet;
- links the Circle faucet for testnet funding.

Unit tests verify that estimate and execution requests use the same forwarding parameters and that recovery state is wallet-bound and expires.

### Limits

The bridge integration is testnet onboarding through a user-connected browser wallet. It is not Circle Agent Wallet funding, Circle Gateway unified balance, or an x402 nanopayment flow. No successful live cross-chain transfer was performed during this audit because that would require a user wallet signature and would move funds.

## Wallet architecture

### Implemented

The user wallet layer uses wagmi's injected connector and recognizes common injected wallet brands. Users can connect a browser extension, switch to Arc Testnet, approve USDC, stake, claim, and bridge testnet USDC.

### Missing Circle wallet capabilities

The official Arc sample supports an injected wallet and a Circle passkey/modular wallet through account abstraction.[^3] ArcSignal does not include Circle modular-wallet or user-controlled-wallet packages, client keys, passkey registration, social/email login, smart-account abstraction, or gasless wallet actions.

Circle Agent Wallets are also absent. There is no:

- Circle CLI wallet login or session;
- 2-of-2 MPC agent wallet;
- agent wallet address or balance API;
- per-transaction, daily, weekly, or monthly spending policy;
- recipient allowlist or contract blocklist;
- Circle sanctions-screened agent transfer flow;
- autonomous wallet execution by an AI runtime.

Circle's docs distinguish an agent wallet from a normal application wallet: it lets an AI agent transact under user-defined policies and keeps key shares away from the agent.[^5] ArcSignal's browser wallets require the participant to approve and sign actions. That is appropriate for human trading, but it must not be called Agent Wallet integration.

## Circle CLI, Agent Marketplace, and x402

### Circle CLI: missing

`@circle-fin/cli` is not a project dependency and the app does not execute `circle wallet`, `circle services`, `circle gateway`, `circle bridge`, or `circle contract` commands. Circle CLI is a developer/agent command interface, not automatically part of an app merely because Circle Bridge Kit is installed.[^6]

### Agent Marketplace and x402: missing

No application code implements:

- Marketplace Discovery API queries;
- service price/schema inspection;
- HTTP `402 Payment Required` handling;
- parsing an `accepts` payment list;
- a signed USDC payment retry;
- Circle Gateway nanopayments;
- Marketplace payment receipts or spend accounting;
- publishing an ArcSignal API as a paid Marketplace service.

Circle's Marketplace flow requires the first request to return 402 with machine-readable payment options, followed by a signed USDC payment and a retried request.[^7] Ordinary API keys used for CoinGecko, API-Football, Gemini, or Groq do not satisfy this protocol.

### Polymarket Marketplace example: not integrated

The supplied Polymarket service URL is a Circle Marketplace listing surface, but the currently rendered public page exposes too little crawlable detail to independently verify its live schema or price. ArcSignal does not reference that URL, query a Polymarket service, pay through x402, ingest Polymarket odds, or retain a payment receipt. No implementation claim is supportable.

## Circle AI Skills

Circle AI Skills are development instructions that help an AI coding tool produce integrations; installing or consulting a skill does not add runtime wallet, bridge, or payment capabilities to an application.[^9] ArcSignal contains no Circle skill package or generated skill manifest in its project-level skills. Its Bridge Kit integration should be judged from the actual package imports, calls, error handling, and tests—not from whether a skill was used while coding.

If future work uses Circle Skills, the corresponding application capability still needs code, configuration, tests, and live verification. Frequently changing details such as supported chains, contract addresses, and SDK method signatures should be rechecked against Circle's live documentation or MCP rather than copied from an old example.[^9]

## AI analysis and trading workflows

### Implemented analysis workflow

ArcSignal generates market analysis from CoinGecko or API-Football context through Gemini/Groq-compatible code. Signal Intelligence adds three bounded, sequential perspectives:

- Macro Analyst Agent;
- Technical Signal Agent;
- Contrarian Risk Agent.

For each signal it stores provider, model, version metadata, generation time, snapshot time, YES probability, confidence and subjective range, supporting and contradicting factors, source, previous-record link when present, raw analysis, snapshot, integrity hash, provider response identifiers, and final outcome after resolution. Leaderboard scoring excludes pending markets and computes accuracy, Brier score, clamped log loss, calibration buckets, average confidence, category performance, and horizon performance.

Generation jobs are durably leased, bounded, retried with backoff, and reconciled on schedule. Provider outputs are instructed to use only the supplied snapshot and not claim browsing. Historical markets do not receive fabricated retrospective signals.

### What “agent” means here

The three entries are prompt-defined analysis roles. They can share the same underlying provider/model identity. They do not have persistent Circle Agent Wallets, independent budgets, Marketplace discovery, tool-selection loops, or authority to place trades. “AI signal agent” is supportable; “autonomous Circle trading agent” is not.

### Comparison with Circle's trading-thesis tutorial

| Tutorial pattern | ArcSignal | Status |
|---|---|---|
| Research-first, no automatic trade | Signals inform users and never transact | Implemented |
| Structured thesis, bull and bear cases | Stored and displayed | Implemented |
| Conflicting evidence | Contrarian factors and disagreement range | Implemented |
| Confidence and caveats | Confidence/range plus disclaimer | Implemented |
| Do not invent unavailable data | Prompt constraint and explicit empty states | Implemented |
| Wallet readiness and balance check | Human staking UI checks balance/allowance; no agent wallet | Partial |
| Maximum USDC research budget | No agent research budget | Missing |
| Marketplace service discovery | No Marketplace client | Missing |
| Paid data calls | No x402 paid research | Missing |
| Payment receipt and total spend log | No paid-service ledger | Missing |
| Arrays market data | CoinGecko is used instead | Missing |
| Autonomous execution under policy | No agent wallet or trading policy | Missing |

Circle's tutorial explicitly recommends beginning with research-only workflows, marking unavailable data, retaining receipts/costs, and reviewing signals before automating execution.[^8] ArcSignal's current non-trading Signal Intelligence layer follows the safer part of this pattern.

## Proof-first UX

### Implemented evidence

ArcSignal's UI and API provide meaningful proof surfaces:

- transaction receipts must succeed;
- expected contract address and decoded event fields must match;
- transaction hashes link to a dedicated verification view;
- market data and resolution evidence distinguish on-chain truth from indexed cache;
- AI cards show exact provider/model metadata and timestamps;
- raw model output and original market-data snapshot remain inspectable;
- source URLs and access times are displayed;
- the integrity hash is explained as change detection, not independent attestation;
- pending predictions are excluded from scoring;
- settlement transaction hashes and final results appear after reconciliation;
- empty, retrying, stale, historical, and pending states are explicit;
- leaderboard sample-size labels identify early results.

### Remaining proof gaps

- The AI analysis hash is not committed on-chain before the market cutoff.
- No signed model attestation or provider-verifiable response is required.
- There is no public immutable manifest binding question, oracle policy, evidence schema, cutoff, and dispute rules.
- Owner resolution has no proposal bond or challenge window.
- Source availability is not guaranteed; API-Football links may require credentials and data can change.
- The deployed contract is not proven to match the checked-in source.
- There is no visible contract-version badge that distinguishes legacy and hardened deployments.
- No paid-data receipt exists because Marketplace/x402 is absent.

## Security and operational findings

### Positive controls

- `SafeERC20`, reentrancy protection, state-before-transfer claim handling, and input bounds exist in checked-in Solidity.
- Cron routes use bearer-secret authentication.
- Signal calls are bounded and retryable.
- Chain receipts and events are verified before indexed activity is accepted.
- Neon is documented as a read model rather than the source of truth.
- The application clearly labels itself testnet and unaudited.
- 134 Vitest tests passed.
- Four Foundry contract tests passed.
- TypeScript type checking passed.
- Route bundle budgets passed.

### Material risks

1. **Deployed/source mismatch.** The selected live contract does not expose the checked-in `paused()` surface and is documented as lacking the revised refund path.
2. **Centralized privileged key.** The owner creates, resolves, and cancels every market. Compromise can create bad markets or submit wrong outcomes; loss can halt resolution.
3. **No dispute mechanism.** A wrong owner resolution becomes final at the contract layer.
4. **No independent contract audit.** Four unit tests cover core happy-path and selected failure cases, but there are no fuzz, invariant, differential, economic-manipulation, or formal tests.
5. **Dependency advisories.** `npm audit --omit=dev` reported 18 production dependency findings: 4 high, 6 moderate, and 8 low, with no automatic fix available. The high-severity dependency chain reaches the direct `@circle-fin/bridge-kit` dependency through Circle CCTP/Solana-related transitive packages. Exploitability in the browser bridge path requires separate reachability analysis; the findings must not be dismissed solely because some affected packages target unused chains.
6. **Broken owner diagnostic.** `npm run ops:check-owner` imports a missing `src/lib/arc` module and exits before querying the chain.
7. **Operational private key.** Market generation and resolution require a server-side owner key.
8. **Testnet-only assumptions.** Faucets, mock infrastructure, and Arc Testnet addresses cannot be promoted to a real-value environment.

The repository's audit-baseline wrapper initially failed to parse/report the registry response, while a direct production audit returned the findings above. The dependency baseline should be regenerated only after the advisories and parsing behavior are reviewed.

## Recommended target architecture

### Phase 0: keep current claims accurate

Continue describing the current product as an **Arc Testnet, USDC-settled, owner-resolved pari-mutuel prediction market with AI research signals**. Do not describe it as UMA-resolved, trustless, position-token based, AMM-traded, Agent Wallet powered, x402 enabled, or production audited.

Add an always-visible protocol-version panel containing chain ID, contract address, bytecode/source verification link, collateral token, resolution authority, cancellation behavior, and whether optimistic disputes are enabled.

### Phase 1: ArcSignal V2 protocol

Design V2 as a separate deployment while retaining read/claim support for V1. V2 should include:

1. Immutable market terms or a content hash covering question, category, resolution source, evidence rules, cutoff, liveness, bond, and valid outcomes.
2. An explicit lifecycle: Draft, Open, Closed, Requested, Proposed, Disputed, Resolved, Void.
3. UMA OOv2-compatible request, propose, dispute, and settle behavior, based on the official Arc sample where appropriate.
4. A documented Arc arbitration model. If a mock DVM is used on testnet, label it as mock/admin-controlled.
5. A neutral/undetermined outcome and safe pro-rata refund behavior.
6. Role separation for market creation, pausing, treasury, and emergency actions.
7. A multisig or timelocked administrator instead of a single hot owner.
8. Versioned events containing sufficient identifiers for deterministic indexing.
9. Explicit fee configuration and fee caps if fees are introduced.
10. A migration registry mapping each market to protocol version and contract address.

Whether to add transferable YES/NO tokens and an AMM is a product decision. If ArcSignal wants to match the official sample and support continuous trading, they are required. If ArcSignal wants to remain pari-mutuel, the UI and documentation should retain Follow/Fade pool terminology and avoid AMM/position-token claims.

### Phase 2: oracle and proof UX

Build a resolution panel showing:

- committed resolution question and ancillary data;
- oracle contract and request ID;
- proposer address and proposed outcome;
- bond, reward, proposal time, and dispute deadline;
- dispute transaction and arbitration status;
- final oracle settlement transaction;
- claimable amount and redemption transaction;
- links to raw provider evidence used for research, clearly separated from oracle truth.

Commit each AI signal's canonical hash on-chain or in an append-only timestamped transparency log before cutoff if public non-retroactivity is a product requirement. Keep model analysis advisory and separate from the market-resolution oracle.

### Phase 3: Circle wallet strategy

Use different wallet types for different actors:

- **Human participants:** retain injected wallets and consider Circle modular/passkey wallets for easier onboarding.
- **Operational automation:** use a hardened multisig/automation role; a developer-controlled wallet may fit scheduled protocol operations better than an end-user agent wallet.
- **Research agents:** add Circle Agent Wallet only when an agent must autonomously pay for data or execute a strictly constrained action.

For any research agent wallet, enforce a small per-request and daily USDC cap, allowlist Marketplace/payment contracts, block arbitrary contract calls, separate research funds from protocol treasury, log every command and receipt, and require human approval before market trades until the strategy has been independently evaluated.

### Phase 4: Agent Marketplace and paid research

Add Marketplace use as an optional evidence adapter rather than a hidden dependency:

1. Query the Discovery API.
2. Display provider, endpoint, health state, input/output schema, chain, and price before payment.
3. Enforce a per-market research budget.
4. Pay through x402/Agent Wallet.
5. Store service ID, request hash, payment transaction/receipt, amount, chain, response hash, and timestamp.
6. Feed only validated structured fields to the analysis model.
7. Show unavailable or failed paid data without blocking all other evidence.
8. Display the total research spend and receipt log beside the resulting thesis.

The Polymarket service should be integrated only after its current Marketplace listing, schema, price, legal terms, and network support are inspected live. Polymarket odds are a market-data input, not an objective resolution oracle.

### Phase 5: security gate

Before any real-value launch:

- fix the deployed/source mismatch;
- add reproducible deployment scripts and manifests;
- verify source and bytecode publicly;
- implement fuzz and invariant testing for solvency and aggregate claims;
- model zero-liquidity, rounding dust, cancellation, dispute, stale-oracle, and liveness failures;
- review all privileged roles and key recovery;
- resolve or isolate reachable production dependency advisories;
- commission an independent smart-contract audit;
- run a capped testnet beta with incident and pause procedures;
- obtain jurisdiction-specific legal advice for prediction-market operation and user access.

## Delivery priority

| Priority | Work | Why |
|---|---|---|
| P0 | Fix owner diagnostic; publish deployed-version status; stop source/deployment ambiguity | Users must know which contract behavior governs funds |
| P0 | Specify V2 oracle, lifecycle, cancellation, and migration invariants | These choices determine contract architecture |
| P0 | Add V2 Foundry fuzz/invariant suite before deployment | Current four tests are insufficient for a settlement protocol |
| P1 | Implement and test V2 optimistic resolution on Arc Testnet | Removes unilateral resolution from normal operation |
| P1 | Add proposal/dispute/bond/liveness proof UI and indexing | Makes optimistic security understandable and verifiable |
| P1 | Choose pari-mutuel versus position-token AMM model explicitly | Avoids building incompatible UX and accounting paths |
| P1 | Resolve/reachability-review Circle dependency advisories | Bridge code handles wallet transactions and deserves a strict gate |
| P2 | Add Circle passkey/modular wallet for human onboarding | Improves access without confusing it with Agent Wallets |
| P2 | Add Marketplace/x402 paid-data adapter with budgets and receipts | Extends Signal Intelligence with auditable paid evidence |
| P3 | Add tightly controlled Agent Wallet research automation | Useful only after payment workflow and policies are proven |
| P3 | Consider autonomous trading | Highest-risk step; requires separate evaluation and policy controls |

## Verification record

| Check | Result |
|---|---|
| Official Arc/Circle documentation review | Completed for all supplied URLs; Polymarket listing content was not crawlable beyond the listing shell |
| Repository contract review | Completed |
| Frontend wallet/staking/bridge review | Completed |
| Resolver/indexer/AI workflow review | Completed |
| `forge test -vv` | 4 passed, 0 failed |
| `npm run test` | 134 passed across 27 files |
| `npm run typecheck` | Passed |
| `npm run check:bundles` | Passed |
| `npm audit --omit=dev --json` | 18 findings: 4 high, 6 moderate, 8 low; no automatic fix reported |
| `npm run ops:check-markets` | Live address: 1,145 markets; historical address: 76 markets |
| `npm run ops:check-owner` | Failed due to missing `src/lib/arc` import |
| Manual live owner/USDC/bytecode RPC reads | Completed; owner and USDC confirmed, bytecode present |
| Live bridge transaction | Not performed; requires a user signature and moves testnet funds |
| Live Agent Wallet/x402 transaction | Not applicable; feature is not implemented |

## Source-by-source implementation map

| Supplied official resource | What was verified from the resource | ArcSignal implementation result |
|---|---|---|
| [Arc Prediction Markets Docs](https://docs.arc.io/build/prediction-markets) | Position tokens, AMM trading, oracle resolution, collateral redemption, Arc finality and USDC gas | Arc network and USDC benefits implemented; reference market mechanics and trustless oracle missing |
| [Arc Prediction Markets Sample App](https://docs.arc.io/build/sample-apps/arc-prediction-markets) | UMA OOv2 lifecycle, ARCT collateral, YES/NO tokens, AMM, proposal/dispute/settlement | ArcSignal uses a different owner-resolved USDC pari-mutuel design |
| [Arc Sample Applications](https://docs.arc.io/arc/references/sample-applications) | Official sample-app catalog entry point | No code is inherited or vendored from this catalog; the specific prediction-market sample was reviewed directly |
| [Circle Agent Stack](https://developers.circle.com/agent-stack) | Agent wallets, CLI, x402 services, multichain actions and compliance guardrails | Only a separate Circle Bridge Kit integration exists; Agent Stack runtime is missing |
| [Circle Agent Wallets](https://developers.circle.com/agent-stack/agent-wallets) | MPC/user-custody agent wallet, autonomous execution, limits, screening | Missing |
| [Agent Wallet Quickstart](https://developers.circle.com/agent-stack/agent-wallets/quickstart) | CLI authentication, wallet creation, funding and balance workflow | Missing; ArcSignal connects injected browser wallets instead |
| [Circle CLI](https://developers.circle.com/agent-stack/circle-cli) | Unified wallet, bridge, contract, Gateway and service commands | Missing from project dependencies and runtime |
| [Circle Agent Marketplace](https://developers.circle.com/agent-stack/agent-marketplace) | Discovery API and x402 paid-request handshake | Missing |
| [Circle AI Skills](https://developers.circle.com/ai/skills) | Development guidance for Circle integrations | No runtime feature follows merely from skills; actual Bridge Kit code was verified independently |
| [Polymarket Marketplace Example](https://agents.circle.com/services/polymarket) | Marketplace listing URL; public crawler returned only the shell | No ArcSignal reference, discovery, payment, odds ingestion, or receipt |
| [Trading Thesis Agent Tutorial](https://www.circle.com/blog/build-a-trading-thesis-agent-with-arrays-and-circle-agent-stack) | Budgeted paid research, agreeing/conflicting signals, no invented data, spend receipts | Structured research behavior substantially present; paid data, budget, wallet, and receipts missing |

## Repository evidence index

| Evidence | Repository location |
|---|---|
| Current Solidity market, owner controls, USDC pools and claims | `src/contracts/ArcSignal.sol` |
| Contract payout/refund/timing/pause tests | `test/ArcSignal.t.sol` |
| Arc chain ID, native USDC gas and selected deployment | `src/lib/contracts.ts`; `src/lib/wallet-config.ts` |
| ERC-20 approval and verified stake transaction | `src/app/market/[id]/MarketDetailStakeModal.tsx`; `src/app/api/markets/[id]/vote/route.ts` |
| Circle Bridge Kit request construction | `src/lib/circle-app-kit.ts` |
| Bridge estimate, execution, retry and progress UX | `src/components/wallet/FundUSDCModal.tsx` |
| Wallet-bound bridge recovery | `src/lib/circle-bridge-recovery.ts` |
| Injected-wallet-only connector configuration | `src/lib/wallet-config.ts`; `src/components/wallet/WalletModal.tsx` |
| Owner-operated external-data resolver | `src/app/api/cron/resolve/route.ts` |
| Market generation and owner contract writes | `src/app/api/cron/generate/route.ts` |
| Event index and recurring operations | `src/app/api/cron/index/route.ts`; `.github/workflows/indexer.yml` |
| Three-perspective signal generation and provenance | `src/lib/signal-intelligence/generation.ts` |
| Signal scoring and resolved-only aggregation | `src/lib/signal-intelligence/scoring.ts`; `src/lib/signal-intelligence/resolution.ts` |
| Signal proof and consensus UI | `src/components/signals/SignalIntelligence.tsx` |
| Honest current protocol documentation | `README.md`; `content/docs/how-it-works.md`; `content/docs/resolution-and-claims.md`; `content/docs/security-and-risks.md` |

## Conclusion

ArcSignal already has a credible Arc-native foundation: Arc Testnet transactions, native-USDC gas handling, ERC-20 USDC collateral and settlement, Circle CCTP onboarding, event-backed indexing, and a careful AI research and scoring layer. The strongest implementation evidence is in USDC staking, Bridge Kit integration, transaction verification, and Signal Intelligence transparency.

The largest architectural gap is resolution. The current owner-controlled outcome call is fundamentally different from UMA-style optimistic resolution. The next most significant gaps are tokenized/AMM trading, Circle passkey or modular user wallets, Circle Agent Wallets, and Marketplace/x402 research payments. These should be implemented as explicit V2 phases rather than implied by Arc/Circle branding or UI copy.

ArcSignal V2 should first make market truth and settlement verifiable, then improve wallet onboarding, then add paid agent research. Autonomous AI trading should remain last, behind wallet-level budgets, allowlists, audit logs, independent evaluation, and a clear user approval policy.

## Sources

[^1]: Arc Docs, [“Prediction markets”](https://docs.arc.io/build/prediction-markets), accessed September 2026.
[^2]: Arc Docs, [“Sample app | Arc prediction markets”](https://docs.arc.io/build/sample-apps/arc-prediction-markets), accessed September 2026.
[^3]: Circle, [“arc-prediction-markets” reference implementation](https://github.com/circlefin/arc-prediction-markets/blob/master/README.md), accessed September 2026.
[^4]: Circle Developer Docs, [“Agent stack”](https://developers.circle.com/agent-stack), accessed September 2026.
[^5]: Circle Developer Docs, [“Agent wallets”](https://developers.circle.com/agent-stack/agent-wallets) and [Agent Wallet quickstart](https://developers.circle.com/agent-stack/agent-wallets/quickstart), accessed September 2026.
[^6]: Circle Developer Docs, [“Circle CLI”](https://developers.circle.com/agent-stack/circle-cli), accessed September 2026.
[^7]: Circle Developer Docs, [“Agent marketplace”](https://developers.circle.com/agent-stack/agent-marketplace), accessed September 2026.
[^8]: Circle, [“How to Build a Trading Thesis Agent with Arrays & Agent Stack”](https://www.circle.com/blog/build-a-trading-thesis-agent-with-arrays-and-circle-agent-stack), accessed September 2026.
[^9]: Circle Developer Docs, [“AI skills for building with Circle”](https://developers.circle.com/ai/skills), and Circle's [open-source skills repository](https://github.com/circlefin/skills), accessed September 2026.
[^10]: Circle Agent Marketplace, [“Polymarket” listing](https://agents.circle.com/services/polymarket), accessed September 2026; public crawl exposed only the listing shell during this audit.
[^11]: Arc Docs, [“Sample apps”](https://docs.arc.io/arc/references/sample-applications), accessed September 2026.
