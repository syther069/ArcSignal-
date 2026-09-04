:::planned Public API status
ArcSignal does not currently offer a versioned, supported public developer API. The routes below exist to support the application and may change without notice. Do not build a production integration against them.
:::

## Current app-facing reads

The Next.js application includes read routes such as:

```text
GET /api/markets?limit=160&offset=0
GET /api/stats
GET /api/activity
GET /api/portfolio?address=0x...
GET /api/football/live
```

`/api/markets` prefers the indexed database and falls back to bounded on-chain reads. Some routes can return fallback or unavailable states when the index, RPC, database, or upstream provider is unavailable.

## Transaction tracking

The application posts a finalized stake transaction to an internal route so it can verify the receipt, confirm the ARCSignal contract and `Staked` event, update the index, and refresh relevant pages.

```text
POST /api/markets/:id/vote
```

This route does not place the on-chain stake for the user. The wallet transaction must already have succeeded.

## Indexing model

Arc has deterministic sub-second finality and no reorganization risk after a block is committed. A single confirmation is sufficient for app-level indexing.

The background indexer therefore defaults to `INDEX_CONFIRMATIONS=1`: it follows one block behind the latest observed head. Arc RPC receipts and matching ArcSignal events remain authoritative. Neon is a fast read model, not the source of truth.

`INDEX_CONFIRMATIONS` is an operational safety knob. Operators may raise it if RPC lag, provider inconsistency, or production policy requires a more conservative lag.

## Private operational routes

Cron endpoints for generation, indexing, maintenance, and resolution are operational infrastructure. They require server-side credentials or owner authority and are not public integration APIs.

:::security Never expose operator credentials
`CRON_SECRET`, `RESOLVER_PRIVATE_KEY`, database credentials, and AI provider keys belong only in the server environment. They must never be sent to a browser or public API client.
:::

## Planned public interface

A supported API would need versioning, authentication rules, rate limits, a stability policy, schemas, error contracts, and an explicit distinction between indexed data and authoritative chain state. Until those exist, use the published Solidity interface and ARC Testnet RPC for experimental development.

