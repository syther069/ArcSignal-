## What the analysis contains

The analysis service asks an AI provider for structured JSON with:

- a probability from 0 to 100;
- a confidence score from 0 to 100;
- a YES or NO prediction;
- a short summary;
- bull and bear cases;
- key factors and risk factors;
- source labels; and
- a generation timestamp.

The response is validated before it is attached to a market. Missing fields, invalid probability ranges, or malformed JSON cause the generation attempt to fail.

## Providers and data

The current code attempts Gemini when a configured Gemini key is available and can fall back to Groq. Crypto prompts include data gathered through the market-data integration, while football prompts include fixture data from API-Football.

Provider availability, model behavior, stale upstream data, and prompt interpretation can all affect the output.

:::important Analysis is not resolution
The AI signal helps frame a market and gives participants a thesis to Follow or Fade. It cannot call the contract, verify a real-world outcome on-chain, or override the owner-controlled resolver.
:::

## How to read confidence

Confidence is a model-generated field, not a calibrated guarantee. Compare it with the stated sources, market question, resolution criteria, and time horizon. Two markets with the same confidence can have very different data quality or ambiguity.

## Known limitations

- Language models can hallucinate, overstate evidence, or misread context.
- Source labels do not prove that every statement was faithfully derived from that source.
- Upstream market or fixture data can be missing, delayed, or incorrect.
- A stored analysis becomes stale as conditions change.
- The analysis JSON is descriptive metadata, not a cryptographic oracle report.

:::planned Future intelligence features
Specialized agents, user-deployed agents, and richer Oracle-as-a-Service interfaces are roadmap concepts. They are not supported workflows in the current repository.
:::

