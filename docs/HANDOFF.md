# Fallback handoff — 13 October 2026, Asia/Kolkata

## Scope, authorization and source

The user wants reliable hosted judge use for a few testers, not completion of every
production-oriented item in the nine-section backlog. The latest user requests two
remaining-work sections in progress.md: Primary for functional submission/bounty
work, Secondary for proofs, verification and optional hardening. Prioritize Primary;
do not move receipt/test tasks there merely because they can strengthen a bounty.
Optional invitation email, extended hosted failure campaigns,
remote scheduled backup retention and the original future installments are deferred.
Preserve financial correctness, account isolation and immutable consented terms.
Single writer, no subagents. Account contacts, credentials and raw rows stay private.

The user explicitly approved pushing release 66f5e9f (including 66e0441) to the
existing public vkk28/fallback main branch and deploying the existing free Netlify
app, overriding the local-only restriction for that release. Publication completed.
Follow-up application source 5d68f55 is now published and ready on Netlify; exact
GitHub CI run 38311968272 succeeds. Documentation may advance without redeployment.
Branch codex/source-stabilization. Public app:
https://fallbackk.netlify.app. No competition entry, paid upgrade or mainnet work.

Three small follow-up changes are deployed: serialize operational queue timestamps
as ISO text with an explicit SQL cast; add its real PostgreSQL regression; explain
that draft money can be reserved after creation. Targeted checks, real-driver
verification, web types/lint/build and 13 browser checks pass. Source/index/client
scans pass; credentials, contacts and private backups are excluded.

## Verified release and hosted state

- pnpm check passes 129 application/49 contract checks. Actual local-chain lifecycle,
  cap/top-up/expiry/rounding/returns and worker races pass. Actual worker settlement
  and interruption recovery pass through three SQL restarts.
- Real PostgreSQL through 0009 and heartbeat fencing, 13 isolated browser checks,
  web types/lint/build and source/client secret scans pass. Existing optional Privy
  Farcaster/Solana and viem Tempo build warnings remain; no audit claim.
- Fresh chain:verify passes 10143/token/factory runtimes and immutables at 70440116.
  Actual Alchemy snapshots match independent same-block reads with 6 snapshot and
  4 summary requests, 591ms/331ms at one observation; not a loading benchmark.
- Private hosted snapshot restores 12 tables/145 rows exactly in an isolated DB;
  authenticated encrypted byte recovery passes. Direct Neon TCP/HTTPS SQL from this
  host times out; its scoped signed-in SQL console succeeds. Exports/backups stay
  ignored. Migration 0009 and restricted grants are applied and freshly verified;
  request DELETE and schema CREATE remain denied.
- Hosted health confirms databaseReady/rpcReady/alchemyConfigured/sponsorshipEnabled
  true on 5d68f55. Alchemy is a server secret; masked Netlify readback is expected.
  Existing signer/database/invitation credentials are preserved.
- Corrected protected operations reports healthy=true, no diagnostics, one confirmed
  job, zero overdue jobs/unresolved broadcasts, measured lag 4 blocks and a successful
  21:30 UTC 12 October worker heartbeat. Raw-SQL Date serialization is fixed.
  HEALTH_MONITOR_ENABLED stays false; basic private health and scheduling are verified.

Netlify Free serves Next.js/API plus an authenticated 15-minute trigger and bounded
background worker. HOSTED_WORKER_ENABLED=true. Neon Free holds metadata using the
limited application role and TLS. Envio's sole Development 978c44e release remains
unchanged with automatic releases disabled. Its temporary up-to-30-day lifetime and
free quotas must cover judging. No extra account/sponsorship stack is installed.

Do not restart the old local web/worker against its independent metadata journal.
Only the owned loopback database was restarted for disposable regression checks.
It is stopped again after verification; its data files remain preserved.
A failed browser attempt while that DB was stopped was rerun successfully after
restart; it is not evidence of an application defect. Temporary test DBs/server are
cleaned by their harness. Retain the dedicated signer and exact broadcast journal.

## Fresh hosted onboarding case

New plan label: Judge onboarding test. Terms: one 10 FBTEST payment due 14 October
2026, 09:00 Asia/Calcutta; 7-day interval; 48-hour grace; funding deadline 13 October
09:00; reserve minimum/maximum 10; per-payment backup 10 and 100% coverage. Original
plans remain unchanged; live time is not fast-forwarded.

The human completed fresh Privy email sign-in. A verified-email-bound invitation
replaced an unused private link, with optional email sending disabled. The human
joined through Home Requests; canonical embedded account binding matches the actual
verified identity and accepted membership survives owner reload. This proves fresh
email/inbox claiming; shared-link sign-in return remains separate verification.
The human proposed terms and the owner UI confirmed onchain. The fresh payee then
accepted; owner reload shows Payment acceptance done. Human publication then
confirms onchain and live balances show zero allocation/reserve. Existing supporter
joins an email-bound request; owner invitation status confirms accepted. Human
exact 10 FBTEST allowance is verified onchain before funding, with zero reserve.
The human obtains test tokens and deposits 10; actual reserve becomes 10 and allowance
becomes zero. Human activation confirms onchain; canonical snapshot at 70507523 shows
Active, own 0/reserve 10/used 0/paid 0 and the unchanged accepted terms. Human reports
supporter/payee reloads correct with active support funding/withdraw controls absent.
No new payment or external invitation email is claimed.

Private screenshots and role contacts are ignored. Browser tool exposes the owner
profile; other signed-in roles use exact human instructions. Signing confirmations
remain with the human. Reconcile unresolved requests before a fresh attempt.

## Existing payment, history and scheduling

Original hosted installment remains a verified canonical 150 FBTEST complete
payment: 150 own/0 backup, immutable payee and exact window. Remaining original dues
are 11 November and 11 December 2026, 03:48 IST with 48-hour windows. Future outcomes
cannot be verified early and exceed the temporary indexer's lifetime.

Deployed app includes same-block optimized reads, verified hosted chain_metadata
watermark reader, actor-scoped canonical/orphaned/unavailable receipt notifications
and persistent worker lease/heartbeat fences. Before rollout, three existing plans/
23 canonical events reconciled and 38 confirmed user requests matched provider
sponsorship/expected events. All 39 request identities were preserved. Fresh hosted
Envio verifies four plans/27 canonical events and matching accounting at measured
height 70507401, source 70507403. The app displays creation, support change, frozen
share and activation. Five plan refreshes and three four-plan Home refreshes show
expected balances without unavailable data. One reload locator timed out while
services connected; subsequent visible plan loads correctly. New provider-sponsored
action records have not been independently re-exported/reconciled.

Actual authenticated owner Chrome at measured 375px verifies Home/Account/About/
Schedule/Terms navigation without horizontal overflow. Phone plan/activity layouts
are inspected. Found Netlify's injected badge covering Account/About bottom controls;
disabled it only on this verified project through Netlify's supported Free-plan
setting. Reload confirms no badge and those links work. Browser size is restored.
This is responsive Chrome verification, not a real-device/install/screen-reader pass.

CRE SDK/type/build and actual CLI simulation pass 3 scanned/0 accepted/0 stale.
Positive due-work orchestration is pending; independent worker provides ordinary
liveness. The HTTP/RPC adapter is not a native CRE Monad write. Explorer compiler/
source inputs match deployed runtimes; source publication remains pending.

## Next steps

1. On/after 14 October 09:00 IST, verify the fresh scheduled backup-funded payment,
   canonical split/transfer and Envio/notification history. The existing worker runs
   every 15 minutes, but a future success is not claimed. Preserve these fixed terms.
2. Positive CRE evidence matters for that bounty. Shared-link sign-in return and
   independent provider records for the fresh actions remain broader verification.
3. Keep free-tier/indexer availability through judging. Optional external invitation
   email, remote retention and extensive live failure/device campaigns are deferred.
4. Keep docs synchronized; do not call every live item complete or guarantee no failure.

## Latest documentation and Graphify refresh

Reorganized progress.md into the two requested remaining-work sections. Core feature
gaps are not invented: the primary list covers judging availability, meaningful CRE
execution, sponsor entries and main submission materials. All receipt/recovery/
device/CLI proof work is secondary. README and architecture now explain the hosted
stack and optional local Docker Hasura environment. Docker need not run for judges;
no Docker process, volume, provider setting or deployed application changed.

Used the project Graphify skill and existing 0.9.79 wrapper. Code-only/one-worker
extraction and cluster-only --no-label regenerate JSON/report/HTML: 876 nodes,
2157 edges, 59 communities, zero model tokens. 35 files re-extracted/157 unchanged.
179 code-corpus files include 148 represented source files, with no out-of-scope
source; eight Solidity/ten SQL files lack optional parsers and thirteen data/config
JSON files have no nodes. Four pre-existing self-loops remain; no missing/dangling/
collapsed endpoints. The new operationalQueue function is present. Markdown changes
are outside this intentionally code-only graph. No hooks, uploads or global settings.
Actual source, financial and database checks remain authoritative. Latest docs and
ignored graph artifacts are local; application tests were not rerun for doc edits.
