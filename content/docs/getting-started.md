## Before you start

You need an EVM-compatible wallet and USDC on the Arc network this app is configured for. USDC pays both Arc network fees and ERC-20 staking transfers.

:::definitions
Default network | ARC Testnet (until `NEXT_PUBLIC_ARC_NETWORK=mainnet`)
Testnet chain ID | 5042002
Mainnet chain ID | 5042
Native currency | USDC
Testnet RPC | https://rpc.testnet.arc.io
Mainnet RPC | https://rpc.mainnet.arc.io
Testnet explorer | https://explorer.testnet.arc.io
Mainnet explorer | https://explorer.arc.io
:::

:::testnet Faucet availability
On testnet, the application links to Circle's faucet. Faucet network support and limits are controlled by the faucet provider. Confirm chain ID `5042002` before using issued assets. Mainnet uses real USDC; there is no faucet.
:::

## Connect a wallet

Open [ArcSignal markets](/markets) and choose **Connect wallet**. Connecting exposes your public address to the application but does not move assets or create a transaction.

If the wallet is on another chain, use the network switch prompt to select ARC Testnet. Always verify the chain ID in the wallet before approving or staking.

## Fund USDC

The same underlying USDC balance pays Arc network fees and ERC-20 staking transfers. Native gas accounting uses 18 decimals; the ERC-20 staking interface uses 6 decimals. They are not separate tokens — a wallet needs enough USDC to cover the stake plus the USDC network fee.

The configured testnet USDC contract uses six decimals for application transfers. Do not send another token merely because its symbol also says USDC. Wallet libraries may internally label native gas as ETH; Arc network fees are paid in USDC.

## Confirm the addresses

Before signing an approval, compare the spender shown by the wallet with the ARCSignal contract address on [Contracts and addresses](/docs/contracts). Approval gives that contract permission to transfer up to the approved USDC amount.

## Next step

With the correct network and test assets available, continue to [Your first prediction](/docs/first-prediction).
