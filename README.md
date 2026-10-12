# Fallback

A mobile-first PWA for temporary family backup of recurring payments to a consenting
person. The contract spends the recipient's allocated money first, uses only agreed
backup, pays complete installments and independently refunds unused contributions.

The live app is [fallbackk.netlify.app](https://fallbackk.netlify.app). Netlify hosts
the frontend/API and scheduled worker, Neon holds metadata, and Envio Cloud provides
indexed history/GraphQL. Judges do not need the owner's PC or Docker running.
Contracts are deployed and checked against compiled runtime on Monad Testnet.
FBTEST has six decimals and **no real value**. Fresh onboarding, three-role consent,
exact funding and activation work; an actual 150 FBTEST own-funded hosted payment
and separate end/return cases are verified. The fresh 10 FBTEST backup-funded case
is active and due 14 October 2026 at 09:00 IST; its payment is not yet claimed.
The CRE workflow uses the hosted HTTPS adapter; positive useful execution remains
open. Current primary submission/bounty work and secondary checks are separated in
[progress.md](progress.md) and [docs/HANDOFF.md](docs/HANDOFF.md).

## Local development

Use Node 24.19.0 and pnpm 11.25.0. On this Mac the selected Node directory is
`~/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin`.
Export it on PATH for all commands; the host default Node 23 is not the pinned runtime.

```sh
pnpm install --frozen-lockfile
node scripts/prepare-env.mjs
pnpm compiler:install
pnpm check
pnpm test:local-chain
```

The env helper preserves existing credentials, creates only local service keys and
sets `.env` mode 600. Configure provider secrets locally using
[docs/provider-setup.md](docs/provider-setup.md). Never paste them into chat/source.
The official Solidity download is checksum verified. Apple Silicon requires Rosetta
for its macOS x86 compiler. Foundry native binaries are project-local and preserve
exit codes. Local-chain tests start/stop isolated Anvil and produce ephemeral receipts.

For persistent local services after building:

```sh
pnpm services:start database
pnpm db:migrate
pnpm web:build
pnpm services:start web
pnpm services:status
```

`db:local` manages only the project's persistent loopback PostgreSQL cluster on port
54329; it does not change the existing host database. Its random URL is stored only
in ignored `.env`. The web app is at `http://localhost:3000`; `/setup` verifies sign-in,
`/dashboard` exposes role plans, `/new` progressive creation and `/invite` bound links.
The local service runner survives chat continuations, stores only owned process
metadata under ignored .tools, and preserves unknown listeners. Stop it with
`pnpm services:stop`. For development use foreground `pnpm web:dev`; production
foreground `pnpm web:start` remains available.

## Verification and services

```sh
pnpm lint:app
pnpm web:typecheck
pnpm test:postgres
pnpm test:worker-chain
pnpm indexer:configure
pnpm indexer:codegen
pnpm indexer:typecheck
pnpm indexer:verify
pnpm cre:typecheck
pnpm cre:build
pnpm web:build
pnpm test:browser
pnpm scan:client-secrets
pnpm chain:verify
```

Install matching Playwright Chromium into `.tools/browsers` before browser tests.
`indexer:verify` generates its separate local receipt fixture configuration and never
replaces deployment configuration. A running Envio GraphQL endpoint is still required
for live history. `pnpm worker` requires a funded dedicated testnet signer; the
contracts limit it to permissionless fixed-destination actions. Read operational
steps in [docs/operations.md](docs/operations.md).

Docker Desktop is optional for the local GraphQL/Hasura development environment,
not a dependency of the hosted app. For those local checks, run graphql:prepare /
graphql:verify-reader / graphql:status; graphql:stop/start preserve the local metadata
volume and indexer data. Docker can be closed while judges use the online app.
Secrets are generated in ignored mode600 files; app GraphQL is enabled only after a
real query. CRE simulation requires login plus an explicitly authorized HTTPS origin;
the cre:simulate helper passes only the relay credential. The current configuration
uses the hosted adapter; earlier temporary tunnel checks are historical. No positive
payment/workflow deployment is inferred from an empty simulation. See provider-setup.

Contracts/source manifest: `packages/chain/deployments/monad-testnet.json`.
Architecture/custody: `docs/architecture.md`. Accounting: `docs/state-machine.md`.
Actual commands and limits: `docs/test-report.md`, `docs/evidence/`.
Sponsor code/proofs: `docs/integrations.md`. Project-only tooling: `docs/tooling.md`.
No production readiness, independent audit, fiat settlement or bounty completion is
asserted. The existing public repository/free hosting release is authorized and live;
no competition entry or paid upgrade has been submitted.
