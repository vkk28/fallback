# Free hackathon deployment

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
  trigger and due-payment receipt verification remain separate gates.
- Indexer: Envio fallback Development project created for vkk28/fallback/main,
  directory., config.yaml. The approved free tier lasts up to30days and has resource
  and inactivity limits. Actual cloud deployment/sync/GraphQL connection is pending.

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
manifest. Public testnet RPC uses the verified100-block ceiling; configured start
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
checksum is verified but its restoration is not. Hosted backups, live sign-in/recovery,
cloud history/sync and scheduled positive-payment evidence remain unfinished checks.
Existing consented terms and refund liabilities are preserved.

Primary references: [Netlify functions](https://docs.netlify.com/build/functions/overview/),
[Neon Free](https://neon.com/docs/introduction/plans),
[Envio Development](https://envio.dev/pricing/hosting).
