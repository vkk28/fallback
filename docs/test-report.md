# Actual verification — 2026-10-09 (Asia/Kolkata)

## 11 October — source stabilization verification

The local source baseline excludes private configuration, raw evidence, backups and
runtime files. Its 212 staged files passed the configured-secret/artifact scan.
Adversarial probes accept clean source and reject configured-secret disclosure,
a forced private file and binary-embedded disclosure. No secret values are emitted.

- pnpm install --frozen-lockfile --ignore-scripts --offline: passes with the pinned fix.
- pnpm check: 90 application and 49 contract checks, types/fmt/lint/ABIs pass.
- Final installed-dependency regressions: two pass, including the actual CommonJS
  query-string consumer of decoder 0.5.0 and the retained braces depth guards.
- pnpm test:local-chain: exact payment splits/refunds, cap recovery, expiry/race pass.
- Production build, web types, source lint and client-secret scan pass; existing
  optional Privy/Farcaster/Solana and viem/Tempo warnings remain.
- All 11 browser checks pass. Actual Chrome Home survives restart with the existing
  signed-in account, three current summaries and no waiting invitations.
- Read-only Privy reconciliation verifies 38 existing confirmed actions with expected
  canonical receipt events, provider sponsorship and bound wallets.
- pnpm chain:verify passes on chain 10143 with selected FBTEST/runtime/immutables.
- Envio fixture codegen, strict fixture types, real event replay/rebuild and refunds
  pass; production handlers typecheck after the configured indexer is restored.
- Modified GraphQL helper strict types/lint and its actual start/query/status pass.
  Initial startup failed because Hasura retained a connection inconsistency; a
  source-only reload fixes it. Initial production indexer types failed on the 31337
  fixture driver; separate configurations fix that mismatch without masking errors.
- Existing indexed histories reconcile against canonical historical RPC; the runtime
  watermark is still behind head after downtime. No new live scheduled payment,
  lag/reorg proof, new role login or email-delivery proof is claimed.
- Preservation probe: 39 requests remain 39, zero unresolved requests/jobs, original
  active plan retains own 250/reserve 300/paid 0/used 0 and its consented first due;
  completed cases remain closed with zero claims. No signing/submission/enqueue.

Audit after the fix: production zero advisories; full graph one high development-only
braces advisory with no upstream fixed release. Its local guard is tested, and the
finding is neither suppressed nor presented as audit-clean. Full raw logs remain
private. [Sanitized current evidence](evidence/source-stabilization.json) records
commands, scopes and results; previous reports below retain their historical dates.

## Documentation maintenance — 11 October 2026

UI and About verification records below were consolidated from their separate
reports. Their commands, observation dates and evidence scopes remain historical;
no application, contract or network test was rerun for this documentation cleanup.

## UI verification evidence

This implements the core journey improvements in Improve_UIUX.md locally. Existing
consented plans, balances, request identities and contracts are preserved. FBTEST
remains a test token without real value.

| Spec area | Implemented | Remaining boundary |
| --- | --- | --- |
| Neutral system | Grayscale tokens, sans-serif hierarchy, controls, provider accent, icons and offline shell | System sans-serif fallback; no bundled Inter or dark mode |
| Navigation | Home, Activity, Account; mobile bottom navigation; persistent workspace provider | No global role switch; existing URLs preserved |
| Home | Bounded same-block summaries, role filters, pending action/return attention and Requests | RPC failures remain explicitly unknown; a manual retry is available; no availability guarantee |
| Invitations | Public auto-preview, intended-account inbox, connected people, native Share/copy fallback | New people still need their bound destination; no email/contact resolver, revocation or cross-device host |
| Setup | Four steps, schedule presets, field errors, private versioned progress and atomic fresh-draft finalization | Autosave after an editing pause; explicit unsaved-state protection; no edits to consented plans |
| Funding | Exact-amount permission then deposit; restored confirmed permission; actor/plan-scoped input recovery | Separate account authorizations remain; no batching, wallet-based eligibility or auto replay |
| Plan | Overview/Schedule/People/Activity/Terms; next date/window, truthful own/backup forecast and role-specific money | No expiry/top-up bypass or payment guarantees |
| Review and recovery | Native focused modal, action-specific consequences, GET-only Check status, separate renewal | Original request bytes and destination are retained; ambiguous outcomes stay blocked |
| Returns | Ending and returning money are separate; personal entitlement and clear zero state | Only independent recorded-beneficiary claims; no sweep |
| Activity | Stable newest-first cursor, actor-scoped unread/read markers and receipt disclosures | Reorg notification correction, preferences and external channels remain open |
| PWA/accessibility | Safe caching retained; neutral assets; visible focus, touch sizing and reduced-motion rules | Full VoiceOver, zoom/forced-colors, installation/update and real-user studies remain open |

Migration0007 adds only private preliminary setup. A local application backup restored
all141 rows before migration, and another restored all141 rows over all11 tables after
migration. Race checks use a newly created disposable PostgreSQL database; existing
application/indexer databases were not reset. Worker/indexer were stopped at task start
and were restored using owned-process markers.

Automated component journeys use actual UI components in fresh Playwright contexts
with clearly labelled synthetic API/provider fixtures. Their route does not exist in
the running app. They verify interaction/recovery behavior, not provider transactions.
Real contracts are verified separately on disposable Anvil and configured Monad reads.

### Actual final checks

- `pnpm check`: 90 application tests, 49 contract tests, types/fmt/lint/ABIs pass.
- `pnpm web:typecheck`, `pnpm lint:app`, `pnpm web:build`: pass.
- `pnpm test:browser`: 10 pass; public shell at320/375/768/1024/1280/1440, actual
  provider sign-in dialog without credentials, public invitation recovery, safe offline
  caching, isolated focus/approval/reload/draft/role/zero-return/profile journeys.
- `pnpm test:local-chain`: actual deployed disposable-contract splits/refunds,
  cap recovery, late expiry and worker race pass. Contracts are unchanged.
- `pnpm test:postgres`: actual PostgreSQL migrations through0007 and concurrent
  revision-zero saves/inbox acceptance each produce one winner; existing races pass.
- `pnpm chain:verify`: chain10143, configured asset and deployment pass.
- `pnpm scan:client-secrets`: final client artifact scan passes.
- Strict standalone modified-script typechecks and source lint pass.
- `pnpm db:backup-local`: exact141-row/11-table snapshot/restore, no live DB change.
- `pnpm verify:functionality`: read-only final checkpoint23:39:21UTC; requests39→39,
  unresolved0/jobs0, original250 own/300 backup/paid0/used0, A/B Closed and remaining
  claims0, indexed plans3/candidates0, worker gas/database/RPC ready. Future scheduled
  payment is not verified by this pre-due check.

Live Chrome verified the signed-in Home, all3 summaries after retry, original next
payment/forecast, exact allowance restoration, focused modal review/dismissal and
five original indexed events. Current RPC reads occasionally failed; unavailable data
was labelled and monetary controls stayed disabled. No financial confirmation was
clicked; the post-review SQL count is still39 with zero unresolved requests. The second connected Chrome profile had no open window; supported creation
was unavailable, so no new live multi-account transaction walkthrough is claimed.

Early concurrent checks hit sandbox loopback rejection, PGlite initialization timeouts
and Next-generated-type races. The modal dismissal focus and duplicated event-label
entries were repaired. Final serial checks pass; optional Privy/Solana/viem Tempo build
warnings remain. Docker/private GraphQL was also stopped and was restored without
resetting volumes or credentials. This is local test evidence, not an audit or study.

### Follow-up: About tab

Added public About and a fourth navigation item, plus a landing footer link. It
explains the product, use steps and alternatives with explicit testnet scope.
About follow-up evidence is consolidated below and in evidence/about-*.

## About verification evidence

Added a public `/about` page and a fourth shared navigation item. The landing
footer also links to it. The page explains reserved support in plain language,
uses a clearly labelled illustrative 150/110/40 example, describes the actual
setup/consent/funding/start/return sequence, and compares arranging support through
as-needed transfers, upfront support, fixed transfers and messages/spreadsheets.
It explains when simpler methods fit better, rather than claiming unique or
universal superiority. Comparisons concern generic arrangements, not current
features or prices of named financial providers.

Content follows prompt.md Phase 1 and current plan source: only allocated funds
count; complete payments must fit reserve and both caps within the window; active
allocations lock; supporters cannot add/withdraw while active; returns are separate
beneficiary claims. Test-only tokens, scheduler liveness, public records and absent
bank settlement remain explicit. No contract, API, migration, financial action,
provider or consented term changed.

About renders outside the authenticated workspace, with a shared static navigation
component and no account SDK initialization. Visiting it remounts the workspace
provider on return; persisted authentication remains available. Existing setup
unsaved-navigation protection still intercepts navigation links.

### Actual verification

- Final `pnpm web:build`, `pnpm web:typecheck`, `pnpm lint:app` and
  `pnpm scan:client-secrets` pass. Existing optional provider/viem build warnings
  remain; no secret values emitted.
- Final `pnpm test:browser`: 11 pass. About checks public access through the landing
  footer, all four navigation links, active item, six widths (320/375/768/1024/1280/1440),
  overflow, Axe accessibility, skip-link focus, section anchor scrolling, setup link
  and zero account-service requests. Existing ten checks also pass.
- Read-only `pnpm chain:verify` passes for chain10143, configured asset and deployment
  at 2026-10-11T00:04:16.499Z. No transaction was submitted.
- Live signed-in Chrome verifies Home → About → Home with persisted sign-in, then
  reopens About as the deliverable. Final production copy uses the actual Create plan
  button label and includes the test-token funding helper.
- Public screenshots: evidence/about-375.png, about-1280.png and about-preview.png.
  Visual inspection confirms desktop hierarchy and mobile stacked comparison cards.

An initial build captured the earlier setup wording while that copy was being edited.
A fresh sequential build and complete browser rerun verify the final source. Owned
web3000 was stopped only for builds and restored afterwards; database, worker and
indexer were not stopped or reset. Contracts/backend are unchanged, so contract,
local-chain and PostgreSQL suites were not rerun for this informational change.
Axe results cover the tested pages; full VoiceOver and user research are not claimed.
Command evidence is in evidence/about-{build,types,lint,browser,client-scan,network}.txt.

## 10 October backend continuation — latest verified outcomes

- pnpm check:85 backend/domain tests and49 contract checks, types/fmt/lint/ABIs pass.
- Actual test:local-chain accounting/cap/expiry/race and chain:verify pass.
- test:postgres: migration0006, concurrent signer nonce reservations and existing races pass.
- test:worker-chain: one actual150-FBTEST payment, six nonduplicate notifications,
  pre-broadcast interruption, lost broadcast response and notification interruption
  across three persistent SQL reopenings pass; one signature/one broadcast.
- test:indexer-reorg: actual Envio/PostgreSQL/Anvil fork removes orphan payment,
  closure/shares/installment/history; replacement allocation750000 indexes once.
- verify:indexer-live: all three plans reach fixed head69884890, accounting/shares
  and5/7/10 canonical plan events match. No live reorg was induced.
- db:backup-local: ten tables/141 rows restore exactly in a new disposable DB,
  SHA256 checked, private snapshot retained, before/after additive migration.
- Production build, five public browser tests and client bundle secret scan pass.
  Existing optional Privy Farcaster/Solana and viem Tempo warnings remain.
- Final read-only readiness preserves 39 requests, with zero unresolved account
  requests/jobs, healthy database/RPC and no currently eligible discovered plan.
  Actual signed-in B reload preserves Ended/zero claim and complete indexed history.
- Eleven HTTP tests execute actual handlers, installed signed-token verifier and
  local SQL. They isolate sessions/notifications/requests, reject invalid/expired
  credentials, roles/origins and changed accounts, and preserve requests on outages.
  Upstream lookup/chain failures are fixtures, not live provider outage proof.

Initial disposable reorg startup failed because the handler option names a directory;
a replacement branch also initially exceeded its funding deadline. Corrected runs
pass. Early backup attempts failed JSON binding and timestamp/parser equality before
exact restoration passed. Existing databases remained untouched. A standalone script
check first used incompatible module flags; final NodeNext strict script checks pass.
Broad maintenance RPC snapshots also failed transiently; targeted sequential readiness
reads reduce the probe scope. No failed observation is recorded as a pass.

Future scheduled testnet payment, broader live failure observations, external
notification rollback, hosted services/CRE and production release gates remain.
Historical results below retain their original timestamps and narrower scopes.


## 10 October 16:51 UTC — backend recovery running; refund journey complete

Local production build and marker-owned web restart passed after all human refund
requests were confirmed. Five fresh public browser checks and client secret scan pass;
actual signed-in R reload preserves Ended/claim0 and disables the claim button even
with review checked. S’s actual page also shows returned refund1/claim0 and disabled
claim. Final pending-request reconciliation is empty. Database/web/indexer are owned
and listening; worker process is owned. No service/database reset or new financial
submission occurred. Existing optional Privy Farcaster/Solana and viem Tempo build
warnings remain.

B’s full15-request journey is canonical receipt/sponsorship verified: active top-up,
ending without automatic transfers, S1 then R0.5 independent pull claims. Deposited1.5
= claimed1.5, liabilities0, active own/reserve0, paid/used0, installmentCancelled;
repeat reconciliation adds no duplicate notifications. Original current RPC16:50:08
remains Active/own250/reserve300/paid0/used0 with unchanged first due11Oct22:18UTC.
Original request count12→12. Do not repeat or cancel either finished A/B or active
original plan.

Recovery source verifies provider identity, bounded recent operation receipt discovery,
canonical block/receipt and exact execution segment. Known EntryPoints only, at most
2,000 blocks/100 per query/20-second budget between calls; misses/outages remain
unresolved. Validation/other-operation logs do not prove an action; failed inner
operations are distinguished from successful outer transactions. Full core check
passed70 risk/49 contract tests before final three added cases; final38 receipt tests,
strict types and modified-source lint pass. No new contract implementation was changed.

Graphify final code-only graph646 nodes/1,379 edges/34 communities covers uncommitted
source on unborn main; optional Solidity/SQL parsers absent. No hooks/semantic calls/
uploads. Final index coverage16:51:36 remains behind: runtime69832613/RPC69877501;
all3 historical states reconcile but B remains creation-only at its measured height.
Full catch-up, reorg/session/provider failure matrix, real due testnet payment and
hosted operations/release gates remain. No more financial click is currently needed.

Evidence: operation-recovery-checks.json, live-operation-recovery.json,
manual-b-all-claimed.json, manual-b-verification.json, manual-b-ui-completion.json,
privy-live-actions.json, original-plan-preserved.json, graphify-refresh.json,
indexer-live-reconciliation.json and browser-tests.json.

## 10 October — bounded operation recovery

Full core check passes70 risk/49 contract tests. After final log-position and outer-
revert guards plus three added cases, targeted receipts suite passes38/38 and final
strict types pass. Application lint/web types pass; Monad deployment verification
passes16:29:50UTC. A real read-only lookup replay matched B’s known cancellation
receipt16:32:34UTC without clearing its hash or changing request count13→13.
This tests bounded recent lookup, not historical catch-all recovery. Production web
build/restart remains deferred until the human refund journey completes. Evidence:
operation-recovery-checks.json and live-operation-recovery.json.

## 10 October continuation — backend recovery

Renewed B recipient approval reconciled14:45:45UTC: existing request confirmed,
provider-sponsored, expected receipt verified; no signing/resubmission. B funding,
activation, top-up, ending and independent claims remain unverified. Earlier hashless
checkpoints below are historical. Preserve the original active plan and both DBs.

New functionality restores exact funding approval after reconnect using a confirmed
request plus current snapshot allowance, rejects provider identity/hash changes,
recovers a stored receipt during provider outage, handles canonical outer reversion,
and checks canonical receipts for account/worker outcomes and notifications. Client
polling failures retain the same request and recovery control. No cosmetic changes.
22 local SQL/provider regressions added; final pnpm check passes57 risk tests and49
contract checks. Local-chain splits/refunds/cap/expiry/race checks pass. Network
verification passes14:52:52UTC. Worker local persistent recovery passes with one
submission/six nonduplicate notifications; these are fixtures, not live outage proof.

Measured public RPC rejects1,000/10,000 log ranges but accepts100. Envio RPC config
now caps at100, avoiding repeated oversized queries. Owned restart preserved1 plan/
7 events; original historical accounting/five receipt identities still match. Latest
measured index height69429773 versus RPC69854271 at14:54:35UTC remains behind; A/B
history is not verified. Reorg rollback, due live payment, live refund journey and
hosting/deployed CRE gates remain open. Already-confirmed sponsored actions also pass the final canonical receipt verifier
at14:59:07UTC. Read-only B funding recovery passes15:01:43UTC: recipient250000/
supporter1000000 base units restored, no outstanding actions, request count6→6,
Open/own/reserve/paid/used0. Final production build passes (existing optional SDK import warnings), app lint/web
and verification-script types pass, five public browser checks pass, and client
secret scan passes. Owned web/worker/indexer/database remain local. Final API health
200 has databaseReady/rpcReady true at15:09:54UTC.

Actual signed-in R Chrome reconnect restores the0.25 approval. Entering0.50 disables
the deposit step;0.25 enables it. Read-only refresh preserves amount/review/approval.
No wallet action was clicked. The follow-up read verifier recovered15:08:31UTC:
B Open/zero, both exact approvals, requests6→6. Two preceding snapshot reads failed
against RPC; root cause was not established and no universal outage/recovery pass is
claimed. Fixed diagnostic categories contain no private metadata. Browser locator
wait timed out once while refresh was still running; later DOM shows the new snapshot.

User handoff: R Chrome is prepared on B with0.25 and the existing approval. The human
must click only “2. Allocate money” and complete account authorization under the browser
transaction handoff rule. Do not mint/approve again. Then verify its receipt/current
balance before preparing S's1 reserve, activation, active0.25 top-up and independent
refund sequence. Current request count remains6. Original plan is preserved.

Latest index observation15:04:38UTC: processing69496173 (runtime advanced69496573)
vs RPC69856271. Behind;1 plan/7 events, A/B not indexed. No full catch-up/reorg/live
payment/refund/hosted-workflow completion is claimed. Screenshot remains private and
ignored under .tools/manual-verification; public browser evidence is flags only.


Evidence: pending-actions-reconciliation.json, indexer-rpc-ranges.json,
indexer-restart-lag.json, indexer-live-reconciliation.json and backend-recovery-*.txt.
The first sandbox pnpm check failed only because a disposable relay listener was
blocked by EPERM; native-loopback rerun passed. No unavailable test is counted as passed.


Latest continuation: fresh pnpm check passes35 risk tests/49 Foundry checks, lint/web
types and explicit strict verification-script types pass. History logIndex is now
selected from GraphQL; the new regression projects only actually requested fields.
Actual private Hasura history reconciles the real Active plan's250 own/300 reserve,
supporter values and five canonical plan receipt logs at the processing watermark.
Seven total product events are present, but coverage still trails RPC.

Actual test:indexer-restart freezes processing while real chain head advances,
reports behind, preserves the plan/all seven events and resumes69331315→69331407.
Verifier attempts failed initially due strict parsing of an extra metadata field
and a short progress window; final corrected run passes. This is not a reorg test.
Actual test:worker-chain now proves one Anvil submission/150 FBTEST payment through
two persistent SQL reopenings and injected receipt/notification-ack interruptions,
with six nonduplicate receipt-backed messages. No live provider failure is inferred.

Latest exact-origin-approved CRE simulation passes at19:30:53 UTC with scanned1,
accepted0,stale0 through the verified replacement tunnel. The prior origin retired;
automatic review's initial authorization rejection was resolved with direct human
approval of the replacement. No credential was sent before that approval.
Sandbox pnpm check first failed its localhost relay test with EPERM; the native
rerun passes. That denial is not recorded as an application defect or a passed run.
Evidence: core-check.txt, indexer-live-reconciliation.json, indexer-restart-lag.json,
local-worker-verification.json, verification-script-types.txt and cre-simulation.json.

This is technical evidence for the local implementation and configured Monad testnet.
It establishes no independent audit, production financial readiness, user traction or
bounty fulfillment. Evidence timestamps use UTC; this handoff date uses local time.

| Actual command/check | Observed result / evidence |
| --- | --- |
| `pnpm check` | Latest run passed strict types,35 risk tests, formatting/high-medium Solidity lint,49 Foundry checks, three generated ABIs; `evidence/core-check.txt` |
| `pnpm typecheck`, `pnpm test` after native signing correction (prior checkpoint) | Passed with20 unit/risk checks then; superseded by latest34-check run; `types-check.txt`, `backend-domain-tests.txt` |
| `pnpm lint:app`, `pnpm web:typecheck`, production `pnpm web:build` | Passed; Next routes/PWA built. Two optional Privy/Farcaster/Solana and viem/Tempo import warnings remain; `app-lint.txt`, `web-types.txt`, `web-build.txt` |
| `pnpm test:local-chain` | Fresh signed Anvil receipts; exact acceptance arithmetic, cap recovery/late expiry and worker race passed; `local-integration.json`, `local-events.json`, `local-chain-check.txt` |
| `pnpm contracts:slither` (unchanged contracts) | High-severity gate passed; nine low timestamp notices reviewed, no test-token findings; `slither-*.json`, `slither-check.txt` |
| `pnpm chain:manifest`, `pnpm chain:verify` | Actual Monad 10143 deployment receipts and compiled runtime verified; FBTEST six decimals/symbol and factory asset/chain correct; deployment manifest, `monad-rpc.json`, `testnet-deployment-flags.json` |
| `node scripts/prepare-verification.mjs` | Local standard JSON packages reproduce exact creation/runtime bytecode and match every compiler-metadata source hash; `source-verification-preparation.json`. Nothing uploaded to an explorer |
| `pnpm test:postgres` | Real PostgreSQL 18.4 migrations through0005, rate limit/reset, concurrent idempotency, invitation/lease races and three-observer/three-submitter discovery race passed; `postgres-verification.json` |
| `pnpm test:worker-chain` | Actual Anvil gateway delivers150 FBTEST once; retained hash through two persisted SQL reopenings and injected receipt/notification-ack outages; six nonduplicate messages; `local-worker-verification.json` |
| `pnpm indexer:codegen`, typecheck, `pnpm indexer:verify` | Actual Envio 3.14 types/handlers; 33 real captured local events rebuild 450 paid/200 support used, exact refunds/claims and seeded replay; `indexer-verification.json` |
| `pnpm cre:typecheck`, SDK WASM build, actual CLI workflow build; `pnpm cre:test` | Updated CLI1.37/SDK1.23 builds and five SDK tests pass, including actual QuickJS URL-constructor compatibility regression; actual simulation reported separately; deployment absent |
| `pnpm test:browser --trace on` | Five passed on rebuilt stable app:375/1280 axe/overflow/focus, no eager account requests, actual email input without credentials, auth isolation, scheduler relay/origin rejection and static-only cache/offline shell; `browser-tests.json`; private local traces under ignored test-results |
| `pnpm scan:client-secrets` | Passed on production assets; no configured private secret value found or output; `client-secret-scan.json` |
| Lighthouse 13.5 CLI, clean Chromium / localhost | Actual public-home mobile simulations before/after provider deferral, details below; `lighthouse-home-before.json`, `lighthouse-home.json` |
| `pnpm audit --json` | Version-based result: one high braces and one moderate URI-decoder advisory remain after sixteen compatible fixes; tracked depth/work patches and installed-package regression checks mitigate them locally. Not audit-clean; `dependency-audit.json` |
| Isolated `npm audit --prefix infra/performance --json` | Zero reported vulnerabilities in Lighthouse tool lock at this check; `performance-tool-audit.json` |
| Code-only Graphify refresh / focused query / diagnostics | Local AST only; generated CRE bundle excluded;610 nodes/1250 edges/30 communities,3 self-loops; no semantic nodes or missing endpoints. Solidity/SQL optional parsers absent. Not a financial safety test |
| Privy app/wallet reads + user manual checks | Canonical native account/TEE settings verified; two user-reported login/Verify cycles. Actual three-role sponsored consent/publication, self mints, exact approvals,250 own/300 backup and activation verified; privy-live-actions.json/live-plan-funding.json |
| `pnpm graphql:prepare`, `pnpm graphql:verify-reader` | Actual PG18.4 reader: six SELECT tables, no table/schema writes, read-only tx, mode600 files; owner writes/backfill verified. Actual pinned Hasura query/auth rejection/watermark/stop-start persistence verified; envio-graphql-runtime.json; still behind |
| Ruby/Psych Compose YAML parse; actual Docker Compose | Parse/loopback/image pins and actual containers/network/queries now pass. Python PyYAML import was unavailable, not a pass. Empty Hasura log-types failed startup and was fixed with supported settings/no raw log persistence |
| Indexer/CRE safety unit checks | Seven integer/watermark/endpoint/history-selection tests, two local reader/config tests, two relay-origin/environment/quoting tests and actual local socket/header/body/route restriction test pass |
| `pnpm verify:indexer-live`, `pnpm test:indexer-restart` | Existing real plan accounting/supporter/receipt identity matches historical RPC; controlled pause/lag/restart preserves entities; no reorg tested |
| Authorized HTTPS relay / actual CRE CLI simulation | Replacement owned public health/auth401/financial-route404 verified; exact-origin-approved default-limit simulation passes19:30:53UTC, scanned1/accepted0/stale0. Only relay credential forwarded; no source upload, payment or workflow deployment; cre-staging-runtime.json/cre-simulation.json |

## Accounting baseline

49 Foundry checks comprise 17 plan tests, 23 factory checks (including reused plan
checks), five adversarial-token checks and four invariants. Fuzz runs 1,000 cases;
invariants run 128 x depth 64, checking conservation/backing/closed liabilities and
complete nonduplicate transfers. Contracts were not changed during this continuation.

Local receipts prove splits 150/0, 100/50 and 0/150, 450 total delivered, 200 support
used, refunds 66.666666/33.333334 claimed in reverse order, no funds moved on blocked
attempts, in-grace top-up recovery and no late payment after expiry. Two signing
workers cannot double-pay an installment. Local addresses/hashes belong to stopped
Anvil nodes, not Monad or live Privy role sessions.

## Discovered issues and fixes

CRE discovery previously restarted at page one and silently discarded candidates
beyond20, while its per-candidate requests could exceed current quotas. Durable
20-plan keyset pages and an atomic batch enqueue remove both source defects using
two HTTP calls/run. Three regressions prove63-plan traversal, restart preservation,
RPC/indexer failure rollback, tampering rejection, stale and empty pages. Actual
PostgreSQL races prove one frozen batch and one enqueue/cursor advance across three
observers/submissions. A retry initially failed because JSONB reordered object keys;
schema normalization now makes payload comparison and acknowledgement ordering stable.
The WASM compiler initially rejected the exported parameterized test handler; moving
it to a module leaves only zero-argument main exported. Final CLI/SDK builds pass.
SDK harness checks include complete batches, invalid/oversized/arbitrary-call
payloads, failed/payment-claiming/wrong-batch acknowledgements and HTTPS origin bounds.
Those fixtures alone establish no integration runtime. Separate actual Hasura/HTTPS/
CRE CLI evidence now verifies runtime/simulation; no DON deployment or paid receipt.

A real user's draft save exposed a PostgreSQL driver problem absent in PGlite tests:
raw Date parameters in rate-limiter CASE expressions were not serialized by
postgres-js. ISO timestamp bindings/explicit output cast fix it. Real PG regression
now checks limit/reset. Its lease test supplies a certainly-due fixture time to avoid
PG microsecond/default versus JS millisecond scheduling flakiness. The retained user
form was retried and its draft was actually saved. That is not a sponsored transaction.

Durable actor/plan request locking and navigation recovery prevent new keys after
ambiguous provider submission. Tests prove same provider identity and account
isolation. Proposal receipt proof uses exact immutable calldata and records execution
nonce/hash, since another legitimate proposal may advance the nonce after preflight.
Altered terms/expiry/recipient fail proof. Acceptance/publication use stored calls.

The consumer's generic creation catch incorrectly blamed service failures on input;
it now preserves safe actionable errors. Provider failures expose fixed allowlisted
categories/HTTP status only, never raw messages/identifiers/credentials. The original HTTP400 attempt later exceeded its conservative retry window. Official
Privy reference lookup returned200 with no transactions, factory proposal was absent
and nonce unchanged. It was preserved as failed, allowing a fresh request on the same
saved draft; no transaction was sent by the agent. See legacy-request-reconciliation.json.

The specific native Privy user-wallet guide requires the client to sign a request
then the server to submit it. Server user-JWT key exchange was rejected. The corrected
flow uses server-formatted canonical bytes, React useAuthorizationSignature, fixed
expiry/idempotency headers, provider wallet resource binding (migration0004), and
Node authorization_context.signatures. A real P256 fixture verifies the exact HTTP
body/headers emitted by installed Node SDK, and altered sponsorship fails signature
verification. Preparing sends nothing; execution requires the bound client signature.
Expired authorizations, payload injection, changed wallet resources and other users
fail. No signature/user key is persisted. This fixture is technical protocol verification. Separate actual provider/receipt
checks now prove sponsorship for six human actions; see privy-live-actions.json.

Envio's first retry lacked the local RPC interpolation variable. A separate generated
local fixture config now reproduces captured events independently of deployment
configuration and without a running RPC. Browser provider-dialog checks first targeted
its zero-size wrapper, then raced a build replacing assets; final stable-build tests
verify the actual visible email input. Do not run browser journeys while rebuilding
in place; retain forms and wait for server readiness.

## Measured public loading

The first Lighthouse mobile simulation measured performance 69, accessibility 100,
best-practices 77, 2,014.7 ms total blocking and 2,147,696 bytes. It identified eager
account SDK/third-party loading. After deferral until sign-in intent, the same CLI
configuration measured 100/100/100, 49.5 ms blocking, 1,561.6 ms LCP and 164,123 bytes.
These are individual local public-page simulations, not production measurements or
scores for authenticated financial journeys. First measurement overlapped browser
checks; do not claim a controlled statistical benchmark or numeric token-cost savings.
Provider initialization is still required after sign-in intent.

Headless Envio is running against isolated fallback_indexer, preserving deployment
start block and real sync counters; no live product event is indexed yet. Its native
console/metrics listener is confined to127.0.0.1. The dedicated testnet worker has
verified faucet gas and is running; no due testnet payment is claimed.

Owned local services now use a detached marker-verified runner. Actual start/status
checks confirmed database/web survive their launcher exit and /api/health reports
real database and RPC readiness. Prior tool-owned services stopped on continuation;
saved data was preserved and restored. No global daemon/IDE configuration changed.

## Missing checks / external gates

Withdrawal/top-up/cancellation/claim live sponsorship and complete
authenticated browser accessibility, recovery-failure/replacement/error matrix,
fully caught-up Envio coverage/reorg rollback, due testnet worker settlement, deployed CRE workflow, explorer source publication, remote
CI, hosted application/service deployment or real-device installation/update test.
The former auto-review rejection of all-env/unverified-host simulation was resolved
through explicit user-authorized scheduler-only HTTPS, active ownership proof and
relay-only env. Actual simulation passes; remaining release steps need their own
authorization/entitlement. Do not substitute builds,
queued jobs, fixture identities or unavailable tests with passing integration claims.
## 10 October live manual checkpoint
Manual A own0.25/support1 withdrawals have successful expected events and official
Privy sponsorship proof. Empty A ending subsequently confirmed:12 confirmed requests,
lifecycle2 and own/reserve/used/paid0. B consent/publication confirmed:Open, zero
balances, S joined. B activation/top-up/cancellation/claims remain unfinished.
Read-only Refresh confirmed information retained form/approval and request count9→9.
UI-only change: app lint/types/build, five public browser checks and client-secret
scan pass; configured chain:verify passes10:47:51UTC. Earlier35 risk/49 contract tests
retain prior dates; no contract edit/rerun occurred. Actual authenticated P375px
layout has no overflow/recipient controls; keyboard focus observed. Full authenticated
axe/VoiceOver,200% zoom, physical phone, waiting-worker update and failure matrix
are not claimed complete. A broad snapshot read failed transiently before later
successful sequential reads; failed read was not recorded as a pass.

## 10 October evening — fresh functionality checks
User requests backend/functional verification only; unbuilt cosmetic change reverted.
pnpm check:35 risk and49 contract checks pass. test:local-chain: actual splits/refunds,
cap recovery, late expiry and worker race pass. test:postgres: isolated real-driver
migrations/rate reset/idempotency/invitation/lease/discovery races pass. test:worker-chain:
one actual Anvil150-FBTEST settlement across two SQL reopenings, injected receipt/
notification acknowledgement outages and six nonduplicate messages pass. chain:verify
and confirmed-only verify:live-actions pass. These are fresh backend-focused logs,
not fabricated live B outcomes. Six actual-membership internal action guards reject
forbidden roles, request count6→6, no signing; HTTP attack scope excluded.
B renewed approval remains provider-broadcasted/sponsored without hash at14:11:16UTC
after656 seconds. UI preserves it/blocks fresh actions; funding/activation/top-up/
cancellation/claims remain unfinished. Preserve the pending row. No perfect or complete
integration claim, and no authorization rejection/challenge expiry test inferred.

Latest read-only checkpoint14:18:36UTC: renewed B approval is still sponsored/broadcasted without a hash after1096 seconds; it remains unresolved. At14:16:29UTC, index reconciliation found3 registered plans: original accounting/five receipt events match at processed69401589, behind RPC69846708; A/B are not indexed yet. No live B deposit/activation/top-up/refund success is inferred.

A repeat funding-recovery command after browser checks failed without private error
output. Its earlier15:01:43UTC result remains a valid observation, not a claimed
repeat pass. Added fixed-stage diagnostics to distinguish RPC/snapshot/record failures;
the later15:08:31UTC read passed without changing state. Root cause was not established. Chrome amount/review/exact-approval refresh
checks succeeded with no financial click. One browser locator wait timed out while
refreshing; a subsequent DOM observation showed the completed newer snapshot.

## 11 October — UI/UX implementation verification

Current evidence is summarized in [UI verification evidence](#ui-verification-evidence) and
evidence/uiux-verification.json. Final check90 application/49 contract checks,
web types/lint/build, ten browser checks, client scan, local-chain, actual PostgreSQL
migration0007/setup/inbox races, network and strict modified-script types pass.
Final backup restores141 rows/11 tables. Read-only functionality probe preserves39
requests, original250 own/300 reserve/paid0/used0, A/B closure and zero entitlements.

Browser evidence distinguishes fresh public production tests, labelled isolated
component fixtures and existing signed-in Chrome read/review checks. Modal focus,
approval/deposit separation, reload recovery, draft isolation, role restrictions,
zero-entitlement explanation and profile prefill pass in fixtures. Public axe checks
cover six widths; no VoiceOver/conformance/field-performance or new live multi-role
transaction claim. The native deposit review was opened and dismissed with correct
focus; its final monetary confirmation was not clicked.

Early parallel build/check runs caused SQL setup timeouts, and restricted relay tests
hit loopback EPERM. UI types read stale/generated files during route migration/build;
serial regeneration and verification pass. Duplicate event labels and modal focus
were fixed before final passes. One sign-in test ran against mixed build assets and
failed; after owned web restart, all ten browser tests pass. Runtime discovery first
failed because Docker/private GraphQL was stopped; restoring existing owned services
allowed the read-only probe to pass. RPC failures remain intermittently observable
and are shown as unavailable; read-only retry recovered all3 Home summaries.

No new testnet financial request, source publication, external invitation message,
purchase or unrelated account operation was performed. Email/contact delivery,
revocation, hosted access and the wider PWA/accessibility gates remain open.

## 2026-10-11 — About tab

Final web build/types/lint/client-secret scan pass; all11 browser checks pass, with
public About at six widths, Axe/no overflow, navigation/anchors/skip-link focus and
zero account requests. Configured read-only Monad check passes. Live Chrome verifies
signed-in Home → About → Home. Financial suites were not rerun: no contract/backend
changes. Final screenshots and command logs are evidence/about-*; see the About verification evidence above.
