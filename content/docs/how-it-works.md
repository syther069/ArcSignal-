## The protocol in one loop

1. An off-chain job gathers crypto or football data and requests a structured AI analysis.
2. The contract owner creates a market containing the question, category, analysis JSON, and resolution time.
3. Participants choose Follow or Fade and stake testnet USDC into the corresponding pool.
4. After the event can be evaluated, an owner-authorized resolver submits the outcome.
5. Winning participants call `claimWinnings` to receive their original stake plus a pro-rata share of the losing pool.

:::important App and contract roles
The application prepares transactions and indexes events for faster reads. Stakes, pools, outcomes, and claims are authoritative only when recorded by the ARCSignal contract.
:::

## AI-generated market thesis

The analysis layer currently supports crypto data and football fixture data. It requests a structured response containing a probability, confidence score, YES or NO prediction, summary, arguments, factors, risks, sources, and generation time.

This output is stored with the market as `analysisJson`. It is context for participants—not a guarantee, price oracle, or resolution authority.

## On-chain pools

Every market has a Follow pool and a Fade pool. A stake transfers USDC from the participant into the contract and increases both the participant's recorded stake and the selected pool total.

There is no order book and no fixed price locked at entry. The relationship between the two pools determines the eventual return for the winning side.

## Resolution and claims

The owner can submit outcome `1` for Follow or `2` for Fade. This administrative authority is a material trust assumption. Once resolved, the winning side can claim; the contract does not push payouts automatically.

Read [Resolution and claims](/docs/resolution-and-claims) before participating, especially the current cancellation limitation.

## System boundaries

:::technical Current components
The repository contains a Next.js application, Solidity contracts, ARC Testnet wallet integration, off-chain market generation and resolution jobs, event indexing, and app-facing HTTP routes. It does not contain a permissionless market creator, node operator role, audited oracle network, or supported public developer platform.
:::

