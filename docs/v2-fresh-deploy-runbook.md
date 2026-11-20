# Fresh ArcSignal V2 deployment on Arc mainnet (after the 2026-11-20 key compromise)

The old admin wallet `0x93c55fDC…A5d6` is compromised. It is the admin of the old V2 factory
`0x43c4…` and oracle policy registry `0x70b8…`, so **those contracts must not be used again**.
V1 `0x0b2f…` was paused on 2026-11-20 (tx `0x3ced7d9a…02cc1`). The wallet `0xA53Ad249…A9a5` (key
committed in git history) is also treated as leaked.

The deploy script refuses both wallets in every role.

---

## 1. Wallets (create on a clean device; hardware wallet for the admin)

| Role | Wallet | Holds |
|---|---|---|
| **Protocol admin** | hardware wallet or multisig | admin of the factory and registries, oracle owner |
| **Arbiter** | can be the admin (single-operator mode) or a separate multisig | decides disputes |
| **Operator (hot)** | new hot wallet whose key lives in the server env | creates markets, requests and settles, proposes results |
| **Deployer** | new throwaway hot wallet | only sends the deploy transactions, then keeps no roles |
| **Treasury** | any safe address | fees and forfeited bonds |

Funding: the deployer needs **≈ 2 USDC** of gas. The 2026-11-20 dry run used 21.3M gas ≈ 1.06 USDC at 50 gwei. The operator needs a few USDC for gas and enough for initial market liquidity.

## 2. Dry run (sends nothing)

```bash
export FOUNDRY_PROFILE=arc
export EXPECTED_CHAIN_ID=5042
export DEPLOYER_PRIVATE_KEY=0x...        # new deployer key, never the compromised ones
export PROTOCOL_ADMIN=0x...              # new admin
export PAUSE_GUARDIAN=0x...              # usually the admin
export MARKET_CREATOR=0x...              # operator hot wallet
export RESOLUTION_OPERATOR=0x...         # operator hot wallet
export PROTOCOL_TREASURY=0x...
export USDC_ADDRESS=0x3600000000000000000000000000000000000000
export SETTLEMENT_ORACLE=true
export SETTLEMENT_PROPOSER=0x...         # operator hot wallet
export SETTLEMENT_ARBITER=0x...          # admin or multisig
# export ALLOW_SINGLE_OPERATOR=true      # only if proposer == arbiter (pages then say so)
export MAX_MARKET_COLLATERAL=10000000000
export MAX_PROTOCOL_COLLATERAL=100000000000
export MAX_INITIAL_LIQUIDITY=1000000000
export CATEGORY_METADATA_BASE_URI=https://arc-signal.xyz/categories
export PROTOCOL_FEE_BPS=50
export LP_FEE_BPS=100
export ORACLE_IDENTIFIER=0x4152435349474e414c5f5945535f4e4f00000000000000000000000000000000   # "ARCSIGNAL_YES_NO"
export ORACLE_MIN_LIVENESS=3600
export ORACLE_MAX_LIVENESS=604800
export ORACLE_MIN_BOND=25000000          # 25 USDC; must be <= ARCSIGNAL_V2_DISPUTE_BOND_USDC
export ORACLE_RULES_URI=ipfs://arcsignal/oracle/settlement-v1
export ORACLE_RULES_HASH=$(cast keccak "$ORACLE_RULES_URI")
forge script script/DeployArcSignalV2.s.sol --rpc-url https://rpc.mainnet.arc.io
```

## 3. Deploy (only after the dry run looks right)

Run the same command with `--broadcast`. Record every printed address and the **deployment block**.

## 4. Point the app at the new contracts (Vercel, plus `.env.local` for local)

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_ARCSIGNAL_V2_FACTORY_ADDRESS` | new factory |
| `NEXT_PUBLIC_ARCSIGNAL_V2_DEPLOYMENT_BLOCK` | printed deployment block |
| `ARCSIGNAL_V2_ORACLE_POLICY_VERSION` | `1` (fresh registry) |
| `ARCSIGNAL_V2_DISPUTE_BOND_USDC` | `25` |
| `RESOLVER_PRIVATE_KEY` | operator hot wallet key |
| `SETTLEMENT_PROPOSER_PRIVATE_KEY` | operator hot wallet key (or leave empty to use the one above) |
| `ARCSIGNAL_MARKET_CREATION_VERSION` | `2` (V2 only while V1 is paused) |
| `ENABLE_V2_MAINTENANCE` | `true` |
| `ENABLE_V2_SETTLEMENT` | `true` once step 5 says READY |
| `NEXT_PUBLIC_V2_SETTLEMENT_LIVE` | `true` |
| `NEXT_PUBLIC_V2_SINGLE_OPERATOR` | `true` only if proposer == arbiter |

Also:
- Update `artifacts/deployments/arc-5042-v2-manifest.json` with `node scripts/register-v2-deployment.mjs`.
- Remove the compromised keys everywhere: Vercel, GitHub secrets and local env files.
- Rotate every other secret that was in those files.

## 5. Verify

```bash
npx tsx scripts/check-v2-settlement.mts 1
```

Expect `READY`. Then run the first-market checklist in `docs/v2-settlement-runbook.md`, section 4.

## 6. V1

V1 stays paused. Existing V1 claims still work, and it held 0 USDC on 2026-11-20. The compromised key could unpause it, so the app should not create V1 markets any more (`ARCSIGNAL_MARKET_CREATION_VERSION=2`). Deploying a fresh V1 is optional, and only worth it if you still want pari-mutuel markets.
