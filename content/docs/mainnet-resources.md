# Arc Mainnet Resources & Reference

This directory collects canonical Arc Mainnet resources, network endpoints, contract addresses, and protocol safety references.

## Official Arc Mainnet Links

Resource | Link | Notes
---|---|---
Arc Mainnet Explorer | [explorer.arc.io](https://explorer.arc.io) | Transaction and contract verification
Arc Documentation | [docs.arc.io](https://docs.arc.io/) | Official developer and network guides
Arc Portal | [portal.arc.io](https://portal.arc.io) | Direct bridging, cross-chain transfer & onramp
Arc Status | [status.arc.io](https://status.arc.io) | Network health, RPC, and indexer availability
Connect to Arc Guide | [docs.arc.io/connect-to-arc](https://docs.arc.io/arc/references/connect-to-arc) | RPC and network setup for wallets
Canonical Contracts | [docs.arc.io/contract-addresses](https://docs.arc.io/arc/references/contract-addresses) | Official USDC, CCTP, and predeploys
Gas & Fees | [docs.arc.io/gas-and-fees](https://docs.arc.io/arc/references/gas-and-fees) | Native USDC gas accounting details
App Kit Blockchains | [docs.arc.io/supported-blockchains](https://docs.arc.io/app-kit/references/supported-blockchains) | Circle App Kit supported networks

## Verified Arc Mainnet Parameters

- **Chain ID:** `5042` (`0x13B2`)
- **Public RPC:** `https://rpc.mainnet.arc.io`
- **Native Gas Asset:** USDC (18-decimal precision for gas calculation)
- **Canonical USDC ERC-20:** `0x3600000000000000000000000000000000000000` (6-decimal precision)
- **CCTP Domain:** `26`
- **CCTP TokenMessengerV2:** `0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d`
- **CCTP MessageTransmitterV2:** `0x81D40F21F12A8F0E3252Bccb954D722d4c464B64`

## Bridge Troubleshooting & Recovery

Arc Mainnet leverages native Circle CCTP V2 for secure, burn-and-mint cross-chain USDC transfers.
1. **Direct Bridging:** Use [Arc Portal](https://portal.arc.io) to bridge USDC directly from Ethereum, Base, or Arbitrum to Arc Mainnet.
2. **Partial Transfers:** If a CCTP attestation is delayed during high network congestion, retrieve your transaction hash from the source chain and confirm attestation on Iris or the Circle CCTP relayer before retrying.
3. **Gas Prerequisite:** All transaction fees on Arc Mainnet are settled in USDC. Keep a small reserve of USDC in your wallet for network operations.

## Protocol Security & Governance

- **Release Manifest:** Signed deployments, contract bytecodes, compiler settings, and verification records are published upon broadcast.
- **Oracle Resolution Policy:** All mainnet event resolution is governed by independent economic assertions and dispute windows. No single admin key can dictate market outcomes.
- **Exposure Caps:** Factory deployment fixes a maximum of 100,000 USDC of outstanding collateral per market, 1,000,000 USDC across the protocol and 10,000 USDC of initial liquidity per market. Values use six-decimal USDC base units and can only be changed by deploying a new factory; the current contracts do not provide a timelocked increase path.
- **Separate Testnet Environment:** Arc Testnet remains available for development and testing at [testnet.arc-signal.xyz](https://testnet.arc-signal.xyz) (Chain ID: `5042002`). Testnet history is read-only.
