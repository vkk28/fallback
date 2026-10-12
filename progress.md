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

## Primary remaining tasks — hackathon submission and bounties

The core app is implemented and online at https://fallbackk.netlify.app. Fresh-user
joining, payee consent, plan publication, exact permission/deposit and activation
work. The latest application release is 5d68f55. There is no known unfinished core
feature from the submission issues just resolved. This section contains functional
integration work, submission materials and judging availability; technical proofs
and verification procedures are in Secondary below.

### 1. Keep the complete demo online through judging

- [ ] Maintain the hosted app/API and scheduled worker on Netlify, metadata on Neon,
  and the history/GraphQL pipeline on Envio Cloud through the judging period.
- [ ] Keep the indexer within its temporary Development deployment lifetime. If that
  lifetime does not cover judging, arrange a supported hosted continuation. The
  fallback must remain online; a Docker process on the owner's laptop is unsuitable.
- [ ] Keep the working app URL and free-tier configuration available to judges.
  Production capacity for 100+ users and paid infrastructure are outside this scope.

These are ongoing availability tasks. Hosting, migrations, RPC cutover and the
ordinary scheduled worker are already implemented; no migration off the PC remains.

### 2. Finish meaningful CRE execution for the bounty

- [ ] Use the implemented CRE cron/HTTP workflow to discover an actually eligible,
  freshly consented plan and enqueue useful settlement work into the hosted durable
  worker. An empty scan is working scaffolding, but it does not exercise the useful
  orchestration path for judges.
- [ ] Keep the workflow pointed at the hosted adapter, with only the relay credential.
  Keep the independent hosted worker available for ordinary application liveness.
- [ ] Present the actual CRE → hosted API → authoritative Monad reads → durable queue
  → fixed contract call architecture. The HTTP/RPC adapter is not a native CRE Monad
  write. Network deployment is not automatically required: the requirements inspected
  on 11 October accepted CLI simulation; use the current portal rules for the entry.

The implementation, SDK checks, WASM build and empty CLI execution already exist.
The remaining functional step is useful execution with eligible work, not another
account stack or a production CRE deployment. Receipt and simulation proof belongs
in Secondary. Do not edit an accepted schedule to make a case eligible early.

### 3. Prepare the sponsor-bounty entries

- [ ] Complete the entry descriptions and source links for the integrations actually
  used. Explain how each helps this product, rather than listing installed packages.
- [ ] Apply the current portal's entry requirements and select only eligible bounties
  for this project. The linked requirements were last inspected while signed in on
  11 October; no bounty award or completed eligibility claim is implied.

| Bounty | Functional implementation already present | Remaining primary submission work |
| --- | --- | --- |
| [Privy](https://hackathon.monad.xyz/tracks/privy) | Embedded accounts, account-bound consent, sponsored transactions, exact funding and independent returns beyond login | Explain these user journeys and link the relevant account/transaction source in the bounty entry. |
| [Envio](https://hackathon.monad.xyz/tracks/best-use-of-envio) | Hosted indexer driving actual plan history, support accounting, frozen shares and returns | Link the public config, schema and handlers; explain the useful history feature and retain its hosted pipeline. |
| [Alchemy](https://hackathon.monad.xyz/tracks/best-projects-using-alchemy) | Private Monad Testnet RPC used by server/worker reads, reconciliation and chain access | Explain the real RPC role and link its source; keep endpoint credentials server-only. |
| [Chainlink CRE](https://hackathon.monad.xyz/tracks/best-workflow-with-cre) | Cron/HTTP discovery workflow and hosted enqueue/worker adapter | Complete useful execution from item 2 and explain the blockchain/external-system orchestration. |

No additional Privy, Envio or Alchemy feature gap is currently identified from the
requirements previously inspected. Their remaining work is entry preparation;
additional integration evidence is listed separately below.

### 4. Finish the main submission and judge walkthrough

- [ ] Prepare the actual competition entry: hosted app URL, public repository,
  product explanation and the demo materials requested by the submission form.
- [ ] Give judges a short walkthrough for owner, supporter and payee: email sign-in,
  invitation, consent, test-token permission/deposit, activation and where to find
  schedule, activity and returns. Explain that future-dated payments execute only
  inside their agreed windows and that FBTEST has no real value.
- [ ] Explain the distinctive mechanism clearly: own allocated money first, bounded
  family backup only for a complete shortfall, and separate unused-money returns.
  Show the actual UI and current state; never present an expected payment as paid.

Prepare these materials without waiting for every Secondary item. Completing a
competition entry is separate from deploying the app; no entry has been submitted.

## Secondary remaining tasks — verification, proofs and optional hardening

These items retain the broader engineering backlog. They provide confidence or
stronger evidence and may help bounty reviewers, but they are not additional missing
core features. Prioritize targeted checks for any new defect; an exhaustive campaign
is unnecessary for a few judges/testers. Full procedures remain in
[docs/remaining-verification.md](docs/remaining-verification.md).

### 1. Payment and lifecycle proofs

- [ ] Reconcile the new 10 FBTEST backup-funded payment when it is actually due:
  **14 October 2026, 09:00 IST**. Check its canonical payee transfer, own/backup split,
  closure, notifications and indexed history. The case is active with own 0/reserve 10;
  no payment receipt exists yet at the last recorded observation.
- [ ] Collect further live partial-backup, cap-blocked/top-up, exact-expiry, ordered
  missed-payment, cancellation and independent-return evidence where useful.
- [ ] Observe the original November/December installments only when due. Do not wait
  for them to prepare the submission or change their immutable terms.

The existing 150 FBTEST own-funded hosted payment and separate end/return cases are
verified. Local-chain financial accounting tests already cover the core invariants.

### 2. Invitation, account and transaction recovery checks

- [ ] Observe a genuinely fresh shared-link → sign-in → return → claim journey, plus
  consumed-link, wrong-account, revoke/decline/replacement and expiry cases live.
  Fresh email-bound Home joining and canonical binding already work.
- [ ] Independently reconcile provider sponsorship/request records for the newest
  actions. The preserved 38 confirmed actions were reconciled previously.
- [ ] Extend live rejection, interrupted/expired authorization, revert, missing-hash,
  reconnect and duplicate-action checks. Preserve the original request and reconcile
  it before a fresh attempt; do not provoke unrelated-account failures.

### 3. RPC, Envio, worker and CRE evidence

- [ ] Add targeted outage/throttling and slow-RPC evidence while retaining unknown
  amounts, bounded retries and safe disabled actions. Hosted Alchemy adoption and
  repeated successful plan/Home reads are already verified.
- [ ] Follow further payment/closure/claim events through Envio, compare exact amounts
  and frozen entitlements with receipts, and extend hosted restart/lag/reorg checks.
  Four plans/27 events and measured processing coverage already reconcile.
- [ ] Extend hosted worker interruption, lost-response, competing-lease and receipt/
  notification recovery checks without changing signed bytes, nonce or job identity.
- [ ] Capture a successful positive CRE simulation/execution result and trace its job
  through canonical receipt, notification and Envio history. Check duplicate/stale
  batch and HTTP/restart cases. Keep evidence distinct from empty scans and fixtures.

### 4. Device, PWA, accessibility and release checks

- [ ] Extend actual-device install/update, screen-reader, touch, keyboard, zoom,
  offline/stale-tab and fresh-device role/recovery checks. Authenticated owner Chrome
  navigation at measured 375px and fixture/public 320–1440px checks already pass.
- [ ] Run the applicable build, application/contract/local-chain/network, SQL/worker/
  indexer, CRE, browser and secret checks when relevant source changes justify them.
  The current deployed revision's CI and targeted browser/driver checks already pass.
- [ ] Measure slower account initialization and loading only where it obstructs a
  judge's journey; fix observed defects rather than pursuing production benchmarks.

### 5. Explorer publication and supporting artifacts

- [ ] Publish exact testnet contract source using the prepared compiler inputs and
  constructor arguments, if desired or required by an entry. Runtime comparison is
  already verified; it does not establish explorer source publication.
- [ ] Curate receipt links, screenshots, logs with credentials/contacts removed and
  integration evidence for reviewer inspection. Do not fabricate proof or claim audit.

### 6. Optional delivery and longer-term operations

- [ ] Configure the optional invitation-email sender/domain and consented delivery;
  test provider acceptance, actual mailbox delivery and immutable retries. Secure
  links and the Home Requests inbox already work; external email is unnecessary for
  the present submission scope.
- [ ] Enable extended scheduled health diagnostics if needed. Basic private health,
  queue visibility and the hosted scheduled worker already work.
- [ ] Add encrypted remote backups, scheduled retention and an independently protected
  recovery-key copy if longer-term operation needs them. Exact restore/encryption
  checks already pass; remote retention is not currently claimed.
- [ ] Continue dependency/security maintenance when compatible fixes become available.
  Broad production-scale operating safeguards remain deferred.

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
