:::testnet Read this first
ArcSignal is deployed on **ARC Testnet**. Its contracts are unaudited, test assets have no monetary value, and the deployment may change or reset. Do not treat testnet behavior as evidence that the system is ready for real funds.
:::

## What ArcSignal is

ArcSignal is an AI-assisted, pari-mutuel prediction market. An off-chain analysis service produces a market thesis and an owner-controlled account creates the corresponding market on-chain. Participants stake testnet USDC by choosing **Follow** or **Fade**.

The contract escrows stakes, records each pool, stores the final outcome, and calculates a winning participant's pro-rata payout. The application makes those interactions easier to read and submit, but the contract is the source of truth for market and stake state.

## Know the trust boundary

:::security Current resolution model
The AI does not resolve markets and there is no decentralized oracle network in the current contract. An account holding the contract owner authority submits `resolveMarket`. Winners then submit `claimWinnings` themselves.
:::

The documentation distinguishes deployed behavior from planned work. Status labels mean:

- **Implemented** — present in the current application or contract.
- **Testnet** — deployed for testing with assets that have no monetary value.
- **Planned** — a proposed capability, not a supported interface.
- **Risk** — an assumption or limitation that can affect users.
- **Reference** — an explanation of canonical protocol terms or calculations.

## Documentation conventions

Contract addresses and chain parameters are taken from the configuration currently used by the application. If a deployment changes, confirm the live application configuration and explorer before submitting a transaction.

Links to application pages describe the interface as it exists in this repository. Public APIs, node-operator workflows, decentralized resolution, and mainnet operation are not represented as live features.

