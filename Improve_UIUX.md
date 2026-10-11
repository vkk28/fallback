# Fallback — UI and UX improvement specification

Prepared 11 October 2026 · Product-specific design and implementation guidance.

**Primary objective:** make setting up and using a family-backed payment plan feel understandable to someone who has never used a crypto wallet. The interface should organize the work, explain the next decision and recover gracefully when a service is slow. Users should not coordinate account addresses, copy invitation URLs or decipher transaction internals as part of the normal journey.

**Visual direction:** grayscale, soft whites, charcoal and neutral greys; Swiss typographic discipline with the restraint of modern luxury banking. Clear hierarchy, precise spacing and quiet surfaces should create trust. No bright accents, unnecessary gradients, glass effects, decorative charts or visual clutter.

This is a proposed improvement specification, not a claim that these features exist. It was prepared in a documentation-only review. Core implementation is now tracked in [UI verification evidence](docs/test-report.md#ui-verification-evidence); the remaining proposed capabilities must not be assumed complete. Existing financial rules and consented plans remain authoritative. All numerical examples below are explicitly illustrative and must never become fabricated application balances.

## Contents

1. [Evidence and current friction](#1-evidence-and-current-friction)
2. [Product principles and language](#2-product-principles-and-language)
3. [Information architecture](#3-information-architecture)
4. [Invitations without manual coordination](#4-invitations-without-manual-coordination)
5. [Simplified setup and consent](#5-simplified-setup-and-consent)
6. [Funding, activation and payment management](#6-funding-activation-and-payment-management)
7. [Role-specific screens](#7-role-specific-screens)
8. [Transaction recovery, activity and notifications](#8-transaction-recovery-activity-and-notifications)
9. [Grayscale design system](#9-grayscale-design-system)
10. [Components and implementation stack](#10-components-and-implementation-stack)
11. [Accessibility, mobile and PWA](#11-accessibility-mobile-and-pwa)
12. [Backend dependencies and implementation map](#12-backend-dependencies-and-implementation-map)
13. [Prioritized delivery plan](#13-prioritized-delivery-plan)
14. [Acceptance criteria and evaluation](#14-acceptance-criteria-and-evaluation)
15. [References](#15-references)

## 1. Evidence and current friction

### 1.1 What this review is based on

Reviewed the current Next.js screen source, account gates, styling, backend invitation/session/request handlers, data schema, accounting helpers and project handoff. Graphify identified relationships; direct source inspection verified the findings. Existing desktop and mobile landing-page captures in `docs/evidence/shell-1280.png` and `shell-375.png` informed the visual assessment. Those are historical captures, not fresh screenshots of every authenticated state. Chrome had no available open tabs during this review, so no new signed-in usability walkthrough is claimed.

The findings are an expert review of this implementation. They are not measured user-research results. The existing three-role scenario provides functional context, not evidence that normal users understand the interface.

| Current implementation and source | Friction for a normal user | Recommended change | Dependency |
| --- | --- | --- | --- |
| `CreatePlan` in `apps/web/app/ui/consumer.tsx` asks for the payee's Fallback account address | The payee must sign in elsewhere, locate an address and send it back before setup can continue | Select a known person or invite by verified contact identity; resolve their destination within Fallback | New identity/contact and preliminary-draft flow |
| `Plan.invitePerson` returns a read-only URL input | Creator must copy, switch apps, paste and explain what the link means | In-app invitation inbox first; direct delivery for new people; native Share as fallback | Inbox/delivery backend; native Share is a smaller frontend change |
| `/invite` sits inside `AccountGate`; `Invite` also requires “Read this invitation” | Sign-in and an extra button delay understanding why someone was invited | Automatically load a carefully limited preview, then sign in only to accept | Preview endpoint already exists before authentication; UI/privacy changes needed |
| Draft → propose → generate invite → join → accept onchain → publish are separate controls | Users must understand and remember a protocol sequence | One guided setup checklist with explicit handoffs and automatic status updates | UI orchestration over existing actions |
| Four setup steps include raw interval days, grace hours and four backup-limit fields | High cognitive load and hard-to-predict interactions between limits | Plain-language questions, fixed-interval presets, preview and a compact limits editor | UI; true calendar recurrence is a separate contract/product change |
| Form values are held in component state until final save | Reloading or navigating away can lose an unfinished plan | Private resumable setup drafts with save status and recovery | New draft persistence/versioning |
| `Plan` exposes mint, approve and deposit together | Users can confuse receiving test tokens, granting permission and funding a plan | One guided funding journey with truthful substages and resumable progress | Existing actions plus orchestration; batching is not assumed |
| A page-wide “I have reviewed…” checkbox gates unrelated actions | It is easy to miss, easy to click habitually and disconnected from the chosen action | Action-specific review beside amount, destination and consequences | UI and authorization-context handling |
| Dashboard cards expose label/address existence, not current lifecycle or next action | Users have to open each plan to discover what needs attention | Role-aware cards with next date, status, claim or action needed | Summary endpoint; current `GET /plans` is insufficient |
| Dashboard always displays three role columns, including empty ones | Most users see unused categories before useful information | Combined list with role filters; first-use empty state | UI |
| Most plan content sits on one long page, including full terms and technical states | The next action competes with legal/mechanical detail | Overview first, secondary Schedule/People/Activity/Terms views | UI |
| “Refresh confirmed information” is a prominent routine button; focus refetch is disabled | Users must operate synchronization themselves | Bounded automatic read refresh with timestamps and manual fallback | Query strategy and rate-limit budget |
| Recovery uses “Authorize and check this request” | Read-only checking and renewed authorization are conflated | “Check status” first; show “Authorize again” only when required for the same request | UI split over existing GET/retry routes; verify backend semantics |
| Dashboard notifications have no distinct loading/error presentation or read interaction | A service failure can look like “No confirmed updates”; old items crowd the list | Loading/error/empty states, unread markers, newest-first ordering and pagination | UI plus API response/query changes |
| Profile editor starts blank despite an existing `GET /profile` route | Users cannot see or confidently update the saved name | Prefill profile; move it into Account; optionally offer it during first setup | UI |
| Current stylesheet uses green ink, sage surfaces, serif headings and pill buttons | The design does not match the requested grayscale direction | Neutral design tokens, sans-serif hierarchy, restrained corners and fewer nested cards | UI/assets/provider appearance |
| `/setup` and its public footer link expose a development account check | Normal users encounter internal verification work | Automatic account checks; move diagnostics out of normal navigation | UI/routing, retaining useful development diagnostics |
| Current deployment is on localhost; the existing relay is scheduler-only | A link shared to someone else's device cannot open this local app | Test same-host flows honestly; cross-device delivery needs an authorized reachable HTTPS app | Hosting/runtime dependency |

### 1.2 Highest-value changes

Start with the invitation and setup journey. A new coat of styling alone will leave the largest burden intact. The desired experience is: **choose the person → review the plan → Fallback coordinates acceptance → add money → start the plan → see the next payment and any action needed.**

Keep the strengths already present: email sign-in, server-verified account binding, distinct participant roles, confirmed balances, durable transaction requests, explicit funding locks, independent refunds and recoverable processing. Present these protections in understandable language.

## 2. Product principles and language

### 2.1 Interaction principles

- **One obvious next action per state.** Other available actions belong in a secondary area, not a row of equal-weight buttons.
- **People before addresses.** Names and verified contact relationships identify participants; addresses remain inspectable destination details. A display name alone is never proof of identity.
- **Explain the consequence where the user decides.** Put the amount, destination, lock and refund consequences in the action review. Full agreed terms remain accessible.
- **Progressive disclosure, not hidden commitments.** Show a short summary first and the complete limits before commitment. Never hide a restrictive cap, funding cutoff or locked allocation in a tooltip.
- **Resume rather than restart.** Preserve draft progress, invitation context and the exact unresolved transaction across navigation and reconnection.
- **Calm, truthful status.** A queue entry is not a payment, an approval is not a deposit, and a released refund is not money already returned.
- **Respect the relationship.** Avoid guilt-inducing reminders, public supporter rankings, “family owes you” messages or default repeated nudges.
- **Use the verified plan state.** External wallet funds can inform whether a deposit can be funded; they must never determine eligibility for backup.

### 2.2 Recommended vocabulary

| Current/technical wording | Preferred user wording | Required clarification |
| --- | --- | --- |
| Recipient | You / plan owner | Use the internal role in diagnostics only when helpful |
| Payee | Person receiving payments | Name the person on the actual plan |
| Allocated money | Your money in this plan | It is not the user's total wallet balance |
| Reserve / supporter funds | Family backup / reserved support | Reserved money is committed to this plan |
| Propose terms | Request payment acceptance | Recipient authorization still happens |
| Create immutable plan | Create plan | “These payment terms cannot be changed after creation” on review |
| Activate | Start plan | “This locks the agreed funds and enables scheduled payments” |
| Approve | Allow this exact deposit | Permission alone does not move funds |
| Claim | Return unused money | Destination is the user's bound Fallback account, not a bank |
| Closed / ended | Ended | Separate from “unused money returned” |
| Backup cap | Backup limit for each payment | Show both amount and percentage where applicable |
| Grace | Payment window | Show an exact closing date/time |
| Onchain confirmed | Confirmed | Receipt details explain the network transaction |
| Indexer catching up | Activity is updating | Current confirmed money can be available independently |
| User operation / request hash | Reference | Full technical values under receipt details |

Use “FBTEST · test tokens, no real value” consistently. Do not replace FBTEST with ₹, $, a fiat equivalent or “bank balance.” Use banking-level clarity and visual discipline without claiming that Fallback is a bank or that its balances are insured.

### 2.3 Example copy

- Invitation: “You’ve been invited to review a housing payment plan. Joining does not move money.”
- Support: “Reserve up to [amount] for this plan. It can help complete a payment when the owner’s money in this plan falls short.”
- Active lock: “Your remaining money stays in this plan while it is active. End the plan to make it available to return.”
- Insufficient funding: “Add [amount] to this plan before [window closes] to make this payment fully fundable at the current snapshot.”
- Unknown transaction: “We’re still checking this action. You can leave this screen; we’ll keep its progress here.”
- Closure: “The plan has ended. [amount] is available to return to your Fallback account.”
- History lag: “Your action is confirmed. Its activity entry is still updating.”

All interpolated amounts and states must come from the appropriate confirmed data or an explicitly labelled estimate.

## 3. Information architecture

### 3.1 Main navigation

Use **Home**, **Activity**, and **Account** as the initial primary navigation. Put invitations and pending setup actions in a prominent **Requests** section on Home. Promote Requests to its own tab only if usage warrants it. “Create plan” is an action, not a permanent primary destination that every supporter or payee needs.

- Desktop: a compact left rail or slim header, 200–220 px rail if used, with a single content area. Avoid an admin-dashboard sidebar containing unrelated modules.
- Mobile: three labelled bottom destinations, with safe-area padding. A contextual primary action lives above the bottom navigation where appropriate.
- Preserve existing `/dashboard`, `/new`, `/plans/[id]` and `/invite` links during migration. New subviews may use accessible tabs and stable query parameters rather than immediately multiplying routes.
- The logo takes signed-in users Home and signed-out users to the public landing page.
- Account contains profile, sign-in/recovery information, notification preferences, technical account details and sign-out. Never put sign-out beside the main payment action.
- No global role switch that changes permissions. A person can have different roles across plans; each plan clearly states the current role.

### 3.2 Home hierarchy

1. Page title and compact account identity.
2. A prioritized “Needs your attention” section, only when there is something actionable.
3. Next relevant payment or invitation.
4. Plan list, filterable by All / My payments / My support / Payments to me.
5. Recent activity preview, with a clear path to the full history.

Order attention items by consequence: unresolved action, expiring payment window, available refund, waiting acceptance, then optional setup. Avoid treating a future payment as an emergency. Show no arbitrary countdown seconds.

Plan cards should include name, participant context, lifecycle, next due date if relevant, role-specific amount and one next action. Do not aggregate recipient allocation and family reserve into “Your money.” Do not show a supporter the full plan reserve as their personal withdrawable balance.

### 3.3 Plan detail hierarchy

Above the fold: plan name, role, status, next action and the most relevant financial summary. Below: Overview, Schedule, People, Activity, Terms. Use tabs only when they reduce scrolling; on small screens a select or clear section links can replace an overflowing tab bar.

Keep a short “What you agreed to” summary in Overview, including the lock and backup limits. Full terms remain one action away. A desktop summary column may stay sticky; it must unstick when viewport height or zoom would hide content.

```text
Desktop plan overview — structural sketch, not live financial data

Home / Housing                          Active · You manage this plan
Housing
Next payment: [date, timezone]                           [Add money]

┌───────────────────────────────────────┐ ┌─────────────────────────┐
│ Next payment · [amount] FBTEST         │ │ Your money in this plan │
│ Your money [x] + family backup [y]     │ │ [confirmed amount]      │
│ [fundability explanation + timestamp] │ │ Family backup [amount]  │
└───────────────────────────────────────┘ └─────────────────────────┘
Overview   Schedule   People   Activity   Terms
[relevant content]
Plan settings → End plan

Mobile: same reading order in one column; next action remains reachable.
```

## 4. Invitations without manual coordination

### 4.1 Recommended experience

**Primary:** choose a previously connected person or enter an email address. Fallback routes the invitation to their in-app Requests inbox when a verified relationship can be established. For someone new, offer a direct transactional email invitation after delivery infrastructure exists. The sender sees a contact label, role and invitation status, not a wallet-address field and raw token.

The email/login identity must be verified by the account provider and resolved on the server. Do not assume that typing an email proves who owns an embedded account. Existing accounts currently store an ID, address and display name; they do not provide a verified contact directory or invitation inbox.

**Secondary:** “Share invitation” opens the device share sheet. QR code is useful when people are together. “Copy link” remains a fallback inside sharing options, not the main task. Native sharing requires browser support, a secure context and a user gesture; unsupported browsers need usable alternatives. Closing a share sheet is not a payment error. A resolved share call is not proof of delivery or acceptance. [MDN Web Share API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Share_API)

Do not claim that a WhatsApp message or email was sent merely because a compose window opened. A prefilled message is a user-controlled handoff; automated channel delivery is a separate integration. Do not automatically import contacts or send messages while implementing a visual redesign.

### 4.2 Person selection

The selector offers “People you have already connected with” and “Invite someone new.” Show an offchain name, role context and a masked verified contact where authorized. Distinguish similar names before confirming. Keep “Use account address” in an advanced option for the test environment.

Avoid a public searchable email-to-wallet directory. Rate-limit exact-contact requests and return non-enumerating responses. Invitations should disclose no plan details to an unrelated signed-in account. An arbitrary display name cannot be used to transfer funds or bind a destination.

For a new payee, retain the initial inputs as a **preliminary setup draft** while the person verifies their contact and binds their destination. Only then construct and propose the contract-compatible terms. This is a new backend concept: current `createDraft` requires an address, and existing consented terms must never be retroactively rebound.

### 4.3 Invitation lifecycle

| State | Creator sees | Invitee sees / next step |
| --- | --- | --- |
| Prepared | Ready to invite [person] | Nothing yet |
| Delivery queued | Sending invitation | No delivery guarantee yet |
| Handed to delivery provider | Invitation sent, where actually evidenced | Open request |
| Delivery failed | Could not deliver; correct contact or use Share | No false accepted state |
| Awaiting response | Waiting for [person] | Review / Decline |
| Joined, payee acceptance pending | [Person] joined; payment terms awaiting acceptance | Review and accept exact terms |
| Accepted terms | Ready for you to create the plan | Waiting for plan creation |
| Supporter joined | [Person] joined; no contribution yet | Choose support amount |
| Declined | Invitation declined | Reopen details if appropriate |
| Expired or revoked | Invitation no longer active | Ask for a new invitation; no dead-end page |
| Already accepted | Open existing plan | Open existing plan without repeated acceptance |

“Viewed” is optional and should not rely on email tracking pixels. If implemented, derive it from an authorized in-app view and explain the visibility. Avoid social pressure and read receipts by default.

Current invitation expiry is the earlier of 24 hours and the funding deadline. Display the actual expiry. Resend must issue/reuse tokens according to a defined idempotent policy and revoke superseded invitations where supported. It must not extend immutable funding deadlines. Revocation before joining is not removal of an existing onchain participant.

### 4.4 Receiving an invitation

Open directly into a concise preview: who invited you, your requested role, purpose, amount/schedule and what happens if you join. Load it automatically; remove the redundant “Read this invitation” button.

For the current token-preview endpoint, explicitly review what may be seen by anyone possessing the link. Prefer a minimal pre-login preview and full private context after verification. Never disclose dashboard membership, contact details or balances in public link previews. Avoid third-party analytics on token-bearing pages, retain token hashing server-side, scrub tokens from logs and preserve the existing protection against storing usable tokens in idempotency records.

After sign-in, resume the invitation rather than sending the person to an empty dashboard. If signed in as the wrong account, explain the mismatch with a masked identity when authorized and offer **Switch account**. Do not ask the user to paste a wallet address to prove ownership. Preserve context across refresh/sign-in without putting reusable secrets into general analytics or persistent shared caches.

For payees, joining and accepting terms can appear in one guided journey, but the app must distinguish membership from the actual onchain acceptance. For supporters, show “Join and choose support”; joining never implies a contribution.

### 4.5 Environment limitation

Direct invitations solve manual coordination only when the receiving person can reach the application. A `localhost` invitation is restricted to the machine hosting the app. The scheduler tunnel is not an application host. Demonstrate same-host account journeys locally, and treat a reachable HTTPS application plus a configured email provider as prerequisites for genuine cross-device delivery. No such deployment or provider setup is performed by this document.

## 5. Simplified setup and consent

### 5.1 Onboarding

Use one familiar “Continue with email” entry point. Let Privy handle its authentication and recovery screens; avoid an extra “Verify account” task in the consumer journey. Perform the existing binding checks automatically, with a useful reconnect screen if verification fails.

Offer an optional display name so invitees recognize the person. Explain where it is shown. Skip repeated onboarding for returning users. Invitation arrivals retain their intended destination. Ask for neither a role choice nor wallet configuration unless a real action requires it.

Keep the test-network label compact and persistent. Explain public onchain activity and the test-only asset at the first relevant action and within account/help details, without flooding every section with identical notices.

### 5.2 Four understandable decisions

| Step | User decides | Screen behavior |
| --- | --- | --- |
| 1. Payment | Purpose, payment amount, first date, number of payments | Clear amount field; fixed-interval choices; schedule preview |
| 2. Person | Who receives the payments | Known person or verified-contact invitation; preliminary draft if destination pending |
| 3. Backup | Total backup budget, minimum to start and limit per payment | Plain-language guidance, editable suggestions and a worked example |
| 4. Review | Whether to request acceptance of these exact terms | Summary, destination identity, all restrictions, edit links and explicit authorization |

A stepper shows completed sections by name and permits backward navigation without losing inputs. Validate each section before advancing; place errors at the relevant field and focus the first invalid control. Display the full schedule before submission. Save status must distinguish “Saving,” “Saved” and “Could not save.”

### 5.3 Dates and recurrence

- Offer fixed elapsed intervals such as every 7, 14 or 30 days, with a custom-days option. **Do not call every 30 days “monthly.”** True calendar-month recurrence needs separately specified contract behavior and renewed consent; it is not a label change.
- Offer sensible date/time defaults with explicit review, but never silently select contractual terms on the user's behalf. Show the timezone beside the control and on the final summary.
- Show first due, last due, funding cutoff and payment-window end. Current UI derives funding cutoff as first due minus 24 hours; reject an already elapsed cutoff immediately instead of at final save.
- Explain that fixed seconds can appear at a different local clock time across daylight-saving changes. Preserve absolute instants; changing a display timezone must not change stored terms.
- At the exact `due + grace` boundary the payment is expired. Do not promise payment “through” a displayed closing time if that implies inclusion of the boundary.
- Keep date entry usable by keyboard; do not require a calendar popover. Recheck dates before final authorization after a long-lived draft.

### 5.4 Backup limits without a mathematics quiz

Ask: “How much family backup can this plan hold?” and “What is the most backup that may help with one payment?” Follow with “How much must be reserved before the plan can start?” Display the percentage limit beside the amount, using an expandable editor if necessary. Both limits still appear in the review; the effective cap is whichever is lower.

Provide an optional **illustrative calculator**, explicitly separate from live balances. Example: for a 150 FBTEST payment, 100 of own allocation and 50 of allowed backup would complete the payment. If only 30 backup is allowed, an additional 20 of own allocation is required; the plan does not send an incomplete payment.

Use authoritative arithmetic for live estimates:

```text
own portion = min(plan own allocation, payment amount)
shortfall = payment amount − own portion
allowed backup = min(per-payment amount cap,
                     floor(payment amount × coverage basis points / 10,000),
                     currently available reserve)
additional own allocation needed = max(0, shortfall − allowed backup)
```

These calculations explain funding at a snapshot; lifecycle, chronological installment processing and the current payment window still determine execution. Use integer base units, never floating-point calculations. Do not infer that all future payments are guaranteed from a sum of balances.

### 5.5 Saved drafts and changes

Persist unfinished setup privately per authenticated user. Current `POST /plans` creates a complete draft; it does not provide partial saves or edits. Introduce a separate setup-draft representation or explicitly versioned draft API. Clear local recovery data on sign-out and prevent one account from resuming another account's form.

After terms are proposed, a change must create a new version/proposal and invalidate or supersede acceptance of the old version. After plan publication, financial terms are immutable. Offer **Create a similar plan** with a fresh review and consent cycle, not an Edit button that implies the current contract can be changed. Never silently move funds from the old plan into a new one.

### 5.6 Guided handoffs

Show a checklist: **Details ready → Payment acceptance → Plan created → Funding → Started**. Under the active stage, identify who must act next. Recipient waits while payee accepts; payee sees a waiting screen after accepting; recipient is notified when creation becomes available.

Keep required authorizations explicit. The UI can advance to the next screen automatically after a confirmed result, but it cannot sign the next financial action automatically. If the recipient closes the app, Home resumes the correct stage.

## 6. Funding, activation and payment management

### 6.1 One guided funding experience

Replace the three competing funding buttons with **Add money** for the owner and **Reserve support** for a supporter.

1. Enter an amount with a visible FBTEST suffix and locale-aware decimal handling.
2. Review its destination, purpose, applicable lock and whether fees are currently sponsored.
3. If the account lacks test tokens, offer a clearly marked “Get test tokens” substep. Minting is a real testnet action and does not fund the plan.
4. Show “Allow this exact deposit” only when the recorded exact-amount approval is not confirmed and reusable.
5. Prompt for the actual allocation/contribution authorization after the approval is confirmed.
6. Show a confirmation summary only after the deposit receipt establishes success. Refresh the plan; preserve a separate activity-sync status.

This is a single user journey, not a claim of one transaction or one signature. Verify any future account batching/permit support before proposing fewer authorizations. Preserve exact-amount approvals; never introduce unlimited approval merely to reduce clicks.

If interrupted after approval, show “Permission confirmed. Finish adding [amount].” If interrupted during submission, resume the stored request. Changing the amount invalidates the previous review/approval association. “Use available amount” can assist a deposit only if spendable account balance and amount limits are verified; it never changes backup eligibility.

### 6.2 Activation

When funding is open, show collected backup versus the minimum required to start. Distinguish that threshold from complete future payment coverage. Recipient allocations and supporter deposits remain separate.

**Start plan** opens a focused review: exact terms, current allocated amount, current backup, first payment, funding cutoff and the withdrawal lock. Explain that support cannot be added or withdrawn after activation, while the owner may add their own money. Starting is not reversible; ending is a different operation with separate refunds.

If start is unavailable, give the precise reason beside the disabled action: insufficient reserve, funding deadline passed, account mismatch or unresolved action. Do not explain every disabled state with “Payment services are not ready.”

### 6.3 During the plan

Make the next installment the visual anchor. Show amount, due time, window closing time, current own/backup forecast and required action. Label the forecast as based on the displayed snapshot.

- Not due and currently fundable: “Scheduled for [date]. Current funding can cover this payment.”
- Not due but short: “Based on current funding, add [amount] before [deadline].”
- Due and fundable: “Payment window open. Awaiting processing,” unless a specific attempt is actually known.
- Due but blocked by cap: explain the required own-money top-up. More family support cannot be added to an active plan.
- Window ended but expiry not processed: “Payment window ended; status is updating.” Mark **Missed** only from the confirmed outcome.
- Missed: “This payment was not made. No debt is created by Fallback.” Do not imply forgiveness of an unrelated real-world bill.
- Confirmed paid: amount, recipient destination, time and contribution breakdown.

When several installments are overdue, show that the earlier installment must be resolved first. Do not let the interface imply that the user can skip contract ordering. A scheduler outage must appear as delayed processing, never as a fabricated payment.

### 6.4 Withdrawals, ending and refunds

While funding is open, offer **Take back money** in the appropriate person's funding detail, with an amount-specific review. Hide or explain its absence after activation. A supporter cannot end the plan or withdraw active support.

Put **End plan** under Plan settings, visually separate from funding. Use an accessible confirmation dialog that states how many unpaid installments will be cancelled and the currently estimated amounts released to the owner and supporters. Explain that completed payments remain final and exact refundable amounts are determined at closure. Keep “Keep plan” as the safe dismissal option.

After confirmed closure, show **[amount] available to return** and the action **Return [amount] to your account**. Do not say “Refunded” at closure. Each person claims independently. A successful return shows a receipt; zero claim shows a calm completed/zero-entitlement state based on actual history, not merely an unexplained disabled button.

Supporter share estimates during the active plan remain estimates. Preserve frozen contribution weights and exact rounding; do not display a rounded percentage as the source of refund entitlement. Never add “Withdraw all family money” or an admin sweep.

## 7. Role-specific screens

| Screen | Primary content | Primary action | Supporting content |
| --- | --- | --- | --- |
| Signed-out landing | One-sentence purpose, three-step explanation, test-only boundary | Continue with email | How backup works; privacy and help |
| First Home | Relevant invitation, or concise empty state | Review request / Create plan | No empty three-column dashboard |
| Recipient Home | Next payment and plans needing attention | Continue setup / Add money / Review refund | Upcoming schedule, recent activity |
| Supporter Home | Their committed amount and plans they support | Review invitation / Reserve support / Return unused money | Lock explanation and received updates |
| Payee Home | Expected payments and confirmed receipts | Review payment acceptance when pending | Schedule and payment details; no funding controls |
| Draft overview | Checklist, invited person's response, exact reviewed version | Next authorized setup action | Edit preliminary details when allowed |
| Open funding plan | Separate own money and backup, start threshold, funding deadline | Add money / Invite support / Start plan, selected by readiness | Open withdrawals, participant status |
| Active plan | Next installment, funding forecast, window | Add money only when relevant | Schedule, people, activity, terms |
| Ended plan | Personal claim or completed return | Return unused money if positive | Final schedule and actual receipts |
| Activity | Newest first, clear event labels, unread state | Open relevant plan/action | Date/plan filters and pagination |
| Account | Saved profile, current sign-in identity, preferences | Edit profile / Manage preferences | Recovery guidance, technical details, sign-out |

For payees, do not make total family reserves the dominant number. For supporters, prioritize their commitment and potential/actual return. For owners, distinguish next payment readiness from the lifetime amount paid.

People view should show who is receiving payments, who has joined and which invitations need action, subject to an explicit visibility policy. Avoid exposing every supporter's email or contribution to other supporters without a product requirement and consent. The current API does not provide this participant-management view.

## 8. Transaction recovery, activity and notifications

### 8.1 Transaction presentation

Use a persistent action card or sheet with named stages. Avoid percentage progress because confirmation time is not deterministic.

| State | UI treatment | Allowed next step |
| --- | --- | --- |
| Ready | Amount and destination review | Confirm this action |
| Awaiting user authorization | Explain the account prompt | Complete prompt or cancel before submission |
| Prepared but not sent | No movement claimed | Continue same prepared action when valid |
| Submitted | “Waiting for confirmation” with reference in details | Leave page safely / Check status |
| Outcome unknown | Persistent pending card, no false failure | Reconcile the same request |
| Authorization expired | Explain that renewed approval is needed for the stored action | Authorize again after read-only check |
| Confirmed | Specific outcome and confirmed amount | Relevant next action |
| Confirmed, activity lagging | Success plus quiet activity-updating note | Continue; no resubmission |
| Failed/reverted | Specific safe explanation; attempted change did not complete | Correct issue or retry through established request rules |
| Account/network unavailable | Preserve entered data and context | Reconnect / retry read, with no offline transaction queue |

Split read-only status refresh from reauthorization. Current `check()` calls the retry path and can authorize; simply relabelling that button “Check status” would be misleading. Use the existing transaction GET reconciliation first and expose renewed authorization only when the outcome permits it. Surface unrelated/new actions as blocked while the existing ambiguous request requires resolution.

Use short user explanations plus an expandable diagnostic reference. Remove raw provider codes from the main error sentence. Never tell the user “no money moved” unless the system can establish that no transaction was sent or the relevant state change failed. Preserve pending identity across tabs and warn on account changes before showing new data.

### 8.2 Refresh and data freshness

Refresh on confirmed mutation, reconnect, focus return and a bounded interval when work is pending. Back off during failures and suspend unnecessary polling for hidden tabs. Provide “Last checked [time]” and a manual retry when automatic reads fail.

Coordinate queries: current backend read limits are per user, so several tabs each polling multiple endpoints can exhaust them. Prefer a bounded summary endpoint and deduplicated queries; do not fetch every complete plan every few seconds. Never turn unavailable data into zero balances.

Maintain independent freshness for confirmed chain snapshot, transaction receipt and indexed history. If the chain read fails but older data is available in the current session, visibly label it stale and disable actions requiring fresh validation. Do not expand service-worker caching to authenticated financial responses just to make screens appear instant.

### 8.3 Activity and receipts

Translate events into recognizable sentences instead of splitting CamelCase event names. Group related permission/deposit events under one user action while retaining individual technical receipts. A payment receipt shows plan, installment, amount/asset, destination, confirmed timestamp and own/backup breakdown. A refund receipt shows whose returned allocation it represents.

Use locale-formatted dates, timezone on details and a verified network explorer link when configured. Never send contact metadata in explorer URLs. Offer a print/save view of actual receipt data later; label it as an onchain payment receipt, not a bank transfer receipt or evidence that a landlord accepted fiat.

Distinguish loading, no history, history unavailable, history still syncing and confirmed empty results. Allow pagination without duplicate rows or losing scroll position. Existing notifications are returned oldest-first with a 50-item limit; a full Activity screen needs newest-first ordering, read state and cursor pagination, not just a visual list reversal.

### 8.4 Notifications

Start with in-app delivery for invitations, acceptance needed, plan ready to start, payment confirmed, top-up needed, missed payment and return available. Separate future reminders from confirmed financial outcomes. A user can mute informational updates without hiding an unresolved action from their plan.

Request push/email preferences after users understand their purpose. Provide frequency controls, quiet hours where relevant, clear sender identity and opt-out. Do not ask for push permissions immediately on the landing page. Do not send automatic repeated supporter reminders by default.

Notifications must be idempotent and reconcile with canonical state. If a reorg invalidates a previously displayed event, mark or correct the activity entry; external email cannot be silently retracted and needs an explicit correction policy. This recovery remains an implementation dependency, not an already verified feature.

## 9. Grayscale design system

### 9.1 Palette and semantic tokens

Use true neutral greys: equal red, green and blue channels. Avoid the green tint in current CSS and the blue/purple tint of some default library themes.

| Token | Value | Usage |
| --- | --- | --- |
| `background` | `#FAFAFA` | Main canvas |
| `surface` | `#FFFFFF` | Cards, dialogs and inputs |
| `surface-muted` | `#F2F2F2` | Quiet groups and secondary surfaces |
| `surface-hover` | `#EBEBEB` | Row/button hover |
| `text-primary` | `#171717` | Titles, values and body emphasis |
| `text-secondary` | `#525252` | Explanations and field labels |
| `text-muted` | `#666666` | Timestamps and less prominent readable text |
| `border-subtle` | `#E5E5E5` | Decorative separators and card outlines |
| `border-control` | `#858585` | Input boundaries when needed for identification |
| `primary` | `#242424` | Main action fill |
| `primary-hover` | `#111111` | Main action hover |
| `primary-foreground` | `#FFFFFF` | Text on the main action |
| `focus` | `#171717` | Keyboard focus with contrasting offset |

Subtle separators are decorative, not the only indication of an interactive boundary. Text needs adequate contrast on every surface where it is used. Do not use low-opacity text for essential terms, amount units or errors. Grayscale is fully compatible with accessibility when labels, icon shapes, outlines and contrast carry meaning. [W3C text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [W3C non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)

Calculated checks for these proposed pairs: primary text/canvas **17.18:1**, secondary text/white **7.81:1**, muted text/muted surface **5.13:1**, white text/primary button **15.52:1**, and control border/white **3.69:1**. These validate the named token pairs, not every future component or an implemented accessibility conformance result.

Suggested foundation, to map into the selected component system during implementation:

```css
:root {
  --background: #fafafa;
  --foreground: #171717;
  --card: #ffffff;
  --card-foreground: #171717;
  --muted: #f2f2f2;
  --muted-foreground: #666666;
  --primary: #242424;
  --primary-foreground: #ffffff;
  --border: #e5e5e5;
  --input: #858585;
  --ring: #171717;
  --radius: 0.75rem;
}

.money-value { font-variant-numeric: tabular-nums lining-nums; }
:focus-visible { outline: 2px solid #171717; outline-offset: 3px; }
```

This snippet is a token proposal, not a drop-in migration of the current global stylesheet. Map error/destructive tokens explicitly too, so copied components do not silently reintroduce red accents. Start with the light theme. Dark mode is optional follow-up work only after all financial states are verified in the primary theme.

### 9.2 Typography

Use **Inter** as the proposed single UI typeface, self-hosted with its license preserved, and a system sans-serif fallback. It provides tabular-number features suited to aligned amounts. Keep font loading resilient and avoid a runtime dependency on a third-party font CDN. [Inter official site](https://rsms.me/inter/)

| Use | Desktop | Mobile | Weight / behavior |
| --- | --- | --- | --- |
| Public hero | 48–56 px / 1.08 | 34–40 px / 1.12 | 500; restrained negative tracking |
| App page title | 30–32 px / 1.2 | 26–28 px / 1.2 | 600 |
| Main financial value | 32–40 px / 1.15 | 28–32 px / 1.2 | 500–600, tabular digits |
| Section title | 20 px / 1.3 | 18–20 px / 1.3 | 600 |
| Body and inputs | 16 px / 1.5 | 16 px / 1.5 | 400 |
| Labels and support copy | 14 px / 1.45 | 14 px / 1.45 | 400–500 |
| Minor metadata | 12–13 px / 1.45 | 12–13 px / 1.45 | Never for critical obligations |

Remove the repeated oversized italic serif treatment from application screens. An optional editorial serif on the public landing page is a later art-direction choice, not necessary for this system. Avoid heavy uppercase letter spacing throughout the app. Keep body line lengths around 55–75 characters.

Format amounts with grouping and the supported locale decimal separator. Do not round a small nonzero claim to “0.00.” Show enough precision to preserve material value, with exact six-decimal base-unit amounts available on review/receipt. Keep FBTEST next to the value without making it unreadably small.

### 9.3 Spacing and layout

- Use a 4 px spacing base: 4, 8, 12, 16, 24, 32, 48 and 64 px.
- Page gutter: 20 px mobile, 32 px tablet, 40–48 px desktop. At 320 px, adapt without horizontal overflow.
- Main content: roughly 1120–1200 px maximum. Reading/forms: 560–640 px; do not stretch a simple form across the whole desktop.
- Card padding: 20 px mobile, 24–32 px desktop. Card gaps: 16–24 px.
- Section gaps: 32–48 px; field label to input 6–8 px; help text 6 px below.
- App buttons: 44–48 px high; inputs 48 px; compact controls must retain adequate hit areas.
- Corners: 8–10 px controls, 12–16 px cards, up to 16–20 px dialogs. Reserve pills for small status/filter chips.
- Shadows: generally none on cards; a subtle neutral elevation on popovers/dialogs only. Prefer a border and spacing to a shadow stack.
- Align titles, numbers, labels and dividers to a consistent grid. Right-align numeric columns; left-align descriptive text.

Avoid card-inside-card nesting. The current account wrapper encloses the whole consumer experience; move authentication into an app shell and let page content breathe. Whitespace should separate meaningful groups, not push the primary action below several screens of introductions.

### 9.4 Grayscale status system

| State | Shape/icon + text | Treatment |
| --- | --- | --- |
| Draft | File outline + Draft | Light surface, visible outline |
| Waiting | Clock + Awaiting acceptance | Neutral surface; name next actor |
| Active | Small solid marker + Active | Strong text with a restrained badge |
| Needs action | Alert triangle + specific action | Dark left rule or stronger border; explanatory sentence |
| Pending | Spinner/clock + Processing | Static label remains if animation is reduced |
| Confirmed | Check circle + Confirmed | Clear label; no confetti |
| Failed | X circle + Could not complete | High-contrast message and recovery action |
| Missed | Calendar/X + Not paid | State why and show outcome |
| Ended | Archive outline + Ended | Quiet treatment; refund status separate |

Success and error must remain distinguishable without green/red. Icons supplement text rather than replace it. Errors should be visible, not aesthetically minimized. Use a stronger border, heading and action-specific explanation for destructive confirmations rather than bright red buttons.

### 9.5 Buttons, forms, cards and motion

Primary: charcoal fill, white text, one per decision area. Secondary: white/transparent surface, clear border and charcoal text. Tertiary: text action with adequate hit area. Destructive actions live apart from routine actions and use an explicit consequence label.

Every input has a persistent label; placeholders are examples, not labels. Put units inside the field's trailing area without obstructing the value. Use inline errors linked programmatically to the input. Prefer a native/selectable control for a few options; use a combobox only for a genuine searchable person list. Never use a slider as the only way to enter an exact financial amount.

Use Lucide's existing icon family consistently, generally 18–20 px for controls and 20–24 px for section symbols. Avoid decorative icon circles on every card.

Motion: approximately 120–180 ms for hover/focus and 180–240 ms for sheets/dialogs. Use subtle opacity or small translation, not bouncing or scaling financial values. Honor reduced motion, maintain focus and avoid layout shifts while numbers load. Prefer static skeleton blocks to glossy gradient shimmer. [MDN reduced motion](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion)

### 9.6 Complete the visual migration

Apply tokens to `globals.css`, Privy appearance configuration, layout `themeColor`, manifest colors, offline page, SVG/generated PWA icons, focus styles, error styles, badges and any notification permission/help surfaces. A green provider modal or old green home-screen icon would make a partial grayscale conversion feel unfinished. Preserve provider-controlled security prompts; theme only supported appearance settings.

## 10. Components and implementation stack

### 10.1 Recommendation

Use **shadcn/ui source components with a consistent Radix primitive base**, Tailwind CSS for the adopted styling layer, and the existing Lucide, React Hook Form, Zod and TanStack Query dependencies. This provides editable component code that can be adapted to the neutral system, rather than forcing a generic fintech dashboard template. shadcn supplies component source; owning it also means reviewing updates. [shadcn introduction](https://ui.shadcn.com/docs)

Current source uses custom CSS. The root manifest does not currently include Tailwind, shadcn configuration or an explicit Radix component stack. Treat adoption as a scoped migration with pinned compatible versions and a reviewed build configuration; these tools are recommended, not already integrated. The official Next.js guide supports an existing-project setup. Do not scaffold over this application or blindly run a command that assumes `apps/web` has its own package manifest. [Existing Next.js setup](https://ui.shadcn.com/docs/installation/next)

Current shadcn documentation offers multiple primitive variants. Choose one consistently; do not mix Base UI, Radix and React Aria variants casually in the same component layer. Use Radix's keyboard/focus behavior as a foundation, then test the actual composed forms and dialogs. It does not automatically make the product accessible. [Radix accessibility](https://www.radix-ui.com/primitives/docs/overview/accessibility)

### 10.2 Components to adopt

| Building block | Fallback use |
| --- | --- |
| Button, Input, Label/Field, Textarea | Consistent controls, associated errors and help |
| Card, Separator, Badge | Plan summary and understated states |
| Tabs | Plan sections, with keyboard navigation |
| Dialog / Sheet | Deposit review, invite details, mobile action flow |
| Alert Dialog | End-plan confirmation and other irreversible consequences |
| Select / Radio Group | Schedule presets and small choice sets |
| Combobox | Authorized known-person selection |
| Accordion / Collapsible | Full terms and technical receipt details |
| Skeleton / Alert | Loading and recoverable failure states |
| Dropdown Menu | Secondary plan actions and account menu |
| Toast | Noncritical feedback such as a copied link; never sole financial confirmation |

Fields should follow accessible grouping and validation patterns; irreversible confirmations need focus management and clear dismissal. [shadcn Field](https://ui.shadcn.com/docs/components/base/field), [shadcn Radix Alert Dialog](https://ui.shadcn.com/docs/components/radix/alert-dialog)

Build Fallback-specific components on top: `PlanCard`, `NextPaymentCard`, `FundingBreakdown`, `SetupChecklist`, `PersonPicker`, `InvitationCard`, `ActionReview`, `TransactionProgress`, `RefundCard`, `ReceiptDetails` and `DataFreshness`. Keep domain arithmetic outside presentation components.

### 10.3 Templates and inspiration

Use the official shadcn blocks as composition references for a restrained shell or authentication layout. Do not copy its dashboard sample data, revenue charts, admin tables or navigation wholesale. This product needs coordination and payment clarity, not trading-terminal density. [Official shadcn blocks](https://ui.shadcn.com/blocks)

Prefer the existing Next.js architecture over introducing a second frontend framework or another account SDK. Do not add animation libraries merely for fades that CSS handles well. A simple labelled segmented funding bar is more useful than a pie chart; exact values and a textual explanation must accompany it.

“Intelligent UI” should mean context-aware presentation here: show the next valid action from lifecycle, role, verified balance and request state. It does not require an AI chatbot, AI-selected financial terms or a new unverified UI product. No capability named “Intelligent UI” was installed or used for this document.

## 11. Accessibility, mobile and PWA

### 11.1 Accessibility requirements

Target WCAG 2.2 AA across actual journeys. At minimum: 4.5:1 normal text contrast, 3:1 large text and required non-text boundaries; keyboard operation; visible focus; meaningful labels; error identification; status announcements; and content reflow. Product target: 44–48 px touch controls, exceeding the WCAG 2.2 AA minimum target-size rule where applicable. Do not label 44 px as the AA minimum itself. [WCAG quick reference](https://www.w3.org/WAI/WCAG22/quickref/), [Target size minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)

Specific implementation checks:

- One descriptive page heading, logical subheadings, landmarks and the existing skip link.
- Screen-reader announcements for meaningful transaction-stage changes; do not repeatedly announce every polling tick or move focus on refresh.
- Focus moves to the first invalid field or error summary, then returns to the invoking control after a dialog closes.
- No hover-only explanation, color-only state, drag-only control, forced paste blocking or inaccessible OTP replacement.
- Terms and financial confirmations remain readable at 200% zoom and layouts reflow at 400% where applicable.
- Sticky buttons never hide content, focused inputs or validation messages. Mobile keyboards and safe areas are tested.
- Any abbreviated address can be expanded and copied with an accessible label. Full values wrap without breaking the page.
- Test keyboard, VoiceOver, reduced motion and forced-colors/high-contrast behavior; automated axe checks alone are insufficient.

### 11.2 Mobile behavior

Design first at 375–390 px, then verify 320, 768, 1024 and 1440 px. Forms are one column on mobile. Use full-width primary buttons for action flows. Drawers must have a visible close control and allow the whole content to scroll; they cannot rely on swipe-to-dismiss.

Use decimal keyboards for amounts and 16 px inputs. Preserve values when switching apps to read an invitation or authorize a request. Do not promise independent accounts in three tabs: tabs in one browser profile normally share the sign-in session. Test role scenarios with isolated contexts/profiles; the consumer app should detect account changes and clear sensitive query state.

### 11.3 Offline and installation

Retain the current policy of not caching authenticated financial API responses in the service worker. When offline, keep unsent form state where safe, explain that visible in-memory financial information may be stale and disable submissions. Never queue a money action invisibly for later execution.

Offer installation after a meaningful completed interaction, not before the user understands the app. An update notice should allow a safe refresh after an in-progress action is recorded/recoverable; never reload midway through authorization. Restore context after update or reconnect. Keep the offline screen grayscale, readable and equipped with Retry/Home choices that accurately reflect connectivity.

### 11.4 Performance

Keep public landing content server-rendered and account SDK work limited to where needed. Use one controlled provider/query architecture without creating accidental cross-account cache reuse. Lazy-load nonessential dialogs/details; avoid a chart package until a real use case requires it. Reserve layout space for pending values and images.

Evaluation targets, not measured claims: LCP ≤2.5 seconds, INP ≤200 ms and CLS ≤0.1 at the 75th percentile when field data exists. For this local hackathon build, collect repeatable lab observations and report the environment; do not present them as real-user field results. [Web Vitals](https://web.dev/articles/vitals)

## 12. Backend dependencies and implementation map

### 12.1 What styling alone cannot solve

| Capability | Existing support | Work needed |
| --- | --- | --- |
| Native share | Generated address-bound invitation token | Share UI, fallback, clipboard feedback and truthful cancellation state |
| In-app invitation inbox | Address-bound token invitations and memberships | Query by verified actor binding; pending status, response/revocation lifecycle and permissions |
| Invite by email | Email login; no contact-invitation schema | Verified identity resolution, private delivery targets, non-enumeration and lifecycle rules |
| New person without an account | Draft currently requires payee address | Preliminary setup draft, verified destination binding before proposal, fresh consent |
| Direct email delivery | Not established | Provider, transactional outbox, retry/deduplication, delivery status and consented sending |
| Saved partial drafts | Complete draft creation only | Private partial schema, validation per stage, versions, update/resume APIs |
| Action-aware Home cards | Basic list returns ID, label, address and role | Bounded summary endpoint with lifecycle, freshness, personal claim and next action |
| People management | Membership and invite records | Authorized views, expiry/revocation, visibility rules and role-safe commands |
| Guided funding | Mint/approve/deposit and durable request records | Persistent stage reconciliation, exact-amount context and per-stage UI |
| Read-only recovery | Transaction GET plus retry/submit | Separate UI paths; confirm GET/retry behavior and reconnect presentation |
| Activity read status | `readAt` field and read endpoint | Unread payloads, newest-first cursor feed, UI acknowledgement scoped to actor |
| New notification channels | Existing in-app records | Preferences, consent, delivery outbox, correction/reorg behavior |
| Calendar-month recurrence | Fixed interval seconds | Separate product/contract design and tests; exclude from visual-only work |
| Cross-device use | Local web app; scheduler-only relay | Authorized HTTPS app runtime and working providers |

For every new write API, preserve authenticated role checks, origin checks, idempotency and existing account binding. Do not let invitation routing or a prettier people selector weaken those guarantees. New contact information stays offchain, out of logs and outside public receipt payloads.

### 12.2 Source changes to plan

| Existing path | Intended future responsibility/change |
| --- | --- |
| `apps/web/app/ui/consumer.tsx` | Extract screen components and dedicated transaction/invitation hooks; retain existing financial flow semantics |
| `apps/web/app/ui/account-gate.tsx` | Lightweight auth boundary instead of a card enclosing every screen |
| `apps/web/app/ui/privy-gate.tsx` | Automatic verification, return-to-invite behavior, neutral provider appearance, cache isolation |
| `apps/web/app/page.tsx` | Clear landing hierarchy, concise copy, relevant sign-in routing |
| `apps/web/app/dashboard/page.tsx` | Home shell and action-aware plan summaries |
| `apps/web/app/new/page.tsx` | Resumable guided creation shell |
| `apps/web/app/invite/page.tsx` | Preview before sign-in and resumable role-specific acceptance |
| `apps/web/app/plans/[id]/page.tsx` | Role-aware plan shell and stable section navigation |
| `apps/web/app/globals.css` | Semantic neutral tokens, responsive layout, component states and typography |
| `apps/web/app/layout.tsx`, `public/manifest.webmanifest`, `public/offline.html`, icon assets | Complete neutral theme, mobile metadata and offline consistency |
| `apps/web/app/api/[...path]/route.ts` | Summary, invitation lifecycle and activity APIs without compromising existing guards |
| `packages/backend/src/plans.ts`, `schema.ts`, `infra/migrations/` | Preliminary drafts, verified contact routing, inbox/delivery persistence and explicit versioning |
| `packages/backend/src/transactions.ts`, `receipts.ts` | Reuse authoritative action/recovery behavior; change only when required and tested |
| `packages/domain/src/accounting.ts`, `terms.ts` | Source of exact calculations and validation; UI helpers must agree with these rules |
| `tests/browser/shell.spec.ts` and additional focused browser tests | Expand beyond public shell checks into all three authenticated journeys and failure states |

Do not rewrite contracts to fit a visual template. Do not start by splitting every file into a new abstraction; extract components along clear user journeys and preserve one writer per checkout.

## 13. Prioritized delivery plan

The ordering below balances friction reduction with dependency readiness. Effort labels are relative scope, not promised delivery times.

| Priority | Work package | Effort | Completion gate |
| --- | --- | --- | --- |
| P0 | Neutral tokens, typography, app shell, button/field primitives | Medium | All core states readable and consistent at mobile/desktop sizes |
| P0 | Action-specific review, precise disabled reasons, status-only recovery | Medium | Users can distinguish approval, deposit, pending and confirmed without diagnostics |
| P0 | Guided funding and setup checklist | Medium–large | Reload at every substage resumes the correct stored action |
| P0 | Automatic invitation preview and native Share fallback | Small–medium | No mandatory manual copy; no extra preview click; wrong-account recovery works |
| P0 | In-app Requests for existing verified accounts | Medium–large | Invitee discovers and accepts the correct request without exchanging a token |
| P0 | Role-aware Home and next-payment/claim cards | Medium | Current summary data and one relevant next action per plan |
| P1 | Private saved drafts and precise field validation | Medium–large | Reload/navigation preserves setup and terms changes require fresh review |
| P1 | Email invitation and new-person destination binding | Large | Verified identity, delivery evidence, expiry/revocation and reachable app all work |
| P1 | Activity/read state, receipt detail, in-app reminders | Medium | No false empty/error state; chronological feed and duplicate-free updates |
| P1 | People view and invitation management | Medium | Visibility rules, decline, resend and expiration verified |
| P1 | PWA recovery, update behavior and complete accessibility pass | Medium | Offline/account-change/zoom/keyboard journeys pass |
| P2 | Optional push, receipt export, additional locales and dark mode | Variable | Useful, consented and fully verified; not needed to demonstrate the core journey |

The direct invitation experience is the desired endpoint. Native sharing is an immediate improvement, not a claim that manual cross-app coordination is fully solved. If delivery/hosting is unavailable, present the available mode honestly rather than drawing a nonfunctional “Send invitation” control.

For a focused hackathon redesign, complete the P0 set and a coherent three-person local walkthrough before adding graphs, an AI assistant, budget tools, open banking, fiat ramps or elaborate animation. Use real testnet state and isolated test accounts; never inject demonstration balances into the real dashboard.

## 14. Acceptance criteria and evaluation

### 14.1 Functional UX acceptance

- A returning user reaches their relevant plan/request after sign-in without a manual account-verification step.
- A known invitee can discover a request in-app; the creator does not need to obtain an address or manually copy a URL in the target experience.
- New-person direct delivery is only marked complete after verified contact binding and real delivery infrastructure exist.
- Invitation preview explains the requested role before commitment; wrong account, expired, declined, revoked and already-used states have clear recovery.
- Each setup field reports its own error; dates, units, timezones and all restrictive limits are visible before acceptance.
- Every draft/setup and funding substage survives refresh/reconnect without creating duplicate financial requests.
- A supporter can distinguish joining, approving, depositing, locked support, refundable support and a completed return.
- A payee can distinguish accepting terms, expected payments and funds actually received.
- The owner can identify the next installment, current shortfall and permitted remedy without interpreting a contract reason code.
- Unknown confirmation remains pending/recoverable; “Check status” does not silently prompt for a fresh financial authorization.
- End plan and return funds are separate, truthfully labelled actions. Zero claim never looks like an unexplained system failure.
- Original plans, confirmed receipts, immutable terms, own-money-first accounting, frozen shares, exact grace boundaries and independent refunds remain intact.

### 14.2 Visual and accessibility acceptance

- All app-owned surfaces, provider appearance settings and PWA assets use the agreed grayscale system.
- No unexpected green/blue/red accents, gradient shimmer, decorative growth charts or fake testimonials remain in the redesigned scope.
- Page hierarchy is consistent; the first viewport answers “What is happening?” and “What can I do next?”
- All required financial values and restrictions remain readable at supported zoom and mobile widths.
- Keyboard focus is visible and predictable; dialogs, tabs, forms and navigation work with assistive technology.
- Error/success/waiting states remain distinguishable in grayscale and forced-colors mode.
- Motion respects the user's preferences; reduced motion does not remove status information.

### 14.3 Verification plan

Test recipient creation, payee acceptance, supporter contribution, activation, owner top-up, open withdrawal, ending and independent claims. Include interrupted authorization, lost response, stale approval, wrong account, expired invitation, RPC outage, index lag, provider outage, offline reconnect and reload after each action stage. Include empty, loading, error, zero and large-value layouts.

Keep the original active testnet plan and completed A/B plans intact; use isolated fixtures/disposable local scenarios for destructive or boundary tests. Check the real integration separately when permitted. Visual tests cannot substitute for financial correctness checks.

For implementation: run appropriate type/lint/build and browser checks, including `pnpm check`; run `pnpm test:local-chain` for contract/payment changes and `pnpm chain:verify` for configured deployment checks. Extend API/database verification when invitation or draft schemas change. This documentation-only task does not rerun financial suites or claim a redesigned UI passed them.

### 14.4 Usability evaluation and measurements

Use task-based sessions when real participants are available and authorized. Ask people to create a plan, accept a request, reserve support, explain a pending action and recover a refund. Ask them to explain what is locked and what happens when backup is insufficient. Observe hesitation, backtracking and misunderstandings rather than leading them with instructions.

Measure completion rate, time to complete, field corrections, manual address/link exchanges, abandoned setup stages, recovery success and duplicate-request attempts. Track recipient/payee/supporter results separately. Set the target for mandatory manual address/link exchanges to zero in the intended direct-invitation flow. Establish a baseline before claiming any improvement percentage.

Optional consented instrumentation can record stage names and sanitized failure categories. Do not record invitation tokens, contact addresses, wallet identifiers, signatures or financial payloads in analytics. Technical test passes are not traction or usability-study results.

## 15. References

Official sources checked on 11 October 2026. Library choices and design values in this document are recommendations for Fallback, not vendor endorsements or claims of installed functionality.

| Reference | Why it is useful |
| --- | --- |
| [shadcn/ui introduction](https://ui.shadcn.com/docs) | Editable component-source model |
| [shadcn Next.js installation](https://ui.shadcn.com/docs/installation/next) | Existing-project integration |
| [shadcn theming](https://ui.shadcn.com/docs/theming) | Semantic variables and theme mapping |
| [shadcn component catalog](https://ui.shadcn.com/docs/components) | Select only necessary primitives |
| [shadcn blocks](https://ui.shadcn.com/blocks) | Layout references, not sample financial content |
| [Radix accessibility](https://www.radix-ui.com/primitives/docs/overview/accessibility) | Keyboard/focus behavior foundation |
| [Inter](https://rsms.me/inter/) | Proposed typography and tabular numbers |
| [MDN Web Share API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Share_API) | Native sharing requirements and limits |
| [WCAG 2.2 quick reference](https://www.w3.org/WAI/WCAG22/quickref/) | Accessibility acceptance framework |
| [Web Vitals](https://web.dev/articles/vitals) | Performance evaluation targets |

**Definition of done for this redesign:** a person can understand their role, invite the right person, review the exact commitment, complete or resume their action and understand the next payment/refund without needing the developer to explain the protocol. The grayscale visual system must support that clarity on every state, not only on the landing page.
