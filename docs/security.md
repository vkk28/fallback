# Threat model and static-analysis review

Assets are attributed escrow funds and immutable consented payment terms. Authorized
recipient actions, supporter Open funding actions, payee acceptance, permissionless
scheduling, and beneficiary-fixed claims are separate authorities. There is no admin.
The worker cannot redirect payments. Factory membership will be checked by all apps.

Protected against locally tested failure classes: insufficient/cap-blocked partial
payments, order bypass, duplicate settlement/claims, altered terms, unauthorized role
actions, consent replay/expiry/domain crossing, rounding dust, external wallet/allowance
influence, unaccounted donations, transfer failure, reentrancy, and competing workers.

Slither 0.11.6 direct-solc analysis reports nine low-severity timestamp findings for
factory/plan/term deadline checks; test token reports none. These are intentional:
schedules use actual block time, with exact tested boundaries, and no randomness or
historical hardship inference. Validator timestamp behavior can affect boundary
transactions; the UI must disclose execution-time evaluation. No high/medium findings
were observed on this path. Reports are in `docs/evidence/slither-*.json`.

Initial Foundry-mode Slither analysis produced unresolved inherited reference IDs,
so that output is not treated as clean analysis. Direct-solc compilation resolved
the imports/inheritance without those warnings. The uninitialized prefix and uncached
bounded-array length notices were fixed explicitly. Foundry high/medium lint is a
separate gate; expected timestamp warnings remain visible in full compiler output.

Conventional immutable asset selection remains essential. Balance-delta checks
reject fee behavior but cannot make arbitrary malicious/rebasing token code safe.
FBTEST's public test mint is intentional and means all resulting balances have no
real value. Unsolicited tokens are locked excess; no administrator can sweep them.

Known payee collusion, beneficial ownership, wallet funds held elsewhere, voluntary
recipient allocation choices, public chain activity, reserve-cap shortfalls, and
offchain creditor/fiat settlement remain outside the guarantee. Liveness requires a
worker or another caller. Application authorization, sponsorship, cache and relay checks are described below;
recovery/error completeness and deployed operational verification remain incomplete.
Automated checks are not an independent audit or production financial approval.

## Application checks and remaining boundaries — 2026-10-08

Backend tests exercise cryptographically signed JWT fixtures through the installed
Privy verifier, exact canonical embedded-wallet selection, private membership access,
account rebinding rejection, invitation hash/binding/expiry/replay, origin/body limits,
durable rate/idempotency and ambiguous-request recovery. Real PostgreSQL checks
confirm concurrent idempotency/invitation/lease behavior. These fixture accounts are
not evidence of distinct live Privy role sessions. The user reported two live account
verification cycles; actual sponsored recipient/payee consent, publication and recipient funding are now
verified separately in privy-live-actions.json. Remaining mutation/recovery paths still
need individual proof.

Named sponsored calls enforce recipient/supporter/payee role, testnet, registered
plan, destination/selector and bounded amounts on the server. Token approvals are
exact, separate steps. Durable stored payloads survive navigation and block new
actor/plan keys until reconciled; no credential is stored in those rows. Approval
receipt proof checks owner/spender/value. Sponsored account-operation proof uses
expected inner events and provider wallet ownership rather than the outer EntryPoint.
Private queries/caches are identity scoped and cleared on logout; service workers
cache safe static/offline content only. Offline actions are disabled, never queued.
Four public browser/provider-dialog/axe/offline checks passed; authenticated journey isolation,
recovery failures and all provider error/replacement cases need live verification.

Tracked pnpm patches bound braces 3.0.3 parser/AST depth and decode-uri-component
0.2.2 recursion/work while preserving existing CJS/ordinary input behavior. Tests
load the actually installed patched dependencies with deep hostile inputs. Compatible
published fixes address sixteen additional audit findings. The version-based audit
still reports one high and one moderate advisory for the patched versions. They are
locally mitigated, not suppressed or an audit-clean claim. Future dependency upgrades
must retain or supersede the mitigation with meaningful regression checks.

The HTTP relay uses constant-time bearer authentication, bounded schema, fixed
allowlisted actions, registry/current-index/deadline/preview RPC checks and unique
jobs. Worker notifications require successful receipt logs and beneficiary-fixed
contracts remain authoritative if indexing/relay is wrong. Live reorg/lag, secret
rotation, host backups and deployed CRE simulation remain unverified. Automatic
approval rejected simulation with all `.env` values and an unverified endpoint; the
correct next action is trusted-host approval and a relay-only secret environment.


## Corrected native signing boundary
The general server user-JWT approach was rejected for native Privy login. Follow the
specific native-user-wallet guide: server builds canonical request bytes, client uses
useAuthorizationSignature, backend passes the bound signature with its private app
credentials. Access JWTs still authenticate app endpoints. The client checks version,
canonical wallet resource URL, public app ID, stored request ID, exact expiry, testnet,
zero native value and sponsorship. The backend ignores arbitrary destinations/data
in signed-submission input; only signature/expiry are accepted and the stored body is
reconstructed. Provider verifies ownership/signature. Wallet resource is pinned in
migration0004; changes require reconciliation. Signatures expire after two minutes
and are never saved/logged. Manual same-key retry ceiling is one hour, below provider
idempotency lifetime. Neither an unrestricted user key nor delegated signer is granted.
Tests verify actual SDK HTTP canonicalization/cryptographic signature mismatch and
request isolation/expiry. Live provider/receipt proof now covers consent, publication, self mint, exact approval
and recipient allocation. Other mutation/error paths require their human authorization.
