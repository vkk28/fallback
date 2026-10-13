# Actual verification — 2026-10-09 (Asia/Kolkata)

## 13 October — complete-change publication checks

- Fresh pnpm check passes root TypeScript, 132 application tests, Solidity format/lint,
  49 contract checks including invariants, and typed ABI regeneration without a new
  tracked ABI diff. Existing low block-timestamp advisories remain in local compilation.
- Fresh test:local-chain passes complete split/refund/cap/top-up/expiry/worker-race
  scenarios. test:worker-chain and test:cre-batch each pass one real disposable local
  150 FBTEST payment (100 own/50 backup), durable signing/broadcast and notification
  recovery through three SQL restarts. No hosted payment or CRE CLI result is inferred.
- lint:app, cre:typecheck, all five CRE SDK checks and explicit strict NodeNext checks
  of scripts/cre-simulate.ts and scripts/local-worker-verification.ts pass.
- Source scan passes 251 files/nine configured secret checks. README relative assets,
  links and deployment addresses match. Commands use a temporary
  pnpm_config_verify_deps_before_run=false setting without changing dependencies.
- Fresh read-only chain:verify passes configured chain10143, asset, token/factory
  runtime and immutables at70690516, observed2026-10-13T13:12:37.860Z.


## 13 October — README and screenshot verification

- Inspected the official primary-track and four intended bounty pages in signed-in
  Chrome. Compared README claims with current progress, source and dated evidence.
- Captured and visually inspected three original live-app iPhone 17 Pro Max Mobile
  View PNGs: About, next-payment forecast and confirmed/pending schedule. Browser
  preset is 440x956; exported framed PNGs are 614x1272. PNGs contain no text/EXIF
  metadata. This is desktop emulation, not a physical-device test.
- README relative links and image targets pass. The existing 512px logo is 11836 bytes,
  within 3 MB. No financial state, profile or user request is mutated for captures.
- Initial pnpm chain:verify aborts its automatic dependency install without TTY.
  Command-only verify-deps-before-run=false avoids installation. Restricted-network
  script run returns HttpRequestError; scoped network-enabled invocation passes
  chain 10143/asset/runtime/immutables at 70688174, observed 2026-10-13T13:00:46.587Z.
- Application/contract/browser suites retain prior dated outcomes. No fresh suite,
  useful hosted CRE enqueue, new hosted payment or portal submission is claimed.
- Final source scan passes 251 files/nine configured secret checks with no findings.
  git diff --check and README local links/assets, deployment addresses, HTML table
  balance and code fences pass. Explorer host matches viem's selected chain definition;
  web-tool explorer retrieval is unavailable. Original Chrome pages are restored.


## 13 October — Secondary completed-scope audit

- Fresh canonical closed-plan read at 70671724 verifies both original cancellation
  cases and all four recorded beneficiaries with claimable zero. Open-withdrawal
  case totals: deposited/withdrawn 1250000 base units. Independent-return case:
  deposited/claimed 1500000. Both have Cancelled outcomes, no active allocated/reserve
  balance and exact attributed conservation. No signing or submission is performed.
- Fresh hosted Envio verification passes four plans/27 canonical receipt events,
  exact historical accounting and four backend history pages at processed height
  70671720/source 70671722, measured two-block lag. No local Hasura credential forwarded.
- Dated evidence independently distinguishes completed scopes: manual-b-all-claimed
  and UI completion prove separate returns/zero-claim reload/deduplicated reconciliation;
  live-operation-recovery is a read-only bounded lookup replay of a known confirmed
  operation, without clearing its hash. It is not an actual missing-hash incident.
  Prior provider proof checks 38 actions across 13 action types; fresh onboarding
  actions remain outside that 12 October 10:05 UTC capture.
- Stored local worker/CRE-batch results prove one real local payment/signature/
  broadcast through three SQL restarts; local indexer reorg removes orphan entities,
  and owned local restart/lag preserves existing data. These do not prove hosted
  provider interruption or a real Monad reorg. Local app restore verifies 13 tables/
  141 rows; historical indexer restore verifies 16 tables/45851 rows; AES-GCM recovery
  is byte-exact. Remote upload/retention flags remain false. Those checks were reviewed,
  not rerun. Explorer prepared-input evidence explicitly says upload false.
- Completed portions leave Secondary; current release checks cease to be an open
  checkbox. Real-device/accessibility, additional live failure/invitation cases,
  positive hosted CRE, newest provider records, explorer upload, optional mail and
  remote retention remain pending. Stale runbook rollout tasks are corrected.
  This continuation changes documentation/private read-only helpers only; earlier
  132 application/49 contract checks are retained without a new suite claim.
- Documentation whitespace/relative links pass; final source scan passes 247 files/
  nine configured secret checks, with no findings. Private current-return evidence
  is retained mode600 and excluded from tracked source.

## 13 October — requested 12 October plan inspection

- Same-block canonical factory registry audit at 70668731 checks all four plans,
  schedules, lifecycle, per-installment outcomes and current previews. There are
  zero eligible settleNext/expireNext/closeFunding actions. Two original small
  cases are Closed with Cancelled outcomes; both active plans are NotDue.
- Original installment zero is due 12 October 2026 at 03:48 IST and is already Paid.
  Envio event lookup yields the canonical successful receipt at 04:00:42 IST.
  Receipt/block identity, exact due/grace, PaymentSettled amount/index/split and
  one complete transfer from the plan to immutable payee verify 150 FBTEST own/
  zero backup. Its next due installment is November. No receipt/hash/account/label
  is logged; private sanitized audit is ignored .tools/hosting/plan-schedule-audit.json.
- Fresh protected operations is healthy, with successful 11:15 UTC scheduled
  heartbeat, one confirmed job, no overdue/unresolved broadcasts and measured
  four-block index lag. No financial call, signing or submission occurs.
- Sixteen technical source paths are verified with git cat-file in the already
  published 5d68f55 revision. Source links/descriptions/role steps are prepared in
  bounty-engineering-notes.md. Portal forms/videos/submission are not performed.
  No tracked application/contract code changes in this follow-up; the prior
  132 application/49 contract checks are retained, not claimed rerun for docs.
- `pnpm scan:source` passes 247 files/nine configured secret checks with no findings.
  `git diff --check` and documentation relative-link checks pass.

Completed items leave Primary; the uncompleted useful hosted CRE run is explicitly
deferred under the user's no-waiting instruction. This is not full bounty completion.

## 13 October — engineering-only CRE continuation

- `pnpm check` passes 132 application tests and 49 contract checks, with root
  typechecking, formatter/lint and regenerated typed ABIs. Initial sandboxed check
  had 131 passes/one loopback EPERM in the existing relay test; the authorized
  loopback-enabled rerun passes all 132. No application failure is inferred from EPERM.
- `pnpm cre:test` passes all five SDK workflow checks; `pnpm cre:typecheck` and
  `pnpm lint:app` pass. Explicit strict checking of the two touched scripts with
  NodeNext/allowJs passes after typing signal names and undefined dotenv values;
  root tsconfig does not include scripts. No web/UI source changed.
- `pnpm test:cre-batch` passes on isolated loopback Anvil plus persistent SQL reopened
  three times. Strict production CRE batch validation/coordinator accepts one real
  eligible contract job; repeated ack before/after payment leaves one job and a
  second worker processing call finds nothing. Actual 150 FBTEST payee balance and
  PaymentSettled amount/index/split match 100 own/50 backup. There is one signature,
  one broadcast and six duplicate-free receipt notifications. Pre-broadcast outage,
  lost broadcast response and interrupted notification ack recover. This test uses
  disposable chain ID 10143 for strict payload compatibility, not public Monad,
  hosted Envio or the actual CRE CLI. Initial sandbox loopback EPERM was rerun with
  authorized access. The separate original 31337 `test:worker-chain` also passes.
- `pnpm test:local-chain` passes the unchanged deployed-contract lifecycle, exact
  splits/refunds, cap recovery, late expiry refusal and competing-worker case.
  Existing block-timestamp lint advisories remain; no new contract source changed.
  The local CI workflow now includes `test:cre-batch` after local-chain; its remote
  execution has not been run or published in this continuation.
- Actual hosted `cre:simulate` scans four plans/accepts zero/skips zero with CLI exit
  0. New `cre:execute` repeats that real result and exits 2 as intended; workflow
  verified true/useful enqueue false/payment receipt false. No currently eligible
  plan is invented. Archive has one sanitized mode-600 run, with count/flag evidence
  only. Regression tests cover empty/stale, contradictory/missing/oversized counts,
  failed CLI and consistent non-empty results; these fixtures are not live work.
- Fresh `chain:verify` passes configured Monad Testnet ID 10143, token/factory runtime
  and immutables at 70646512. Fresh active onboarding snapshot preserves exact terms,
  canonical publication, own 0/reserve 10000000/used 0/paid 0. No signing/submission.
- Hosted Envio verifies four plans/27 canonical receipt events and exact historical
  accounting at 70646687/source 70646689, measured two-block lag. Runtime operations
  is healthy with successful hosted heartbeat, one confirmed job, zero overdue and
  zero unresolved broadcasts. Public health 200 reports account/database/RPC/Alchemy/
  indexer/deployment/sponsorship readiness; anonymous plans returns 401. Netlify
  release 5d68f55 remains ready; masked secret readback is not provider evidence.
- `pnpm scan:source` passes 246 files/nine configured secret checks, no findings.
  Private rows/contacts/credentials and raw provider outputs remain ignored. No
  application deployment, hosted configuration, accepted terms or worker journal changed.

Phase 5's actual useful hosted CRE run remains pending until legitimate eligibility.
Local batch success does not replace it. Phase 7 entry/demo/ongoing availability is
user-managed under the latest instruction; no competition/bounty completion claim.

## 12 October — submission release checks and backed-up migration

- Fresh pnpm check passes129application/49contract checks. Actual local-chain
  lifecycle passes exact splits/returns, cap recovery, late refusal and worker race.
- Actual worker gateway passes one settlement, durable pre-broadcast identity,
  lost response and notification recovery through three SQL restarts. CRE types
  and five SDK tests pass. These are controlled local checks, not new live payments.
- Production web build, types, lint and client-secret scan pass. All13browser checks
  pass with an owned server/new disposable DB, without starting the old local worker
  or modifying retained metadata. Final rebuild includes the new readiness flag.
- Fresh configured Alchemy chain/runtime/immutables check passes at block70440116.
  Optimized live snapshot/summary match independent canonical reads at their pinned
  block:6/4requests and591/331ms at one observation; no signing/submission.
- Direct hosted-backup TCP connection times out; its HTTPS SQL probe also times out.
  Signed-in Neon SQL console succeeds. Single-statement snapshot export restores
  all12tables/145rows into a disposable local DB, preserving full timestamp values;
  AES-GCM decrypted bytes match exactly. Raw export/backups remain private and ignored.
- Guarded migration0009 commits. Fresh readback shows heartbeat present, migration
  recorded, app SELECT/INSERT/UPDATE granted, request DELETE blocked and schema CREATE
  blocked. Private visual evidence is retained. This is an additive schema change.
- RPC secret setting is accepted, with other credentials/worker state preserved.
  First readback check incorrectly expected an unmasked value and failed; official
  Netlify secret semantics explain the masking. Runtime/provider/repeated-read and
  new-user invitation verification remain pending the source deployment.

## 12 October — read-only judge-readiness assessment

- Public hosted landing page loads in the browser. Signed-in Chrome owner Home,
  active-plan view, global Activity and indexed plan Activity are inspected.
- Hosted /api/health returns accountsConfigured/databaseConfigured/databaseReady/
  rpcReady/indexerConfigured/deploymentConfigured/sponsorshipEnabled all true.
  Those readiness flags do not establish reliable complete contract snapshots.
- Home refreshes intermittently report unavailable chain information for different
  plans; the active plan also alternates between unavailable and actual100FBTEST
  owner allocation/300FBTEST reserve. Unavailable reads disable financial controls.
  This is a remaining hosted usability issue, not a claimed resolved failure.
- Plan Activity displays the real150FBTEST first payment,150own/0backup, plus
  funding/activation history. Global Activity includes payment and previous returns.
  This inspection is not a new canonical receipt reconciliation or transaction.
- Native Chrome confirms another prepared account is connected. The user confirms
  all three accounts and supplies a screenshot. The connected browser tools expose
  inconsistent profile coverage; no complete three-role journey is claimed.
  Native navigation/reload of that account did not yield a usable Home view during
  this inspection; its original landing URL is restored. Do not infer an app root
  cause from this tooling-limited result.
- Initial sandbox chain:verify fails with HttpRequestError. The network-enabled
  read-only rerun passes at2026-10-12T15:20:30.794Z, chain10143/block70431696,
  assetVerified=true/deploymentVerified=true. No raw provider error or URL is logged.
- Existing application/contract/browser suite results retain their recorded scope;
  they are not rerun by this assessment. No financial action, migration or release.
- Source scan passes246files/9configured secrets with zero findings; documentation
  diff whitespace check passes. Neither is an application journey test.

## 12 October — documentation and local graph verification

Updated progress/HANDOFF from the existing hosted results without rerunning service
or financial checks. Code-only Graphify extraction and no-label clustering succeed:
837nodes/2012edges/48communities. Current corpus comparison finds no excluded parsed
sources; direct hosted worker/function reads validate the focused call relationships.
Diagnostics retain4self-loops, with0missing/dangling endpoints or collapsed edges.
Solidity/SQL parsing remains unavailable. Source scan passes231files/6configured
secrets with no findings; git diff --check passes. Application/contract suites were
not rerun for these documentation/derived-artifact changes.

## 12 October — final hosted checks

Production health returns200 with database/RPC/indexer/account/deployment flags true.
Anonymous plans return401; authenticated scheduler health returns1confirmed job.
Actual hosted reload preserves3plan links; authenticated Activity displays10real
history rows without outage. UI completeness stays unknown for the compatible hosted
schema; actual provider metadata independently shows2-block lag.
Human explicitly approves permanent duplicate2f8cfc0 deletion; exact confirmation
is submitted and provider completion verifies deployment not found/removal from
active list.978c44e is preserved.

## 12 October — final cloud indexing and app connection

-978c44e real CI38225443546 passes. Root codegen/types and unchanged shared handlers
  retain the verified deployment/start/rollback/history settings. HyperSync catches
  up in approximately1minute, replacing the very slow forced-RPC backfill.
- Actual GraphQL reports3plans/29events, processed70357291/source70357293. Same-height
  lifecycle/own/reserve/used/paid agree with all3contracts.23plan timeline receipt-log
  identities, timestamps and numeric splits match canonical chain receipts. Three
  actual backend history reads pass. No local Hasura secret is forwarded.
- Native production deploy6acca0f563507c7fa760b260 is ready with the verified reader.
  Static production alias is not included in Free; no upgrade is selected. Auto-deploy
  is disabled so final documentation does not create redundant indexer instances.

## 12 October — resumed hosted runtime verification

- Privy public iframe policy initially excludes the Netlify origin, explaining the
  failed handshake. Human adds the exact allowed origin; policy now permits it.
  Actual hosted sign-in and Home display all three preserved plan links.
- Native scheduled trigger completes22:15:26UTC in241.89ms. First due job retries
  before signing, then commits its exact bytes/hash/nonce and submits. Fresh canonical
  RPC verifies successful installment0/150FBTEST, own150/backup0, immutable amount/
  payee, complete token transfer, own-first and exact grace. Hosted authenticated
  queue health returns1confirmed job; no replacement nonce/signature is created.
- Direct local Neon TCP checks now time out; hosted health still has DB/RPC ready.
  Receipt check explicitly uses the previously captured exact journal plus fresh RPC;
  it does not misrepresent a new direct SQL read. Initial direct verifier fails on SQL
  connectivity; the successful helper uses proper grace conversion and the separate
  immutable payee getter. No stored value was modified.
- Envio39e1bf8 build succeeds4m31s, but runtime handler typechecking fails because
  its project config omits root-generated declarations.2f8cfc0 fixes both TS contexts.
  Cold handler types with local declaration temporarily absent, root types and real
  CI38222196779 pass. Actual corrected cloud startup/sync remain pending.

## 12 October — actual hosted app and state-preserving worker cutover

- Core pnpm check passes107app/49contract checks; actual local-chain integration,
  focused worker lint/types and local function bundling pass. No contract edit.
- Real GitHub203fcd6 and3525676 checks pass, including native Linux dependency/core/
  local-chain/web/CRE/static-analysis checks. Later config/doc commits are recorded
  only when their own checks complete.
- Final owned-web/worker quiesced snapshot/disposable restore passes12tables/141rows
  at21:52:06UTC; exact existing-Neon comparison passes21:54:09UTC. Timestamp equality
  uses full-precision SQL; other fields compare by primary key. TLS certificates and
  limited-role transactions/advisory locks pass. Approved setup cleanup is granted;
  transaction-request DELETE remainsfalse. 39existing identities are preserved.
- Native Netlify Next.js adapter5.16.2 deploy succeeds. App/health return200; health
  databaseReady/rpcReady/accountsConfigured/deploymentConfigured=true. Anonymous
  /api/plans returns401 SIGN_IN_REQUIRED. Privy dialog opens; human sign-in and
  fresh hosted sponsor/financial journeys are not yet observed.
- Worker-enabled deploy6acc07c5a3371bdb3ffa42c7 is ready, Node24, with authenticated
  background execution and15-minute schedule. Actual invocation202 completes in
  4102.93ms without errors. No currently due payment receipt is inferred from it.
- Root Envio cloud config codegen, cloud-handler typecheck and whole-source types
  pass. Source scan231files/6configured secrets has no findings; diff check passes.
  Development project creation succeeds; cloud indexing/GraphQL remain pending.
- Private indexer snapshot preserves16tables/45851rows and verifies checksum;
  disposable restoration is not tested and is not claimed.
- Read-only chain:verify passes actual10143/asset/runtime/immutables at22:11:03UTC.

Initial raw .next publication served404 until the adapter was explicit. Runtime
builds failed on a public RPC falsely marked secret; an ignored update was detected,
then public RPC/app ID were recreated and verified. Actual secret scanning stays on.
Offline Netlify dry-run fails stack overflow. Initial backup/CLI-mint/restore-path/
timestamp-parser failures are resolved as recorded in decisions/HANDOFF; they are
not substituted with claimed passes. No private rows or credentials are emitted.

## 11 October — free hackathon hosting evaluation

- pnpm chain:verify passes at17:35:58UTC: actual chain10143, six-decimal FBTEST runtime
  and factory bytecode/immutables. No transaction is submitted.
- Read-only Vercel API returns selected Hobby plan. Netlify CLI status gives no
  usable authenticated JSON account; no project is deployed.
- Google CUA inspection shows unapplied monthly credit, overdue identity verification
  and expired free trial; no form/upgrade is submitted.
- Docker web compilation finishes with existing optional-provider warnings, TypeScript
  completes and10pages generate. Build is cancelled before trace/image completion
  after hosting scope changes (exit130). No completed build or container smoke pass.
- netlify.toml is readiness configuration. Native adapter build, bounded worker,
  hosted database/indexer and laptop-off journeys remain open. Application/contract
  code is unchanged; previous suites below are historical, not rerun here.
- Source scan passes225files with no configured-secret/private-artifact findings;
  git diff --check passes. TOML parses with the bundled Python runtime. The initial
  system-Python attempt lacked tomllib and did not pass; bundled retry succeeds.

## 11 October — secure invitations and first-time onboarding implementation

- Final pnpm check passes102 application tests and49 contract checks; strict backend
  types, formatting, contract lint and generated ABIs pass. Final targeted invitation
  and signed HTTP tests pass24 checks. No contract implementation changes.
- Real PostgreSQL migrations through0008 pass in disposable databases. Competing
  first-time claims bind one canonical account; competing replacements yield one
  new invitation. Claim/revoke and claim/decline races produce one terminal state.
  A claim deliberately queued behind a plan lock across expiry is rejected with
  no destination binding or membership mutation.
- A controlled local HTTP server accepts a fixture message then drops its response.
  Three concurrent retries preserve one body/key, perform two total HTTP calls,
  and record one provider-accepted outcome. No request reaches an external email
  provider. Unit fixtures also cover422 rejection, throttling, retry age, revocation,
  wrong accounts, unverified/forged email and immutable destinations.
- The additive migration preserves all39 transaction requests and existing plan
  terms. Read-only before/after probes report the original active own250/reserve300,
  paid0/used0, first due11Oct22:18UTC; completed B retains zero claims. No signing,
  financial submission, replacement financial request or settlement enqueue.
- Private backup/restore verifies141 exact rows in11 tables before migration and
  12 afterward. Restores use new disposable databases, never the application database.
- Local-chain lifecycle/split/refund/cap/expiry/race checks pass. Configured Monad
  chain:verify validates test asset/runtime/factory immutables. This remains the
  existing RPC, not a completed Alchemy integration.
- Production build, web types, app lint and client/source secret scans pass. All13
  browser tests pass, including isolated actual-component invitation preparation,
  reload, revoke/replacement, account return/token recovery and decline; Axe and
  mobile overflow checks cover these fixture states. Provider sign-in entry is
  tested without entering credentials. Fixtures cannot create live app balances
  or provider receipts.
- Actual signed-in Chrome reloads the rebuilt Home with all three existing plans,
  displays address-free new-person setup guidance and returns to Home with the same
  session. No draft fields are edited/saved and no OTP, membership or financial
  authorization is submitted in this inspection.

Initial tests needed sandbox permission for loopback sockets; the permission-enabled
suite passes. Initial chain verification raced a Foundry artifact rebuild; sequential
verification passes. An initial browser run served old HTML with new build chunks;
owned web restart restores all public/PWA checks. The isolated manager fixture also
needed its own page heading; that fixture correction passes Axe. Existing optional
Privy/Farcaster/Solana and viem/Tempo warnings remain.

Actual first-time Privy signup/account creation and real email-provider delivery,
failure or mailbox receipt remain unverified. A verified sender, server credentials,
owned reachable HTTPS app and authorized recipients are still required. No external
email is sent, no full app is published and no user OTP/financial confirmation is
performed by the agent. See sanitized secure-invitations.json and HANDOFF.md.

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

## 12 October — sequential remaining-work verification

Task 1: `vitest run packages/backend/src/invitations.test.ts` passes 12 tests,
including shared clean-HTTPS sender readiness. Actual new Privy account and external
email delivery remain pending; local sender credentials are absent. No email sent.
Task 2: `vitest run packages/chain/src/client.test.ts` passes four controlled
429/503/timeout/endpoint tests. Whole-source typechecking passes. Sandboxed
`chain:verify` cannot reach RPC; authorized network retry passes at block70368511
(chain10143, token runtime/decimals/symbol, factory runtime/immutables). No Alchemy
credential is configured; this is public-RPC evidence only.
Task 3: three receipt/backend/HTTP suites pass64 tests. Initial live receipt check
fails with the project-local DB stopped; only that existing DB is restarted, leaving
local web/worker stopped. Pending-request reconciliation passes with zero unresolved
local requests. Hosted Chrome owner Home shows three real plans, zero claims for
completed A/B and an unknown snapshot for the original; plan history shows ten real
B events and unknown coverage. Money controls disable while current reads fail.
Broader account/sponsored failure flows require human sessions and fresh consent.
Task 3 completion of historical read-only verification: all38 preserved confirmed
account actions match provider wallet/sponsorship and canonical expected events.
No signing/submission. Task 4: actual deployed local-chain suite passes splits,
rounding/returns, blocked-cap recovery, late expiry and worker races. Fresh canonical
check of captured hosted installment journal passes150000000 own/0support and all
transfer/window/identity assertions. Repaired current readiness passes: original
own100000000/reserve300000000/paid150000000/used0, outcomes[1,0,0]; A/B closed with
zero remaining attributed funds/claims,39request identities unchanged. Local queue
is not the hosted journal. Task 5: sixteen focused indexer/notification/experience
checks pass. Hosted reader verifies processing70370404/source70370406 against fresh
RPC70370408 (4blocks). Three plans/23canonical plan events reconcile. A transient
TypeScript narrowing error in the hosted parser is repaired; source types pass.
Task 6:12focused worker/heartbeat/operational checks pass, including stale lease
fencing, stale heartbeat completion, private aggregate diagnostics and dropped/
underpriced identical-byte backoff. Migration0009 generated locally; not yet applied
to hosted DB. Hosted restart/interruption and monitoring activation remain pending.
Task6 actual worker-chain initially fails a fixture timing assertion after stronger
pending backoff. The driver now schedules reopen checks using persisted nextAttempt;
rerun passes one actual settlement, one signature/submission, three SQL reopenings,
receipt/notification interruption and six idempotent messages. Backup/disposable
restore passes12tables/141rows before local migration0009. Migration applies locally
only; real PostgreSQL verification through0009 and heartbeat fencing passes.
Task7: CRE types/five SDK tests/WASM build pass. Discovery/environment tests pass5;
scheduler loopback test initially fails sandbox EPERM, then its authorized rerun
passes1. Actual CLI hosted simulation succeeds3scanned/0accepted/0stale. No positive
payment or network workflow deployment is inferred.
Task8: full check passes123application tests/49contract checks before later snapshot
optimization. Web types/lint pass; production build passes with existing optional
Privy Farcaster/viem Tempo bundling warnings. Three snapshot tests pass, plus actual
Monad Multicall3 factory/token verification and same-block Alchemy comparison.
Client artifact scan passes. Envio replay/rebuild passes. Current private Alchemy
chain/deployment check and captured hosted payment receipt recheck both pass.
Final available checks: pnpm check passes129application/49contract checks. Web types
and app lint pass. Browser suite passes13checks (six isolated actual-component
journeys plus seven public/HTTP/PWA checks), distinct from live account actions.
Actual Envio disposable-chain reorg rollback passes. Envio production codegen/types
are restored and pass after fixture replay. Owned local restart verifier fails its
preflight because no marker-owned indexer is running; no owned service is stopped
or restarted and no fresh local restart pass is claimed.

Operating safeguards: current local snapshot/exact app restore verifies13tables/
141rows. AES-GCM seal/open tests and scheduled health diagnostic tests pass8checks;
actual encrypted application/indexer bundle decrypts byte-exactly with authenticated
hashes. Indexer data is the retained11October22:01UTC historical snapshot, not a fresh
hosted export. No remote backup upload or schedule is enabled. Explorer standard JSON
uses exact compiler0.8.30/settings/source hashes and recompiles all three runtimes to
the selected artifacts; constructor inputs for token/factory are prepared privately.
No explorer source upload or new hosted release is performed.

New indexer restore helper initially exposes fixture ABI path, safe NUMERIC JSON
representation and BYTEA parameter serialization issues in disposable databases.
Repairs preserve integer exactness, decode binary bytes before insertion and compare
canonical SQL representations; each failed attempt is recorded as failure, never a
restoration pass. Source/client secret scanning now covers the private RPC URL/key
suffix and backup encryption key. Nine configured private values/245source files
pass the scan before the explorer helper addition; final count is recorded separately.
Indexer restore final outcome: passes16tables/45,851rows with exact database values,
checked safe integer export representations and one serial sequence reset. BYTEA
inputs are decoded before parameter binding; timestamps compare through full-precision
SQL casts rather than JavaScript Date conversion. Only newly created disposable DBs
are modified/dropped; the retained snapshot and existing indexer remain unchanged.
Final source/client scan passes246files/9configured private values, no findings.
All three account connections are confirmed by the user's screenshot/native windows;
no repeat sign-in is needed. Broader fresh financial/role-recovery checks remain
manual, and no new onchain account action was signed/submitted in this session.
Final production build succeeds, including service worker/page generation, with the
recorded optional Privy/viem warnings. Final client-artifact scan and app lint pass.
Explorer constructors for all three registered plans are prepared from same-block
immutable reads at70424620; standard JSON still matches all selected runtimes.
Final graph refresh produces875nodes/2153edges/52communities with no semantic calls;
parser gaps remain explicit. No new hosted release, remote backup, email delivery,
explorer upload or user financial signature/submission is claimed.
