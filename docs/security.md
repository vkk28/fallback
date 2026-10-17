# Security model

Fallback's protected assets are attributed plan funds and immutable consented
payment terms. Owner actions, supporter funding, payee acceptance, permissionless
settlement and beneficiary-fixed claims have distinct authority.

## Contract boundaries

Each immutable plan holds its own attributed owner allocation and supporter reserve.
The contract enforces owner-money-first settlement, complete payments, backup caps,
chronological processing and exact execution-time windows. Activation freezes
supporter weights and ordering. Closure establishes independent pull claims with
exact rounding; a failed claim cannot block another beneficiary.

There is no proxy upgrade, administrator sweep or configurable payment executor.
The worker cannot choose a different destination, amount or funding split.
External wallet balances, approvals and unsolicited transfers cannot change
attributed funding or eligibility. Unsolicited tokens remain locked excess.

Asset selection is immutable. Balance-delta checks reject fee behavior, but cannot
make arbitrary malicious or rebasing assets safe. FBTEST has public test minting
and no real value.

## Account and application boundaries

Privy authentication resolves a canonical embedded account. Every private object
and action is checked against that account's membership and role. The browser
authorizes the backend's exact stored request; arbitrary client destinations or
calldata are not accepted. Authorization binds account, application, request,
expiry, chain, zero native value and sponsorship.

User authorization signatures expire after two minutes and are never stored or
logged. Access tokens authenticate application requests; they do not give the
backend an unrestricted user signer. Durable payloads and provider identities
support reconciliation before retries, including ambiguous submissions.

Token approvals are exact and separate from deposits. Receipt verification checks
the intended inner contract events, account, amounts and terms rather than relying
on an outer account-abstraction receipt alone.

Private APIs enforce authentication, membership, origin checks, schema/body limits,
rate limits and idempotency. Invitations are expiring, account-bound and single-use.
Private caches are identity scoped and cleared on logout. The service worker
caches safe static/offline assets only; financial actions are disabled offline.

## Scheduler and data boundaries

The HTTP adapter requires constant-time bearer authentication, bounded inputs,
allowlisted actions, registered plans and current RPC eligibility checks. Durable
jobs deduplicate work. Signed worker calls are committed before broadcast; leases
and nonce reservations fence competing processes.

The indexer is a history read model. Current chain state and canonical receipts
authorize financial actions and establish confirmed outcomes. Missing reads stay
unavailable rather than becoming zero balances. Notifications are receipt-backed.

## Verification and dependency review

Contract unit, fuzz, invariant and local-chain checks cover conservation, caps,
boundaries, replay, role restrictions, adversarial token behavior and worker races.
Application, PostgreSQL and browser tests cover authorization, concurrency,
recovery and interface behavior.

Recorded direct-solc Slither analysis found no high/medium issues and nine
low-severity timestamp findings for intentional schedule/deadline comparisons.
Actual block timestamps govern the tested boundaries. This is automated analysis,
not an independent audit or production financial approval.

The dependency review recorded on 11 October 2026 pins decode-uri-component to
0.5.0 with a tested query-string compatibility patch. It also records a high-severity
braces 3.0.3 advisory in development tooling, with a tracked parser/AST depth guard
and hostile-input regressions. That mitigation is not an upstream fix. See the
[decoder advisory](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr) and
[braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).

Source scans inspect configured secrets, credential markers and personal machine
paths without printing secret values. Credentials, private records, raw evidence,
backups and generated runtime state are excluded from source control.

## Product and operating limits

Backup is bounded by deposited funds and consented caps. A recipient may hold money
elsewhere, and known payees may collude. Public onchain activity is visible even
when application labels remain private. Execution requires a worker or another
caller within the permitted window.

Fallback does not deliver bank payments, verify external bills or determine
financial hardship. Local test chains, browser previews, hosted simulations and
real testnet receipts establish different evidence scopes. No independent audit,
physical-device certification or production financial readiness is claimed.
