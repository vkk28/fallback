# Deployment

The deployed application is [fallbackk.netlify.app](https://fallbackk.netlify.app).
Its services run independently of a local development machine.

| Component | Runtime | Repository configuration |
| --- | --- | --- |
| Web and authenticated API | Netlify Next.js runtime | [netlify.toml](../netlify.toml), [apps/web](../apps/web) |
| Private metadata and durable jobs | Neon PostgreSQL | [Migrations](../infra/migrations), [database client](../packages/backend/src/database.ts) |
| Scheduled execution | Netlify scheduled trigger and background function | [Functions](../netlify/functions), [worker](../apps/worker/src) |
| Indexed history | Envio Cloud HyperIndex and GraphQL | [config.yaml](../config.yaml), [schema](../indexer/schema.graphql) |
| Payment contracts | Monad Testnet 10143 | [Deployment manifest](../packages/chain/deployments/monad-testnet.json) |

## Application configuration

Use Node 24.19.0 and pnpm 11.25.0. Netlify builds from the repository root with
<code>pnpm web:build</code>, publishes apps/web/.next and bundles netlify/functions.
The explicit Next.js adapter is required for the nested application and API routes.

Follow [provider setup](provider-setup.md) for credentials. Configure APP_ORIGIN
and INVITATION_APP_ORIGIN to the exact HTTPS application origin. Server credentials,
the limited database connection and worker/relay/trigger keys belong in host
runtime storage. The public Privy app ID is browser configuration.

Apply versioned migrations with the schema owner and use a limited application
database role. Preserve existing accounts, invitations, requests, signed
transactions and nonce reservations during a release.

## Worker operation

The configured trigger runs every 15 minutes. Keep HOSTED_WORKER_ENABLED disabled
until the database, signer, private trigger authentication and state-preserving
cutover are verified. Only one authoritative signer/journal combination should
operate across a local-to-hosted migration.

Hosted batches refuse registries above 50 plans and process at most 20 queued jobs.
The worker rechecks chain eligibility, commits signed bytes before broadcast and
reconciles receipts before notifying users. Never delete an unresolved job or
replace its nonce to force a retry. A queued or submitted job is not a paid
installment; contract timestamps and canonical receipts determine the outcome.

## Indexing

Envio dynamically registers plans created by the configured factory. Preserve the
deployment start block and shared handler/schema configuration. Generated code,
local runtime output and private credentials are excluded from Git.

Configure the application with its private GraphQL reader and verify actual
historical accounting and the processing watermark. A plan's last event is not
a synchronization watermark. Use manual Envio releases for the existing hosted
installation; do not reset its data as part of an application release.

## Release checks

~~~sh
pnpm scan:source
pnpm check
pnpm test:local-chain
pnpm web:typecheck
pnpm web:build
pnpm chain:verify
~~~

Run appropriate database, worker, indexing, browser and CRE checks when those
components change. Verify public HTTP access, anonymous rejection on private
routes and authenticated current-state reads after a release.

The public health endpoint checks database and RPC readiness. Protected operational
health exposes aggregate job, broadcast, heartbeat and indexing diagnostics.
Keep relay credentials in authorization headers. Review canonical receipts before
intervening in unresolved work.

## Recovery and service limits

Back up private state before migrations or service changes and test restoration
in a disposable database. Preserve signer/journal identities and invitation keys.
Encrypted local backup helpers are provided; remote storage, scheduling and
retention must be configured separately for the chosen hosting environment.

The hosted setup uses resource-limited services. Monitor availability and indexer
project lifetime for the configured plans; free hosting does not imply permanent
or unlimited capacity. Docker is optional for local Hasura development.

Contract runtime verification, explorer source publication, CRE simulation and
CRE-network deployment are separate operations. Consult the manifest for explorer
status. No mainnet or real-asset deployment is configured.
