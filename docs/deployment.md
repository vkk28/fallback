# Deployment status and zero-cost constraints

## 12 October — current implementation checkpoint

User's selected app name is fallbackk, with the prepared production hostname
https://fallbackk.netlify.app. Native deployment is pending. The selected Netlify
team is verified Free (300credits, no saved payment method). Neon Free is verified
$0/month with1GB storage/100CU-hours; fallback-hackathon uses direct PostgreSQL18,
fixed0.25CU and five-minute automatic suspension.

netlify/functions/worker-trigger.ts and worker-background.ts provide authenticated,
bounded15-minute execution. Runtime checks actual Monad10143, caps registry scope
at50plans and processes at most20jobs through existing journal/nonce/receipt logic.
HOSTED_WORKER_ENABLED=false until cutover. Finite workers close their DB sessions.
No new arbitrary transfer/signing endpoint or contract change is introduced.

At21:25:18UTC11October the new Neon database verifies12tables/141restored records.
Primary-key comparison handles different collations; SQL timestamp equality retains
full precision. Other fields compare exactly. TLS certificate/hostname verification
and limited-role transaction/advisory-lock tests pass. Owner credentials remain
local; use applicationDatabaseUrl from the ignored private credential file for
host runtime. Existing source has38confirmed requests,1preserved legacy failed and
zero jobs. Keep local worker until the verified target takes over with one database
and one signer owner. Restore does not authorize resetting either state store.

User explicitly approves automated testnet settlement of consented plans and its
move to Netlify. Initial automatic review denied worker startup without this specific
grant; subsequent human approval permits the owned worker restart. Project-only
Neon CLI access is also approved, but minting failed; the user's private connection
file replaces that dependency. Never print connection strings, keys or private rows.

Local checks pass107application/49contract tests, local-chain integration, configured
chain/runtime/asset verification, types/lint and both native function bundles. Native
Netlify framework build, exact runtime configuration, origin/sign-in verification,
remote worker execution and Envio hosting remain separate unfinished gates.

Source is published to https://github.com/vkk28/fallback. The repository was empty
and public; its existing visibility is retained. Private configuration, databases,
wallet material, backups, browser state and raw evidence are excluded. The corrected
GitHub Linux CI run below passes; local passes do not replace remote verification.

The user authorizes deployment using existing credits/free resources only and has
no credit card, but can perform verification using a supported debit card or UPI.
Oracle was explicitly rejected after the user checked its signup. No paid
provisioning, upgrade or billing method is configured by this work. A fully hosted
payment system is not yet claimed.

## Required runtime

The web app/API requires Node24, HTTPS and private PostgreSQL with interactive
transactions and advisory locks. The worker requires a persistent independent
process plus the same application database/immutable job state. Envio requires
its own PostgreSQL database/schema, native indexer process and authenticated
GraphQL service. Runtime secrets stay in host secret storage, never image layers,
build arguments (except public Privy app ID), source or logs.

The Dockerfile supplies web, worker and explicit migrate targets with a verified
official Node24.19.0 multi-platform image. Build from the repository root. Pass only
NEXT_PUBLIC_PRIVY_APP_ID as a public web-build argument. PORT is provided by the host;
the web target binds0.0.0.0. It does not start a worker or run migrations implicitly.
The build context excludes local credentials/private/generated artifacts. Container
build/smoke outcomes are recorded separately from external deployment results.

## Latest scope — small hackathon demo, laptop off

The user clarified that only three or four people will test this hackathon project,
but every service must work with the laptop off. Free Vercel/Netlify app/API hosting
is appropriate. Do not require a production VM or Google billing merely because
the existing local processes are persistent.

Read-only Vercel API inspection confirms the selected scope is Hobby. Its free
personal/non-commercial limits fit a small testnet demo; actual usage determines
quota consumption. Native Hobby cron is once daily, so it cannot replace the
current five-second worker loop unchanged.

Netlify's current credit-based Free plan supports scheduled functions (30-second
limit) and background functions (up to15minutes). Prefer an authenticated scheduled
trigger plus a bounded background worker for this demo. Preserve job leases, nonce
reservation, commit-before-broadcast journal, receipt recovery and notification
deduplication. main.ts is a persistent loop, not a function handler. This adaptation
is proposed, not implemented/deployed. Select only the actual Free plan without paid
upgrade/recharge. CLI status did not return a usable authenticated Netlify account.
Browser inspection also reaches the Netlify login page, which explicitly accepts
service terms on login; leave that step to the user. Neon also shows its login
page. Both are left open for human account access; no login form is submitted.

netlify.toml prepares Node24/pnpm and apps/web/.next. Netlify's Next.js adapter,
hosted build, private runtime configuration, database and worker are unverified.
Neon Free is the metadata database candidate; continual polling can exhaust its
100 CU-hours/month/project even with few users. Choose a measured cadence and
retain scale-to-zero, TLS and sessions compatible with transactions/advisory locks.
No hosted database exists. Neon tools are absent; a recent suggestion already exists,
so do not repeat the installation prompt.

Envio Cloud Development is free for testing, with a maximum30-day lifespan and
event/storage/inactivity deletion limits. It fits temporary hackathon indexing,
not permanent hosting. Retain private local backups and verify a hosted rebuild
from the existing factory/start block before switching reads.

Next: establish actual free Netlify/Neon/Envio connections, test the bounded worker
and hosted framework build, then follow the state-preserving cutover below. No
cloud resource, runtime credential or private database is uploaded in this evaluation.

## Free hosting evaluation — 11 October 2026

- Vercel's existing signed-in CLI account can host the Next app/API on its personal
  free tier, subject to its plan limits. It does not replace the independent worker
  or Envio/GraphQL service. Confirm the actual selected scope/plan before deployment.
- Neon provides a free PostgreSQL starting point for staging. Access is not yet
  connected. Its compute/storage quotas must be checked for this workload; ongoing
  worker/indexer polling cannot be assumed to fit. Use direct/session-capable
  PostgreSQL for transactions/advisory locks, with verified TLS.
- Oracle Always Free VM is excluded at the user's request; do not retry its signup.
- Northflank Sandbox advertises always-on services/database but its documentation
  requires a payment method for all users before creating resources.
- Koyeb's free instance sleeps after one hour and cannot be a worker service.
- Render free web instances sleep, workers are not free, and free Postgres expires
  after30days. Hugging Face now requires a paid plan for new Docker Spaces.

These limits are checked from primary provider documentation, not old free-host
lists. No verified card-free, permanently always-on host for the complete current
stack has been provisioned. A web/API/database staging deployment must state that
worker/indexer hosting remains incomplete rather than imply unattended payments
continue when the local computer sleeps.

## Existing Google AI Pro subscription

Actual signed-in Google inspection now shows a US$10 monthly offer, Action Required
and no eligible billing account in its selector. The billing link reaches an existing
account with overdue mandatory identity verification and a banner stating its free
trial is over. No credit is redeemed, form submitted or paid upgrade selected.
Identity/payment/terms steps remain human actions. Keep personal/billing identifiers
out of source/logs. Current Firebase spend caps permit billed overages during
reporting/enforcement delays; they do not prove a hard zero-spend bound. Google
provisioning is excluded from the current demo route.

Google Cloud credits may help cover persistent worker/indexer hosting alongside
free app/database tiers. Before provisioning, verify the actual granted balance,
eligible SKUs, renewal/expiry, region, storage and network/IP charges. Cloud budget
alerts alone are not a hard spending cap. Do not provision a paid resource on the
assumption that the subscription automatically covers it. The mandate remains
zero additional spending or existing credits only.

The corrected real GitHub run is successful:
https://github.com/vkk28/fallback/actions/runs/38156982907
The initial run failed on the unapproved Linux embedded-Postgres symlink setup;
the reviewed platform-specific allowBuilds correction resolves it. Dependency,
core/local-chain, web build/types, CRE checks and Slither steps complete on Linux.

Neon was installed by the user. Its tools appeared, then were no longer available
in this session; no hosted database has been created or migrated by this work.
Do not repeat the installation request or assume database credentials/plan access.

## State-preserving cutover

1. Back up both application and indexer stores privately; verify disposable restore.
2. Provision only an explicitly free/credit-bounded compatible target. Restore
   existing profiles, memberships, terms/salts, invitations, requests/idempotency,
   notifications and job/nonce/broadcast state. Never seed replacement requests.
3. Apply only pending additive migrations. Compare exact counts and immutable
   payloads and reconcile unresolved provider/chain requests before enabling writes.
4. Configure the exact HTTPS app origin and authentication origins. Verify chain10143,
   existing deployed runtime/token/factory and canonical account binding.
5. Move the dedicated worker with an explicit single-owner cutover and preserved
   signer/nonce/job state. Keep the current worker operating until the verified
   target can safely take over; do not start a second independent state store.
6. Verify actual account/invitation/funding/recovery/history and restart journeys,
   backups, measured indexer lag and monitoring on the hosted target.

The original active plan, completed A/B cases and39 request identities are protected.
Source publication never migrates their private state or restarts local services.

Primary references:
[Vercel Hobby](https://vercel.com/docs/plans/hobby),
[Neon plans](https://neon.com/docs/introduction/plans),
[Oracle Always Free](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm),
[Northflank billing](https://northflank.com/docs/v1/application/billing/pricing-on-northflank),
[Koyeb free limits](https://www.koyeb.com/docs/reference/instances),
[Render free limits](https://render.com/docs/free),
[Hugging Face Spaces](https://huggingface.co/docs/hub/en/spaces-overview).

[Google AI Pro benefits](https://developers.google.com/profile/help/benefits),
[Google Cloud free resources](https://cloud.google.com/free),
[Firebase spend caps](https://firebase.google.com/docs/projects/billing/spend-caps),
[Vercel cron limits](https://vercel.com/docs/cron-jobs/usage-and-pricing),
[Netlify scheduled functions](https://docs.netlify.com/build/functions/scheduled-functions/),
[Netlify background functions](https://docs.netlify.com/build/functions/background-functions/),
[Envio development limits](https://envio.dev/pricing).
