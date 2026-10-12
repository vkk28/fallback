# Fallback handoff — 12 October 2026, Asia/Kolkata

## Task, authorization and source

Latest user scope supersedes completing all nine backlog sections as a submission
gate: make the hosted app reliable for judges and a few testers, without
production-scale operations. User authorizes Chrome verification and confirms three
prepared owner/supporter/payee sessions. Available local work across all nine is
implemented; manual/live/time-dependent gates remain explicitly pending. Prioritize
progress.md's submission target. Account emails/keys/raw rows are not in tracked
docs. No subagents; single writer.

User now requests execution of the major submission issues, clear manual steps when
needed, and continued independent work while they complete those steps. A fresh
account is reported ready; its invitation claim and resulting role still need live
verification. Existing authorization covers the selected public repository/free
Netlify/Neon testnet deployment. No paid service, new recipient email or mainnet work.

Current release preparation: pnpm check129app/49contract, actual local-chain lifecycle,
worker settlement/recovery through three SQL restarts,13browser checks in a disposable
DB, web types/lint/build and client/source scans pass. Optimized Alchemy reads match
independent same-block values:6snapshot/4summary requests,591ms/331ms at one observation.
Fresh chain verification passes10143/block70440116. A credential-free alchemyConfigured
health flag is added for runtime verification; final rebuild is in progress.

Fresh hosted snapshot verifies12tables/145rows in an isolated local restore and
authenticated encrypted recovery. This host cannot connect to Neon's TCP/HTTPS SQL
endpoint; its signed-in project SQL console succeeds. Single-statement read-only
export stays private, including moving the new download into ignored storage.
Migration0009 commits through that console; fresh readback confirms the table,
migration hash and SELECT/INSERT/UPDATE grant, with request DELETE/schema CREATE
still blocked. Netlify accepts the verified Alchemy URL as a secret and preserves
the database, signer, invitation keys and enabled worker. Secret API values are
masked by design. Runtime cutover still requires the pending source deployment.

Fresh read-only Chrome inspection verifies owner Home/active plan and actual
payment/return Activity, but Home and plan reads intermittently show unavailable
chain information. The native browser also confirms another account is connected;
its role journey is not yet verified. Browser-profile tool coverage is inconsistent
despite the user's three prepared sessions. Do not treat that as missing user
sign-in or reset their accounts. Fresh configured Alchemy chain:verify passes
at block70431696, with token/factory runtime and immutable checks. This does not
prove the hosted RPC cutover or resolve its intermittent read failures.
Public hosted health flags are all true, which is separate from complete plan-read
reliability. Native navigation of the other connected account remained inconclusive;
its original landing URL was restored. Source scan246files/9secrets and diff
whitespace checks pass for this documentation-only scope update.

Branch codex/source-stabilization; HEAD01c36c3, published functional source978c44e.
Substantial source/tests/migration/docs changes are uncommitted and unpublished.
Keep changes local and Monad Testnet only. Preserve consented terms, request/job/
nonce identities, exact grace, own-money-first full payments, plan separation,
frozen supporter weights, independent returns and conservation. No new user
financial signature/submission, email, paid resource or contract mutation occurred.

## Implemented and verified locally

- Invitation readiness shares the strict clean HTTPS origin check with encrypted
  preparation. Sender credentials/recipient consent and live new-person claim remain
  absent. Existing three account connections are ready, not a new-account claim proof.
- Shared server/worker RPC transport bounds timeouts/retries and rejects redirects,
  remote plaintext and credential-bearing authority. User-saved Alchemy Testnet
  verifies10143, deployed token/factory runtime/immutables, plan reads and the
  preserved hosted payment receipt. No extra account/sponsorship stack.
- Verified Monad Multicall3 snapshots pin all fields/outcomes to one block and fail
  as a whole. Actual Alchemy snapshot6requests/641ms and summary4requests/422ms match
  independent same-block accounting at that observation.
- All38preserved confirmed account requests match provider wallet/sponsorship and
  canonical expected events. Zero unresolved local requests;39request IDs unchanged.
  Current verifier reflects original own100/reserve300/paid150/used0 FBTEST and
  outcomes[Paid,Pending,Pending]; completed A/B have zero attributed claims.
- Hosted Envio chain_metadata reader verifies measured coverage. Three hosted plans
  and23canonical plan events reconcile; measured lag4blocks at the recorded check.
  Actor-scoped receipt notifications distinguish canonical/orphaned/unavailable,
  restore re-mined events without duplication, and reopen orphaned confirmed requests.
- Worker lease/row locks fence stale completion/preparation. Pending broadcasts
  retain exact bytes/hash/nonce and back off5seconds to5minutes. There is no fee
  replacement or nonce clearing. Migration0009 adds owned-cycle heartbeat; applied
  to the retained local DB only. Private scheduler/operations exposes aggregate
  RPC/lag/heartbeat/job diagnostics; HEALTH_MONITOR_ENABLED gates scheduled checks.
- CRE config now uses the existing hosted HTTPS API. Types/SDK/build and actual CLI
  simulation pass3scanned/0accepted/0stale. Relay secret only is forwarded. Positive
  due-work orchestration is still pending; no native CRE Monad write is claimed.
- Local application backup restores13tables/141rows exactly. AES-GCM authenticated
  bundle verifies byte-exact recovery. Historical indexer export restores16tables/
  45,851rows and one serial sequence into an isolated DB without ingestion. Numeric
  safety, binary binding and full-precision SQL timestamp differences are handled.
- Explorer standard JSON/source hashes/compiler0.8.30+cancun/optimizer200 reproduce
  all three runtime artifacts. Inputs/constructor arguments are private generated
  artifacts; explorer publication is pending. Backup key is private in .env and
  needs an independent protected recovery copy.

## Actual hosted state and ownership

Netlify Free fallbackk.netlify.app serves Next.js/API, authenticated background
worker and15minute trigger. Neon Free holds the preserved12-table/141-row cutover
snapshot with a limited application role and certificate-validated TLS. Envio's
sole Development978c44e release uses HyperSync/shared handlers; automatic releases
are disabled. Free quotas and temporary up-to30day indexer lifetime remain.
Current source deployment is pending. Heartbeat migration is now applied and the
Alchemy URL is saved as a secret; the old hosted runtime has not adopted it yet.
Monitoring remains disabled pending a verified updated batch. Do not restart the old local web/worker
against its independent state store. Retain the existing dedicated signer/journal.
Global Netlify CLI identity is unrelated; use only the project-owned private auth.

The original first installment's canonical receipt remains150FBTEST own/0backup,
complete immutable-payee transfer inside its exact window. Its remaining immutable
30day dues are11November and11December2026,03:48IST, with48hour windows. Future
outcomes cannot be verified early and exceed the temporary demo indexer's lifetime.
Use separate freshly consented cases for earlier positive testing.

## Actual checks and limitations

Final pnpm check passes129app/49contract checks. Actual local-chain lifecycle and
persistent worker/Anvil interruption/reopen tests pass. Real PostgreSQL through0009
and heartbeat fencing passes. Envio replay/rebuild and disposable-chain reorg rollback
pass; production codegen/types restored. Owned local indexer restart verifier fails
preflight because no marker-owned indexer is running; no new restart pass is claimed.
Web types/lint/build,13browser checks and source/client-secret scans pass. Build has
existing optional Privy Farcaster/viem Tempo warnings. Braces advisory still has no
upstream patched release; tested development guard remains. No audit claim.

Browser checks use a disposable DB/isolated UI contexts. Native Chrome/user screenshot
confirms three connected accounts; tab tooling exposes one profile and native
navigation is inconsistent. Requested375px override remained1440px; authenticated
phone/screen-reader/fresh-device flows are not claimed. Public/fixture responsive
checks cover320–1440px. Private evidence remains ignored under docs/evidence/.tools.

## Next concrete gates

Prioritize reliable hosted RPC/plan reads and a tested rollout of necessary local
fixes, with a fresh hosted backup before migration0009. Then verify new-person shared
invitations and ordinary owner/supporter/payee financial/reload/return journeys,
real family-backup payment evidence and useful history, and phone/desktop usability.
Recheck actual scheduling and free-tier/indexer availability through judging. Positive
CRE work and hosted Alchemy evidence matter when claiming those integrations.
Use docs/remaining-verification.md for the selected procedures. Optional invitation
email, waiting for the original November/December installments, extended live
failure campaigns and scheduled remote backup retention are deferred backlog.
Keep the sole indexer release and all free tiers; this assessment performs no
deployment, migration, new consent, payment, email or competition submission.

Graphify is local0.9.79, code-only/one AST worker, no-label clustering. Latest refresh
covers changed source; Solidity/SQL parser gaps and self-loops remain disclosed in
tooling.md. Graph is navigation, never contract safety evidence. Clean up only owned
verification processes/databases; persistent application/indexer data stays intact.
