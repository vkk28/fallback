# Fallback handoff — 11 October 2026, Asia/Kolkata

## Current task and source

Completed the first execution item: private local source/dependency stabilization.
The baseline is 39da7d3 on main; this handoff belongs to the separate stabilization
commit on codex/source-stabilization. No remote repository or publication. One writer in this checkout. The next
item in progress.md is secure invitations and new-person onboarding, followed by
Alchemy RPC, live recovery, conditional payments, Envio/notifications, worker recovery,
CRE, integrated UI/PWA checks and durable hosting last.

Source scans exclude private configuration, raw historical evidence, backups and
runtime artifacts; the exact baseline index passed. Raw docs/evidence remains local
and intact, with only source-stabilization.json included in Git. Personal machine
paths were normalized. pnpm scan:source scans tracked/new source, and --staged scans
the exact commit contents. It checks configured values/artifact classes, credential
markers and home paths, including binary content; it is not a comprehensive audit.
No hooks or global settings changed. Git commits use an anonymous local identity.

## Implemented changes

Pin decode-uri-component 0.5.0, with a one-line query-string 7.1.3 patch selecting its
ESM default for the existing CommonJS consumer. Remove the obsolete decoder patch.
Frozen-lockfile offline reinstall and installed ordinary/malformed query tests pass.
Production audit reports zero advisories. Full audit still reports one high braces
3.0.3 development-tooling finding; no fixed upstream release is published. Retain
its tested parser/AST depth guards, keep the advisory visible and replace them when
a compatible published fix is verified. Do not claim audit cleanliness.

Hasura retained a source connection inconsistency after PostgreSQL recovered.
A source-only metadata reload restored Plan/watermark queries. graphql-local.ts now
reloads only the existing owned source after credential/ownership checks; it does
not replace metadata or reset data. Actual repaired startup/query/strict health pass.

Production indexer types no longer include the 31337 fixture driver. indexer:verify
now generates fixture types and checks the driver before actual captured-event
replay. Stop the owned indexer during fixture codegen and restart afterward to
restore configured testnet types. Fixture checks and restored production types pass.

## Protected financial and private state

Use Monad Testnet 10143 and six-decimal, valueless FBTEST only; disposable Anvil is
for explicitly separated tests. No contract implementation, deployed immutable,
consented plan term or durable request/provider identity changed.

The preservation probe at 11:43:37 UTC found 39 requests before/after, zero unresolved
requests/jobs and zero eligible registry/indexed candidates. Original Housing test
remains Active with 250 FBTEST own/300 reserve/paid 0/used 0, 12 requests and first due
12 October 2026, 03:48 IST (11 October 22:18 UTC). Do not repeat funding/activation,
cancel it, change terms or fast-forward testnet time. Manual A/B remain Closed;
B has 15 requests and zero owner/supporter claims. Do not repeat completed actions.
No new signing, submission, replacement request or enqueue occurred in verification.
The independent worker is restored for the already-consented schedule; no future
payment is claimed. Native user wallets stay human controlled, including final
consequential browser transaction clicks and authentication-code entry.

Keep both databases, worker key, legacy failed request, wallet/provider identifiers,
credentials and backups. Never reset, sweep, install hooks or publish private source.
No additional account stack, purchases, outbound messaging or hosting authorized here.
The prior scheduler-only tunnel approval does not authorize full-app hosting.

## Actual verification

- pnpm check: 90 application and 49 contract checks; types/fmt/lint/ABIs pass.
- Final dependency regression suite: two pass; source-scan adversarial probes pass.
- test:local-chain: exact splits/refunds, cap recovery, expiry and worker race pass.
- Production build, web types, source lint and client-secret scan pass.
- All 11 browser checks pass, with isolated fixtures distinct from live receipts.
- Actual signed-in Chrome Home survives restart with the three real plan summaries.
- Read-only Privy checks validate all 38 existing confirmed actions, expected inner
  canonical events, wallet binding and provider sponsorship; no new financial action.
- chain:verify validates configured chain 10143, token/runtime and factory immutables.
- Envio typed fixture replay/rebuild/refunds and production handler types pass.
- Existing live indexed histories reconcile against canonical historical RPC.
- GraphQL repaired startup/query/status and modified-script strict types/lint pass.
- Frozen-lockfile offline reinstall passes. Production audit zero; full audit one
  development-only high finding with tested local mitigation, not suppressed.

Initial GraphQL startup failed on its cached connection inconsistency; the narrow
reload fixed it. Initial production indexer types failed on the fixture driver; the
separate strict configurations fix that mismatch. Initial owned indexer startup
failed, then a bounded diagnostic resumed preserved storage and the owned restart
passed. One automatic permission-review timeout was retried successfully.
Existing optional Privy/Farcaster/Solana and viem/Tempo build warnings remain.
New multi-role logins, live due payments, RPC failure matrix, worker delivery/reorg,
CRE positive work, email delivery and durable hosting are later checklist items.

## Runtime and next action

Owned app 3000, PostgreSQL 54329, indexer 9898, dedicated worker and private GraphQL
8080 are restored. Use scripts/local-services.mjs and graphql-local.ts ownership
checks; preserve unrelated listeners. Never use envio stop, migration down or a reset.
The indexer resumed after downtime and remains behind head: historical reconciliation
passes but is not a current catch-up/lag or notification-reorg proof. Local services
cannot maintain uptime when the host sleeps.

Graphify is local/code-only with one worker and no model calls/uploads. Focused
queries were checked against source. The graph/report/HTML were refreshed after
changes; Solidity/SQL parsers remain unavailable. See sanitized evidence for counts
and graph endpoint/self-loop diagnostics; graphs never establish contract safety.

Next: inspect the existing invitation/account/setup paths and implement secure
first-time invitation claims with revocation/decline/replacement. Bind authenticated
canonical accounts before financial consent, retain single-use/expiry/private access,
and keep delivery, membership and onchain consent distinct. Prepare email delivery
without contacting anyone absent explicit authorized recipients/contact consent.
Preserve the original due plan and all existing requests during this work.
