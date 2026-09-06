# Security

ArcSignal is experimental ARC Testnet software. No professional audit report is included, and the default deployed contract is a legacy version that does not contain every protection in the checked-in `src/contracts/ArcSignal.sol` revision.

## Reporting a vulnerability

Do not publish exploitable details against an active deployment before maintainers have had a reasonable opportunity to respond. Use the repository's private vulnerability-reporting channel when enabled, or contact the maintainers through the repository profile.

Include the affected contract address or application version, reproduction steps, expected and actual behavior, and the impact. Never include private keys, seed phrases, API credentials, or real user data.

## Dependency audit policy

`npm run audit:baseline` fails for any production advisory whose GHSA identity is not explicitly reviewed in `scripts/check-audit-baseline.mjs`. The current exceptions come from Circle Bridge Kit's bundled Solana or ethers compatibility dependencies; ArcSignal uses the EVM viem bridge path. The exceptions remain risks and should be removed when Circle publishes a compatible dependency graph that resolves them.

Aggregate vulnerability counts are informational because one advisory can propagate through many packages. CI gates the advisory identities so a newly introduced issue cannot hide behind an unchanged count.
