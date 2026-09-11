# Signal Intelligence

Signal Intelligence adds auditable AI predictions independently of the existing trading thesis. It uses Next.js server routes, the existing Neon driver, provider clients, and cron-secret authorization. Wallet and contract write flows are unchanged. It does not introduce UMA or claim decentralized resolution.

## Setup and operations

No new packages or environment variables are required. Existing `DATABASE_URL` (or `POSTGRES_URL`), `CRON_SECRET`, and at least one existing AI provider key are required. Crypto generation uses the existing CoinGecko feed; football uses `API_FOOTBALL_KEY`. Chain reconciliation uses the configured ARC RPC and existing contract address. Never put secrets in browser code.

Run `node scripts/migrate-signals.mjs --verify-only` to validate SQL and integrity constraints in an isolated, temporary schema. Run `node scripts/migrate-signals.mjs` to validate and then atomically apply the additive migration. Test schema records are removed in the same transaction; a failure rolls back the entire transaction. Existing market tables and data are not modified by the migration.

Public reads:

- `GET /api/ai/agents`
- `GET /api/ai/leaderboard`
- `GET /api/markets/{id}/signals`

Trusted operations use `POST /api/cron/signals` with the existing `Authorization: Bearer <CRON_SECRET>` header. The production workflow sends `{"action":"generate-scheduled","maxMarkets":1}` every five minutes. Each indexed, supported open market receives a durable generation job; one worker leases at most one market and makes no more than three model calls. Partial successes are idempotent, failures use capped exponential backoff, and expired leases are recoverable. Send `{"action":"generate","marketId":"<existing open market ID>"}` for a targeted retry or `{"action":"reconcile"}` to retry settlement scoring. None of these operations submits a transaction. There is no public signal-write or score-write endpoint.

The authenticated resolver invokes signal scoring after successful settlement. The five-minute indexer persists settlement receipt references atomically with indexed events and retries reconciliation even when no new blocks need indexing. This also supports manual settlements and recovery after a missing resolver confirmation record. A failed signal reconciliation does not fail market indexing. Signal generation remains a separate bounded worker so indexing never waits on model providers. Provider failures retain already committed signals; retries skip completed styles.

## Data and integrity

The four tables are `ai_agents`, `ai_signals`, `signal_sources`, and `signal_scores`. Agent profiles and immutable signal fields are typed JSONB records; sources and trusted per-prediction scores have separate relational tables. Agent identities include reasoning style and the actual provider/model response identity. New records capture a provider-reported model version when returned, otherwise the actual provider model ID with an explicit `provider-model-id` provenance label. Provider aliases may move. Groq's serving fingerprint describes backend configuration, not an immutable weight revision, and is stored separately with the response ID. Historical records explain that no separate revision was captured; they are real predictions, not demo records. No legacy signals are backfilled or rehashed with guessed metadata.

Every market detail page includes the Signal Intelligence section, initially loaded on the server with loading, error, and lifecycle-specific generation states. Populated markets show each agent estimate, the median probability, and the disagreement range before the full cards. Cards expose model metadata, generation and source snapshot timestamps, probability and confidence range, supporting and contradicting evidence, sources, prior-record links when present, original hash, and final resolution. Market listings identify queued/retrying coverage or show the signal count and median. Both cards and leaderboard refresh every 15 seconds. Leaderboard disclosures show category and horizon metrics with resolved/pending/excluded counts, calibration buckets, recent prediction links, and sample maturity labels. `/ai-leaderboard/coverage` shows generation jobs, missing signals, source freshness, retries, and pending score reconciliation.

SHA-256 covers the complete immutable signal record, including market, agent/model identity, timestamps, probability/range, factors, source metadata, raw model response, and original input snapshot. Object keys are canonicalized; array order is preserved. Database triggers reject analysis/source updates or deletions. Read-time hash mismatch marks the record invalid and excludes it from scores. This is tamper detection, not an independently anchored timestamp or a defense against a database administrator replacing the entire database.

MVP stores one prediction per agent/model and market, enforced by a unique constraint. `previousSignalId` is nullable for future revision support; no revision history is invented. Model-reported confidence and subjective uncertainty intervals are not empirical calibration claims. Only provided source snapshots are attributed; model-generated citations are not trusted as sources.

## Scoring and resolution

Probability always means probability of the question resolving YES. FOLLOW means the question result agrees with the original market thesis; FADE means it disagrees. Reconciliation reads the market from ARC, verifies a successful receipt and matching contract-address/market/outcome event, and records the block timestamp. Direct resolver confirmation, submitted/confirmed oracle attempts, or indexed settlement events supply the receipt reference. Missing evidence keeps signals pending; cancellation is excluded based on chain state. Resolution provider links are provider references, not archived copies of observations.

Only valid resolved predictions generated before the market cutoff and settlement timestamp are scored. Accuracy uses YES at probability >= 0.5. Brier is squared probability error. Natural-log loss clamps only its input to [0.001, 0.999]. Calibration uses ten half-open buckets with 1.0 in the final bucket; expected calibration error is weighted by bucket population. Average confidence is mean self-reported confidence on scored predictions. Empty metrics are null, never fabricated zero scores. Rankings use ascending Brier with equal scores tied; agents without scored history are unranked. Category and time-horizon groups use the same scoring rules. No minimum sample threshold is implied.

`disputed` and `invalid` statuses are excluded; the existing owner-controlled testnet contract has no dispute lifecycle to hook into. Adding a future oracle dispute integration requires a trusted server adapter. Reconciliation only updates pending score rows, preserving previously reviewed statuses. The leaderboard compares different market samples and is not a controlled model benchmark.

## References reviewed

- [Arc documentation](https://docs.arc.io/) and [prediction markets](https://docs.arc.io/build/prediction-markets)
- [Arc App Kit](https://docs.arc.io/app-kit)
- [Circle developer documentation](https://developers.circle.com/) and [resources](https://www.circle.com/developer)
- [Circle prediction market sample](https://github.com/circlefin/arc-prediction-markets)
- [Circle agent starter kits](https://github.com/circlefin/agent-stack-starter-kits)
- [UMA documentation](https://docs.uma.xyz/) and [event-based market tutorial](https://docs.uma.xyz/developers/optimistic-oracle/in-depth-tutorial-event-based-prediction-market)

The Circle sample's UMA V2 and AMM architecture differs from ArcSignal's owner-controlled FOLLOW/FADE pools. The sample deploys test oracle infrastructure; none is assumed to exist in ArcSignal.
