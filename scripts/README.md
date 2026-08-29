# Project scripts

Run commands from the repository root.

## Supported commands

| Command | Purpose |
| --- | --- |
| `npm run generate` | Invoke the authenticated market-generation route locally |
| `npm run resolve` | Invoke the authenticated market-resolution route locally |
| `npm run db:migrate` | Apply the development database schema |
| `npm run check:bundles` | Enforce frontend bundle budgets |
| `npm run audit:baseline` | Enforce the production dependency-audit ceiling |
| `npm run ops:check-markets` | Read current and historical ARC market counts |
| `npm run ops:check-owner` | Read the deployed ArcSignal contract owner |
| `npm run ops:scheduler` | Run one external-data scheduler diagnostic |

## Deployment utilities

`deploy/legacy/` contains manual contract deployment helpers retained for recovery.
They are not part of CI or normal application deployment. Build Foundry artifacts
before using the Foundry helper, and provide deployment credentials through the
environment rather than source files or command arguments.

The currently deployed contract is the source of truth. Never replace it merely
because these historical helpers exist.