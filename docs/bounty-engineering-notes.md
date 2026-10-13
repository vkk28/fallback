# Fallback — technical entry notes

Prepared from verified implementation and actual provider checks on 13 October 2026.
This file contains technical text and source links only. No video, portal entry,
source publication or bounty award is claimed. Useful hosted CRE work remains pending.

## Main technical description

Primary track: **Consumer Products & Payments**.
Live product: https://fallbackk.netlify.app.
Public repository: https://github.com/vkk28/fallback.
Network: **Monad Testnet, chain 10143**. Asset: **FBTEST**, six decimals, no real value.

One-line description:

Family-backed recurring payments that use your allocated money first, cover
shortfalls within agreed limits, and return unused support.

Fallback lets an owner arrange recurring payments to a consenting payee with limited
family backup. Each plan isolates the owner's allocated money from supporter reserves.
At a scheduled payment, immutable contracts use own money first and backup only when
the complete payment fits the agreed caps and window. Activation locks contributions
and freezes supporter weights. Ending cancels unpaid installments; remaining owner
money and unused support are independently claimable by recorded beneficiaries.
Email sign-in and embedded accounts power role-authorized sponsored transactions;
live indexed history explains payments, funding, frozen shares and returns. The
hosted worker provides scheduling independently of the owner's laptop. External wallet
balances do not determine eligibility; Fallback does not verify bills or deliver fiat.

Accounting source: [FallbackPlan](https://github.com/vkk28/fallback/blob/5d68f55f28e9838a45b9b1c424d76d073521e75a/contracts/src/FallbackPlan.sol).

## Privy — functionality beyond login

Fallback uses Privy for one canonical embedded Ethereum account per authenticated
user and for account-authorized, sponsored contract actions. Owners propose/publish
consented terms and activate/end plans; payees accept the destination and exact terms;
supporters authorize precise token permission and separately deposit backup. Users
recover independent returns through their recorded accounts. Backend role checks,
immutable request payloads and receipt reconciliation preserve identity through retries.
This account stack powers the financial journey beyond authentication.

Source: [account provider](https://github.com/vkk28/fallback/blob/5d68f55f28e9838a45b9b1c424d76d073521e75a/apps/web/app/ui/privy-gate.tsx),
[client authorization](https://github.com/vkk28/fallback/blob/5d68f55f28e9838a45b9b1c424d76d073521e75a/apps/web/app/ui/transaction.ts),
[canonical identity](https://github.com/vkk28/fallback/blob/5d68f55f28e9838a45b9b1c424d76d073521e75a/packages/backend/src/auth.ts),
[prepared sponsored actions](https://github.com/vkk28/fallback/blob/5d68f55f28e9838a45b9b1c424d76d073521e75a/packages/backend/src/transactions.ts),
[canonical receipts](https://github.com/vkk28/fallback/blob/5d68f55f28e9838a45b9b1c424d76d073521e75a/packages/backend/src/receipts.ts).

## Envio — real financial history consumed by the app

Envio HyperIndex dynamically indexes factory-created plans. Its derived entities
reconstruct allocation changes, contributions, frozen supporter weights, own/backup
payment splits, missed/cancelled installments, closure and claims. The app consumes
that history through bounded GraphQL reads and displays processing coverage separately
from canonical current-state reads. The hosted pipeline reconciles four plans and
27 canonical plan events with exact historical accounting. Integer amounts and
chain/transaction/log identities avoid rounding loss and duplicate history.

Source: [cloud config](https://github.com/vkk28/fallback/blob/5d68f55f28e9838a45b9b1c424d76d073521e75a/config.yaml),
[schema](https://github.com/vkk28/fallback/blob/5d68f55f28e9838a45b9b1c424d76d073521e75a/indexer/schema.graphql),
[event handlers](https://github.com/vkk28/fallback/blob/5d68f55f28e9838a45b9b1c424d76d073521e75a/indexer/src/handlers/events.ts),
[application reader](https://github.com/vkk28/fallback/blob/5d68f55f28e9838a45b9b1c424d76d073521e75a/packages/backend/src/indexer.ts).

## Alchemy — authoritative Monad Testnet RPC

Fallback uses a private Alchemy Monad Testnet endpoint for authoritative contract
reads, same-block plan snapshots, receipt reconciliation and the worker's fixed
permissionless contract calls. Current runtime health confirms Alchemy configuration
and RPC readiness; deployed token/factory runtime and immutables were checked through
the configured endpoint. Credentials stay server-side. Unavailable reads leave money
unknown and disable required actions instead of supplying substitute balances.

Source: [chain client and bounded transport](https://github.com/vkk28/fallback/blob/5d68f55f28e9838a45b9b1c424d76d073521e75a/packages/chain/src/client.ts),
[authoritative worker gateway](https://github.com/vkk28/fallback/blob/5d68f55f28e9838a45b9b1c424d76d073521e75a/apps/worker/src/gateway.ts).

## Chainlink CRE — HTTP/RPC settlement orchestration

Fallback's CRE cron workflow discovers a bounded, frozen page through its external
hosted HTTP adapter, validates the testnet/action payload and submits an exact batch.
The adapter rechecks authoritative Monad state and atomically enqueues durable jobs
with cursor advancement; repeated observations/submissions preserve the acknowledgement.
An independent worker signs only fixed permissionless calls and reconciles canonical
receipts before producing in-app notifications. This integrates Monad with external
HTTP scheduling, SQL persistence and notification processing through an explicit
RPC-backed adapter; it is not a native CRE Monad chain write.

Source: [cron workflow](https://github.com/vkk28/fallback/blob/5d68f55f28e9838a45b9b1c424d76d073521e75a/workflows/cre/main.ts),
[HTTP orchestration](https://github.com/vkk28/fallback/blob/5d68f55f28e9838a45b9b1c424d76d073521e75a/workflows/cre/handler.ts),
[atomic batch coordinator](https://github.com/vkk28/fallback/blob/5d68f55f28e9838a45b9b1c424d76d073521e75a/apps/worker/src/discovery.ts),
[durable worker](https://github.com/vkk28/fallback/blob/5d68f55f28e9838a45b9b1c424d76d073521e75a/apps/worker/src/jobs.ts).

Current status: actual hosted CLI simulation succeeds with four scanned/zero eligible
jobs. A useful non-empty hosted run is still pending. Local batch-to-payment/recovery
verification is separate and does not complete that claim. The new local `cre:execute`
guard enforces non-empty work; enqueue acceptance does not prove payment.

## Role walkthrough and current-state inspection

1. Sign in with email to obtain the canonical Fallback account. All tokens are test-only.
2. Owner: create a plan, invite the intended payee, propose terms, wait for payee
   acceptance and publish those immutable terms. Joining and financial consent differ.
3. Supporter: join the intended request, review terms, obtain test tokens, authorize
   the exact permission and separately deposit backup. Permission alone is not funding.
4. Owner: activate once the required reserve is met. Active allocations are locked;
   owner top-ups remain available, while supporter funding/weights are frozen.
5. Use Overview, Schedule and Activity to inspect amounts, windows, outcomes and
   receipt-backed indexed history. A future payment remains pending until actually paid.
6. When ending a plan is intended, review the cancellation first; ending and claiming
   the remaining money are separate role-authorized actions. Zero claim is explained.

The installment due 12 October 2026 at 03:48 IST is already paid, with a canonical
150 FBTEST own-funded transfer at 04:00:42 IST. Two other plans are Closed/Cancelled.
The fresh 10 FBTEST plan is NotDue. There is no currently eligible hosted work.

Manual portal step: choose Consumer Products & Payments and the intended Privy,
Envio, Alchemy and CRE bounties; paste the applicable technical descriptions and
links. Keep CRE's pending status explicit. Final submission and mandatory video fields
remain with the owner. No optional account stack or unrelated sponsor is proposed.
