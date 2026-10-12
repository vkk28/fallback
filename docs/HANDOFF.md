# Fallback handoff — 13 October 2026, Asia/Kolkata

## Scope, authorization and source

The user wants reliable hosted judge use for a few testers, not completion of every
production-oriented item in the nine-section backlog. Prioritize progress.md's
submission target. Optional invitation email, extended hosted failure campaigns,
remote scheduled backup retention and the original future installments are deferred.
Preserve financial correctness, account isolation and immutable consented terms.
Single writer, no subagents. Account contacts, credentials and raw rows stay private.

The user explicitly approved pushing release 66f5e9f (including 66e0441) to the
existing public vkk28/fallback main branch and deploying the existing free Netlify
app, overriding the local-only restriction for that release. Publication completed.
Branch codex/source-stabilization has HEAD 66f5e9f. Netlify production is ready on
that exact source; GitHub CI run 38279978230 succeeds. Public app:
https://fallbackk.netlify.app. No competition entry, paid upgrade or mainnet work.

Three small follow-up changes remain local: serialize operational queue timestamps
as ISO text with an explicit SQL cast; add its real PostgreSQL regression; explain
that draft money can be reserved after creation. Targeted checks, real-driver
verification, web types/lint/build and 13 browser checks pass. Prepare a reviewed,
scanned corrective commit and verify its actual hosted rollout.

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
  true on 66f5e9f. Alchemy is a server secret; masked Netlify readback is expected.
  Existing signer/database/invitation credentials are preserved.
- Actual updated hosted heartbeat succeeds at 17:01 UTC 12 October. Private health
  measures indexer lag 2 blocks but reports QUEUE_UNAVAILABLE: raw SQL Date binding
  fails in postgres.js. The local correction fixes this actual driver defect.
  HEALTH_MONITOR_ENABLED stays false pending corrected rollout.

Netlify Free serves Next.js/API plus an authenticated 15-minute trigger and bounded
background worker. HOSTED_WORKER_ENABLED=true. Neon Free holds metadata using the
limited application role and TLS. Envio's sole Development 978c44e release remains
unchanged with automatic releases disabled. Its temporary up-to-30-day lifetime and
free quotas must cover judging. No extra account/sponsorship stack is installed.

Do not restart the old local web/worker against its independent metadata journal.
Only the owned loopback database was restarted for disposable regression checks.
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
exact 10 FBTEST deposit-permission handoff is pending. Deposit/activation/new payment
are not yet claimed. No external email sent.

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
UI read reliability and history still need rechecking.

CRE SDK/type/build and actual CLI simulation pass 3 scanned/0 accepted/0 stale.
Positive due-work orchestration is pending; independent worker provides ordinary
liveness. The HTTP/RPC adapter is not a native CRE Monad write. Explorer compiler/
source inputs match deployed runtimes; source publication remains pending.

## Next steps

1. Complete human owner creation, supporter invitation, separate exact approval/
   deposit and owner activation for the fresh case; verify receipts and role reloads.
   Never sign for the user or duplicate an ambiguous request.
2. Commit/roll out the three verified corrections with truthful docs, verify exact
   deploy/CI and operational queue, and repeat Home/plan/history reads.
3. Verify phone/desktop usability where tools permit. A previous 375px override
   stayed 1440px; no authenticated phone-width pass is claimed. Automated public/
   fixture 320–1440px checks pass.
4. Record actual backup-funded payment/history when due. Positive CRE evidence
   matters for that bounty, not the existing independent worker.
5. Keep progress, decisions, tooling and integration evidence synchronized. Do not
   call every live item complete or promise nothing can ever fail.

Graphify was optional for this release and was not refreshed. Prior local code-only
graph is navigation with disclosed Solidity/SQL parser gaps and self-loops. Actual
source, financial and database checks are authoritative.
