# Remaining live verification procedures

The latest scope prioritizes reliable judge use and a few testers. These nine
procedures retain the broader verification backlog; their entire completion is not
a submission prerequisite. Use the submission target in progress.md to select the
essential hosted journeys. Optional invitation delivery, future original-plan
installments, extensive failure campaigns and scheduled remote backup retention
can remain explicitly deferred. CRE/Alchemy evidence depends on the bounties
actually pursued and the current official requirements.

These procedures require the real provider/account or actual due time. Local fixtures
prove implementation behaviour only. Keep raw receipts, account/contact data and
provider output in ignored private evidence; record only sanitized outcomes in docs.
Do not enter credentials in chat, source, browser URLs, or terminal output.

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

In the Alchemy dashboard, create/select a free app for Monad Testnet (chain 10143).
Set its HTTPS URL privately as MONAD_RPC_URL in the project and hosted server
configuration. This variable must never be NEXT_PUBLIC_*; retain Privy for accounts
and sponsorship. The official testnet host is monad-testnet.g.alchemy.com; use the
key-bearing URL only in secret configuration. Do not change CHAIN_ID or deployments.
Run `pnpm chain:verify`, `pnpm verify:live-actions` and `pnpm verify:indexer-live`.
Record chain/runtime/immutables, canonical receipts, and dashboard method counts
for the matching verification period as evidence of actual Alchemy requests.
Use local controlled transport tests for timeouts/429/503; do not exhaust live quotas.
Private Alchemy URL is verified locally and adopted by hosted release 66f5e9f.
Hosted health confirms alchemyConfigured and rpcReady. Repeat actual Home/plan reads
and new-action receipt reconciliation before claiming full judge readiness.

## 3. Accounts and transaction recovery

Use separate Chrome profiles for owner, supporter and payee. Sign-in codes and
account recovery stay with the account holder. On a freshly consented disposable
FBTEST plan, record the plan/request identity privately before each action.

- Verify each role's Home, People, funding and return controls; another account must
  not see private labels/drafts/requests. Sign out and switch accounts on the same
  browser, confirming private cached data and unfinished amount input are cleared.
- Owner/supporter: obtain only the test tokens needed, review the exact permission,
  authorize it, reload, and then review the separate deposit. Permission alone must
  leave plan funding unchanged; reload must restore only the exact current allowance.
- Dismiss/reject an authorization, interrupt a challenge, and allow one challenge
  to expire. Reopen the same stored request and use Check status before retrying;
  verify unchanged destination/amount/request ID and at most one deposit event.
- Reconnect after submission; a missing hash stays unresolved until provider/RPC
  proof. Never use elapsed time or a token balance as permission for a fresh request.
- Claims: review/authorize once, reload and check canonical status. A second attempt
  must show no remaining claim and cannot create a second transfer.

Controlled provider errors and SQL/browser fixtures do not prove live failures.
Do not deliberately exhaust sponsorship or alter existing provider records. Record
only actual observed live rejection/revert/outage outcomes, separately from fixtures.

## 4. Live conditional lifecycle

The original three-installment plan's immutable first due is 12 October 2026
03:48 IST; its later dues follow its actual onchain interval. Do not fast-forward
Monad or alter its terms. After each due, reconcile the canonical receipt, exact
150 FBTEST payee transfer and own/support split. Its starting allocation was250
FBTEST and backup300; expected paid splits are150/0,100/50,0/150 if those installments
settle within their exact windows and no new owner allocations occur.

Use separate freshly consented test-only cases for blocked-cap/within-window top-up,
after-expiry refusal, cancellation and natural closure. Use at least two supporter
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

The reader supports local FallbackSync and hosted chain_metadata, joining the
watermark and history in one GraphQL page response. Lag is measured against current
chain reads; invalid/missing metadata remains unknown. Deploy the reviewed source
to the existing app before expecting this local change in the hosted interface.

For each fresh live lifecycle event, compare timeline amount/splits/log identity,
frozen supporter contributions/prefix/entitlement and canonical receipts. A future
plan event cannot prove index completeness. During GraphQL failure the timeline must
be unavailable/unknown while current financial reads still govern actions. Controlled
reorg fixtures now demote orphaned receipt notifications and restore a canonical
re-mined event without duplicate IDs. Real testnet reorgs are not induced or claimed.
No live Envio restart/release is triggered by local verification; keep its sole
approved release and automatic deployment disabled to conserve free indexing hours.

## 6. Worker and operations

Local code now includes heartbeat migration0009, aggregate private operational
health, stale-lease fencing and bounded retries of identical signed bytes. Apply
that migration/grant to the active hosted metadata DB before deploying the worker.
Keep the existing signer and sole active state store. Use the recovery runbook in
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

Local Multicall3 reads reduce Home/plan RPC work while preserving same-block
fail-closed amounts. Hosted app needs reviewed source rollout before using them.
Current braces advisory has no published patched release; the tested local depth
guard remains and the advisory stays visible in security.md.

## 9. Hosted safeguards and final rollout

All three account sessions are prepared; their connection is visible in the supplied
screenshot and native Chrome windows. Sign-in readiness is no longer a dependency.
Use the role/lifecycle procedures above for the remaining fresh financial actions.

Before deploying these local changes, take a fresh private hosted application
snapshot. Apply migration0009 to Neon with its schema owner, and grant only
SELECT/INSERT/UPDATE on worker_heartbeat to the existing application role. Preserve
financial request/job identities, all existing terms and signer; do not run the old
local worker. Replace Netlify's server-only MONAD_RPC_URL with the verified private
Alchemy Testnet endpoint and classify it as a secret. Roll out reviewed source to
the existing app/worker; keep Envio automatic deploy disabled. No paid upgrade or
recharge. Do not alter deployed contract bytecode or immutable settings.

After the first successful updated batch, enable HEALTH_MONITOR_ENABLED=true.
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

Submission gates: successful applicable checks for the exact rolled-out revision,
hosted new-user invitation and ordinary role financial/recovery journeys, reliable
chain reads, useful payment/history evidence, and judging-period service availability.
Take a fresh hosted backup before migration. Positive CRE receipt evidence is a
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
pending. Constructor arguments for all three current registered plans are now prepared from
same-block immutable reads. Newly created plans require their own fresh inputs.
