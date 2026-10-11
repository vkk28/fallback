import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Plan } from '../../../apps/web/app/ui/plan';
import { CreatePlan } from '../../../apps/web/app/ui/create-plan';
import { Account } from '../../../apps/web/app/ui/account';
import { Dashboard } from '../../../apps/web/app/ui/home';
import { Invite } from '../../../apps/web/app/ui/invitation';
import { InvitationManager } from '../../../apps/web/app/ui/invitation-manager';
import type { API, PlanData } from '../../../apps/web/app/ui/core';
const scenario = new URL(location.href).searchParams.get('scenario') || 'active';
const who = new URL(location.href).searchParams.get('actor') || 'owner';
const assetAmount = '1000000';
const now = Math.floor(Date.now() / 1000);
const t = { amount: assetAmount, minimumReserve: assetAmount, maximumReserve: '3000000', perPaymentCap: assetAmount, firstDue: String(now + 172800), interval: '86400', grace: '3600', fundingDeadline: String(now - 3600), count: 2, coverBps: 10000 };
const accountAddress = '0x0000000000000000000000000000000000000200';
const restore = JSON.parse(sessionStorage.getItem('fixture-plan') || 'null');
const p: PlanData = restore || { plan: { id: 'fixture-plan', label: 'Synthetic UI test plan', address: '0x0000000000000000000000000000000000000100', payee: accountAddress, role: scenario === 'supporter' ? 'supporter' : scenario === 'payee' ? 'payee' : 'recipient', terms: t, proposalHash: null }, current: { lifecycle: scenario === 'closed' ? 2 : 1, own: scenario === 'closed' ? '0' : '1000000', reserve: scenario === 'closed' ? '0' : '2000000', used: '0', totalPaid: '0', timestamp: String(now), observedAt: new Date().toISOString(), block: '1', chainId: 10143, recipient: '0x0000000000000000000000000000000000000300', payee: accountAddress, terms: { ...t, metadataCommitment: '0x' + '00'.repeat(32) }, frozenFunding: '2000000', frozenReserve: '2000000', claimable: '0', share: scenario === 'supporter' ? ['2000000', '2000000', '0', true, false] : ['0', '0', '0', false, false], supporters: [accountAddress], outcomes: [0, 0], preview: { due: t.firstDue, own: '1000000', gap: '0', allowedBackup: '1000000', reason: 3, index: 0 } }, consent: null, chainError: null, history: { Timeline: [], sync: null }, fundingApproval: null, outstanding: scenario === 'pending' ? { id: 'a'.repeat(64), action: 'approveOwn', hash: null, amount: '1000000' } : null };
window.fixtureAuthorizations = 0; window.fixtureCalls = [];
let pending: { id: string; action: string; amount: string } | null = p.outstanding ? { id: p.outstanding.id, action: p.outstanding.action, amount: '1000000' } : null;
let confirmed = false;
const record = () => sessionStorage.setItem('fixture-plan', JSON.stringify(p));
const api: API = async <T,>(path: string, body?: unknown) => {
  window.fixtureCalls.push((body === undefined ? 'GET ' : 'POST ') + path);
  const input = body as Record<string, unknown> | undefined;
  let result: unknown;
  if (path === 'health') result = { deploymentConfigured: true, sponsorshipEnabled: true };
  else if (path === 'invitation-delivery-status') result = { configured: false };
  else if (path === 'plans/fixture-plan/invitations') result = JSON.parse(sessionStorage.getItem('fixture-invitations') || '[]');
  else if (path === 'invitations') {
    const rows = JSON.parse(sessionStorage.getItem('fixture-invitations') || '[]');
    if (input!.replace) rows.find((r: { id: string }) => r.id === input!.replace).status = 'replaced';
    const row = { id: rows.length === 0 ? 'c'.repeat(64) : 'd'.repeat(64), role: 'payee', contact: input!.email ? 'email' : 'link', intendedAddress: null, status: 'open', expiresAt: new Date(Date.now() + 86400_000).toISOString(), delivery: null, attempts: null, nextAttemptAt: null };
    rows.push(row); sessionStorage.setItem('fixture-invitations', JSON.stringify(rows));
    result = { ...row, token: 't'.repeat(43) };
  } else if (path === 'invitations/revoke') {
    const rows = JSON.parse(sessionStorage.getItem('fixture-invitations') || '[]'); rows.find((r: { id: string }) => r.id === input!.id).status = 'revoked'; sessionStorage.setItem('fixture-invitations', JSON.stringify(rows)); result = { revoked: true };
  } else if (path === 'invitations/accept') result = { planId: 'fixture-plan' };
  else if (path === 'invitations/decline') result = { declined: true };
  else if (path === 'plans/fixture-plan') result = structuredClone(p);
  else if (path === 'profile') result = { displayName: 'Saved fixture name' };
  else if (path === 'people' || path === 'requests') result = [];
  else if (path.startsWith('plan-summaries')) result = { items: [], next: null };
  else if (path === 'setup-draft' && !input) result = JSON.parse(sessionStorage.getItem(`fixture-draft-${who}`) || 'null');
  else if (path === 'setup-draft') {
    const old = JSON.parse(sessionStorage.getItem(`fixture-draft-${who}`) || 'null');
    if ((old?.version || 0) !== input!.version) throw new Error('This setup was changed in another tab. Reload the saved version before continuing.');
    const saved = { fields: input!.fields, step: input!.step, version: Number(input!.version) + 1 };
    sessionStorage.setItem(`fixture-draft-${who}`, JSON.stringify(saved)); result = { version: saved.version };
  } else if (path === 'transactions') {
    pending = { id: 'b'.repeat(64), action: input!.action as string, amount: input!.amount as string };
    p.outstanding = { id: pending.id, action: pending.action, hash: null, amount: pending.amount }; record();
    const expiry = Date.now() + 120_000;
    const payload = { version: 1, method: 'POST', url: 'https://api.privy.io/v1/wallets/fixture-wallet/rpc', headers: { 'privy-app-id': 'ui-fixture', 'privy-idempotency-key': pending.id, 'privy-request-expiry': String(expiry) }, body: { sponsor: true, method: 'eth_sendTransaction', chain_type: 'ethereum', caip2: 'eip155:10143', params: { transaction: { value: '0x0', chain_id: 10143 } } } };
    result = { requestId: pending.id, hash: null, requestExpiry: expiry, payloadBase64: btoa(JSON.stringify(payload)) };
  } else if (path.endsWith('/submit')) {
    confirmed = true;
    if (pending?.action === 'approveOwn') p.fundingApproval = { amount: pending.amount };
    if (pending?.action === 'addOwn') { p.fundingApproval = null; p.current!.own = (BigInt(p.current!.own) + BigInt(pending.amount)).toString(); }
    p.outstanding = null; record(); result = { status: 'confirmed' };
  } else if (path.startsWith('transactions/')) result = { status: confirmed ? 'confirmed' : 'prepared', hash: null };
  else result = {};
  return result as T;
};
const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity, refetchOnWindowFocus: false } } });
createRoot(document.getElementById('app')!).render(<QueryClientProvider client={client}><main id="main"><p role="note">Isolated UI test fixture. All values are synthetic; no real account, provider or network transaction.</p>{scenario === 'invite' ? <Invite api={api} address={accountAddress} /> : scenario === 'onboarding' ? <><h1>Isolated invitation management</h1><InvitationManager api={api} planId="fixture-plan" identity={who} role="payee" boundAddress={null} online={true} onJoined={async () => {}} /></> : scenario === 'create' ? <CreatePlan api={api} identity={who} online={true} /> : scenario === 'account' ? <Account api={api} identity={who} address={accountAddress} signOut={async () => {}} /> : scenario === 'home' ? <Dashboard api={api} identity={who} /> : <Plan api={api} id="fixture-plan" identity={who} online={true} walletId="fixture-wallet" />}</main></QueryClientProvider>);
