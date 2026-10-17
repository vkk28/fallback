# Architecture and trust boundaries

Fallback combines an authenticated Next.js PWA/API with immutable payment-plan
contracts on Monad Testnet (10143). Netlify runs the application and bounded
scheduled worker, Neon stores private metadata and durable jobs, and Envio Cloud
provides indexed history through GraphQL. Hosted operation is independent of a
local development machine. FBTEST has six decimals and no real value.

## Contracts and current state

FallbackFactory binds consent to the chain, factory, token, owner, payee, exact
terms, nonce and expiry. The payee accepts onchain before the owner publishes.
Its enumerable registry identifies authentic plans.

Each FallbackPlan isolates owner allocations and supporter reserves. It consumes
owner money first and makes complete, chronological payments inside exact grace
boundaries. Activation freezes supporter weights and ordering. Closure establishes
independent beneficiary claims with exact base-unit rounding. Twelve installments
and eight lifetime supporter slots bound iteration. There is no proxy, admin sweep,
destination edit or arbitrary executor.

The [state-machine reference](state-machine.md) defines settlement and conservation.
The [deployment manifest](../packages/chain/deployments/monad-testnet.json) records
addresses, actual deployment receipts and explorer-publication status.
Network verification checks compiled runtime and immutable values separately.

## Accounts and authorization

Privy is the account layer. The backend verifies authentication and resolves one
canonical embedded Ethereum account; the client checks that same identity. The
browser submits named intents and amounts. The backend checks membership, role,
chain, factory registration and amount bounds, then constructs a fixed call and
preflights it against current RPC state.

For native Privy login, the browser signs canonical request bytes through the SDK's
user authorization mechanism. The backend submits the bound signature with
sponsorship. Access tokens authenticate API requests; they do not grant an
unrestricted server signer. Authorization binds the account resource, application,
stored request, expiry, chain, zero native value and sponsorship. Signatures are
short-lived and are neither persisted nor logged.

Durable request payloads exist before provider I/O. Actor/plan locks prevent
replacement while a request is unresolved. Reloads recover the original identity;
retries reconcile provider state and expected inner contract events. An outer
receipt or submitted hash alone cannot establish the intended action. Exact token
approval and actual deposit remain separate confirmed steps.

## Private metadata and interface

PostgreSQL stores labels, profiles, memberships, invitations, saved setup,
transaction requests, notifications and jobs. Invitations bind an exact account,
a verified-email digest or a first authenticated private-link claimant. Membership
and onchain financial acceptance are distinct.

Row locks serialize invitation claims, decline, revocation and replacement. Setup
revisions are separate from immutable consented terms. Optional invitation email
uses an explicitly authorized, encrypted immutable outbox; provider acceptance is
distinct from mailbox delivery.

API responses are private, no-store, origin-protected, size/schema/rate bounded and
membership scoped. Client caches are identity scoped and cleared on logout.
Current balances, claims and schedules use block-consistent contract reads.
Missing data stays unavailable. Forecasts are distinct from confirmed payments.

The shared workspace covers Home, setup, plans, Activity and Account; invitation
previews and About can be opened before authentication. The PWA caches safe static
assets and an offline shell. Financial actions are disabled offline and never
queued for automatic replay.

## Indexed history

Envio dynamically registers factory-created plans and reconstructs funding,
frozen shares, payment splits, missed/cancelled installments, closure and claims.
Chain/transaction/log identities prevent duplicates, and integer amounts preserve
exact accounting.

Bounded GraphQL queries power Activity. The processing watermark describes coverage
separately from a plan's last event. Current contract reads and canonical receipts
remain authoritative for financial actions. A delayed index does not imply a
failed payment.

## Scheduling and recovery

The independent worker discovers registered plans, rechecks current chain state
and persists unique jobs keyed by chain, plan, installment and action. Leases and
nonce reservations coordinate competing workers. Signed bytes, hash and nonce are
committed before broadcast; recovery reconciles or rebroadcasts the same transaction.
Notifications require matching successful receipt events.

The worker signs only its own permissionless settlement, expiry and funding-closure
calls. It cannot change the payee, amount, split or consented schedule.

CRE adds a cron workflow through an authenticated HTTP/RPC adapter. A frozen bounded
discovery page and batch acknowledgement use two HTTP calls. Cursor advancement and
job enqueue share a transaction; retries preserve the acknowledgement and avoid
duplicate jobs. The adapter rechecks Monad state before accepting work.

Hosted CLI simulation and local batch-to-payment recovery have separate evidence
scopes. The implementation does not claim CRE-network deployment or a hosted
CRE-triggered payment. The independent worker provides scheduled liveness.

See [deployment](deployment.md), [provider setup](provider-setup.md) and
[security](security.md) for configuration and operating boundaries.
