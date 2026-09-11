# Signal Intelligence implementation and verification

Implemented and verified locally on 7 September 2026. The additive migration was applied to the configured Neon database. No production website deployment or wallet transaction was performed.

## Delivered

- Three real reasoning agents: Macro Analyst, Technical Signal, and Contrarian Risk.
- Immutable typed prediction records, raw provider analysis and input snapshots, canonical SHA-256 hashes, and normalized sources.
- Server-side binary accuracy, Brier score, clamped natural-log loss, calibration buckets/error, confidence averages, and category/horizon aggregates.
- Public read APIs and a cron-secret-protected generation/reconciliation endpoint.
- Market signal cards, audit disclosures, source links, loading/error/empty states, and a separate AI leaderboard with desktop/mobile navigation.
- Receipt-verified YES/NO scoring integrated into the existing indexer without extending its run deadline.

## Verification results

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed; production build also completed its TypeScript phase |
| `npm run test` | 128 tests passed across 26 files; worker count bounded in Vitest configuration |
| Repository ESLint | Passed with zero errors and 75 pre-existing warnings |
| Feature-specific ESLint | Passed with zero errors or warnings |
| `npm run build` | Passed with network-enabled database/RPC access |
| Bundle budgets | All four existing route budgets passed |
| Foundry `forge test --offline` | Four contract tests passed |
| Production audit baseline | Passed; 18 existing vulnerabilities remain (8 low, 6 moderate, 4 high), no critical or newly unapproved advisories |
| Isolated SQL migration test | Passed: schema creation, immutable analysis and source triggers, and resolved-score constraints; test schema removed atomically |
| Additive database migration | Applied successfully, no seed/demo predictions |
| Read APIs | Agents, leaderboard, and market signals returned HTTP 200 |
| Unauthorized signal write | HTTP 401 |
| Real generation | All three agents generated real Groq `openai/gpt-oss-120b` predictions for `BTC-PRICE-24h-1788695907` |
| Repeat generation | HTTP 200, all three `already recorded`; no duplicate records |
| Reconciliation endpoint | HTTP 200, no eligible resolved markets yet |
| Visual inspection | Leaderboard empty and populated states, expandable calibration details, real market signal cards and audit disclosure inspected at desktop and 390px mobile widths |

The first parallel test run hit two existing test timeouts; the full suite passed with two workers. The local npm/npx PowerShell launcher resolves to a missing global npm installation; verification used the working npm CLI at `C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js`, or the installed package executables directly. No dependencies or lockfiles were changed.

## Changed files

Core:

- `src/lib/signal-intelligence/types.ts`
- `src/lib/signal-intelligence/scoring.ts`
- `src/lib/signal-intelligence/audit.ts`
- `src/lib/signal-intelligence/repository.ts`
- `src/lib/signal-intelligence/generation.ts`
- `src/lib/signal-intelligence/resolution.ts`
- `src/lib/types.ts`
- `src/lib/gemini.ts`

Database and operations:

- `db/migrations/001_signal_intelligence.sql`
- `scripts/migrate-signals.mjs`
- `src/app/api/cron/index/route.ts`
- `src/app/api/cron/signals/route.ts`
- `src/app/api/ai/agents/route.ts`
- `src/app/api/ai/leaderboard/route.ts`
- `src/app/api/markets/[id]/signals/route.ts`

UI:

- `src/components/signals/SignalIntelligence.tsx`
- `src/components/signals/AILeaderboard.tsx`
- `src/components/signals/SignalLayout.tsx`
- `src/app/ai-leaderboard/page.tsx`
- `src/app/ai-leaderboard/loading.tsx`
- `src/app/market/[id]/MarketDetailClient.tsx`
- `src/components/layout/Sidebar.tsx`
- `src/components/layout/Navbar.tsx`

Tests and documentation:

- `src/__tests__/signal-intelligence.test.ts`
- `src/__tests__/signal-api-auth.test.ts`
- `src/__tests__/signal-generation.test.ts`
- `src/__tests__/signal-resolution.test.ts`
- `docs/signal-intelligence.md`
- `docs/signal-intelligence-verification.md`

## Resources and limitations

No new environment variables or packages are required. Existing database, AI-provider, cron-secret, and ARC RPC configuration was available. Football generation requires the existing sports provider key; the live generation check covered crypto.

The three recorded predictions are pending, so historical metrics and ranks are intentionally blank. Verified resolution logic was tested with controlled fixtures; a real settlement of these new signals has not yet occurred. Generation for future markets is an explicit authenticated operational call documented in `docs/signal-intelligence.md`.

New predictions store provider response versions when returned, otherwise the actual provider model ID with an explicit provenance label. Serving fingerprints and response IDs are stored separately. Historical records explain that no separate revision was captured; immutable analysis and hashes are preserved. There is no invented legacy history. Each agent/model has one prediction per market; revision support and decentralized dispute integration remain future extensions. Audits detect record changes but are not independently anchored on-chain. The existing testnet owner remains the market resolver.

## Follow-up implementation

Completed the existing UI with server-loaded market signals, 15-second refresh for both signal cards and leaderboard, category/horizon metric tables with pending and excluded counts, and recent prediction links. Agent links open the corresponding disclosure. Provider transport metadata now reaches the immutable record instead of being discarded. Added provider identity, transport, full generation, rendering, pending-to-resolved aggregation, and settlement recovery tests.

Successful resolver receipts trigger scoring directly. The indexer records settlement references atomically with indexed events, allowing recovery when a resolver confirmation write is missing. Reconciliation verifies the receipt and market outcome, rejects late predictions, and only updates pending score rows.

All four requested npm scripts passed. The npm scripts were invoked through the working npm CLI because the system PowerShell npm launcher is broken. Lint retained 75 existing warnings and zero errors. Desktop inspection verified agent disclosures and links to populated market cards; mobile inspection verified the card and hash disclosure. No live settlement was forced for testing.

## Coverage automation follow-up

Added the durable `signal_generation_jobs` queue and automatic job creation in the finalized-block index transaction. The production workflow leases one market every five minutes, limits each market to three model calls, retries with capped backoff, and recovers expired leases. The same five-minute index path now reconciles scores even when there are no new blocks. A fresh CoinGecko current-price request repairs an old aggregate observation without relaxing the two-minute audit rule.

Market pages now distinguish scheduled, running, retrying, pre-feature, and missed-cutoff states. Populated pages show the three agent probabilities, median estimate, and disagreement range. Market rows show coverage and median probability. The leaderboard labels one to four outcomes as an early result. The coverage view at `/ai-leaderboard/coverage` shows missing records, provider retry state, snapshot freshness, and pending reconciliation.

The additive queue migration passed in an isolated schema and was applied to the configured database. A live bounded worker run completed all three auditable signals for `ETH-PRICE-24h-1788937434`; the markets page displayed `3 AI signals · 28% median YES`. Unit and rendering coverage increased to 134 passing tests across 27 files before the final repository checks.
