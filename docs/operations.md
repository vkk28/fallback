# Operations and deployment readiness

## Safe configuration

Run `node scripts/prepare-env.mjs`; edit ignored `.env` locally, permissions 600.
`.env.example` documents names only. Server secrets: PRIVY_APP_SECRET, DATABASE_URL,
ENVIO_GRAPHQL_SECRET/API_TOKEN, WORKER_PRIVATE_KEY, CRE_RELAY_SECRET and invitation
HMAC key. Optional email delivery also uses RESEND_API_KEY and
INVITATION_DELIVERY_KEY. NEXT_PUBLIC_PRIVY_APP_ID alone is public. Contract addresses/start block
are public verified deployment values. Prefer a host secret manager for remote use.
Never copy `.env`, keystores, database data, browser sessions or broadcast sender
metadata into source archives. The reviewed source has a private local Git baseline;
there is no remote publication. Run `pnpm scan:source --staged` before local commits.

## Source and indexer verification

Use the pinned Node 24 runtime and `pnpm install --frozen-lockfile`. The URI decoder
override and query-string import patch are required together; retain the tested
braces depth patch until a compatible upstream fix is verified.

`pnpm indexer:typecheck` checks production handlers against the configured generated
types. `pnpm indexer:verify` generates the separate 31337 fixture types, typechecks
the fixture driver and replays actual captured local receipts. First run
`pnpm test:local-chain` to refresh those receipts. Stop the owned indexer before
fixture codegen using `node scripts/local-services.mjs stop indexer`; afterward
`node scripts/local-services.mjs start indexer` regenerates the configured testnet
types and resumes preserved storage. Then rerun `pnpm indexer:typecheck`.
Do not regenerate a different configuration while the owned indexer is running.

`pnpm graphql:start` now reloads only the existing `fallback_indexer` source after
its ownership/credential checks. This repairs Hasura's cached connection error
after PostgreSQL returns. It does not replace metadata or reset indexer tables.
Verify `pnpm graphql:status` and a real query; a listening container alone is insufficient.

## Local startup and migrations

Migration 0008 adds invitation claims/lifecycle and the encrypted delivery outbox;
it preserves existing plans, accounts and transaction requests. Back up with
`pnpm db:backup-local` before applying it. The backup helper includes the new table
and restores into a disposable database, never over the application database.

Optional email setup requires a verified Resend sender in INVITATION_EMAIL_FROM,
server-only RESEND_API_KEY, a random 32-byte INVITATION_DELIVERY_KEY encoded as 64
lowercase hex characters, and an owned reachable HTTPS INVITATION_APP_ORIGIN.
Keep both invitation keys with private backups; changing the HMAC key invalidates
email matching for existing invitations, and losing the encryption key prevents
delivery retries. Do not change keys merely to recover an unresolved send.
No sender is scheduled or started automatically. An owner selects verified email,
records recipient contact consent, prepares the invitation, and explicitly chooses
Send invitation email. Localhost email delivery is disabled. A shared email-bound
link still works locally with the intended verified account.

Delivery fixes the provider idempotency key and encrypted message across retries.
Timeouts, throttling, conflicts and server errors remain unresolved/retryable with
30-second exponential backoff, at most five attempts, invitation expiry and a
23-hour first-attempt cutoff. Permanent rejection requires replacement; replacing
revokes the old link atomically. A crash after sending can retry the same body/key
within these bounds. Resend retains keys for 24 hours; see its
[idempotency documentation](https://resend.com/docs/dashboard/emails/idempotency-keys).
“Provider accepted” does not prove mailbox delivery. No delivery webhook or mailbox
success is claimed. Obtain authorized recipients before external verification.

Builds replace .next assets. Rebuild and restart the owned web process before
browser checks; running an old server against newly built chunks invalidates those
checks. Run chain:verify after Foundry/local-chain artifact generation has finished.

Use Node 24.19.0/pnpm 11.25.0. `pnpm db:local` starts only port 54329 and keeps project
data under ignored `infra/data/postgres`. `pnpm db:migrate` applies versioned Drizzle
migrations. `pnpm web:dev` starts loopback development; `pnpm web:build` then
`pnpm web:start` exercises production service worker behavior. For chat-independent local services use `pnpm services:start`, `pnpm services:status`
and `pnpm services:stop`. The detached runner records only owned PID/marker metadata
under ignored .tools/services and checks its exact process title before signalling.
It preserves any unknown existing listener. Logs contain fixed diagnostics only.
Opt in separately with node scripts/local-services.mjs start worker or start indexer;
status/stop take the same service argument. Worker startup checks actual chain10143.
The worker key is already configured/faucet-funded; never regenerate it on resume.
Indexer creates only the separate fallback_indexer database and uses non-destructive
migration up. Its child-only preload confines the native development port9898 to
127.0.0.1. Never use db-migrate down, setup or envio stop to resume live data.
`pnpm web:start`/`pnpm db:local` remain foreground alternatives; Ctrl-C shuts those
own processes down. Never kill unrelated databases.
Back up private database data before changing services/migrations; no backup policy
has been deployed. Compose source is provided, but Docker was unavailable here.

## Contract deployment

Existing Monad deployment is in `packages/chain/deployments/monad-testnet.json`;
do not redeploy merely to resume. `pnpm chain:manifest` checks actual saved receipts;
`pnpm chain:verify` checks RPC chain, code, selected asset and factory immutables.
The deployment wrapper resolves keystore/password-file paths relative to the caller
before changing to `contracts`. For a new authorized test deployment, create an
encrypted test-only Foundry wallet, fund from the official faucet, simulate the
Deploy script with `--keystore`/`--sender`, and broadcast only that reviewed simulation.
Keep its hidden password prompt local. Run `node scripts/prepare-verification.mjs` to produce local standard JSON packages
under `.tools/verification`; it checks every source against compiler metadata and
reproduces exact creation/runtime bytecode without contacting an explorer. Source
explorer verification is pending and must not silently upload private source. No mainnet is configured.

## Separate hosting requirements

The Next.js application needs Node 24, TLS, exact APP_ORIGIN/Privy origin, private
PostgreSQL access and compiled static assets. PostgreSQL must be durable with private
networking, SCRAM, backups and controlled migrations. Envio needs a supported runtime
and GraphQL service indexing from the verified deployment start block. The worker
needs a persistent process, private DB/RPC and a funded dedicated testnet key. CRE
uses an authenticated HTTPS adapter; source build alone does not operate it.
Hosting/source publication/purchases await authorization. Files describe readiness,
not a deployed hosted service. The local testnet worker and headless Envio indexer
are now running; GraphQL and due testnet settlement are not yet verified.

## Health and failure response

Use pnpm verify:indexer-live for bounded read-only reconciliation of the existing
registry against private Hasura and historical Monad RPC. It compares accounting at
the committed processing height, verifies supporter values/canonical receipt logs,
and emits only technical totals/flags. Coverage may remain behind even when all
current product events are indexed. It refuses oversized scopes rather than claim
complete proof from a truncated history.

pnpm test:indexer-restart is an opt-in operational check: it briefly pauses only
the marker-owned indexer, proves unchanged private history/measured lag while RPC
advances, then restores indexing and checks preserved entities/resumed progress.
The worker stays running. No reset, rewind, new financial action or reorg is performed.
Run with native ps/loopback access; never interpret sandbox socket denial as stopped.
Actual controlled lag/restart now passes; supported reorg rollback remains separate.

`GET /api/health` returns configuration flags plus actual database SELECT1/RPC-chain
checks, no secrets. Configuration/sponsorshipEnabled does not prove sponsored success.
Protected `/api/scheduler/health` returns persisted job counts grouped by status;
call only with the relay credential in an authorization header. Never put it in a URL.
Queued work is not paid. Review growing queued/submitted/failed counts with actual
receipts before intervening; never delete outstanding hashes to force a resubmit.

The consumer shows chain snapshot time and unavailable/incomplete history explicitly.
Envio Plan.lastBlock is the last plan event, **not** an indexer synchronization watermark.
Do not treat a quiet plan as measured lag. Obtain runtime sync height/metrics from
Envio before testing lag/reorg. Its supported CLI exposes `envio metrics`; its actual local /metrics endpoint and PostgreSQL sync counters have been read.
The live backfill evidence records progress height/time separately from entity events.

Local Hasura preparation uses pnpm graphql:prepare and graphql:verify-reader. The
isolated Envio schema previously gave CREATE to PUBLIC; preparation removes that
grant while preserving owner/indexer writes. The dedicated login has SELECT on
Plan/Terms/Timeline/Supporter/Installment/chain_metadata, no schema creation, default
read-only transactions and a10s statement timeout. Re-run preparation/verification
after any intentional schema replacement. It does not alter application metadata DB.

infra/hasura.compose.yaml runs a separate private metadata PostgreSQL volume and
Hasura2.50.3 pinned by manifest digest, exposing only127.0.0.1:8080. Configuration/
passwords/owner marker stay in ignored .tools/graphql, mode600 files/mode700 directory.
CLI children inherit only required Docker/system settings. graphql:start verifies
ownership before using existing containers, preserves unknown listeners/sources,
adds/tracks the named source without clear_metadata/reset, and enables app .env
GraphQL settings only after an actual query. graphql:stop preserves volumes.
Docker Desktop is installed/logged in. Actual Compose/container/network/GraphQL queries,
authentication rejection and metadata/source preservation across stop/start are verified.
Docker Desktop's CLI/credential helpers are selected from its native application path
in the helper's child environment; no global PATH/settings change. Empty enabled-log-types
failed actual startup; use supported startup/error settings with Docker log persistence
disabled to keep raw connection/HTTP diagnostics out of logs. Backfill is still behind.

GraphQL numeric stringification preserves integer money; backend validation rejects
numeric financial responses. History and the runtime watermark are queried together.
Without that watermark, compatibility fallback returns unknown coverage. The UI compares
processed height with the actual RPC snapshot, never Plan.lastBlock. This is a height
comparison, not separate reorg/finality verification. Redirects and unencrypted remote
GraphQL targets are rejected before server-secret forwarding.

Sponsorship errors expose only a safe provider HTTP status; immutable payloads stay
stored for same-request retries. Requests older than one hour with no provider
identity/hash require provider-side reconciliation and deliberately block new actions.
Privy statuses replaced/provider_error are ambiguous, not proof of payment/failure.
Expired authorization may require sign-out/sign-in; this does not discard the stored
request. Do not log access tokens, raw provider errors, wallet metadata or secret URLs.

Worker retries are bounded/backed off, hashes reconciled before status, notifications
idempotent per receipt log/user. Registry discovery remains operational without an
indexer when worker credentials are configured. CRE uses two authenticated requests:
GET `/api/scheduler/candidates` returns a frozen `{batchId,candidates,scanned,nextCursor}`;
POST `/api/scheduler/enqueue-batch` accepts only `{batchId,candidates}`. Apply migration0005
before deploying this API/workflow together. The existing single-candidate enqueue
route remains available for fixed permissionless jobs, but does not advance discovery.

Each run scans20 indexed plans, including closed rows, with a stable ID cursor;
the final page resets the cursor. No candidate list is truncated. Registration and
current RPC lifecycle/preview determine eligibility, and RPC is rechecked before
jobs/cursor/acknowledgement commit atomically. Empty/stale pages advance; failures
retain the page. Repeated DON submissions return the same latest acknowledgement;
older batches return409. Inspect a persistent pending batch privately when a page
keeps failing; do not clear it or outstanding job hashes to force progress. At the
configured one-minute cron, a cycle takes at least ceil(indexedPlans/20) minutes,
plus outages. Keep the independent worker running for timely discovery, especially
when that cycle approaches grace duration. Queued/accepted requests are not payments.
Source/fixture/WASM checks and actual authorized CRE CLI simulation pass. Live GraphQL
runtime works but coverage is still behind; workflow deployment is unverified and ungranted.
Contracts remain the accounting authority.

After human login and exact HTTPS-host authorization, use pnpm cre:simulate
--authorized-origin HTTPS_ORIGIN. Set config.staging.json apiOrigin to that exact
origin first; the host's APP_ORIGIN must match. The runner uses fresh prebuilt WASM,
--limits default, an ignored relay-only env and a restricted child environment,
without broadcast/deployment. It records fixed CLI outcome, not raw response/logs.
An exit0 is not proof of a paid installment: reconcile adapter/jobs/actual receipts.
The final runner parses the exact handler counts. Latest19:30:53UTC scanned1/accepted0/
stale0 comes from one real future-due plan, not fabricated candidates/payments.
project.yaml declares only public monad-testnet RPC; CLI rejects an empty RPC list even
for HTTP. The target uses private registry/no wallet key or mainnet. Current documented
Monad Testnet support is CLI1.30+/TS1.19+; installed1.37/1.23 and tenant list confirm it.

User authorized only temporary scheduler HTTPS publication/simulation. The owned staging
relay listens3001 and exposes /health plus the two exact authenticated routes; strips
cookies/wallet headers, bounds body size and rewrites only the fixed local origin.
cloudflared2026.10.0 archive checksum is verified; no global config/autoupdate is used.
Publisher output saves only public URL/instance/PID, not raw logs. Current origin and
ownership record: .tools/cre-staging/tunnel.json. Simulation rejects a retired/stale
tunnel process or mismatched fresh HTTPS proof before reading/forwarding the relay key.
Do not use the temporary hostname as a durable deployment or expose additional routes
without authorization. Native CLI/private workflow deployment remains separate.

## Same-request receipt and funding recovery

`pnpm verify:pending-actions` reconciles at most20 existing unresolved local/testnet
requests with stored Privy identity. It never signs, sends, replaces or clears an
ambiguous request. Output contains status flags only; private IDs/hashes stay in the
DB. Missing hash/timeouts remain unresolved; an explicit matching provider failure
or canonical receipt determines terminal state. `verify:live-actions` can verify the
expected receipts and sponsorship of already-confirmed requests afterwards.

Plan API fundingApproval is derived from the latest confirmed role-specific exact
approval and the allowance at the plan snapshot block. Reconnect needs no duplicate
approval when that amount remains unconsumed. An outstanding request blocks recovery;
a changed wallet/spender/amount or consumed allowance disables the deposit step.
Canonical receipt checks precede monetary confirmation and notification writes. Provider
outage with a stored hash falls back to RPC; replacement hashes/mismatched identities
require explicit reconciliation. These checks are not a full reorg rollback solution.

Generated Monad RPC indexer config uses100-block initial/maximum ranges and zero
additive growth, based on actual configured endpoint probes. Never increase the start
block or reset the database to force catch-up. Check the runtime processing watermark
and reconcile A/B only after it reaches their event heights.

`pnpm verify:funding-recovery <existing-plan-id>` checks the role-specific confirmed
requests and snapshot allowances for a selected existing plan, with request-count
preservation. It never submits or records private identities in exported evidence.
Actual B check restored recipient0.25/supporter1 exact approvals, requests6→6 and
Open/zero plan accounting. This proves read recovery, not funding/activation/refunds.

## 10 October — durable broadcast and local recovery additions

Migration0006_worker_broadcast is applied locally. Before applying it elsewhere,
back up the private metadata DB; migrate before starting updated worker code. The
worker stores signed permissionless bytes/hash/nonce before broadcasting, under a
per-chain/signer advisory lock and unique nonce index. Keep the dedicated worker key
stable. Do not expose signed bytes through APIs, logs or tracked artifacts. Old hashes
stay receipt-only. Ambiguous/dropped/underpriced transactions require reconciliation;
never clear identities/nonces or silently sign replacements. Owned worker/web were
restarted successfully onto tested source/build.

pnpm db:backup-local takes a consistent read-only application snapshot in private
ignored .tools/backups, verifies its SHA256 and restores/verifies every row in a NEW
disposable DB, then removes only that shadow DB. Source data is never overwritten.
Timestamp precision and JSON are preserved. Ten tables/141 rows restore exactly
before/after migration. No extra database client was installed. This is a local
metadata recovery tool, not a scheduled/encrypted/remote/indexer backup policy.

pnpm test:indexer-reorg starts its own disposable chain, temporary named database,
private fixture directory and loopback metrics port; it never resets the preserved
indexer. It tests actual Envio rollback, not createTestIndexer's replay simulation.

RPC range recovery is additive10 with ceiling100; keep the verified ceiling/start
block/rollback settings. verify:indexer-live now waits briefly for a fixed observed
RPC head and validates later processing heights against fresh RPC. All three plans
and full A/B history reconcile. Runtime normally trails the moving head by configured
two blocks. verify:functionality uses only read-only preserved-plan/claim/discovery/
health checks and does not enqueue/sign/submit. Local host sleep still interrupts
worker liveness; durable hosting and alerting remain separate work.
