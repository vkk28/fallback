# Fallback handoff — 11 October 2026, Asia/Kolkata

## Latest task: core engineering checklist and documentation cleanup

Latest user scope: progress.md contains completed engineering and remaining
engineering tasks only. Exclude deadlines, logos, marketing, videos, recruitment,
user trials and startup planning. Remaining work is sequential: source/dependencies,
secure new-person invitations, Alchemy RPC, live account recovery, conditional
payments, Envio/notification correctness, worker recovery, meaningful CRE simulation,
UI/PWA/integrated checks, then full durable hosting and hosted verification last.
Target Consumer Products & Payments plus Privy, Envio, CRE and verified Alchemy use.
This task plans the work; no new integration, hosting or financial action occurred.

Removed duplicate hackathon-readiness and phase-status reports and the obsolete
Manual A/B procedure; completed A/B evidence remains below and in test-report.md.
Consolidated UI/About verification reports into test-report.md and repaired references.
Keep the product/UI specifications, operations/provider/security/accounting docs,
actual evidence and handoff. Documentation links and checklist ordering were checked;
no application tests or services were run for these edits. The source graph is unchanged.

## Previous task: progress checklist format

User preference: progress.md should list completed capabilities and detailed
remaining work without dates, checkpoint values or session history. Rewritten
into two sections grouped by feature area. Verification provenance remains in
its dedicated reports. Documentation only; no tests, services or graph refreshed.
Keep this format when maintaining progress.md.

## Previous task: progress and Graphify refresh

Updated progress.md to reflect implemented core UI/UX and About, migration0007,
recorded90 application/49 contract checks,11 browser checks and141-row/11-table
backup, while keeping delivery/hosting/future-payment gates open. Tests and service
health were not rerun for this documentation-only update.

Local Graphify0.9.79 code-only extraction plus cluster-only --no-label regenerated
JSON/report/HTML:767 nodes/1756 edges/44 communities. Direct source validates shared
PrimaryNav. Diagnostics show no missing/dangling endpoints or duplicate/collapsed
edges; three self-loops remain. Solidity/SQL parsers are absent;22 source-less import
stubs carry a legacy semantic marker, with no model calls. No hooks/upload/package
upgrade/app state change. Evidence and covered hashes: graphify-refresh.json.

## Previous task: About tab

Added public `/about` and shared Home/Activity/Account/About navigation, plus a
landing footer link. Explains the purpose, illustrative accounting, actual usage,
advantages over four generic support arrangements, and when a simpler method fits.
Testnet-only scope, locks, caps, separate claims, public records and scheduler limits
are explicit. No financial/backend/contract state changed. About needs no account
SDK; returning to the workspace remounts its provider with persisted authentication.
Final build/types/lint/client scan and all11 browser tests pass, including About
accessibility at six widths and no account-service initialization. Configured network
read checks pass. Live Chrome verifies the signed-in Home → About → Home journey;
About is left open. Owned web3000 serves the final production build; other services
were untouched. Contract/local-chain/PostgreSQL tests were not rerun for this static
change. See [About verification evidence](test-report.md#about-verification-evidence) for current evidence.

## Previous task: UI/UX implementation

Implemented the core redesign from [Improve_UIUX.md](../Improve_UIUX.md). The app
uses neutral tokens, sans-serif typography, accessible action reviews, mobile
Home/Activity/Account navigation and role-aware current-state cards. Workspace
routes preserve their URLs in a shared provider layout. Sign-in verifies the
bound account automatically. The public invitation route previews before sign-in.

Added authenticated Requests, prior-connection person selection, private versioned
setup drafts (migration0007), a newest-first paginated activity feed and read markers.
Invitations are still bound to verified account addresses; inbox acceptance has the
same expiry, role and single-use checks as link acceptance. Owners can see their
known invitees; other participants cannot enumerate fellow supporters. New people
still need a bound address. Email delivery, contact identity resolution, revocation,
notification preferences and cross-device HTTPS hosting remain unavailable.

Plan screens show the next payment/window, separate role-specific amounts, a guided
exact approval/deposit sequence, restored confirmed approval amounts, independently
claimable returns and readable zero-entitlement states. Money actions have focused
reviews. **Check status** only reconciles the stored request; renewed authorization
requires a separate review. Entered funding amounts are actor/plan-scoped session
recovery data and are cleared on sign-out/account changes. No monetary action is
queued offline. Setup changes save after an editing pause or on Continue/Save;
unsaved navigation is intercepted, and cross-tab revision conflicts require reload.

No contract or consented-term change. Original and completed A/B plans are preserved;
no new testnet financial request was submitted. Tests use isolated clearly labelled
UI fixtures for interrupted actions and actual SQL/Anvil checks for the underlying
safeguards. They are not new live multi-role receipt evidence or a usability study.

Final checks: pnpm check90 application +49 contract checks; web type/lint/build;
10 browser checks; client-secret scan; local-chain; actual PostgreSQL migration,
setup-revision/inbox races; configured network; strict modified-script types all pass.
Backup/restore verifies141 rows/11 tables after migration0007. Read-only runtime probe
at23:39:21UTC preserves all39 financial requests, zero unresolved requests/jobs,
original250 own/300 backup/paid0/used0 and A/B closure/zero claims. All3 indexed plans
are discoverable; current due candidate count is zero. No future payment is claimed.

Live Chrome verified all three Home summaries after a read-only retry, the original
next payment/forecast, restored exact allowance, modal focus/dismissal and five
original indexed events. RPC reads occasionally failed; the UI truthfully showed
unavailable money information and disabled mutations, then recovered on retry.
The second connected Chrome profile had no open window and supported creation was
unavailable. New multi-role submissions remain untested here; isolated UI fixtures
and API/SQL role tests have separate scopes. No personal screenshots are tracked. A post-review SQL count remains39 financial requests and zero unresolved requests.

Web3000/database54329/indexer9898/worker and private GraphQL8080 have been restored.
Docker was stopped at task start and is now running the existing owned containers;
volumes/credentials are preserved. Run builds, UI typechecks and full SQL-heavy checks
sequentially on this host: concurrent runs produced initialization timeouts and stale
Next-generated types. Early duplicate event labels and modal focus were fixed; the
final source/build/browser checks pass. Optional SDK warnings remain as before.
Evidence: uiux-*.txt, browser-tests.json, local-backup.json, postgres-verification.json,
functionality-readiness.json, and uiux-verification.json. See test-report.md#ui-verification-evidence.

## Scope and protected state

Financial/backend safeguards are preserved; the core UI/UX redesign is implemented. One writer in Fallback.
Main has no commits; source remains untracked. Keep local and Monad Testnet only.
Preserve both databases, worker key, legacy failed request, request/provider identities
and immutable consented terms. No reset, sweep, hooks, global IDE settings, purchases,
publication, explorer upload or competition submission.

Original Housing plan remains Active with 250 FBTEST own / 300 reserve, paid/used 0,
12 requests and first due **12 October 2026, 03:48 IST** (11 October 22:18 UTC).
Do not repeat funding/activation, cancel it, change terms or fast-forward testnet time.
A and B are Closed; do not repeat finished financial actions. B's 15 requests and
independent S1 / R0.5 refunds are confirmed; every remaining claim is zero.
Native Privy wallets remain human controlled. Browser consequential transaction
clicks/OTPs retain their applicable human handoff. No financial click is pending.
Keep credentials, signatures, invitations and personal metadata out of tracked evidence.

## Completed in this continuation

Large index backfill is complete. At 17:28:50 UTC, all three plans reached fixed RPC
checkpoint 69884890; subsequent runtime height 69884925. Accounting, supporter
weights/entitlements and 5 original / 7 A / 10 B canonical plan events reconcile.
Two-block live lag stays enabled. B's signed-in Chrome page shows complete history,
Ended, zero claim and a disabled claim button. No new financial request was created.
The final read-only readiness probe preserved all 39 requests, found zero unresolved
account requests/jobs and no currently eligible registry/indexed worker candidates.
Database/RPC health and worker test gas are available. The signed-in B session
survived the tested production restart and reload.

Indexer RPC additive recovery is 10 under the unchanged 100-block ceiling. Zero
additive growth had left transiently reduced query ranges permanently small. Owned
restart preserved entities and resumed backfill; start block and rollback settings
were preserved. Actual Envio 3.14 / PostgreSQL / disposable Anvil reorg verification
now removes orphan payment, closure, shares, installment and timeline entities, and
indexes the canonical replacement once. This does not prove all live RPC reorg cases
or rollback of external notifications.

Worker signs a fixed permissionless call and persists exact bytes/hash/signer/nonce
before broadcast. A per-chain/signer database lock and unique nonce index serialize
reservations. Retries reconcile first and can only rebroadcast identical bytes;
legacy stored hashes remain receipt-only. Stale lease terminal observations cannot
overwrite a newly persisted hash. No user key/signature is stored. Ambiguous/dropped
hashes remain unresolved; no automatic fee replacement or nonce clearing exists.

Migration 0006_worker_broadcast and its generated schema snapshot are applied after
a verified private local application backup. Exact restore of 141 rows / ten tables
passes in a newly created disposable database, before and after migration. Backups
remain under ignored .tools/backups with mode600 files/mode700 directories. They
preserve timestamp precision and JSON values; they are local application metadata
snapshots, not indexer, remote, encrypted or scheduled backups.

## Actual checks and runtime

- pnpm check: 85 backend/domain tests, 49 contract checks, types/fmt/lint/ABIs pass.
- test:local-chain: actual splits/refunds, cap recovery, expiry and worker race pass.
- test:worker-chain: one actual payment/six notifications, three SQL reopenings,
  pre-broadcast interruption, lost broadcast response and notification interruption pass.
- test:postgres: migration0006 and separate concurrent nonce reservations pass,
  alongside previous rate/idempotency/invitation/lease/discovery races.
- test:indexer-reorg and verify:indexer-live pass with the distinct scopes above.
- Eleven new HTTP-handler tests use the installed cryptographic verifier and local
  SQL; provider user lookup/chain outages are fixtures, not live provider failures.
- Production build, five public browser tests and client secret scan pass. Existing
  optional Privy Farcaster/Solana and viem Tempo warnings remain.
- Strict modified-script types and source lint pass after repaired local test setup.
  Early reorg fixture configuration/deadline checks and backup JSON/timestamp
  restoration attempts failed before correction; existing databases stayed untouched.

At this task start, owned web/database/indexer/worker were stopped. They have been restored; web serves the verified redesigned production build. Private GraphQL is healthy again after restarting the existing Docker runtime. Web and worker restarted
onto the tested build/source; private Hasura8080 remains available. Use
scripts/local-services.mjs and verify marker ownership before signals. Native ps and
loopback access are needed; restricted sandbox checks can falsely report services down.
Never use envio stop, DB reset or migration down. Graphify is project-only/code-only;
Solidity/SQL parsing remains unavailable and it is not a contract safety check.

Evidence: indexer-live-reconciliation.json, indexer-reorg.json,
indexer-restart-lag.json, local-worker-verification.json, postgres-verification.json,
local-backup.json, graphify-refresh.json and previously verified B/sponsorship files.
Current aggregate evidence also includes functionality-readiness.json,
backend-browser-completion.json and backend-continuation-checks.json.

## Next concrete work

Preserve the original plan and verify its actual due payment/receipt, notifications
and indexed history when its timestamp arrives. Keep the independent worker running;
local services cannot provide uptime while the host sleeps. Live provider/session/RPC
failure observations beyond fixtures, notification reorg recovery, installation/update
safety, durable hosting, monitoring, indexer/remote backups, deployed CRE authorization,
source publication and release gates remain. No complete integration/audit claim.

Earlier scheduler-only relay approval does not authorize full-app hosting or deployed
CRE. Reverify the owned current tunnel before forwarding its relay secret. No purchase,
publication, account expansion or new financial submission was performed here.
