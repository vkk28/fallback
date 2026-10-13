# Remaining live verification procedures

The latest scope prioritizes reliable judge use and a few testers. These nine
procedures retain the broader verification backlog; their entire completion is not
a submission prerequisite. These procedures belong to progress.md's Secondary
section; its Primary section holds functional submission/bounty work. Optional
invitation delivery, future original-plan
installments, extensive failure campaigns and scheduled remote backup retention
can remain explicitly deferred. CRE/Alchemy evidence depends on the bounties
actually pursued and the current official requirements.

These procedures require the real provider/account or actual due time. Local fixtures
prove implementation behaviour only. Keep raw receipts, account/contact data and
provider output in ignored private evidence; record only sanitized outcomes in docs.
Do not enter credentials in chat, source, browser URLs, or terminal output.

## 13 October evidence audit — completed baseline

The remaining checklist in progress.md now excludes completed portions. Live ordinary
approval/reload recovery, cancellation and independent owner/supporter returns are
verified; fresh closed-plan reads confirm zero claims and conserved accounting.
Current four-plan/27-event Envio history reconciles. Local transport, SQL races,
worker interruption, indexer restart/lag/reorg, CRE duplicate/stale/HTTP/retry and
backup restore/encryption checks are complete at their recorded scopes. Current
release checks are complete; later source changes still require appropriate checks.

Fresh email-bound onboarding is verified, but fresh shared-link return and live
invitation edge cases remain. Real provider/hosted failure campaigns, actual-device
install/update/accessibility, useful hosted CRE work, explorer source publication,
optional external email and remote retention are not completed by those baselines.
The actual 12 October installment is Paid; waiting for the 14 October case remains
excluded from the current engineering pass. Older rollout instructions below are
updated to preserve the deployed 5d68f55 configuration rather than repeat completed setup.

## 1. New-person invitation and optional email

1. Owner: open the hosted app, create a fresh preliminary plan with an unbound payee,
   and copy the payee invitation link. Leave existing published plans untouched.
2. Invitee: open that link in a separate Chrome profile/private window. Use an email
   never previously used in this Privy app and finish the sign-in code yourself.
3. Confirm the invitation survives sign-in and reload, review the requested role,
   then join. Joining binds the canonical account; it does not accept onchain terms.
4. Reload and confirm the same plan/role. A different account opening the consumed
   link must be refused. For an email-bound request, an unrelated verified email
   must be refused before claim. Owner cannot revoke an accepted membership.
5. Owner: on a separate unaccepted request verify revoke, decline and replacement.
   The old link must stop working. Do not change the destination of a bound plan.

Optional email setup: verify a sending domain/identity with Resend. Configure
RESEND_API_KEY, INVITATION_EMAIL_FROM, INVITATION_DELIVERY_KEY (32 random bytes in
lowercase hex), and INVITATION_APP_ORIGIN=https://fallbackk.netlify.app privately.
Retain the encryption key for existing outbox retries. Use a recipient who explicitly
consents to this test. Create one email-bound request with delivery consent and use
its owner delivery control. Record provider acceptance and mailbox arrival separately.
A timeout/429 retry must use the existing invitation, envelope and provider key after
the displayed retry time; never replace an ambiguous send just to retry immediately.
A terminal failure/23-hour retry cutoff requires explicit invitation replacement.
Do not provoke failures by contacting unrelated people or changing a verified sender.

Current result (13 October): human fresh email sign-in, email-bound Home claim,
canonical binding and owner reload persistence are verified. Fresh proposal,
acceptance and publication confirm onchain. Shared-link sign-in return is still a
separate check. Optional sender/key/consented delivery remains unconfigured; no
external invitation email sent.

## 2. Alchemy RPC

Alchemy adoption, secret storage, configured runtime/immutables and repeated hosted
reads are complete on 5d68f55. Retain the existing private MONAD_RPC_URL, network,
deployment and Privy account stack; do not create or cut over another provider app.
Controlled timeouts/429/503 are already tested. Remaining scope is hosted
outage/throttling/slow-read observation and any additional provider telemetry needed
for that observation; do not exhaust live quotas to manufacture failure. Independently
reconcile provider sponsorship records for the newest onboarding actions separately.

## 3. Accounts and transaction recovery

Use separate Chrome profiles for owner, supporter and payee. Sign-in codes and
account recovery stay with the account holder. On a freshly consented disposable
FBTEST plan, record the plan/request identity privately before each action.

- Verify each role's Home, People, funding and return controls; another account must
  not see private labels/drafts/requests. Sign out and switch accounts on the same
  browser, confirming private cached data and unfinished amount input are cleared.
- Dismiss/reject an authorization, interrupt a challenge, and allow one challenge
  to expire. Reopen the same stored request and use Check status before retrying;
  verify unchanged destination/amount/request ID and at most one deposit event.
- Reconnect after submission; a missing hash stays unresolved until provider/RPC
  proof. Never use elapsed time or a token balance as permission for a fresh request.

Controlled provider errors and SQL/browser fixtures do not prove live failures.
Do not deliberately exhaust sponsorship or alter existing provider records. Record
only actual observed live rejection/revert/outage outcomes, separately from fixtures.

Ordinary exact approval/deposit separation, current-allowance reload recovery and
completed zero-claim reload behaviour are verified. The bounded missing-hash lookup
was replayed against a known confirmed operation without clearing its stored hash;
an actual live lost-hash/interrupted-authorization incident is still separate scope.

## 4. Live conditional lifecycle

The original three-installment plan's first payment is verified Paid: due 12 October
2026 at 03:48 IST, complete 150 FBTEST own-funded transfer at 04:00:42 IST. Its future
dues are 11 November and 11 December at 03:48 IST. Do not fast-forward Monad or alter
terms. Reconcile each future receipt/transfer/split when it actually occurs. Current
own/reserve is 100/300 FBTEST; future expected splits are 100/50 and 0/150 only if
payments fit their windows and no new owner allocations occur.

Ordinary open withdrawals, active top-up, cancellation and independent returns are
complete; do not repeat the finished A/B cases. Use separate freshly consented
test-only cases for live blocked-cap/within-window top-up, after-expiry refusal,
partial-backup payments and natural closure. Use at least two supporter
accounts for the exact rounding case:200 and100 FBTEST, unused backup100, final
returns66.666666 and33.333334 under the frozen slot order. Claim in reverse order
and verify zero remaining claims, conserved funding and no double payments.
All signing/consent/funding actions belong to their role accounts; do them manually.
Local-chain time manipulation is fixture evidence only. Failed preflight attempts
must show no transfer; indexer history cannot authorize a payment.

`pnpm verify:functionality --app-origin https://fallbackk.netlify.app` now checks
current original-plan accounting/outcome order rather than assuming zero paid
forever. It reads the retained local metadata copy, not the hosted job journal;
use canonical receipt and hosted-journal evidence for hosted execution claims.

## 5. Envio history and notifications

The deployed 5d68f55 reader supports local FallbackSync and hosted chain_metadata,
joining watermark/history in one response. Current history/accounting and measured
coverage are verified; no reader rollout remains. Invalid/missing metadata stays
unknown. Remaining scope is new future lifecycle events and hosted failure campaigns.

For each fresh live lifecycle event, compare timeline amount/splits/log identity,
frozen supporter contributions/prefix/entitlement and canonical receipts. A future
plan event cannot prove index completeness. During GraphQL failure the timeline must
be unavailable/unknown while current financial reads still govern actions. Controlled
reorg fixtures now demote orphaned receipt notifications and restore a canonical
re-mined event without duplicate IDs. Real testnet reorgs are not induced or claimed.
No live Envio restart/release is triggered by local verification; keep its sole
approved release and automatic deployment disabled to conserve free indexing hours.

## 6. Worker and operations

Heartbeat migration0009/grants, private operational health, stale-lease fencing and
identical-byte backoff are deployed and verified. Local interruption/replay tests
are complete. Keep the existing signer and sole active state store. Use the runbook in
operations.md; never clear a missing/dropped hash or nonce to force a fresh action.

Hosted restart tests require a due freshly consented test plan and its private
journal. Run one controlled interruption after durable signing, resume the same
hosted store, and prove one canonical payment plus idempotent notifications. Existing
local Anvil/reopen tests and the first hosted payment are separate evidence. Check
private scheduler/operations after rollout; it must show a current last-success
heartbeat, bounded job counts, real measured lag and actionable fixed diagnostics.

## 7. Positive CRE orchestration

Config now targets the existing HTTPS hosted API. Build with `pnpm cre:build`, then
run `pnpm cre:simulate --authorized-origin https://fallbackk.netlify.app` at an
actually eligible due time. The wrapper sends only the relay secret, uses prebuilt
WASM/default limits and records sanitized CLI result counts. Two HTTP capabilities
perform bounded discovery and frozen-batch enqueue; the adapter rechecks canonical
RPC state and the independent worker signs only fixed permissionless calls.

Use `pnpm cre:execute --authorized-origin https://fallbackk.netlify.app` for a
positive-work gate. Exit 0 requires an accepted job; exit 2 is a valid empty/stale
scan, while missing/invalid/contradictory results or CLI failure are errors. Each
sanitized run is retained in ignored `.tools/cre-simulation/runs/`; a later empty run
does not erase the earlier observation. Enqueue is still not a payment receipt.
`pnpm test:cre-batch` separately verifies actual local batch-to-payment, retry/replay
and notification recovery on loopback Anvil/SQL. Its chain ID 10143 exercises the
strict schema; it is not a public Monad/CRE CLI/Envio check. Do not use it as a
substitute for the remaining useful hosted run. The ordinary worker can settle first.

To prove positive work, use a fresh consented active FBTEST plan with due work,
record the same batch/job identity across repeated runs and trace its canonical
payment receipt into notifications and Envio. If discovery is empty, record zero
and leave positive orchestration pending. Do not change/fast-forward the original
plan to manufacture eligibility. Induce failures only with controlled fixtures;
HTTP failure must retain the batch/cursor and restart must return the same ack.
CRE network deployment remains optional; actual successful CLI simulation plus
positive useful orchestration is the required evidence.

## 8. Interface, PWA and integrated checks

Use the prepared three role profiles after sharing each Fallback tab with the
browser tool. Check320/375px phone layouts and200%/400% zoom: no horizontal page
scroll, all actions visible, readable amounts/limits/windows, touch targets and
bottom navigation. Use keyboard Tab/Shift-Tab, Enter, Escape for setup, invitations,
funding/recovery dialogs and returns; dismissal must return focus to its opener.
For actual assistive technology verification, use your normal screen reader and
confirm labels, dialog titles, error announcements and chronological schedule.
Automated axe/DOM accessibility checks are separate from that manual result.

Save an unfinished draft; change it in a second tab and confirm stale-version
rejection. Go offline while a review is open: all money actions must disable and no
queued action may replay on reconnect. Install the final HTTPS app using the browser
install control and check offline shell. When a new worker waits, keep drafts open,
save privately, then close/reopen all app tabs to adopt it; no forced skipWaiting or
automatic reload discards a form. Verify request identity again after updating.

Deployed Multicall3 reads reduce Home/plan RPC work with verified same-block
fail-closed amounts. This rollout is complete; actual-device testing remains.
Current braces advisory has no published patched release; the tested local depth
guard remains and the advisory stays visible in security.md.

## 9. Optional hosted safeguards and future releases

Fresh role onboarding and ordinary funding/activation are verified. Future manual
account tests require the relevant human-held profiles; an old connection screenshot
does not establish a current authenticated session. Use the scoped procedures above.

Hosted backup/restore, migration0009/limited grants, Alchemy secret cutover and
reviewed app/worker rollout are complete. Do not repeat them as pending work. For a
future application release, take a fresh private snapshot and apply only its new
migrations. Preserve all request/job identities, terms and signer; never run the old
local worker against its independent store. Keep Envio automatic deploy disabled,
free tiers and immutable deployed contracts. No deployment is needed for this doc audit.

Extended monitoring remains optional and disabled under the current scope. If it
is needed, verify private operations health before enabling HEALTH_MONITOR_ENABLED.
The existing15-minute scheduled trigger checks private scheduler/operations after
scheduling; failure records only fixed diagnostics and fails the native invocation.
Configure native provider notifications manually if desired. This does not send
Slack/email/SMS from the app or silently enroll recipients. Confirm healthy RPC,
measured lag, current heartbeat, failed jobs and unresolved broadcasts in the hosted
runtime before describing monitoring as enabled. Monitoring runs during worker
trigger execution; a missing schedule still needs provider-side failure visibility.

`pnpm db:backup-local` verifies current local metadata into a new disposable DB.
`pnpm db:seal-backup` seals that snapshot together with the retained historical
indexer snapshot, authenticates both and verifies byte-exact decrypted recovery.
Keep BACKUP_ENCRYPTION_KEY separately in protected off-device recovery storage.
The sealed artifact alone is safe for a private backup destination; plaintext
restoration files must remain private. This local encryption test is not a new
hosted snapshot, a remote upload, retention service or scheduled remote backup.
Choose/authorize a private free storage destination and snapshot schedule before
remote backup activation. Retain7daily and4weekly successful encrypted snapshots;
never remove the last known verified backup or the key needed by retained archives.
Restore both app and indexer to newly named isolated DBs first; compare all rows,
sequence positions, indexer watermark and canonical accounting before any cutover.
Rebuilding public index history from the preserved deployment start is also available;
private application metadata must come from its authenticated backup.

Explorer verification: use the saved exact compiler0.8.30/settings/source inputs
from the compiled artifacts/deployment manifest. Verify the existing token/factory
and plan addresses with constructor arguments and compare runtime/immutables first.
If explorer credentials/API access are unavailable, leave explorer-source status
pending. Runtime comparison alone does not prove explorer source publication.

Baseline release checks, fresh email-bound joining, ordinary role financial/recovery
journeys and current payment/history are verified. Future changes still require
appropriate checks and backups. Useful positive CRE receipt evidence is a
bounty priority if CRE is pursued. Optional invitation email, a broad HTTPS
installation/update matrix, scheduled remote retention and extended monitoring
remain broader verification work. Keep each result separate from existing hosted
availability/scheduled payment/history evidence.

The original plan's verified remaining due dates are11November2026 and11December2026,
03:48 IST, each with its immutable48-hour window. These are future network conditions;
this session cannot verify them in advance. A separate freshly consented case may
provide earlier positive CRE/lifecycle evidence without changing that plan.

Explorer inputs: `pnpm contracts:prepare-verification` writes private standard JSON
and token/factory constructor arguments under .tools/explorer-verification after
checking source hashes and recompiling the three runtime artifacts exactly. Use
that input for a manual authorized explorer submission; source publication is still
pending. Constructor arguments for the three original registered plans are prepared
from same-block immutable reads. The fourth/newly created plan needs its own fresh
inputs if source publication is pursued.
