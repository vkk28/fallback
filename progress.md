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

## Hackathon submission target

Execution status (13 October): application source 5d68f55 is live on the free Netlify
app and its exact GitHub CI passes. Hosted health confirms database/RPC/Alchemy/
sponsorship readiness. A fresh hosted snapshot restores 12 tables/145 rows exactly;
encrypted recovery, migration 0009 and restricted grants are verified. A real updated
scheduled worker heartbeat succeeds. The operational queue query exposed a real
driver timestamp defect; its small correction and clearer draft message pass
real PostgreSQL, web types/lint/build and 13 isolated browser checks and are deployed.
Protected operations is healthy with zero unresolved broadcasts/overdue jobs. Five
plan refreshes and three four-plan Home refreshes show expected amounts without
unavailable data. Four indexed plans/27 events reconcile with canonical receipts.
Actual owner Chrome at 375px passes core navigation/overflow checks. Disabled the
optional hosting badge that covered mobile Account/About controls and verified recovery.

A genuinely new account signs in, joins an email-bound Home request and remains
bound after owner reload. The human proposes and accepts terms; owner publication
confirms onchain for a separate one-payment 10 FBTEST case. Supporter invitation is
accepted without email delivery. Separate exact permission, actual 10 FBTEST deposit
and activation are verified; supporter/payee reloads are reported correct by the human.
The new backup-funded payment is due 14 October 09:00 IST, so its actual receipt is
pending. Shared-link sign-in return has not been observed in this case. Existing
end/return cases remain receipt/history verified; no future outcome is inferred.

The latest user scope is a reliable hosted app for judges and a few testers, without
production-scale operations. The nine sections below retain the broader engineering
backlog; completing every live/manual item is not the submission acceptance test.
This is an engineering assessment, not confirmation of current competition rules.

Prioritize these checks on the actual hosted release:

- A new person can sign in, follow a shared invitation, join the correct role and
  return after reload. Optional invitation email delivery can wait; sign-in email
  and secure invitation links must work.
- Owner, supporter and payee can complete their ordinary journeys: consent,
  publication, separate permission/deposit, activation, status recovery, ending
  and independent returns. Preserve financial correctness even at small scale.
- Demonstrate a real payment using family backup and its indexed history. A
  judge can inspect a settled example without waiting for the original November
  and December installments. New demo terms require fresh role consent.
- Home and plan reads work reliably, and phone/desktop navigation and basic
  keyboard/reload/offline behaviour do not obstruct those journeys. Chrome
  inspection before rollout found intermittent unavailable chain information;
  the updated release now passes repeated reads and actual 375px owner navigation.
- Review and test the chosen source revision, take a fresh hosted backup before
  any migration, roll out the needed fixes, and recheck the actual app/worker/history.
  Confirm free-service capacity and indexer availability through judging.

| Existing section | Submission scope |
| --- | --- |
| 1. Invitations | New-user sign-in and shared links are essential; optional sender setup/delivery is deferred. |
| 2. RPC / Alchemy | Reliable hosted reads are essential. Hosted Alchemy proof is needed if that integration is claimed. |
| 3. Account recovery | Ordinary role, reload, approval/deposit and duplicate-action protection are essential; exhaustive live failure campaigns can wait. |
| 4. Lifecycle | A real supported payment and working end/return journey are essential product evidence; waiting for every original installment is deferred. |
| 5. Envio | Useful accurate hosted history and truthful lag/unavailable states are essential; additional live restart/reorg campaigns can wait. |
| 6. Worker | Actual scheduling and safe persistent retries are essential; extended hosted interruption campaigns can wait. |
| 7. CRE | Positive useful orchestration evidence is a priority when pursuing the CRE bounty; it does not block ordinary use of the existing independent worker. |
| 8. Interface / PWA | Core phone/desktop journeys and applicable final checks are essential; a broad device/assistive-technology/install matrix can wait. |
| 9. Operations | Tested release, migration backup, basic health and judging-period availability are essential; scheduled remote backup retention and long-term operations can wait. |

Explorer source publication remains useful reviewer evidence, with its necessity
subject to the actual submission rules. Do not imply that pending optional work
passed, disable consent/account isolation, fabricate demo data, or change existing
plan terms to shorten testing. Account authorization and genuinely future outcomes
remain separate from work the agent can complete locally.

## Broader remaining engineering and verification work

All nine sections below have been addressed sequentially for available local work.
Remaining live/manual/time-dependent gates are retained until actually verified.

The broader engineering target is a complete Consumer Products & Payments app with
substantive Privy, Envio and Chainlink CRE integrations, plus verified Alchemy RPC
use. Prioritize the submission target above, preserving existing consented plans
and request identities. Free hackathon hosting is live; the remaining work extends
product verification and operating safeguards beyond the verified demo.

### 1. Finish secure invitations and new-person onboarding

Local engineering verified: sender readiness uses the same strict HTTPS-origin
validation as encrypted outbox preparation; all 12 invitation tests pass. Fresh
hosted email sign-in/inbox claim and canonical account binding now pass; shared-link
sign-in return and optional provider delivery remain separate. Follow
[the manual procedure](docs/remaining-verification.md#1-new-person-invitation-and-optional-email).

- Verify the implemented address-free flow with an actual newly created Privy account:
  email sign-in, invitation return, review and one-time canonical-account claim.
  Local authenticated HTTP, SQL races and isolated browser checks cover the
  implementation; they are not a live first-time sign-in result.
- Configure the optional sender credentials and verified sending identity, using
  the hosted HTTPS application origin. Obtain consented recipients before sending
  or testing external email; no messages have been sent by the implementation.
- Complete actual email-provider delivery/failure/retry verification for the
  implemented encrypted outbox. Keep provider acceptance, mailbox delivery,
  membership and onchain consent distinct. Retain its tested revocation, decline,
  exact expiry, atomic replacement, private visibility and immutable request identity.

### 2. Strengthen RPC access and complete the Alchemy integration

Local engineering verified: shared server/worker transport now bounds timeouts and
retries and refuses redirects, credential-bearing URLs and remote plaintext RPC.
Four controlled transport tests and source typechecking pass. Actual public-RPC
chain/runtime/token/factory verification passes at block 70368511. Alchemy-specific
configuration is now supplied privately by the user. Alchemy chain/runtime/immutables
verification passes at block70373447; actual same-block plan snapshots and preserved
payment receipt reconciliation also pass through that provider. Hosted release
66f5e9f confirms Alchemy selection and actual RPC access; repeated UI reliability
checks remain. [Setup procedure](docs/remaining-verification.md#2-alchemy-rpc).

- Apply the verified private Alchemy Monad Testnet endpoint to the hosted server
  for plan reads, receipt reconciliation and worker chain access.
- Repeat provider chain/runtime/immutable and application-read verification after
  hosted RPC cutover; local provider-specific requests and receipts are verified.
- Exercise timeouts, throttling and unavailable responses. Preserve unknown states,
  bounded retries and disabled money actions until authoritative reads recover.
- Keep provider credentials out of browser bundles and logs. Retain Privy as the
  single account and sponsorship stack.

### 3. Complete live account and transaction recovery

Local recovery/role verification passes 64 receipt/backend/HTTP checks; actual local
pending-request reconciliation finds zero unresolved requests. Hosted owner Home
and real history are inspected, including safe disabled actions during unavailable
RPC reads. Full new-session owner/supporter/payee and live authorization-failure
journeys remain pending; [role procedure](docs/remaining-verification.md#3-accounts-and-transaction-recovery).
All 38 preserved confirmed account actions also reconcile against current provider
sponsorship and canonical expected events, without signing or submission.

- Walk through owner, supporter and payee sign-in, account switching, reconnect and
  role-specific visibility using the current interface and real bound accounts.
- Verify exact approval followed by deposit, sponsored authorization, rejection,
  interrupted/expired challenges, known reverts and missing-hash recovery.
- Reconcile stored requests before permitting fresh financial actions. Verify that
  reloads, retries and provider/RPC failures cannot create duplicate deposits or claims.
- Distinguish controlled failure tests from observed live provider failures and fix
  any uncovered recovery defect without changing immutable request payloads.

### 4. Prove the complete conditional-payment lifecycle on testnet

Local deployed-chain lifecycle verification passes exact splits/rounding/returns,
cap/top-up recovery, late expiry and worker races. The existing hosted installment
is freshly reverified against its captured journal and canonical receipt:150 FBTEST
own,0 backup, exact payee transfer/window. Readiness verification now follows current
accounting and chronological outcomes. Future installments and fresh consented live
cases remain pending; [lifecycle procedure](docs/remaining-verification.md#4-live-conditional-lifecycle).

- Follow the preserved plan's remaining installments as their actual due conditions
  arise, reconciling each canonical receipt, exact payee amount and funding split.
  Its first own-funded installment is verified; later outcomes are not inferred.
- Use separate freshly consented cases to verify own-funded, partly backup-funded
  and fully backup-funded payments within the agreed caps. Never change the original
  plan's terms or fast-forward live network time.
- Verify blocked payments move no funds, owner top-ups recover within the payment
  window, expired installments remain unpaid and later installments process in order.
- Complete cancellation/natural closure and independent owner/supporter returns,
  checking exact rounding, conservation and zero remaining claims after completion.
- Record actual live receipts separately from the already passing local-chain tests.

### 5. Complete Envio history and notification correctness

Implemented and verified locally: hosted chain_metadata coverage, bounded legacy
fallback, invalid-watermark handling, canonical/orphaned/unavailable notification
states and idempotent restoration after re-mining. Sixteen focused checks and source
types pass. Actual hosted history reconciles all three plans and 23 canonical events;
the new reader measures a four-block lag against a fresh RPC head. Updated source is
deployed in release 66f5e9f; fresh live event/UI and live restart checks remain.

- Follow the new funding, payment, missed-installment, closure and return events
  through Envio into the application timeline and supporter accounting.
- Reconcile indexed amounts, frozen weights and entitlements against canonical
  receipts, and measure processing lag instead of inferring completeness from a log.
- Roll out the verified hosted processing-watermark reader so the hosted interface
  shows measured coverage; keep unknown on invalid/unavailable watermark reads.
- Verify restart/backfill and recovery from unavailable or stale GraphQL data;
  current chain state must continue governing financial actions.
- Correct receipt-derived in-app notifications after reorgs. Verify orphaned events
  cannot leave false payment records or duplicate notifications after reconciliation.
- Keep readable config, schema, handlers and reproducible indexer setup with the
  integration evidence, showing Envio drives useful application behaviour.

### 6. Harden worker delivery and restart recovery

Local engineering verified: stale job leases and heartbeat completions cannot
overwrite newer state; unresolved signed transactions back off without changing
bytes/hash/nonce. Twelve focused worker/operations checks and actual Anvil settlement
with three SQL reopenings pass. Added migration0009 and private aggregate health
endpoint/runbook. Hosted migration/rollout and actual updated heartbeat are verified.
Queue timestamp correction is deployed and protected operations reports healthy.
Extended interruptions and optional scheduled monitoring remain;
[worker procedure](docs/remaining-verification.md#6-worker-and-operations).

- Extend the verified first hosted due-work delivery with live interruption/restart
  cases, preserving exact transaction bytes, hashes, nonce reservations and job identities.
- Check competing workers and interrupted receipt/notification processing cannot
  pay twice, strand acknowledged jobs or overwrite newer broadcast state.
- Apply the locally tested dropped/underpriced recovery runbook in hosted operations.
  Ambiguous broadcasts remain unresolved; immutable bytes/hash/nonce are retained.
- Deploy and enable the implemented private RPC/heartbeat/job/broadcast/lag health
  checks after migration0009 and verify actual native scheduled diagnostics.

### 7. Complete meaningful CRE orchestration

Workflow types, five SDK checks, WASM build and six discovery/relay/environment
checks pass. Actual CRE CLI simulation through the hosted HTTPS adapter succeeds:
three plans scanned, zero eligible jobs, zero stale candidates. This verifies the
current adapter path; positive due-work receipt/notification/history orchestration
remains pending an eligible consented plan. [CRE procedure](docs/remaining-verification.md#7-positive-cre-orchestration).

- Run a successful actual CRE CLI simulation with positive eligible work through
  discovery, authoritative RPC checks, durable enqueue and worker processing.
- Trace the resulting canonical receipt into notifications and Envio history;
  an empty scan does not demonstrate payment orchestration.
- Verify repeated runs, stale candidates, external HTTP failure and restart recovery
  preserve the frozen discovery batch and cannot enqueue or pay twice.
- Document the actual cron/HTTP/RPC adapter architecture and reproducible workflow
  configuration. Keep relay secrets and wallet/database credentials separated.
- Retain successful simulation evidence for the CRE integration. Network deployment
  of the CRE workflow is optional because the bounty accepts CLI simulation.

### 8. Finish interface quality, PWA safety and integrated verification

Available engineering verification passes: final full check129application/49contract
checks,13browser journeys/accessibility/PWA checks, production build, web types/lint,
client-secret scan, real PostgreSQL through0009, actual worker restart fixtures and
Envio replay/rebuild. Three snapshot checks and canonical Alchemy reads verify
reduced request counts. Current braces advisory still has no upstream patched
release. Fresh live onboarding/funding/activation and reported role reloads pass;
actual 375px owner core navigation passes after removing the hosting obstruction.
Screen-reader/real-device/install and broader failure checks remain separate.
[Quality procedure](docs/remaining-verification.md#8-interface-pwa-and-integrated-checks).

- Complete authenticated mobile, keyboard, screen-reader, zoom/reflow, focus and
  touch checks across setup, invitations, funding, pending requests and returns.
- Refine any confusing amount, lock, limit, schedule, approval or recovery state
  uncovered by those engineering checks. Keep technical account details optional.
- Verify offline transitions, stale tabs and application updates preserve drafts
  and request identity, isolate accounts and never replay money actions offline.
- Measure authenticated loading/provider initialization and slow-network behaviour;
  fix material delays, unnecessary RPC work and layout instability.
- Run the full applicable checks: pnpm check, test:local-chain, chain:verify, real
  PostgreSQL/worker/indexer tests, CRE checks, web types/lint/build, browser checks
  and client-secret scanning. Record actual outcomes and remaining limitations.
- Recheck upstream braces releases and replace its local guard with a verified
  compatible security fix when one becomes available; keep its advisory visible.
- Prepare reproducible build, migration, deployment and recovery instructions,
  contract-source verification inputs and technical evidence for each integration.

### 9. Finish hosted operating safeguards and integrated verification

Local safeguards are implemented and verified: gated scheduled health monitoring,
current13-table/141-row application restore, authenticated encryption and byte-exact
archive recovery, historical16-table/45,851-row indexer restore with sequence reset,
and exact explorer compiler/source/runtime inputs. Eight backup/monitor checks pass.
Hosted migration/approved rollout/Alchemy cutover are verified, with a fresh exact
12-table/145-row hosted backup and encrypted recovery. Focused corrections are
deployed; remote retention, full fresh-device financial/PWA journeys and explorer
submission remain manual/live gates. [Operating procedure](docs/remaining-verification.md#9-hosted-safeguards-and-final-rollout).

- Finish the full fresh-device owner/supporter/payee financial and recovery journeys
  on the hosted app, beyond the verified sign-in/plans/history and scheduled payment.
- Retain the free-tier quotas and temporary indexer lifetime; keep all services
  independent of the laptop, without enabling paid upgrades or recharge.
- Enable health/lag/job monitoring and backup both application and indexer data with
  appropriate encryption, retention and a verified restore procedure.
- Verify invitation links, hosted sponsorship, payment notifications and recovery
  together with the already verified scheduled settlement and indexed history.
- Verify installation and update behaviour on the final HTTPS app, and execute the
  applicable CI checks as source changes. Existing functional-source CI passes.
- Complete authorized explorer source verification and deployment checks without
  changing deployed bytecode or immutable settings. Record the final hosted
  configuration, integration evidence and operating/recovery instructions.
