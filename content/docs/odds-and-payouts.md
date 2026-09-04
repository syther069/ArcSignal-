## Pari-mutuel returns

ArcSignal does not lock fixed odds when you stake. Winning participants recover their own stake and receive a pro-rata share of the losing pool.

```text
payout = user stake + (user stake × losing pool ÷ winning pool)
net profit = payout - user stake
```

The Solidity contract performs integer arithmetic in the token's smallest unit. Division rounds down, so tiny remainders can remain in the contract.

## Example

Suppose the pools finish with 1,000 USDC on Follow and 500 USDC on Fade. You contributed 100 USDC to Follow and Follow wins.

```text
payout = 100 + (100 × 500 ÷ 1,000)
payout = 150 USDC
net profit = 50 USDC
```

Your 100 USDC represents 10% of the winning pool, so you receive 10% of the 500 USDC losing pool.

## What changes before resolution

The possible return changes when either pool receives another stake. A displayed estimate is therefore a snapshot, not a guaranteed quote.

:::important No automatic distribution
Resolution only records the winning outcome. Each winning address must separately call `claimWinnings`, and each address can claim a given market only once.
:::

## Edge cases and limitations

- A losing stake receives no payout.
- The current contract does not deduct a protocol fee in `claimWinnings`.
- A winner must have a recorded stake on the winning side.
- Integer division rounds down.
- Cancelled markets have no participant refund function in the current contract. See [Resolution and claims](/docs/resolution-and-claims).

