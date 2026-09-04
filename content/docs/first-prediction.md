## Read the market first

Open a market and check its exact question, AI thesis, resolution time, pool balances, and current state. The headline probability and AI confidence are analytical context; they are not fixed odds or a promise of the outcome.

Do not submit a stake after the resolution time. The contract rejects stakes when `block.timestamp` is no longer earlier than that time.

## Choose a side

- **Follow** means you believe the result will match the AI's stated prediction.
- **Fade** means you believe the result will not match that prediction.

The contract encodes a submitted stake side as `0` for Follow and `1` for Fade. Resolution outcomes use a different encoding: `1` means Follow won and `2` means Fade won.

:::important Read the thesis, not only the side label
Follow and Fade are relative to the stored AI thesis. Confirm whether the thesis itself predicts YES or NO before choosing a side.
:::

## Approve USDC

If the ARCSignal contract does not already have enough allowance, the application asks for an ERC-20 approval. This is a separate wallet transaction and costs a USDC network fee.

Review the token, spender, amount, and chain in the wallet. An approval does not place the prediction; it only authorizes the later transfer.

## Submit the stake

After approval is confirmed, submit the stake transaction. The contract checks that:

- the market exists;
- it has not been resolved;
- the resolution time has not passed;
- the side is Follow or Fade;
- the amount is greater than zero; and
- USDC can be transferred from your wallet.

On success, the contract emits `Staked` and updates the selected pool. The application verifies the transaction receipt and may index it immediately so the portfolio appears without waiting for the background indexer.

## After submission

A prediction is not a freely tradable position. The current contract does not provide early exit, stake cancellation, or transfer functions. Wait for resolution and, if your side wins, claim from the portfolio.

