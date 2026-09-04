## Before you start

You need an EVM-compatible wallet, ARC Testnet gas, and testnet USDC. These are test assets and have no monetary value.

:::definitions
Network | ARC Testnet
Chain ID | 5042002
Native currency | ARC
RPC fallback | https://rpc.testnet.arc.network
Block explorer | https://testnet.arcscan.app
:::

:::testnet Faucet availability
The application links to Circle's faucet for test USDC. Faucet network support and limits are controlled by the faucet provider and may change. Confirm that the selected network and token address match ARC Testnet before using any issued asset.
:::

## Connect a wallet

Open [ArcSignal markets](/markets) and choose **Connect wallet**. Connecting exposes your public address to the application but does not move assets or create a transaction.

If the wallet is on another chain, use the network switch prompt to select ARC Testnet. Always verify the chain ID in the wallet before approving or staking.

## Fund gas and USDC

ARC pays network transaction fees. USDC is the asset transferred into prediction pools. They have different jobs, so a wallet needs enough of both for a complete workflow.

The configured testnet USDC contract uses six decimals. Do not send another token merely because its symbol also says USDC.

## Confirm the addresses

Before signing an approval, compare the spender shown by the wallet with the ARCSignal contract address on [Contracts and addresses](/docs/contracts). Approval gives that contract permission to transfer up to the approved USDC amount.

## Next step

With the correct network and test assets available, continue to [Your first prediction](/docs/first-prediction).

