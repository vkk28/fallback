# Fallback handoff — 12 October 2026, Asia/Kolkata

## Active task and authorization

Complete a free hackathon deployment for three or four testers, with all services
operating while the laptop is off. Netlify Free hosts the app/API/worker, Neon Free
hosts private metadata, and the user approves Envio Development for temporary
indexing. Do not provision paid resources, billing methods or mainnet services.
The user approves public vkk28/fallback source and fallbackk.netlify.app, specific
server-secret transfer to Netlify, and automation of existing consented testnet
plans with the preserved signer. User installed Netlify/Envio GitHub apps for
fallback only. Setup-draft DELETE permission is separately approved.

One writer on codex/source-stabilization; latest published source399e72d. No
subagents. Follow prompt.md Phase1 before financial edits; keep consented terms,
plan separation, own-money-first complete settlement, chronological processing,
exact grace boundaries, frozen shares, independent refunds and conservation.

## Actual hosted state

https://fallbackk.netlify.app returns200. Native @netlify/plugin-nextjs5.16.2 serves
Next.js16.4 from apps/web. /api/health returns databaseReady/rpcReady/accountsConfigured/
deploymentConfigured=true; /api/plans without a session returns401 SIGN_IN_REQUIRED.
Sponsorship is configured; existing sponsorship receipts are historical evidence,
not a new hosted payment verification. Privy sign-in dialog opens on this origin;
human email/code entry and hosted signed-in plan reads remain pending.

Worker enabled deployment6acc07c5a3371bdb3ffa42c7 is ready, Node24, with authenticated
background execution and */15 cron. A real authorized invocation is accepted202
and completes in4102.93ms without error. No payment receipt is inferred: the original
first due is11October22:18UTC (12October03:48IST). Next scheduled trigger is22:15UTC.
Verify the actual scheduled trigger and subsequent eligible settlement separately.
Bounded worker checks actual10143, refuses registries over50plans, processes at most
20existing jobs, reuses durable lease/nonce/signed-byte/receipt logic and closes DB.

Local owned web and worker are stopped for single-owner cutover; database remains.
Do not restart either against the old independent state store. Neon restores exact
12tables/141records, including38confirmed requests,1legacy failed and zero initial
jobs. Final quiesced backup/disposable restore passes21:52:06UTC; exact target match
passes21:54:09UTC. Stored timestamps compare in SQL at full precision. Limited
fallback_app supports transactions/advisory locks and setup cleanup; no schema
CREATE or transaction-request DELETE. Owner URL stays local, app URL is a Netlify
secret. Certificate/hostname validation remains enabled.

Envio fallback Development project exists, repositoryfallback, branchmain,
directory., config.yaml. No deployment existed at creation: a new branch push is
needed after connection. Root cloud config/codegen/typecheck passes; preserves
configured start69077351, verified factory/token, rollback/history and unchanged
shared handlers. Actual hosted sync, GraphQL endpoint and Netlify reader switch
are pending. Private local indexer snapshot preserves16tables/45851rows with checksum;
its disposable restoration is unverified. Original indexer store is untouched.

## Checks and tools

Core check passes107app/49contract checks; actual local-chain integration and local
Netlify function packaging pass. New root cloud codegen, cloud-handler types and
whole-source typecheck pass. Read-only chain:verify at22:11:03UTC passes actual10143,
asset/runtime/factory immutables. GitHub3525676 CI passes38178453035;399e72d is pending.
Source scan passes231files/6configured secrets with no findings; diff check passes.
No contract source or consented plan/request identity changed.

Initial native publication lacked adapter and served404. Runtime build then failed
because the known public RPC was incorrectly marked secret. Updating that flag was
ignored; recreating the public RPC/app-ID variables verified the classification and
resolved scanning. Actual keys/DB URL remain secrets; scans stay enabled. Offline
Netlify dry-run failed stack overflow; native build is the deployment evidence.

Use Node24/pnpm11 runtime paths from tooling.md. Netlify task-local OAuth token and
Neon URLs, trigger secret, backups and raw browser evidence are ignored mode600
files under .tools/hosting. Global Netlify CLI login belongs to a different identity:
never use it for this project. Neon CLI mint failed; user private DB connection is
used instead. Do not print credentials, rows, account IDs or raw provider errors.

## Next actions

Publish this factual handoff to trigger the connected Envio branch; verify cloud
build/sync and event accounting against existing receipts. Configure only the actual
hosted GraphQL reader URL on Netlify, then verify history and measured coverage.
Check native scheduled trigger logs and preserved job status before claiming unattended
payments. Finish human hosted sign-in/reload checks. No external recipient email,
new funding, cancellation, refund or consented-term replacement is authorized here.
