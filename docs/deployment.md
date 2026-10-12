# Free hackathon deployment

## Current submission-fix release preparation

Fresh application/contract/local-chain/worker/browser/build checks pass. Hosted
backup verifies12tables/145rows in an isolated local restore and encrypted recovery.
Migration0009 is applied and the restricted heartbeat grant verified, without
changing existing plan/request/job data or the deployed contracts. Netlify now stores
the verified Alchemy URL as a server secret; the enabled worker and other secrets
are preserved. Source deployment, runtime provider verification, repeated hosted
reads and the new-person invitation remain pending. Monitoring stays disabled until
the updated worker completes. Later sections retain historical cutover evidence.

## Actual services

- App/API: https://fallbackk.netlify.app on the verified Netlify Free plan
  (300credits, no saved payment method). Native Next.js adapter5.16.2 serves the
  nested app. Public site returns200; private API requires Privy authentication.
- Metadata: Neon Free fallback-hackathon, PostgreSQL18, direct certificate-verified
  TLS, fixed0.25CU and five-minute suspension. Actual account shows1GB/100CU-hours.
  Exact quiesced12-table/141-row restore passes. Owner credentials remain local;
  limited application connection is stored only in Netlify secrets.
- Worker: enabled Node24 background function with an authenticated scheduled trigger
  every15minutes. One native invocation completes4102.93ms without error; scheduled
  trigger and actual due-payment receipt verification pass:150FBTEST entirely from
  recipient allocation, no backup consumed. Hosted queue reports1confirmed job.
- Indexer: Envio fallback Development project created for vkk28/fallback/main,
  directory., config.yaml. The approved free tier lasts up to30days and has resource
  and inactivity limits. 978c44e runs with HyperSync,29events/3plans and measured2-block lag. Its verified
  release URL is connected to the app; Free has no static production alias.

All selected services are free tiers. No paid upgrade, payment method or auto-recharge
is configured. Quotas still apply; this does not promise unlimited permanent hosting.
Google benefits were not redeemed because the actual account required verification
and its old trial had expired. The user selected this free Netlify/Neon route instead.

## Reproducible configuration

netlify.toml builds pnpm web:build from repository root, publishes apps/web/.next,
bundles netlify/functions and explicitly enables @netlify/plugin-nextjs. Native
framework build is required; publishing a raw .next directory alone produced404.
NODE_VERSION24.19.0/PNPM_VERSION11.25.0 are pinned. Secrets remain server environment
values, never GitHub files or public browser assets. Public Privy app ID and public
Monad RPC are ordinary configuration; actual secret scanning stays enabled.

Set production APP_ORIGIN and INVITATION_APP_ORIGIN to the exact HTTPS app origin.
Use the limited Neon DATABASE_URL, preserved dedicated testnet worker key, Privy
server secret, invitation HMAC key, CRE relay secret and private trigger secret.
Keep HOSTED_WORKER_ENABLED=false until the journal/signer/state cutover is verified.
Optional email delivery remains disabled; no sender or external recipient is configured.

Root config.yaml uses existing schema/handlers/ABIs and the root pinned Envio3.14
manifest. HyperSync handles historical/current sync with the public RPC retained as a bounded
fallback using the verified100-block ceiling. Configured start
69077351 is preserved, preceding factory deployment69077360. Native root codegen
and cloud-handler types pass. Generated runtime/type outputs remain ignored.

## State-preserving cutover and limits

Owned local web/worker were quiesced. Final private snapshot/disposable restore and
exact Neon comparison preserve all accounts, memberships, invitations, immutable
payloads, request identities, notifications and job/nonce state. Source database is
unchanged. At cutover there are38confirmed requests,1legacy failed and zero jobs.
Limited app role permits setup-draft cleanup but no financial request DELETE/schema
CREATE. Do not restart an independent local signer/database after remote writes begin.

The worker scans at most50registered plans and refuses an incomplete larger scope.
It processes at most20existing jobs per batch, retaining commit-before-broadcast
signed bytes, nonce reservation, canonical receipts and notification deduplication.
A15-minute cadence can delay attempts; actual contract due/grace boundaries govern
eligibility. No guarantee or fabricated receipt follows from HTTP202 acceptance.

Application backup verifies exact disposable restoration; local indexer snapshot
checksum is verified but its restoration is not. Hosted sign-in/three preserved plan reads, actual history/accounting/23receipt events
and native scheduled/positive-payment checks pass. Full fresh-device financial and
recovery journeys, remote backup retention/restore and optional email delivery remain
separate product verification work. Envio deployments are manual after stabilization.
Existing consented terms and refund liabilities are preserved.

Primary references: [Netlify functions](https://docs.netlify.com/build/functions/overview/),
[Neon Free](https://neon.com/docs/introduction/plans),
[Envio Development](https://envio.dev/pricing/hosting).

Final production health returns200 with DB/RPC/indexer/account/deployment readiness;
anonymous private plans return401 and authenticated worker queue returns1confirmed.
Hosted reload preserves3plan links and authenticated history loads. Human-approved
obsolete2f8cfc0 deletion completes;978c44e is preserved. No paid static alias or upgrade.

Actual authenticated Activity displays10indexed rows without outage. Hosted schema
has no FallbackSync view, so the app labels coverage unknown; independent metadata
checks measure a2-block lag. No latest-completeness claim is fabricated in the UI.

## Pending local engineering rollout

Current source adds strict invitation sender readiness, bounded shared RPC transport,
same-block Multicall3 snapshots, hosted watermark support, receipt notification reorg
reconciliation, fenced worker leases/heartbeats, private operational health and gated
scheduled monitoring. Migration0009 is applied to the local metadata copy only.
Existing hosted release remains978c44e; source is uncommitted and unpublished.

After a fresh private hosted backup, apply0009 with the schema owner and grant only
SELECT/INSERT/UPDATE on worker_heartbeat to the existing application role. Preserve
all journal/request/nonce/signature identities and the existing dedicated signer.
Cut over Netlify's server-only MONAD_RPC_URL to the privately verified Alchemy
Monad Testnet URL, classified as a secret. Deploy reviewed app/worker source, verify
actual heartbeat/coverage, then set HEALTH_MONITOR_ENABLED=true. The existing
15minute trigger reports fixed diagnostic failures through native invocation status.
Keep free tiers and the sole Envio release; no automatic Envio release is required.

`pnpm contracts:prepare-verification` prepares standard JSON/compiler settings and
constructor arguments privately after source-hash and runtime compilation checks.
Use that package for an authorized explorer source-verification submission. It does
not upload code or change deployed bytecode. Runtime verification, prepared inputs
and successful explorer publication are three separate results.

Remote backup storage, scheduled encryption/retention and fresh hosted isolated
restoration remain unconfigured. Local app/indexer/encrypted restore evidence is
recorded in test-report.md; the indexer export is historical. Manual final gates and
browser steps are in remaining-verification.md.
