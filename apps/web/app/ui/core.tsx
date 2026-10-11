'use client';
import { useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { parseAmount } from '../../../../packages/domain/src/accounting';
import type { TermsInput } from '../../../../packages/domain/src/terms';
import type { IndexerSync } from '../../../../packages/domain/src/indexer';
import type { planSnapshot } from '../../../../packages/chain/src/client';

type Wire<T> = T extends bigint ? string : T extends readonly unknown[] ? { [K in keyof T]: Wire<T[K]> } : T extends object ? { [K in keyof T]: Wire<T[K]> } : T;
export type Role = 'recipient' | 'supporter' | 'payee';
export type PlanData = { plan: { id: string; label: string; address: string | null; payee: string | null; role: Role; terms: Record<string, string | number>; proposalHash: string | null }, current: Wire<Awaited<ReturnType<typeof planSnapshot>>> | null, consent: [string, string, string, boolean, boolean] | null, fundingApproval: { amount: string } | null, chainError: string | null, history: { Timeline: HistoryRow[]; sync: IndexerSync | null; Plan_by_pk?: { lastBlock: string } | null } | null; outstanding: { id: string; action: string; hash: string | null; amount?: string | null } | null };
export type HistoryRow = { id: string; kind: string; transactionHash: string; blockNumber: string; timestamp: string; amount: string | null; own: string | null; support: string | null; installment: number | null };
export type ConsumerMode = 'dashboard' | 'create' | 'plan' | 'invite' | 'activity' | 'account';
export type API = <T>(path: string, body?: unknown, key?: string) => Promise<T>;
export class RequestError extends Error { constructor(message: string, public requestId?: string, public noTransactionSent = false) { super(message); } }
const messages: Record<string, string> = { PAYEE_CLAIM_REQUIRED: 'Invite the person receiving payments and wait for them to join before requesting payment acceptance.', INVITED_EMAIL_REQUIRED: 'Sign in using the verified email this invitation was sent to.', INVITATION_REVOKED: 'The owner revoked this invitation. Ask for a new link.', INVITATION_REPLACED: 'This invitation was replaced. Use the latest link.', INVITATION_DECLINED: 'This request was declined. Ask the owner for a new invitation if you change your mind.', REPLACE_EXISTING_INVITATION: 'An invitation for this person is already open. Replace it from People to invalidate the old link.', EMAIL_DELIVERY_NOT_CONFIGURED: 'Email delivery needs a configured sender and reachable HTTPS app. Use a secure link for now.', REACHABLE_INVITATION_ORIGIN_REQUIRED: 'Email invitations require a reachable HTTPS app.', EMAIL_RETRY_LATER: 'Wait for the retry time before checking delivery again.', EMAIL_REPLACEMENT_REQUIRED: 'Delivery cannot safely retry. Replace this invitation to create a fresh link.', INVITATION_FUNDING_CLOSED: 'This plan is no longer open for support invitations.', PAYEE_ALREADY_BOUND: 'The payment destination is already fixed. A different destination needs a new plan.',  SETUP_CHANGED_IN_ANOTHER_TAB: 'This setup was changed in another tab. Reload the saved version before continuing.', INVITATION_NOT_FOUND: 'This invitation is unavailable. Check the link or ask the owner for a new invitation.', INVITATION_ALREADY_USED: 'This invitation has already been accepted. Open Home to find the plan.', AUTHORIZATION_EXPIRED_RETRY_SAME_REQUEST: 'This authorization expired. Check and authorize the same stored request again.', SEPARATE_PAYEE_REQUIRED: 'The payee must use a different Fallback account from the recipient.', FUNDING_DEADLINE_PASSED: 'Choose a first payment at least one full day in the future. Funding closes one day before it.', ORIGIN_REJECTED: 'Open Fallback at http://localhost:3000 to save this draft.', ACCOUNT_BINDING_CHANGED: 'This sign-in account does not match its previously verified embedded account. Reconnect before continuing.', IDEMPOTENCY_CONFLICT: 'This request was already used for different details. Reopen the creation flow before saving a changed draft.', PENDING_ACTION_CONFIRM_FIRST: 'A previous action is unresolved. Check that stored request before starting another.', RECONCILE_EXPIRED_REQUEST: 'This request is too old to resubmit safely. Provider reconciliation is required before another action.', SIGN_IN_REQUIRED: 'Sign in again to continue.', AUTHENTICATION_FAILED: 'Your session needs to reconnect. Sign out and sign in again.', SPONSORSHIP_NOT_CONFIGURED: 'Transaction sponsorship is unavailable. Your money has not been moved.', SPONSORSHIP_OR_AUTHORIZATION_FAILED_RETRY_SAME_REQUEST: 'Authorization could not be confirmed. Check this request before starting another.', SERVICE_UNAVAILABLE_RETRY: 'Current information is unavailable. Refresh and try again.', INVITED_ACCOUNT_REQUIRED: 'Sign in with the exact account invited to this plan.', INVITATION_EXPIRED_OR_USED: 'This invitation has expired or was already accepted. Ask for a new link.', PLAN_NOT_FOUND: 'This plan is unavailable to your account.', RATE_LIMIT: 'Please wait a minute before trying again.', EXPECTED_EVENT_NOT_CONFIRMED: 'The expected action is not confirmed. Keep this request open and check again.' };
export function useAPI(): API {
  const { getAccessToken } = usePrivy();
  return useCallback(async <T,>(path: string, payload?: unknown, key?: string) => {
    if (!navigator.onLine) throw new RequestError('You’re offline. Payment actions are disabled.');
    const token = await getAccessToken();
    const headers: Record<string, string> = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
    if (key) headers['idempotency-key'] = key;
    const response = await fetch(`/api/${path}`, { method: payload === undefined ? 'GET' : 'POST', headers, ...(payload === undefined ? {} : { body: JSON.stringify(payload) }), cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) throw new RequestError(result.error === 'PREFLIGHT_NOT_PAYABLE_NO_TRANSACTION_SENT' ? 'Current terms or funding do not allow this action. No transaction was sent. Refresh and adjust the amount.' : (result.error === 'INVALID_INPUT' ? `Check these fields: ${(result.fields || []).join(', ') || 'amounts and schedule'}.` : messages[result.error] || 'This action could not be completed. Refresh the information before trying again.') , result.requestId, result.error === 'PREFLIGHT_NOT_PAYABLE_NO_TRANSACTION_SENT');
    return result as T;
  }, [getAccessToken]);
}
export const money = (value: string | bigint | null | undefined) => {
  if (value == null) return '—';
  const n = BigInt(value), whole = n / 1_000_000n, fraction = (n % 1_000_000n).toString().padStart(6, '0').replace(/0+$/, '');
  return new Intl.NumberFormat(undefined).format(whole) + (fraction ? decimalSeparator() + fraction : '');
};
export const decimalSeparator = () => new Intl.NumberFormat(undefined).formatToParts(1.1).find(p => p.type === 'decimal')?.value || '.';
export function inputAmount(value: string, decimals = 6) {
  const decimal = decimalSeparator();
  if (decimal !== '.' && value.includes('.')) throw new Error(`Use ${decimal} for decimals, without thousands separators.`);
  return parseAmount(decimal === '.' ? value : value.replace(decimal, '.'), decimals);
}
export const date = (seconds: string | bigint) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(Number(seconds) * 1000));
export const zone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
const termsInput = (terms: Record<string, string | number>) => terms as TermsInput;

export function Terms({ terms }: { terms: Record<string, string | number> }) {
  const t = termsInput(terms);
  return <div className="terms"><h2>What everyone agrees to</h2><dl><div><dt>Each payment</dt><dd>{money(t.amount)} FBTEST</dd></div><div><dt>Schedule</dt><dd>{t.count} payments, every {Number(t.interval) / 86400} days</dd></div><div><dt>First due</dt><dd>{date(t.firstDue)}</dd></div><div><dt>Last due</dt><dd>{date(BigInt(t.firstDue) + BigInt(t.count - 1) * BigInt(t.interval))}</dd></div><div><dt>Funding closes</dt><dd>{date(t.fundingDeadline)}</dd></div><div><dt>Minimum backup to start</dt><dd>{money(t.minimumReserve)} FBTEST</dd></div><div><dt>Payment window</dt><dd>{Number(t.grace) / 3600} hours after each due time</dd></div><div><dt>Backup per payment</dt><dd>Up to {money(t.perPaymentCap)} FBTEST and {t.coverBps / 100}% of its amount</dd></div><div><dt>Total backup limit</dt><dd>{money(t.maximumReserve)} FBTEST</dd></div></dl><p>The owner’s money in this plan goes first. Backup is used only when the complete payment fits these limits. It is evaluated when the transaction runs, within the payment window.</p><p>Starting locks family backup and the owner’s money in this plan. Ending the plan cancels unpaid payments and makes remaining money separately claimable. Unused backup is shared under the frozen contribution ordering, including exact rounding.</p><small>All dates: {zone()}. FBTEST is a test-only asset with no real value.</small></div>;
}

