# External setup and exact next actions

## Configured and actually verified — preserve these

Privy email sign-in, TEE user-controlled server wallets, localhost origin, app-paid
Monad sponsorship and disabled client transactions are configured. The user reports
two successful sign-in/account-verification cycles. Official provider reads plus
expected Monad receipt events now verify sponsored propose, payee acceptance,
publication, self-only test mint, exact approvals,250 FBTEST recipient allocation,
300 FBTEST supporter contribution and recipient activation.
See evidence/privy-live-actions.json and live-plan-funding.json. Recovery failure
and every remaining mutation path still need proof; authentication alone is insufficient.

Monad token/factory receipts, runtime and immutable asset/chain are verified.
Use the existing packages/chain/deployments/monad-testnet.json; do not redeploy to
resume. FBTEST has six decimals and no real value. Credentials remain in ignored
.env (mode600), deployment keystore in .tools/keystores/fallback-testnet. No password,
private key, usable signature or invitation token belongs in chat or tracked files.

The earlier HTTP400 proposal was reconciled as unsubmitted through official Privy
reference lookup and factory reads, preserved as failed, and safely superseded by the
human's fresh authorized proposal. Do not revive it or bypass request-age guards.

## Supporter/activation gate — completed and verified

The user completed the distinct third account/invitation flow, sponsored approval/
300 FBTEST contribution and recipient activation, then returned “Activation confirmed.”
14:16:24UTC block-consistent reads verify Active, recipient250, reserve300, frozen
support300 and one supporter. Official provider/receipt checks verify each action.
Do not repeat any mint, approval, deposit or activation. No payment/refund is claimed;
the first due remains future. Further withdrawals/top-ups/cancellation/claims need
separate reviewed scenarios; preserve the existing published terms and active plan.

## Worker and live Envio — no repeated key setup

The dedicated worker key was generated directly into ignored mode600 .env. Its
public faucet address is in .tools/worker-testnet-address.txt. The user funded it;
official RPC verifies positive faucet gas. The owned permissionless worker is
running and checks actual chain10143 at startup. No due testnet settlement is claimed.
Use node scripts/local-services.mjs status worker; start/stop take the same argument.
Never regenerate or display its private key. It cannot choose payment destinations,
amounts or splits, and has no user signing authority.

Headless Envio3.14 is really backfilling from the verified deployment start block
through official RPC into separate local PostgreSQL database fallback_indexer.
Its development metrics/console listener binds127.0.0.1:9898. Sync counters are in
evidence/envio-live-backfill.json; no product event has been indexed at that checkpoint.
Resume with node scripts/local-services.mjs start indexer; never delete/reset its DB.

GraphQL is now running and configured privately. The user installed/logged in Docker
Desktop; the agent started only pinned owned Hasura/metadata containers. Actual query,
unauthenticated rejection, integer/watermark handling and stop/start metadata
persistence are verified. The restricted reader has six SELECT tables, no writes,
read-only transactions and mode600 credentials; owner/backfill still work. App settings
were enabled only after a real query. Native Docker CLI/credential-helper paths are
used in child PATH, without changing global settings. Docker logs are disabled.

At16:00:16UTC processing was69180653/source-reported69215046, zero events/plans.
GraphQL works, but the live plan's history has not been indexed yet. Do not equate
empty history with a failed confirmed transaction. Keep the indexer running from
the original deployment block; never reset its DB/use destructive stop/down commands.

Useful commands (bundled Node PATH required):
```sh
pnpm graphql:status
pnpm graphql:verify-reader
pnpm graphql:stop
pnpm graphql:start
```
Stop/start preserve volumes and unrelated resources. Restart owned web safely only
if its process needs new .env values and no human authorization is active.

## CRE — login, authorized HTTPS and actual simulation completed

The user completed CRE CLI login and explicitly authorized a temporary scheduler-only
Cloudflare HTTPS tunnel plus relay-only simulation. Granted scope excludes full-app
publication, source upload, purchases, workflow deployment and submission.
Current temporary origin:
https://species-notification-goto-citizens.trycloudflare.com
It exposes public /health and only authenticated GET /api/scheduler/candidates and POST
/api/scheduler/enqueue-batch. Local/public401 auth and404 financial-route checks pass.
Full web/DB/user wallet keys stay local. This URL has no uptime guarantee and changes
on restart; active process/instance proof is required before sending credentials.
The publisher session77722/current child info is ignored .tools/cre-staging/tunnel.json.
Do not signal an unverified PID or reuse a retired URL.

```sh
pnpm cre:simulate --authorized-origin https://species-notification-goto-citizens.trycloudflare.com
```
The runner verifies exact configured/authorized origin, active owned tunnel and fresh
HTTPS instance proof, fresh prebuilt WASM and default production limits. It forwards
only CRE_RELAY_SECRET in a mode600 ignored file; child env excludes Privy/worker/DB
credentials and NODE_OPTIONS. The former all-env/unverified-host auto-review rejection
was resolved by this narrow authorized/verified path, not bypassed.

Actual default-limit CLI simulation passed16:07:14UTC, including verified handler
result scanned0/accepted0/stale0 from the genuinely empty index. This is a successful
simulation, not a paid installment/deployed workflow or bounty fulfillment. Positive
due work and complete indexed histories remain. Native Monad Testnet capability is
documented for CLI1.30+/TS1.19+ and confirmed by installed1.37/1.23/tenant list, but
the current workflow uses the explicit RPC-backed HTTP adapter and no native CRE writes.
CLI initialization requires project.yaml and a nonempty public monad-testnet RPC.
Target registry is private; no wallet key, broadcast or mainnet is configured.

Runtime failure at the bundled URL constructor was fixed using portable bare-HTTPS
DNS validation. Five SDK regressions and actual WASM simulation pass. Private CRE
registry is listed; workflow deployment/secret-manager upload still require separate
authorization and confirmed entitlement. Stable public full-app/worker/indexer hosting
also remains a separate release decision.

The .tools folder is hidden. Finder Cmd+Shift+G can open
~/Desktop/Fallback/.tools/cre (already opened for the user).
No further login/funding/activation repetition is needed.

Secrets belong only in ignored mode600 .env/.tools files or approved provider/host
secret managers. Return non-secret confirmations and URLs; keep keys, OTPs, invitation
tokens and usable signatures in their original private interfaces.

## Other remaining authorizations

Explorer verification publishes contract source. Application/indexer/worker hosting,
public repository creation and competition submission require authorization.
For exact current bounty requirements, sign into https://hackathon.monad.xyz yourself
and return the non-secret requirements text or authorize read access. No password or
token is requested. Alchemy is optional; its RPC credential belongs only in .env or a
host secret manager. Official Monad RPC already supports the implemented reads.
