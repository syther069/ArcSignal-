# V2 settlement on Arc mainnet: switch-on runbook

Status on 2026-11-20: **not live.** The mainnet V2 oracle policy (v1) points at a plain wallet, so V2
markets cannot settle. The app refuses to create V2 markets until this runbook is complete.
No mainnet V2 markets exist yet, so nothing needs migrating.

Check readiness at any time (read-only, sends nothing):

```bash
npx tsx scripts/check-v2-settlement.mts
```

---

## 0. What you need first

| Item | Why | Notes |
|---|---|---|
| **Arbiter multisig** | Decides disputed results | A Safe (or another audited multisig contract) on Arc mainnet with at least 2 of 3 signers. The script refuses a plain wallet. |
| **Owner multisig** | Can change the proposer, arbiter or treasury | Can be the same Safe as the arbiter, or a separate one. |
| **Proposer key** | The settle-v2 job proposes results with it | A **new** key, not the admin `0x93c5…`. Fund it with a little USDC for gas. |
| **Treasury address** | Receives forfeited dispute bonds | Can be the protocol treasury. |
| **Deployer key** | Deploys the oracle and registers the policy | Must hold `ORACLE_POLICY_ADMIN_ROLE` on the registry. Today that is the admin `0x93c5…`. |

Confirm that a Safe deployment exists on Arc mainnet (chain 5042) before you start. If it doesn't, use another audited multisig contract.

## 1. Deploy the oracle and register it (policy version 2)

The factory reads the oracle from the oracle-policy registry, so **no factory redeploy is needed**. The script deactivates v1 for new markets.

```bash
export ARC_RPC_URL=https://rpc.mainnet.arc.io
export DEPLOYER_PRIVATE_KEY=0x...            # holds ORACLE_POLICY_ADMIN_ROLE
export ORACLE_POLICY_REGISTRY=0x70b84b5b24973d8388f355c03aaeebc5af788a69
export USDC_ADDRESS=0x3600000000000000000000000000000000000000
export SETTLEMENT_OWNER=0x...                # multisig
export SETTLEMENT_ARBITER=0x...              # multisig
export SETTLEMENT_PROPOSER=0x...             # address of the new proposer key
export SETTLEMENT_TREASURY=0x...
export SETTLEMENT_MIN_BOND=25000000          # 25 USDC; must be <= ARCSIGNAL_V2_DISPUTE_BOND_USDC
forge script script/RegisterSettlementOracle.s.sol --profile arc --rpc-url $ARC_RPC_URL --broadcast
```

Write down the printed oracle address and the **new policy version** (expected: 2). Add both to
`artifacts/deployments/arc-5042-v2-manifest.json`.

## 2. Production settings (Vercel)

| Variable | Value |
|---|---|
| `ARCSIGNAL_V2_ORACLE_POLICY_VERSION` | the printed version (2) |
| `ARCSIGNAL_V2_DISPUTE_BOND_USDC` | `25`, or higher |
| `SETTLEMENT_PROPOSER_PRIVATE_KEY` | the new proposer key |
| `ENABLE_V2_MAINTENANCE` | `true` (requests results after close, settles after the dispute window, voids expired markets) |
| `ENABLE_V2_SETTLEMENT` | `true`: only after step 3 says READY |
| `NEXT_PUBLIC_V2_SETTLEMENT_LIVE` | `true`: shows the settlement panel and the live wording |

`RESOLVER_PRIVATE_KEY` must still hold the factory's market-creator and resolution-operator roles, because the market job and maintain-v2 use it.

The `V2 settlement` GitHub workflow (`.github/workflows/settle-v2.yml`) runs every 5 minutes and needs the existing `CRON_SECRET` repository secret.

## 3. Verify before switching on

```bash
npx tsx scripts/check-v2-settlement.mts 2
```

Expect `"verdict": "READY…"`. That requires all of these:
- the oracle is a real contract
- the arbiter and owner are contracts
- the configured proposer key is the oracle's proposer
- the bond is at least the policy minimum

## 4. First markets checklist

1. Let the market job create one short V2 market, or one approved X-trend draft.
2. Before close, the market page shows trading and the plain resolution card.
3. At close, the `settle-v2` run logs an observation for the market (table `close_observations`).
4. Within ~5 minutes, `maintain-v2` requests the result, then `settle-v2` proposes it (`oracle_attempts` status `V2_PROPOSED`). The page then shows "Proposed result: YES/NO · can be disputed until …".
5. After the dispute window (1 hour), maintain-v2 finalizes it. Anyone can also press **Finalize result**.
6. A winning holder redeems 1 USDC per token from the claim section.
7. Anything logged as `V2_MANUAL_REVIEW` needs a person. The arbiter cannot act on a request with no proposal, so either propose by hand with the proposer key or let the market void at `voidAfter` (holders redeem their collateral).

## 5. Rollback

All new V2 markets stop immediately if you do one of these:
- set `ENABLE_V2_SETTLEMENT=false` (the market job falls back to V1)
- or deactivate the policy: `setVersionActive(1, 2, false)` from the policy admin

Markets already created keep their oracle. Proposals, disputes and settlement continue for them through the oracle and the multisig.

## Known limits
- Results are checked once, at close, from CoinGecko (crypto) or API-Football (full-time score). A late or missing price goes to manual review, never to an automatic guess.
- GitHub's scheduler can run late. A scheduler that runs every minute (for example Vercel Cron) for `/api/cron/settle-v2` makes close-time observations more reliable.
- The arbiter has the final say on disputes. That is a trusted multisig, not a decentralized oracle.
