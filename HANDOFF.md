# ArcSignal handoff (last updated 2026-11-21)

Read this first. It is the complete state of the project for whoever works on it next (human or agent).
Everything described here is committed on `main`. **No secret is in this file or in git.** Keys live only in
the git-ignored `.env.local` / `.env` on the owner's computer.

## What ArcSignal is
An AI-assisted USDC prediction market on **Arc mainnet** (chain 5042, RPC `https://rpc.mainnet.arc.io`,
USDC `0x3600000000000000000000000000000000000000`; USDC is also the gas token: 18 decimals as native gas,
6 decimals as the ERC-20). Users "Follow" or "Fade" the AI's pick. Stack: Next.js 16 (webpack), React 18,
wagmi 3 / viem 2, Neon Postgres, Foundry (solc 0.8.35, profile `arc`), vitest.

**Next.js here has breaking changes.** Read the relevant guide in `node_modules/next/dist/docs/` before writing
Next code (see `AGENTS.md`). Use `npm run build` (it passes `--webpack`); plain `next build` fails.

## Hard rules (the owner's standing instructions)
1. **Never print, paste or commit a private key or secret.** Keys are in `.env.local` / `.env`. Load them in
   code with `process.loadEnvFile`; show only derived public addresses.
2. **Never use the compromised wallets** `0x93c55fDC841835fB61b944C6970f334AD4A2A5d6` and
   `0xA53Ad24909d9E5f4eE015b90EAA0fbA5C0B9A9a5`. `DeployArcSignalV2` and `deploy-fresh-v2.mjs` refuse them.
3. **Ask before any mainnet transaction, production env change, database migration or push.** The database
   (Neon) is the shared live one.
4. Apply migrations by running only the specific `db/migrations/*.sql` file (statements are separated by
   `-- statement`). Do not run `npm run db:migrate`: it re-runs every migration, some of which change data.
5. Keep new features behind env flags that default to off. Add tests with every change.
6. Commit as the single author `syther069`. No `Co-Authored-By` trailers.

## Security incident (2026-11-20)
The old admin wallet `0x93c5…A5d6` was reported compromised. It owned V1 and was admin of the old V2 contracts.
A second key (`0xA53A…`) was committed in an old commit, so treat it as leaked too.
- V1 was **paused** on 2026-11-20 (tx `0x3ced7d9ade7410f9fa3d75bf3cd5a5811de0633a52ba4a39887a8cb781e02cc1`).
  The attacker could unpause it. It held 0 USDC. Existing claims still work.
- The old V2 factory (`0x43c4…2225`) and registry (`0x70b8…9a69`) are abandoned. Their oracle was a plain
  wallet, so V2 markets there could never settle. They had 0 markets.
- Still to do by the owner: rotate every secret that was in the old env files or git history (Gemini, Groq, xAI,
  CoinGecko, API-Football, Supabase, Neon password, `CRON_SECRET`, `OPS_ADMIN_SECRET`), update Vercel and GitHub
  secrets, and delete the old keys everywhere. The xAI key was also pasted into a terminal, so rotate it.

## Contracts on Arc mainnet
**Fresh V2 (deployed 2026-11-21, block 32234352, 37 txs, 0.356 USDC gas):**

| Contract | Address |
|---|---|
| Factory | `0x46f34037823fF79a7dcA49E0C219eb95a4d9A6B2` |
| Settlement oracle (also its own adapter) | `0xF3c02435b3d643CcEeBE29AF45A8E4679E92CE10` |
| Oracle policy registry | `0x3Cebd30365cA522ee74961Fb7838451Fd1405c02` |
| Category registry | `0xf555b4787a6e46a0884664cbe079C7947fA840a6` |
| Fee controller | `0x40966ba84C684cf3C36cD48c8613472c42f13423` |
| Market deployer | `0xAd3954114552a584839FD0397765E430DFc9Bd4b` |
| AMM deployer | `0x1D55F3edA31E8853572E41852F00182eC045e1ef` |

Oracle policy 1 version 1 points at the settlement oracle, minimum dispute bond 25 USDC, liveness 1h to 7d.
The deployer kept no roles (checked on chain). **V1** singleton: `0x0b2ffef100152f94a7924830056b05dc60d88c4d`
(paused, owner compromised). Not deployed yet: `SignalAnchor` (`src/contracts/v2/SignalAnchor.sol`).

**New wallets** (keys only in `.env.local` / `.env`):

| Role | Address | Env names |
|---|---|---|
| Admin: owns V2, oracle owner and arbiter, treasury, pauser | `0x6a9daC65A1F05B766D448360EaE885F76391FC8c` | `ADMIN_PRIVATE_KEY`, `PROTOCOL_ADMIN`, `SETTLEMENT_ARBITER` |
| Operator (hot): creates and resolves markets, proposes results | `0x4c38dC03c3A7cc731e45F3d1AE52FA78095541fb` | `RESOLVER_PRIVATE_KEY`, `MARKET_CREATOR`, `SETTLEMENT_PROPOSER` |
| Deployer (throwaway, no roles) | `0x0D7B555b919218430307a0Da2462EC2519D0b16f` | `DEPLOYER_PRIVATE_KEY` |

Balances on 2026-11-21: deployer about 0.37 USDC, **operator 0**, admin 0. The admin is a single hot key; move
arbiter and owner to a multisig with `setArbiter` / `setOwner` (no redeploy needed).

## What was built (all behind env flags unless noted)
- **Trading:** Sell screen (`SellPositionModal.tsx`, `planSell` in `v2-market-math.ts`: swap part, then
  `redeemPairs`). Fixed trade box faking success or prices. Follow always means "back the AI's pick" (`aiPicksYes`,
  `questionOutcome`, `sideBuysYes` in `market-insight.ts`). Fixed the V2 YES price (scarcer token is pricier).
  Approvals default to 5x the trade (checkbox for exact). WalletConnect phone sign-in.
- **Trust UI:** "How this market ends" card, AI vs market price, honest AI track record, share image, Share on X.
- **Signal anchoring:** AI forecast hashes batched into a Merkle root on Arc (`SignalAnchor.sol`, `merkle.ts`,
  `anchors.ts`, cron `anchor-signals`). Needs the contract deployed plus `ENABLE_SIGNAL_ANCHORING`,
  `SIGNAL_ANCHOR_ADDRESS`, `ANCHOR_PRIVATE_KEY` (use a dedicated key, not the admin).
- **Grok (xAI):** `src/lib/xai.ts` (Responses API with live X and web search). Grok as a 4th scored agent with cited
  sources saved in the hashed record. X Pulse (cron `x-pulse`), price-move notes (cron `price-moves`), Ask Grok chat
  (`/api/markets/[id]/ask`, rate limited), X-crowd and market-price baselines on the leaderboard, resolution
  evidence packs (advisory), markets drafted from X trends with buzz and lean ranking (`trend-drafts*.ts`,
  review page `/ops/drafts`, protected by `OPS_ADMIN_SECRET`; approved drafts publish through the `generate` job).
- **V2 settlement:** `ArcSignalSettlementOracleV2.sol` (only the proposer proposes, anyone disputes with a bond,
  arbiter decides, `closeVoided` returns stuck bonds). Keeper cron `settle-v2` (observes the CoinGecko price right at
  close, proposes only when `decideCryptoResolution` says "resolve", else manual review), own workflow
  `.github/workflows/settle-v2.yml`. UI `SettlementStatus.tsx` with Dispute and Finalize buttons.
- **Safety fixes:** the `generate` job refuses to create V2 markets unless settlement is ready
  (`v2-settlement-readiness.ts`); `index-v2` refuses a mismatched chain; `v2-repository.ts` reads only the active
  chain; `HybridOracleRouterV2.sol` is marked DO NOT DEPLOY.

## Database (Neon, live)
Migrations **004 to 009 are applied**: anchors, X pulse, Grok phase 2 (price points, move notes, Ask usage),
Grok phase 3 (drafts, evidence), draft sentiment, close observations. DDL is mirrored in
`src/lib/signal-intelligence/schema.ts` and `scripts/migrate-signals.mjs`. Six stale testnet V2 rows were deleted.

## Key settings
Defined in `.env.example` and `.env.mainnet.example`. Current local `.env.local` already points at the new factory
(`NEXT_PUBLIC_ARCSIGNAL_V2_FACTORY_ADDRESS`, `NEXT_PUBLIC_ARCSIGNAL_V2_DEPLOYMENT_BLOCK=32234352`,
`ARCSIGNAL_V2_ORACLE_POLICY_VERSION=1`, `ARCSIGNAL_MARKET_CREATION_VERSION=2`, `ARCSIGNAL_V2_DISPUTE_BOND_USDC=25`).
**Production (Vercel) has NOT been updated** and may still hold the old factory and old keys.

| Feature | Flags |
|---|---|
| V2 settlement | `ENABLE_V2_SETTLEMENT`, `NEXT_PUBLIC_V2_SETTLEMENT_LIVE`, `ENABLE_V2_MAINTENANCE`, `NEXT_PUBLIC_V2_SINGLE_OPERATOR` (only if one wallet does both) |
| Grok | `XAI_API_KEY`, `XAI_MODEL`, `ENABLE_X_PULSE`, `ENABLE_PRICE_MOVES`, `ENABLE_ASK_GROK` + `NEXT_PUBLIC_ENABLE_ASK_GROK`, `ENABLE_TREND_DRAFTS`, `ENABLE_EVIDENCE_PACKS`, `OPS_ADMIN_SECRET`, `TREND_*` |
| Anchoring | `ENABLE_SIGNAL_ANCHORING`, `SIGNAL_ANCHOR_ADDRESS`, `ANCHOR_PRIVATE_KEY` |

## Do next, in order
1. **Fund the operator** `0x4c38…41fb` with USDC (at least 0.05 for gas, plus any market liquidity). It is the only
   blocker the readiness check reports.
2. Run `npx tsx scripts/check-v2-settlement.mts 1`. It should say READY (with multisig warnings).
3. Update **Vercel** env: new factory, deployment block, policy version, operator key, flags. Remove the old keys
   from Vercel and GitHub secrets. Rotate the secrets listed above.
4. Turn on `ENABLE_V2_MAINTENANCE`, `ENABLE_V2_SETTLEMENT`, `NEXT_PUBLIC_V2_SETTLEMENT_LIVE`. Follow the first-market
   checklist in `docs/v2-settlement-runbook.md` (section 4).
5. Deploy `SignalAnchor` with its own key, then enable anchoring.
6. Move arbiter and owner to a multisig. Decide whether to deploy a fresh V1 or retire it.
7. Optional: passkey sign-in and sponsored gas (check whether Circle Modular Wallets support Arc mainnet first).

## Not verified (be honest about these)
- Buy, sell, dispute and claim have **never been run with a real wallet**. No V2 market has existed yet.
- X Pulse, price-move notes and evidence packs were not live-tested (no open or just-closed markets).
- Nothing in this repo calls `/api/cron/resolve` (the V1 resolver). Something outside the repo may. Check.
- `TREND_EXTRA_SYMBOLS` (DOGE, BNB, LINK, TON) needs the same flag on the resolver; their CoinGecko ids are unchecked.
- Settlement trust: one operator proposes and one admin wallet arbitrates. It is not decentralized.

## Commands
```bash
npm run dev            # next dev --webpack (preview config in .claude/launch.json)
npm run build          # production build (webpack)
npx tsc --noEmit       # typecheck
npx vitest run         # app tests (283 passing on 2026-11-21)
forge test             # contract tests (50 passing)
npx tsx scripts/check-v2-settlement.mts [policyVersion]   # read-only readiness check
node scripts/deploy-fresh-v2.mjs [--broadcast]            # fresh V2 deploy (dry run by default)
```
Docs: `docs/v2-settlement-runbook.md`, `docs/v2-fresh-deploy-runbook.md`, `docs/signal-intelligence.md`.

## Gotchas
- Shell is Git Bash on Windows. Avoid heredocs with nested quotes; write files with the editor tool.
- Foundry loads `.env` only (not `.env.local`). Both files hold the new wallet block now.
- Cron jobs run from GitHub Actions every 5 minutes (`indexer.yml`, `settle-v2.yml`) and call `arc-signal.xyz`
  with `CRON_SECRET`. Pushing to `main` can trigger a production deploy.
- `next-env.d.ts` flips between dev and build paths; do not commit that noise.
