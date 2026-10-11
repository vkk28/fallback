# Fallback

A mobile-first PWA for temporary family backup of recurring payments to a consenting
person. The contract spends the recipient's allocated money first, uses only agreed
backup, pays complete installments and independently refunds unused contributions.

The consumer app/backend, Envio handlers and independent worker are implemented.
Contracts are deployed and verified against compiled runtime on Monad testnet.
FBTEST has six decimals and **no real value**. Sponsored three-role consent/funding and
recipient activation are verified:250 own/300 frozen backup. Open withdrawals, active top-up/ending/returns and historical indexed accounting
are verified in separate live cases. Scheduled conditional-payment proof and durable
full-app hosting remain open. Actual private GraphQL and authorized scheduler-only
HTTPS CRE CLI simulation pass; positive CRE due-work evidence remains open. Accurate status:
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

Local GraphQL/reader verification and actual Hasura runtime now work with user-installed
Docker Desktop. Run graphql:prepare / graphql:verify-reader / graphql:status;
graphql:stop/start preserve metadata volume and the existing indexer.
Secrets are generated in ignored mode600 files; app GraphQL is enabled only after a
real query. CRE simulation requires login plus an explicitly authorized HTTPS origin;
the cre:simulate helper passes only the relay credential. User-authorized temporary
scheduler-only HTTPS and actual default-limit simulation pass; full app/DB/source stay
local, and no paid receipt/workflow deployment is inferred. See provider-setup for exact steps.

Contracts/source manifest: `packages/chain/deployments/monad-testnet.json`.
Architecture/custody: `docs/architecture.md`. Accounting: `docs/state-machine.md`.
Actual commands and limits: `docs/test-report.md`, `docs/evidence/`.
Sponsor code/proofs: `docs/integrations.md`. Project-only tooling: `docs/tooling.md`.
No production readiness, independent audit, fiat settlement or bounty completion is
asserted. No hosted source upload, purchase or competition submission has occurred.
