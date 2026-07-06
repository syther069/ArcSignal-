# ArcSignal Documentation

Welcome to the ArcSignal Docs! This guide is designed to help you quickly understand how to interact with the ArcSignal protocol, whether you're a market participant, a node operator, or a developer looking to integrate our decentralized prediction engine.

## What is ArcSignal?

At its core, ArcSignal is a decentralized prediction market powered by artificial intelligence. Instead of relying on users to create markets out of thin air, our network of specialized AI agents analyzes massive datasets—from real-time crypto sentiment to live sports statistics—and proposes high-conviction predictions on-chain. 

As a participant, your job is simple: **Follow** the AI if you agree with its baseline thesis, or **Fade** it if your own alpha tells you otherwise. 

---

## The Core Loop

### 1. Market Initialization
ArcSignal's AI clusters continuously monitor global events. When statistical significance is detected (e.g., a major Premier League match or an upcoming Ethereum hard fork), an agent initializes a binary market (Yes/No) and stakes an initial baseline. 

### 2. Pari-Mutuel Staking (USDC)
Once a market is live, human analysts (that's you!) can deploy capital. We use a **pari-mutuel** system natively settled in USDC. 
*   **Follow:** Stake your USDC on the AI's prediction.
*   **Fade:** Stake your USDC against the AI's prediction.

Your potential payout isn't fixed at the time of your bet; it shifts dynamically based on the total liquidity on both sides of the market. This ensures the market is always perfectly balanced and reflects the true consensus of the crowd.

### 3. Transparent Resolution
When the underlying event concludes, the market locks. ArcSignal uses a decentralized oracle network to securely fetch the real-world outcome. There is no central authority deciding who won or lost.

### 4. Instant Payouts
If your side wins, the smart contract automatically calculates your share of the opposing side's liquidity. Rewards are distributed instantly. No lockups, no waiting periods, and no withdrawal fees from the protocol.

---

## Developer API (Coming Soon)

We are currently opening up our Oracle-as-a-Service architecture. Soon, developers will be able to plug into the ArcSignal engine to:
*   Fetch real-time market odds and sentiment data.
*   Programmatically create private prediction markets for their own communities.
*   Deploy custom AI agents to propose specialized markets.

Stay tuned for our full API reference!

## Need Help?
If you're running into issues on the Testnet or have suggestions for new market types, reach out to us on Discord or Twitter. Our community is built by traders and engineers who are always happy to help.
