# Architecture and trust boundaries

Fallback runs locally as a Next.js PWA/API, PostgreSQL metadata/job store, Envio read
model and independent permissionless worker. Contracts are deployed on Monad testnet
10143. FBTEST is a six-decimal unrestricted-mint test asset with no real value.

## Contracts and current state

`FallbackFactory` binds consent to chain, factory, token, recipient, payee, all terms,
nonce and expiry. The bound payee accepts onchain; the recipient publishes once.
The enumerable registry identifies authentic immutable plans. `FallbackPlan` isolates
attributed own funds and reserve accounting, consumes own money first, makes complete
chronological payments within exact grace boundaries and freezes ordered refund
weights. Twelve installments/eight lifetime supporter slots bound iteration. No proxy,
administrator, sweep, destination edit, hardship inference or arbitrary executor exists.
Unsolicited token transfers remain locked unaccounted excess.

`packages/chain/deployments/monad-testnet.json` records actual successful deployment
receipts. `chain:verify` checks runtime against compiler output, masks constructor
immutable spans and checks their token/chain values separately. Explorer source
verification is pending. Local acceptance reports refer to stopped ephemeral Anvil
nodes and must not be presented as Monad payment evidence.

## Accounts, signing and authorization

Privy is the sole account stack. Server SDK 0.35.0 verifies access tokens and resolves
exactly one index-zero Privy embedded Ethereum wallet from provider data. React checks
that wallet against the server identity. The configured app is TEE user-controlled
server-wallet mode; the user reported two successful verify/sign-in cycles. Recovery
failure is not established by those checks. Separate live receipt/provider verification
now proves sponsored propose, accept, publish, self mint, exact approval and allocation.

The browser submits a named intent and amount, never arbitrary destination/calldata.
The backend checks verified object role, testnet chain, factory membership and amount
bounds, builds a fixed call and preflights against RPC. For native Privy login, the client signs server-formatted canonical request bytes
with the SDK's user authorization key; the backend submits with that bound signature
and `sponsor: true`. Access JWTs authenticate app endpoints but do not fetch a user
signing key on the server. No master signer, user key or usable signature is stored.
Challenges expire in two minutes and bind the canonical wallet resource, app,
request ID, testnet, zero native value and sponsorship. Migration0004 records the
wallet resource for immutable retries. The user confirmed app-paid Monad sponsorship and disabled client transaction access.
Every authorization follows readable terms; token approval is exact and a separate
confirmed step before funding. A hash alone never means success.

Transaction payloads are durable before provider I/O. An actor/plan lock blocks a new
key while an earlier request is unresolved. Reopening recovers that stored request;
manual retries reuse the provider identity within a one-hour window, below the
provider's 24-hour idempotency lifetime. Old ambiguous requests remain blocked for
provider reconciliation. Confirmed receipts must contain the expected inner event,
including account/amount/proposal terms: account-abstraction outer destinations alone
cannot prove the requested mutation. Proposal proof records the factory execution
nonce/hash after checking all stored calldata terms; a preflight nonce can advance.
Known provider failures/reverts are distinct
from unknown/replaced/provider-error states.

## Private metadata and UI

PostgreSQL stores offchain labels/optional profile names, memberships, invitation
hashes, idempotent requests/notifications and leased jobs. Schema migrations are in
`infra/migrations`. Invitations have high entropy and bounded expiry. Targets can be
an exact account, a keyed digest of a server-verified Privy email, or a private link
whose first authenticated claimant binds the account. A new preliminary plan can
have no payee; financial preparation is blocked until its invitation is claimed.
Only an unbound, unproposed, unpublished draft with no transaction request can gain
that destination. Accepted destinations and consented terms never change.
Plan-row locks serialize claims, decline, revocation and replacement. Fragment links
reveal terms, not dashboard or signing authority. Email delivery is an optional,
explicit owner action with a consented immutable envelope encrypted in a separate
private outbox. Provider acceptance, membership and onchain consent remain distinct.
Names are neither onchain nor independent identity verification. API responses are
no-store, origin-protected, size/schema/rate bounded and membership scoped. Private
cache is in memory, keyed by verified identity, cleared on logout.

The consumer routes use current block-consistent contract snapshots for balances,
preview, frozen shares, claims and schedule outcomes. Envio histories are bounded and
paginated. Missing RPC/indexer data is explicit; unavailable balances are never zero.
Forecasts do not authorize settlement. Offline disables mutation and preserves open
forms; service workers cache static assets/offline content only, never authenticated
financial results. Updates wait rather than silently replacing active forms.

## Indexing and liveness

Envio dynamically registers factory-created plans, reconstructs funding, frozen
shares, payment splits, missed/cancelled installments, closure and independent claims.
IDs include chain/hash/log index; actual local event replay/rebuild tests pass. Headless
Envio is backfilling from deployment through official RPC into the separate local
fallback_indexer database. Its development listener is confined to loopback. No live
product event is indexed yet. Actual private Hasura GraphQL/auth/watermark/restart
checks pass; caught-up/reorg/lag checks remain incomplete.

The worker scans the bounded factory registry independently of Envio, persists unique
(chain, plan, installment, action) jobs, leases with SKIP LOCKED, rechecks authoritative
state, sends only settlement/expiry/funding closure, and reconciles receipts. It uses
only its own testnet signer, with no control over destination or split. Receipt-backed
notifications are idempotent per log/user. The dedicated worker signer has verified
faucet gas and the owned testnet process is running; no due live settlement is claimed. An interrupted unknown send is checked
against current installment state; stored hashes are never blindly resubmitted.

CRE source uses a cron trigger, an authenticated HTTPS discovery/queue adapter and
Monad RPC rechecks performed by that adapter. It is an HTTP integration, not native
CRE Monad-testnet writes or an oracle hardship decision. CLI/SDK builds and actual
user-authorized default-limit HTTPS CLI simulation pass; deployment has not run.
Each run observes a frozen20-plan keyset page,
then submits the whole batch using two HTTP requests. Per-chain/factory durable
discovery state advances only with the job/acknowledgement transaction, survives
outages and wraps after the last indexed page. Closed rows stay in traversal to
avoid lifecycle-dependent offset shifts; current RPC state selects actual actions.
Empty/stale pages advance and repeated submissions return the same latest result.
Jobs remain unique and worker receipts remain authoritative. Local63-plan/restart/
error regressions, real PostgreSQL races and five SDK test-runtime checks pass.
Coverage depends on caught-up GraphQL; revisit time grows with registry size and
failures. The independent worker remains the timely liveness fallback.

## Deployment boundaries

Next.js, durable PostgreSQL, Envio and the worker need compatible separate runtimes.
Sites was inspected for local work; its hosted Workers runtime cannot run this stack
unchanged with raw PostgreSQL TCP. No application/source upload, paid service, public
repository or competition submission has been authorized. User separately authorized
only a temporary scheduler-only Cloudflare HTTPS tunnel/simulation; full app/DB/source
remain local. Current docs/SDK/tenant list confirm native Monad Testnet capability,
but this workflow remains an explicit HTTP/RPC adapter, not claimed native writes.
No fiat creditor settlement, production financial readiness,
independent audit, user traction or legal classification is asserted.

## UI coordination added 11 October 2026

The (workspace) route group preserves /dashboard, /new, /plans/[id], /activity and
/account while sharing the account SDK/query provider. /invite can preview its limited
link-bound terms before authentication. Financial mutations still go through the
existing request, client authorization, preflight, submission and receipt paths.

Private read endpoints: plan-summaries (10 plans/page, required same-block reads only),
requests (bound pending invitee), requests/[digest] (bound preview), people (prior
relationship visibility) and activity (actor-scoped newest-first cursor). New writes
reuse origin/auth/rate/idempotency protection: setup-draft, setup-finish and
requests/accept. Setup revisions are separate from consented plan terms; finalization
and inbox consumption are atomic. The UI cannot rebind a published destination.
