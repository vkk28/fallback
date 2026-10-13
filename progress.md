# Fallback — completed and remaining work

## What has been done

### Product and payment model

- Defined the app around recurring payments to a known, consenting payee, backed
  by temporary family support with agreed limits.
- Implemented separate owner, supporter and payee roles with account-bound permissions.
- Kept the owner’s allocated money separate from supporter backup for each plan.
  The owner’s money pays first; backup covers only the permitted shortfall.
- Restricted the working implementation to Monad Testnet and FBTEST, a test token
  with six decimal places and no real value.
- Explained the product’s boundaries in the interface: backup is limited, active
  funds are locked, payments are public onchain, and the app does not deliver bank
  payments or verify external bills.

### Contracts and financial accounting

- Implemented plan proposal, payee acceptance and publication of immutable terms.
  Acceptance binds the intended people, payment terms, network, factory and expiry.
- Implemented funding, withdrawals while funding is open, activation, active owner
  top-ups, scheduled settlement, missed installments, cancellation and closure.
- Enforced fixed payment amounts, fixed intervals, payment windows, funding
  deadlines, minimum/maximum reserves and both per-payment backup limits.
- Supported up to twelve installments and eight lifetime supporter slots per plan.
- Made each installment an all-or-nothing payment to its agreed payee. Insufficient
  funds or a restrictive cap move no money; later payments cannot bypass earlier ones.
- Enforced exact payment-window boundaries. Adding money within the window can
  make a blocked payment payable; adding money after expiry cannot revive it.
- Froze supporter contribution weights and ordering when a plan starts. Supporters
  cannot add or withdraw backup while active; the owner can add their own money.
- Locked active allocations to their plan. Ending cancels unpaid installments,
  preserves completed payments and makes remaining money separately claimable.
- Implemented independent returns to recorded beneficiaries, exact rounding and
  double-claim prevention. One failed return cannot block someone else’s claim.
- Preserved conservation and backing, including separation between different plans.
  External wallet balances and unsolicited token transfers do not affect eligibility.
- Kept payment destinations fixed and omitted administrator sweeps, proxy upgrades
  and discretionary payment approval.
- Deployed the contracts on Monad Testnet and verified their compiled runtime,
  configured token and immutable deployment settings.

### Accounts, authentication and transaction recovery

- Implemented email sign-in through Privy and one canonical embedded Ethereum
  account bound to each authenticated user.
- Added server authentication, role and object-access checks, origin/input
  validation, rate limits and private responses that must not be cached.
- Implemented exact backend-prepared actions with fixed destinations, amounts,
  selectors and testnet bounds, checked against authoritative chain state.
- Kept token permission and token deposit as separate authorizations. Approval
  alone never counts as funding a plan.
- Implemented client authorization with sponsored submission and verified actual
  sponsored actions against provider records and expected onchain events.
- Stored durable request identities and immutable payloads for retry/recovery.
  Reopening a session preserves the original request rather than creating a replacement.
- Implemented bounded authorization validity, pinned wallet resources and limits
  on retrying old or ambiguous requests.
- Separated read-only status reconciliation from renewed authorization. Checking
  status does not sign, submit or create a new financial action.
- Restored exact confirmed deposit permission after reconnecting, using current
  allowance reads rather than assuming an earlier approval still applies.
- Confirmed sponsored outcomes through the expected inner contract events, including
  account-abstraction execution, rather than relying solely on an outer receipt.
- Added a self-only, role-bounded test-token faucet and receipt-backed notification
  processing that avoids duplicate records.

### Backend, invitations and saved setup

- Added address-free invitations for new payees/supporters, using an exact account,
  a Privy-verified email or a private link claimed by the authenticated person.
- Allowed an unbound preliminary payee draft, with financial preparation blocked
  until a one-time claim binds the destination. Existing consented terms and request
  identities are preserved.
- Added owner revocation, invitee decline, expiry and atomic replacement with
  serialized claims and safe retries. Accepted membership cannot be revoked.
- Retained invitation intent through sign-in return/reload and added visible status,
  expiry and management controls. Joining remains separate from financial consent.
- Prepared optional consented email delivery with an encrypted immutable outbox,
  exact provider retry identity, bounded backoff and truthful provider-acceptance
  states. Verified controlled local HTTP failures/concurrency; actual external
  delivery and new-account provider sign-in remain unverified.

- Implemented persistent PostgreSQL storage for profiles, labels, memberships,
  invitations, setup drafts, requests, notifications, idempotency records and jobs.
- Added expiring single-use invitations bound to the intended account, storing
  invitation hashes with replay and concurrent-acceptance protection.
- Added a private Requests inbox with the same account, role, expiry and single-use
  safeguards as invitation links. Joining does not imply onchain consent.
- Added selection of previously connected people with role-specific visibility.
  Users cannot browse unrelated accounts or other supporters’ private connections.
- Added private preliminary setup with saved fields, current step and revision.
  Concurrent tabs reject stale saves instead of silently overwriting newer progress.
- Made setup completion atomic and idempotent: it consumes the matching saved
  revision and creates a fresh draft without modifying an existing consented plan.
- Added bounded, paginated plan summaries read at one chain block. RPC failures
  leave amounts unknown rather than generating substitute balances.
- Added actor-scoped activity pagination with stable newest-first ordering and
  read/unread acknowledgement.
- Applied the database migrations needed for these features and verified their
  concurrency behaviour in disposable PostgreSQL databases.

### Interface and user journeys

- Implemented the core redesign from [Improve_UIUX.md](Improve_UIUX.md) with a
  grayscale palette, sans-serif hierarchy, responsive layouts and accessible controls.
- Added shared Home, Activity, Account and About navigation, including a mobile
  bottom bar and a shared provider across authenticated workspace routes.
- Built Home with role filters, current plan summaries, next actions, unresolved
  action/return attention and the Requests inbox.
- Built a four-step setup flow with schedule presets, field-level errors, error
  focus, private autosave, explicit saving, conflict recovery and unsaved-change protection.
- Added public invitation previews before sign-in, bound inbox/link acceptance,
  native sharing where supported and copy-link fallback.
- Built guided funding with exact permission followed by deposit, restored confirmed
  permission and account/plan-scoped recovery of unfinished amount input.
- Split plan details into Overview, Schedule, People, Activity and Terms. Displayed
  next payments, payment windows, own-money/backup forecasts and role-specific actions.
- Added focused action reviews explaining exact amounts, consequences and agreed
  terms. Dismissing a review restores focus to the initiating control.
- Added clear return amounts and explanations when nothing is claimable. Ending
  and returning money remain separate actions.
- Built Activity with pagination, read status and readable event/receipt details.
- Built Account with saved profile editing, recovery guidance, optional technical
  account details and sign-out. Private cached state is cleared on account changes.
- Added a public About page explaining the app, a labelled example, how to use it,
  its advantages, alternative support arrangements and when a simpler method fits.
- Added manual read-only refresh and honest unavailable-data states. Missing current
  financial information disables money actions until the required data recovers.
- Kept monetary values as base-unit integers with locale-aware display and explicit
  schedule timezone information.

### PWA and accessibility foundations

- Added a web manifest, neutral app icons and an offline fallback page.
- Limited service-worker caching to safe static assets; financial API responses
  are excluded, and money actions are never queued for offline replay.
- Disabled financial actions while offline and preserved visible recovery guidance.
- Deferred account-service initialization on public browsing until sign-in intent;
  the public About page requires no account-service initialization.
- Added visible keyboard focus, skip navigation, labelled controls, focused dialogs,
  touch-friendly sizing, reduced-motion rules and forced-colors styling foundations.
- Verified overflow-free public layouts at phone, tablet and desktop widths.

### Indexing and payment history

- Implemented Envio registration of factory-created plans and reconstruction of
  funding, supporter weights, payment splits, missed/cancelled outcomes, closure and returns.
- Used chain/transaction/log identities and integer amounts to avoid duplicate
  events and preserve exact financial history.
- Added bounded GraphQL history queries and runtime processing-watermark reporting.
  A plan’s last event is not treated as proof that the indexer is caught up.
- Configured separate indexer storage and private local Hasura with authenticated
  access and a restricted read-only application database account.
- Completed the index backfill and reconciled the existing plans’ accounting and
  indexed events against canonical Monad receipts.
- Verified replay/rebuild, controlled restart persistence and lag recovery.
- Verified disposable-chain reorg rollback removes orphaned payment, closure,
  supporter-share and history data before indexing the canonical replacement.

### Scheduling, worker and CRE

- Implemented an independent worker that scans the plan registry, rechecks current
  state and creates bounded, deduplicated jobs for permissionless settlement/closure work.
- Restricted worker actions to the contract’s fixed rules. The worker cannot choose
  different destinations, payment amounts or funding splits and has no user signer.
- Added job leases, bounded retries and durable receipt/notification recovery.
- Persisted each fixed signed worker call, hash and reserved nonce before broadcast.
  Retries reconcile first and can rebroadcast only the same serialized transaction.
- Serialized nonce reservations across workers and prevented stale leases from
  overwriting newer broadcast state.
- Verified actual local settlement, pre-broadcast interruption, lost broadcast
  response and notification interruption without duplicate payments or notifications.
- Verified an actual hosted scheduled run and the first consented payment: 150 FBTEST
  from allocated owner money, zero backup. Its canonical receipt, immutable payee,
  complete transfer, funding split and exact payment window match the preserved journal.
- Configured a dedicated private testnet worker signer and local owned-process runner.
- Built CRE workflow source using bounded plan pages, a persistent discovery cursor,
  a frozen retry batch and atomic enqueue/cursor advancement.
- Kept discovery within two HTTP calls per run and made repeated submissions return
  the same acknowledgement without duplicating jobs.
- Implemented a restricted scheduler-only relay with exact-origin and owned-instance
  checks, keeping full-app routes, database credentials and wallet secrets local.
- Verified CRE SDK behaviour, workflow builds and an authorized relay-only CLI simulation.

### Free hackathon hosting

- Published the reviewed source to the selected public repository and deployed the
  Next.js app/API at [fallbackk.netlify.app](https://fallbackk.netlify.app) on Netlify Free.
- Verified public HTTP access, private-endpoint authentication, database/RPC readiness
  and actual hosted Privy sign-in with three preserved plans.
- Restored and compared all private metadata and existing request identities on
  Neon Free with certificate-validated TLS and a limited application role.
- Cut over the preserved signer/journal to authenticated background batches and a
  15-minute schedule; verified its native runs, durable journal and actual first
  consented testnet payment against a canonical receipt.
- Created the free Envio Development project and validated its root cloud config,
  shared-handler code generation and types. HyperSync catches up, and all three
  plans' historical accounting and 23 canonical plan events match the live reader.
- Connected the verified Envio release to the hosted app. Authenticated Activity
  displays real indexed history; independent provider metadata measured a two-block
  lag. The app labels completeness unknown until the verified updated watermark reader is rolled out to the hosted app.
- Kept the app, metadata, scheduled worker and indexer online independently of the
  laptop. Retained free tiers without paid upgrades or recharge; Envio Development
  has a temporary lifetime of up to 30 days and service quotas apply.
- Disabled automatic Envio releases and removed the approved duplicate deployment
  to conserve indexing hours. Future indexer releases require a manual deployment.

### Verification already completed

- Passed 107 application tests and 49 contract checks, including accounting invariants,
  adversarial tokens, consent replay, caps, exact boundaries and cross-plan isolation.
- Verified deployed local-chain payment splits, reverse-order returns, in-window
  top-up recovery, late expiry refusal and competing workers.
- Verified real PostgreSQL migration, rate-limit, idempotency, invitation, setup
  revision, job lease, discovery and worker-nonce races.
- Passed web typechecking, lint, production builds and client-artifact secret scanning.
- Passed eleven browser checks covering public layout/accessibility, sign-in entry,
  navigation, API isolation, safe caching/offline behaviour and isolated UI journeys.
- Verified isolated actual-component flows for approval/deposit separation, reload
  recovery, read-only status checks, draft privacy, role restrictions and zero returns.
- Verified actual sponsored payee consent, publication, funding and activation.
- Completed live open-withdrawal and active-top-up/ending/return scenarios, with
  canonical receipt reconciliation and no remaining claim on the completed test cases.
- Checked actual signed-in Home recovery, exact allowance restoration, review
  focus/dismissal, indexed history and Home → About → Home session continuity.
- Verified contract deployment configuration and historical indexed accounting.
- Passed the remote CI checks for the functional hosting source, including its
  cloud code generation and type corrections. Verified native Netlify builds and
  public/private endpoint behaviour separately from local test fixtures.
- Ran static analysis with no high/medium findings on the verified compiler path;
  reviewed low findings remain. This is automated analysis, not an independent audit.
- Kept synthetic UI fixtures, local-chain tests and live provider evidence explicitly
  separate in [the test report](docs/test-report.md).

### Local operations and project documentation

- User authorized publishing every current source, CI, documentation and screenshot
  change to the existing public GitHub repository. Pre-publication application/contract,
  local lifecycle/worker/CRE-batch, lint, CRE SDK/type and changed-script checks pass.
  This publishes reviewer artifacts and tested helpers without changing the scope of
  pending hosted CRE, new receipt/provider proof or actual-device campaigns.

- Prepared the final judge-facing README against current Consumer Products & Payments
  and Privy/Envio/Alchemy/CRE requirements: product story, judge access, accounting
  example, rubric, source links, architecture, contracts, evidence and local commands.
  Added three real live-app iPhone 17 Pro Max Mobile View captures in docs/assets.
  Screenshot metadata/links/graphic size pass; fresh chain/runtime verification passes
  at 70688174. This advances reviewer documentation without asserting future payments,
  hosted CRE work, device certification, videos or final portal selection/submission.

- Established a private local version-control baseline, excluding credentials,
  private evidence, backups and generated runtime state. Added source scans before
  commits and in CI, and removed personal machine paths from setup instructions.
- Upgraded the application URI decoder to its published security fix, with a narrow
  compatibility patch and installed-consumer regression checks. The development-only
  braces advisory remains visible, with tested local depth guards until an upstream fix.
- Made private GraphQL startup recover its existing source after a database outage,
  and separated production indexer typechecking from typed local-chain replay checks.
- Added owned local service helpers that preserve unrelated listeners and signal
  only processes whose ownership markers match.
- Configured local application/API, persistent metadata database, worker, indexer
  and private GraphQL services with loopback bindings.
- Added private application backups and verified exact restoration of all backed-up
  tables in a disposable database without replacing the application database.
- Kept credentials, keys, authorization material and private backups out of tracked files.
- Pinned dependencies and provided wrappers for the runtime, compiler, contracts,
  indexing, database, browser tests and workflow tooling.
- Added architecture, state-machine, decisions, integration, operation, verification
  and handoff documentation, plus CI configuration for reproducible checks.
- Refreshed the project-only Graphify code graph, report and interactive view.
  Checked source coverage and endpoints, and verified key relationships against source.
- Kept Graphify local without model calls, uploads, global configuration changes or hooks.

### Additional verified engineering and recovery safeguards

- Verified real Alchemy Monad Testnet reads, deployment runtime/immutables and the
  preserved hosted payment receipt through the privately configured server endpoint.
- Reduced same-block plan snapshots to six RPC requests and Home summaries to four
  using verified Multicall3, with all-or-nothing read failure and no substitute amounts.
- Added and live-verified the hosted Envio processing-watermark reader locally;
  its rollout to the hosted interface remains a separate operating step.
- Added actor-scoped notification reorg reconciliation, truthful unavailable states
  and recovery of orphaned confirmed requests while retaining immutable identities.
- Fenced stale worker leases and heartbeat completions; bounded pending rebroadcast
  retries without changing signed bytes, hashes or reserved nonces.
- Added private operational health and gated native scheduled monitoring, with
  fixed aggregate diagnostics and an explicit migration/rollout procedure.
- Verified exact local application restore across thirteen tables and historical
  indexer restore across sixteen tables, including integer safety, binary bytes,
  full-precision timestamps and serial sequence recovery.
- Added authenticated encrypted backup bundles with byte-exact recovery checks and
  private key handling; remote storage, scheduling and retention are still pending.
- Prepared exact explorer compiler/source/runtime inputs and constructor arguments
  for the token, factory and all three existing plans without publishing source.
- Passed the current 129 application and 49 contract checks, thirteen browser checks,
  actual local-chain/worker/PostgreSQL/indexer verification and secret scans.

### 13 October engineering continuation

- Verified the current hosted application release and protected operational health:
  worker succeeds, no overdue/unresolved broadcasts, database/RPC/accounts/sponsorship
  ready, and the actual runtime reports Alchemy configured. Masked provider settings
  are not interpreted as proof of a different RPC provider.
- Reconciled four hosted Envio plans and 27 canonical plan events with exact historical
  accounting; measured processing lag is two blocks at this observation.
- Ran the actual relay-only CRE CLI against the hosted adapter: four plans scanned,
  zero eligible jobs accepted. The consented 10 FBTEST case remains Active with
  own 0/reserve 10/used 0/paid 0 and its original due time.
- Added `pnpm cre:execute --authorized-origin https://fallbackk.netlify.app`.
  It requires observed non-empty enqueue work, rejects CLI-only/contradictory results,
  and returns exit 2 for a valid empty scan. Each sanitized run is archived privately
  so a later empty/failing run cannot overwrite the earlier observation.
- Added `pnpm test:cre-batch`: production batch validation/coordinator and actual
  worker gateway complete one local 150 FBTEST payment (100 own/50 backup), preserve
  one signature/broadcast through three SQL restarts, and replay the acknowledgement
  before/after settlement without duplicate jobs or notifications. This is isolated
  loopback Anvil/SQL evidence, not a positive hosted CRE CLI execution.
- Passed the fresh 132 application/49 contract checks, five CRE SDK checks, types,
  lint and source scanning. Original local worker recovery mode also passes.
- Passed full local-chain lifecycle/split/refund/cap/expiry/worker-race verification.
  Added the CRE-batch check to the local CI workflow; no new remote CI is claimed.
- Checked every registered plan at block 70668731. The installment due 12 October
  at 03:48 IST was paid at 04:00:42 IST: 150 FBTEST own/0 backup, with canonical
  receipt, exact window and complete payee transfer. The next installment is in
  November. Two other plans are Closed/Cancelled; the fresh plan is NotDue.
  No settlement, expiry or funding-closure work is currently eligible.
- Prepared technical product/integration descriptions, 16 verified public source
  paths and a role walkthrough in [the technical notes](docs/bounty-engineering-notes.md).
  Portal typing/submission and videos remain owner-operated; no entry was submitted.
- Audited the secondary checklist against its dated evidence and narrowed mixed
  tasks to the unverified scope. Fresh closed-plan reads at block 70671724 confirm
  both cancellation cases have zero claims and exact attributed conservation;
  fresh hosted Envio reconciles four plans/27 canonical events at 70671720.
  Completed release/local recovery/restore work is no longer an unfinished checklist item.

## Primary remaining tasks — engineering and bounties

**No immediate primary engineering task remains under the latest exclusions.**
Completed items have been removed from this section and recorded above. Technical
entry descriptions, source links and the role walkthrough are ready in
[docs/bounty-engineering-notes.md](docs/bounty-engineering-notes.md).

Useful non-empty hosted CRE execution is still uncompleted, but waiting for the
14 October plan is excluded from this pass. Its deferred status is retained below.
Videos and portal submission remain owner-operated; ongoing hosting availability
is user-managed. No entry or bounty completion is claimed.

## Secondary remaining tasks — verification, proofs and optional hardening

This list contains only the outstanding scope after the 13 October evidence audit.
Completed live cancellation/returns, ordinary approval/reload recovery, current
history reconciliation, controlled local failure/restart/reorg checks, local backup
restore/encryption and release checks are recorded in **What has been done**.
Live provider/hosted campaigns and real-device tests remain separate from fixtures.
Procedures are in [docs/remaining-verification.md](docs/remaining-verification.md).

Useful non-empty hosted CRE execution remains a deferred functional task. All four
plans are currently ineligible; the paid 12 October installment cannot be paid again.
Waiting for the 14 October case is excluded from the current pass. Preserve accepted
schedules and keep local/empty results distinct from useful hosted execution.

### 1. Remaining live payment scenarios

- [ ] Reconcile the 10 FBTEST backup-funded payment after **14 October 2026, 09:00 IST**:
  canonical payee transfer, own/backup split, natural closure, notifications and indexed
  history. At the last observation it is Active with own 0/reserve 10 and unpaid.
- [ ] Verify additional live partial-backup, cap-blocked/in-window-top-up, exact-expiry
  refusal and chronological missed-payment cases where useful. Ordinary active
  top-up, cancellation and independent owner/supporter returns are complete.
- [ ] Observe the original November/December installments only when due. Do not wait
  for them or modify immutable terms to finish current engineering work.

### 2. Remaining invitation and authorization failure cases

- [ ] Verify a genuinely fresh shared-link → sign-in → return → claim journey and
  live consumed-link, wrong-account, revoke/decline/replacement and expiry cases.
- [ ] Independently reconcile provider sponsorship/request records for the newest
  onboarding actions; the 38 earlier confirmed actions are already reconciled.
- [ ] Verify live rejection, interrupted/expired authorization, revert and ambiguous
  pending-request recovery across fresh sessions/concurrent retries. Preserve the
  original request and reconcile it before another attempt. The bounded lookup replay
  against a known confirmed operation does not prove an actual lost-hash incident.

### 3. Remaining hosted RPC/indexer/worker/CRE campaigns

- [ ] Collect targeted hosted outage/throttling and slow-RPC evidence, preserving
  unknown amounts, bounded retries and disabled money actions. Controlled transport
  tests and repeated successful hosted reads are complete.
- [ ] Extend hosted Envio restart/lag/reorg verification. Existing four-plan history,
  receipt/accounting reconciliation and controlled local rollback are complete;
  future payment events must still be reconciled when they occur.
- [ ] Verify hosted worker interruption, lost broadcast response, competing leases
  and receipt/notification recovery. Preserve signed bytes, nonce and job identity;
  the actual local worker interruption/replay tests are complete.
- [ ] Capture useful non-empty hosted CRE work and trace the exact job to canonical
  receipt, notifications and Envio history. Controlled duplicate/stale batch,
  HTTP failure, restart and retry checks are complete; live positive work is pending.

### 4. Remaining device, PWA and loading checks

- [ ] Verify actual-device install/update, screen-reader, touch, keyboard/zoom,
  offline/stale-tab and fresh-device role/recovery behaviour beyond the completed
  responsive Chrome/public/fixture checks.
- [ ] Measure slower account initialization/loading only if it obstructs a user's
  journey, and fix the observed issue. Existing snapshot timings are not a complete
  authenticated loading benchmark.

Current release/build/application/contract/local-chain/network/SQL/worker/indexer/
CRE/browser/secret checks are complete at their recorded revisions. Checks after
future source changes remain standard engineering rules, rather than an unfinished
checkbox for the already-verified source.

### 5. Remaining explorer publication and reviewer evidence

- [ ] Publish exact testnet contract source if desired or required by an entry,
  using verified compiler inputs and matching constructor arguments. Runtime/input
  preparation is complete; explorer publication is not.
- [ ] Prepare a reviewer-safe receipt/screenshot/log bundle if required. Technical
  descriptions/source links are ready; private evidence still needs deliberate
  redaction before sharing. No fabricated proof or audit claim.

### 6. Optional delivery and longer-term operations

- [ ] Configure the optional invitation-email sender/domain and consented delivery;
  verify actual provider acceptance, mailbox arrival and immutable live retries.
- [ ] Enable extended scheduled health diagnostics if needed. Basic private health,
  queue visibility and the scheduled worker are complete; extended monitoring is disabled.
- [ ] Add encrypted remote backups, scheduled retention and an independently protected
  recovery-key copy if needed. Exact local app/indexer restore and authenticated
  encryption recovery are complete; remote storage/retention is unconfigured.
- [ ] Resolve the remaining development-only dependency advisory with a compatible
  fix when available, retaining the tested local guard until then. This is distinct
  from the dependency/security checks already completed.

### Docker and local tools

**Judges do not need Docker, and Docker on this PC is not part of the hosted app.**
The live frontend/API and worker run on Netlify, metadata is on Neon, indexing/GraphQL
is on Envio Cloud, and contracts/RPC/accounts use their online testnet/provider
services. The PC can be off while judges use https://fallbackk.netlify.app.

Docker Desktop is optional for reproducing the older local Hasura GraphQL setup:
`infra/hasura.compose.yaml` runs Hasura plus its PostgreSQL metadata container;
`scripts/graphql-local.ts` manages that project-owned environment. Keep Docker if you
want those local development/debugging tests. You can quit it during judging. Its
local volumes are development data, not the hosted Neon/Envio state; uninstalling or
deleting volumes is unnecessary for submission.
