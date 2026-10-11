# Backend/functionality verification — 10 October 2026

## 10 October — current backend/functionality checkpoint

The previous A/B pending journeys below are historical: both are now Closed, B's
15 requests and independent S1/R0.5 refunds are confirmed, and its ten plan events
reconcile with canonical receipts. Original remains Active,250 own/300 reserve,
paid/used0, first due12October03:48IST. No new financial action was submitted.

Backend core check85 risk/49 contract tests, actual local-chain accounting, real
PostgreSQL races, and production build/five public browser/client-secret checks pass.
Worker durably signs/persists before broadcast, reserves nonces under a DB lock,
recovers one actual local payment after pre-broadcast and lost-response interruptions,
and preserves nonduplicate receipt notifications through three SQL reopenings.
Migration0006 is applied after private backup/exact shadow restoration141 rows.

Eleven actual HTTP-handler tests with locally signed cryptographic tokens verify
recipient/payee/supporter object, notification and request isolation, invalid/expired/
wrong-audience tokens, forbidden roles, foreign origins, account binding changes,
provider lookup outage/reconnection and preservation of outstanding requests during
RPC/indexer outages. These are fixtures, not live provider-session observations.

The large index backlog is eliminated. All three histories/accounting reach fixed
RPC checkpoint69884890 (5/7/10 canonical plan events). Actual disposable-chain Envio
rollback removes orphan payment/closure/shares/instalment/history and processes one
canonical allocation. Live RPC detection edge cases and external notification rollback
remain. B's existing signed-in Chrome read-refresh shows completed history/zero claim.

Remain: live authorization/provider/session/RPC failure observations beyond fixtures,
future due payment, PWA installation/update safety and authorized hosted operations.
No audit, fully completed integration or universal recovery guarantee is claimed.


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


Latest checkpoint:19:48 IST. User explicitly excluded UI/UX work. No cosmetic change
was deployed; temporary preview stopped. No contracts or consented terms changed.

| Check | Actual outcome | Evidence |
| --- | --- | --- |
| Core risk/backend/domain regressions |35 passed | evidence/backend-focused-check.txt |
| Financial contract checks/invariants |49 passed | evidence/backend-focused-check.txt |
| Actual local deployed-chain accounting |Splits/refunds, cap recovery, late expiry and worker race passed | evidence/backend-focused-local-chain.txt |
| Real PostgreSQL |Migrations, rate reset, idempotency, invitation/lease/discovery races passed in disposable DB | evidence/backend-focused-postgres.txt |
| Actual local worker recovery |One150-FBTEST settlement, two SQL reopenings, receipt/notification outages, six nonduplicate messages | evidence/local-worker-verification.json |
| Configured Monad Testnet deployment |Asset/deployment verified | evidence/backend-focused-network.txt |
| Already-confirmed live requests |Expected receipt, sponsorship and wallet identity verified | evidence/privy-live-actions.json |
| Existing B membership action guards |Six forbidden-role actions rejected; requests6→6, no signing/submission | evidence/live-role-guards.json |
| Private history |Original accounting/five receipt events match at index height; behind, A/B not indexed yet | evidence/indexer-live-reconciliation.json |

The role-guard checks exercised internal handlers with existing records, not new
authenticated HTTP requests. Local fixtures are not live Privy sessions. Passing these
checks does not prove every provider failure, scheduled live payment or complete history.

Manual A: recipient0.25 and supporter1 open deposits/withdrawals verified, then empty
ending verified. Ended; own/reserve/paid/used0, all12 stored requests confirmed.

Manual B: exact payee consent, publication and all three memberships verified. Open
for funding; own/reserve/paid/used0. Initial exact allowances are confirmed. Reopening
sessions cleared local form approval state; renewed exact recipient0.25 allowance
has a durable provider identity, sponsorship and broadcast status, but no transaction
hash after1096 seconds at14:18:36UTC. Preserve that request and reconcile it; never
mark it successful/failed from the older allowance or bypass it with fresh funding.

Live B deposits, activation, active top-up, ending and independent claims remain
unfinished. Their final consequential clicks require the human under the existing
automatic review restriction. No current OTP or security configuration input is needed.
Do not repeat actions or reset browser/database state while the approval is unresolved.

Indexer processed69401589 vs RPC69846708 at14:16:29UTC. Catch-up/history and supported
reorg verification remain incomplete. Original plan was not funded/activated/ended
again, and its future scheduled installment was not processed early for testing.

Functional recovery/error matrix and live integration are therefore incomplete;
no claim that the backend works perfectly or that verification is complete is made.

## 11 October — UI coordination endpoints

New private Requests, connected-person visibility, same-block bounded summaries,
preliminary setup and stable newest-first activity paths are covered by the current
90 application checks. Migration0007 preserves old plans and introduces one private
per-actor setup row with version checks. Finalization is atomic and idempotent; it
creates a fresh draft and cannot edit an existing consented plan. Inbox acceptance
uses verified account binding, exact expiry and single-use consumption. No token is
needed in an authenticated inbox request; its digest is not signing authority.

Actual PostgreSQL tests verify competing first saves and inbox acceptance: exactly
one winner for each. PGlite/HTTP checks cover privacy, replay, expiry, cursor ordering,
invalid finalization rollback and duplicate successful finalization. Existing origin,
authentication, rate, action, approval and receipt paths are preserved. Backups now
cover private setup when present and support a pre-0007 snapshot before migration.
There is no external delivery or public contact directory. See [UI verification evidence](test-report.md#ui-verification-evidence).
