# ArcSignal Documentation

The ArcSignal documentation source lives in [`content/docs`](./content/docs) and is published as a dedicated, structured experience under the `/docs` route in the web application.

> **Status Notice**: ArcSignal is experimental software deployed on ARC Testnet (Chain ID `5042002`). The current contracts are unaudited, market resolution is owner-controlled, winning users must manually call `claimWinnings`, and cancelled markets have no participant refund method in this contract version. Public developer APIs, node-operator workflows, decentralized resolution, and mainnet operation are planned roadmap items, not live features.

---

## Documentation Structure

Browse the documentation in the running app at `/docs` or directly in the markdown source files:

### Overview
- **[Overview](./content/docs/index.md)** (`/docs`) — Three guided paths: Predictors, Protocol Observers, and Builders.
- **[How ArcSignal Works](./content/docs/how-it-works.md)** (`/docs/how-it-works`) — High-level protocol loop, AI signals, pari-mutuel mechanics, resolution, and claims.

### Getting Started
- **[Getting Started](./content/docs/getting-started.md)** (`/docs/getting-started`) — Network configuration, wallet setup, and ARC Testnet faucet.
- **[First Prediction](./content/docs/first-prediction.md)** (`/docs/first-prediction`) — Step-by-step walkthrough of staking USDC on Follow or Fade.

### Mechanics
- **[Follow vs Fade](./content/docs/follow-vs-fade.md)** (`/docs/follow-vs-fade`) — Mechanics of agreeing with or fading the AI signal.
- **[Odds & Payouts](./content/docs/odds-and-payouts.md)** (`/docs/odds-and-payouts`) — Pari-mutuel multipliers, pool dynamics, and payout formulas.
- **[Market Lifecycle](./content/docs/market-lifecycle.md)** (`/docs/market-lifecycle`) — State transitions from Open to Locked, Resolved, and Claimed.
- **[Resolution & Claims](./content/docs/resolution-and-claims.md)** (`/docs/resolution-and-claims`) — Owner-controlled settlement and manual winnings claims.

### Protocol & AI
- **[AI Signals](./content/docs/ai-signals.md)** (`/docs/ai-signals`) — AI agent signal generation, conviction scores, and separation from settlement authority.

### Architecture & APIs
- **[Smart Contracts](./content/docs/contracts.md)** (`/docs/contracts`) — ARC Testnet deployed addresses, verified ABI, and contract security properties.
- **[Public API (Planned)](./content/docs/api.md)** (`/docs/api`) — Planned developer API reference and current internal REST endpoints.

### Trust, Security & Reference
- **[Security & Risks](./content/docs/security-and-risks.md)** (`/docs/security-and-risks`) — Comprehensive disclosure of smart contract, oracle, operational, and capital risks.
- **[Glossary](./content/docs/glossary.md)** (`/docs/glossary`) — Standardized protocol terminology.
