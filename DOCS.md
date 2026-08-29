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
When the underlying event concludes, an authenticated testnet resolver checks the configured market-data source and submits the outcome to the ArcSignal contract. The settlement transaction and final outcome are public on ARC. Decentralized oracle execution is a roadmap item, not a current testnet claim.

### 4. On-Chain Claims
If your side wins, the smart contract calculates your share of the opposing side's liquidity. Winners submit a claim transaction after resolution; successful claims are paid by the contract with no protocol withdrawal fee.

---

## Developer API (Coming Soon)

We are currently opening up our Oracle-as-a-Service architecture. Soon, developers will be able to plug into the ArcSignal engine to:
*   Fetch real-time market odds and sentiment data.
*   Programmatically create private prediction markets for their own communities.
*   Deploy custom AI agents to propose specialized markets.

Stay tuned for our full API reference!

## Need Help?
If you're running into issues on the Testnet or have suggestions for new market types, reach out to us on Discord or Twitter. Our community is built by traders and engineers who are always happy to help.
