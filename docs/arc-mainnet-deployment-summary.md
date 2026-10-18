# ArcSignal V2 — Arc Mainnet Contract Deployment Summary

**Date:** 2026-10-17  
**Network:** Arc Mainnet (`Chain ID 5042` / `0x13B2`)  
**RPC Endpoint:** `https://rpc.mainnet.arc.io`  
**Explorer:** `https://explorer.arc.io`  
**Deployer / Admin Address:** `0x93c55fDC841835fB61b944C6970f334AD4A2A5d6`  
**Audited Release Git Commit:** `327bc531a983d2be5d097ab1abefd7c29689a0dd`  

---

## 1. Executive Summary

ArcSignal V2 protocol contracts were compiled, tested, and successfully deployed to **Arc Mainnet**. All 27 deployment transactions confirmed on-chain. Contract bytecode and getters were independently verified via RPC against the official Arc Mainnet node.

The complete deployment manifest was validated and written to [`artifacts/deployments/arc-5042-v2-manifest.json`](../artifacts/deployments/arc-5042-v2-manifest.json).

---

## 2. Deployed Contract Addresses

| Contract Name | Deployed Address |
|---|---|
| **ArcSignalFactoryV2** | `0x43c47ca560042b48fce3af75fac63b1967822225` |
| **CategoryRegistryV2** | `0x726d82a689ca76b77b09a5d78282ff6fa0d902df` |
| **OraclePolicyRegistryV2** | `0x70b84b5b24973d8388f355c03aaeebc5af788a69` |
| **ProtocolFeeControllerV2** | `0x48103f1f0c9f619f82385b200812c9e58da7d1ef` |
| **UMAOracleAdapterV2** | `0xb0457fa7b49a462315d1efb4ac0669aa91531b43` |
| **ArcSignalMarketDeployerV2** | `0xca79519f744dc0daaccaa88e85e8e85ffbe838c3` |
| **PredictionMarketAMMDeployerV2** | `0x86cad302db3d57ee1b1d086a277549602d40ba6d` |
| **Collateral Asset (Canonical USDC)** | `0x3600000000000000000000000000000000000000` |

---

## 3. Protocol Roles & Parameters

- **Protocol Admin:** `0x93c55fDC841835fB61b944C6970f334AD4A2A5d6`
- **Market Creator:** `0x93c55fDC841835fB61b944C6970f334AD4A2A5d6`
- **Resolution Operator:** `0x93c55fDC841835fB61b944C6970f334AD4A2A5d6`
- **Pause Guardian:** `0x93c55fDC841835fB61b944C6970f334AD4A2A5d6`
- **Protocol Treasury:** `0x93c55fDC841835fB61b944C6970f334AD4A2A5d6`
- **Optimistic Oracle Address:** `0x93c55fDC841835fB61b944C6970f334AD4A2A5d6`
- **Protocol Fee:** `50 BPS` (0.50%)
- **LP Fee:** `100 BPS` (1.00%)
- **Max Market Collateral:** `10,000 USDC` (`10000000000` base units)
- **Max Protocol Collateral:** `100,000 USDC` (`100000000000` base units)
- **Max Initial Liquidity:** `1,000 USDC` (`1000000000` base units)

---

## 4. Blockchain Execution & Receipts

- **First Deployment Block:** `26462870`
- **Final Handoff Block:** `26462878`
- **Final Transaction Hash:** `0xcd69092d1e67ff81ff1dd48090861c89a8a98b126407761e02eef6210485f20f`
- **Total Transactions:** `27` confirmed transactions
- **Total Gas Used:** `~20,076,095` gas units
- **Gas Spent:** `~0.3145 USDC`
- **Broadcast Receipt Log:** [`broadcast/DeployArcSignalV2.s.sol/5042/run-latest.json`](../broadcast/DeployArcSignalV2.s.sol/5042/run-latest.json)

---

## 5. Production Environment Variables (.env)

```env
NEXT_PUBLIC_ARC_NETWORK=mainnet
NEXT_PUBLIC_ARC_CHAIN_ID=5042
NEXT_PUBLIC_ARC_RPC_URL=https://rpc.mainnet.arc.io
NEXT_PUBLIC_USDC_CONTRACT_ADDRESS=0x3600000000000000000000000000000000000000
NEXT_PUBLIC_ARCSIGNAL_V2_FACTORY_ADDRESS=0x43c47ca560042b48fce3af75fac63b1967822225
NEXT_PUBLIC_ARCSIGNAL_V2_DEPLOYMENT_BLOCK=26462870
ARCSIGNAL_DEPLOYMENT_BLOCK=26462870
```

---

## 6. Verification Status

- [x] All 19 Foundry invariant and unit tests passed.
- [x] All 164 Vitest unit and integration tests passed across 35 test suites.
- [x] Live RPC bytecode verification confirmed `21,754 bytes` at factory address `0x43c47ca560042b48fce3af75fac63b1967822225`.
- [x] Live factory getters verified (`collateral`, `categoryRegistry`, `oraclePolicyRegistry`, `feeController`, `marketDeployer`, `ammDeployer`).
