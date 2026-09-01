## Follow

Choose Follow when you agree with the AI thesis stored for the market. If the owner later resolves the market with the Follow outcome, Follow stakes are eligible to claim.

Following does not mean buying a YES share in every market. If the AI thesis predicts NO, Follow means agreeing with that NO thesis.

## Fade

Choose Fade when you disagree with the AI thesis. If the owner resolves the market with the Fade outcome, Fade stakes are eligible to claim.

Fade is a position against the AI's conclusion, not necessarily against the natural-language event question.

## Pool signals are not probabilities

The interface can turn pool balances into implied percentages, but those figures only describe where participants placed USDC. They are not oracle probabilities and they can move whenever a new stake enters either pool.

:::technical Side encoding
For `stake`, side `0` is Follow and side `1` is Fade. For the resolved market outcome, `1` means Follow won and `2` means Fade won. Outcome `0` is used by the contract for an unresolved or cancelled state depending on `resolved`.
:::

## A simple decision check

Before staking, be able to answer all three:

1. What exact result is the AI predicting?
2. What evidence would prove or disprove that result?
3. Who currently has authority to submit the final outcome?

If any answer is unclear, do not rely on the color or label of a button alone.

