'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { AccountGate } from './account-gate';
import { Terms, zone, type API, type Role } from './core';

type Preview = { planId: string; role: Role; label: string; requestedBy: string; terms: Record<string, string | number>; intendedAddress: string | null; payee: string | null; requiresVerifiedEmail: boolean; expiresAt: string };
const intentKey = 'fallback:invitation-intent';
export function invitationSource() {
  const id = new URLSearchParams(window.location.search).get('request');
  let token = window.location.hash.slice(1);
  try {
    if (id || token) {
      if (id && /^[a-f0-9]{64}$/.test(id) || /^[a-zA-Z0-9_-]{43}$/.test(token)) sessionStorage.setItem(intentKey, JSON.stringify({ id, token, until: Date.now() + 24 * 3600_000 }));
      else sessionStorage.removeItem(intentKey);
    } else {
      const saved = JSON.parse(sessionStorage.getItem(intentKey) || 'null');
      if (saved?.until > Date.now()) {
        if (saved.id && /^[a-f0-9]{64}$/.test(saved.id)) return { id: saved.id as string, token: '' };
        token = saved.token || '';
      } else sessionStorage.removeItem(intentKey);
    }
  } catch { /* The URL still works if tab-local recovery storage is unavailable. */ }
  return { id, token };
}
function clearIntent() { try { sessionStorage.removeItem(intentKey); } catch { /* Optional tab-local recovery. */ } }
async function publicPreview(token = invitationSource().token) {
  if (!/^[a-zA-Z0-9_-]{43}$/.test(token)) throw new Error('This invitation link is incomplete. Open your Requests on Home or ask for a new invitation.');
  const response = await fetch('/api/invitations/preview', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token }), cache: 'no-store' });
  const result = await response.json();
  const unavailable: Record<string, string> = { INVITATION_REVOKED: 'The owner revoked this invitation. Ask for a new link.', INVITATION_REPLACED: 'This invitation was replaced. Use the latest link.', INVITATION_DECLINED: 'This request was declined. Ask the owner for a new invitation if needed.' };
  if (!response.ok) throw new Error(unavailable[result.error] || (response.status === 410 ? 'This invitation has expired or was already accepted. Check Home for an accepted plan, or ask for a new invitation.' : 'This invitation is unavailable. Check the link and try again.'));
  return result as Preview;
}
export function PublicInvitation({ inbox = false }: { inbox?: boolean }) {
  const [preview, setPreview] = useState<Preview | null>(null), [error, setError] = useState(''), [connect, setConnect] = useState(false), [attempt, setAttempt] = useState(0), [restoredInbox, setRestoredInbox] = useState(false);
  useEffect(() => { const changed = () => { setPreview(null); setError(''); setAttempt(a => a + 1); }; window.addEventListener('hashchange', changed); return () => window.removeEventListener('hashchange', changed); }, []);
  useEffect(() => {
    const source = invitationSource();
    if (inbox || source.id) { void Promise.resolve().then(() => setRestoredInbox(true)); return; }
    let active = true;
    publicPreview(source.token).then(p => { if (active) setPreview(p); }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [attempt, inbox]);
  if (inbox || restoredInbox || connect) return <AccountGate mode="invite" startLogin={connect} />;
  return <section className="flow-card"><p className="eyebrow">An invitation to Fallback</p><h1>{preview?.role === 'supporter' ? 'Be someone’s backup.' : 'Review a payment plan.'}</h1>{error ? <div role="alert" className="error"><p>{error}</p><button className="secondary" onClick={() => { setError(''); setAttempt(a => a + 1); }}>Check invitation again</button><Link className="text-action" href="/dashboard">Open Home</Link></div> : !preview ? <p role="status">Loading invitation details…</p> : <><p>{preview.requestedBy} invited you to {preview.role === 'supporter' ? 'reserve family backup' : 'receive scheduled payments'} for <strong>{preview.label}</strong>.</p><p>Joining does not move money. You will review the exact terms before authorizing any action.</p><p>Respond before {new Date(preview.expiresAt).toLocaleString()} · {zone()}.</p><Terms terms={preview.terms} /><button onClick={() => { invitationSource(); setConnect(true); }}>Sign in to review this request</button><p className="field-help">{preview.requiresVerifiedEmail ? 'Sign in with the email the invitation was sent to. Privy must verify it.' : preview.intendedAddress ? 'Use the sign-in for the invited account.' : 'New here? Email sign-in creates your account. Return here to review and join; your account becomes the fixed destination.'} Names are profile labels, not identity verification.</p></>}</section>;
}
export function Invite({ api, address }: { api: API; address?: string }) {
  const router = useRouter();
  const [source, setSource] = useState(invitationSource), [agreed, setAgreed] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(''), [declined, setDeclined] = useState(false);
  const key = useRef(crypto.randomUUID()), guard = useRef(false);
  useEffect(() => { const changed = () => { setSource(invitationSource()); setAgreed(false); setDeclined(false); setError(''); key.current = crypto.randomUUID(); }; window.addEventListener('hashchange', changed); return () => window.removeEventListener('hashchange', changed); }, []);
  const preview = useQuery({ queryKey: ['invitation', source.id, source.token], retry: false, refetchOnWindowFocus: false, queryFn: () => source.id ? api<Preview>(`requests/${encodeURIComponent(source.id)}`) : publicPreview(source.token) });
  async function respond(decline = false) {
    if (guard.current || !decline && !agreed) return;
    guard.current = true; setBusy(true); setError('');
    try { const r = await api<{ planId: string }>(`${source.id ? 'requests' : 'invitations'}/${decline ? 'decline' : 'accept'}`, source.id ? { id: source.id } : { token: source.token }, key.current + (decline ? '-decline' : '-accept')); clearIntent(); if (decline) setDeclined(true); else router.push(`/plans/${r.planId}`); }
    catch (e) { setError(e instanceof Error ? e.message : 'Invitation response could not be confirmed. Retry the same response.'); }
    finally { guard.current = false; setBusy(false); }
  }
  if (declined) return <section className="flow-card"><h1>Invitation declined</h1><p>You have not joined this plan. No money moved and no financial terms were accepted.</p><Link className="button-link" href="/dashboard">Open Home</Link></section>;
  return <section className="flow-card"><Link className="text-action" href="/dashboard">← Home</Link><p className="eyebrow">Review your request</p><h1>{preview.data?.role === 'supporter' ? 'Reserve family backup.' : 'Payments to you.'}</h1>{preview.isPending ? <p role="status">Loading the invitation…</p> : preview.isError ? <p role="alert" className="error">{preview.error.message} <button className="secondary" onClick={() => preview.refetch()}>Check again</button></p> : <><p>{preview.data.requestedBy} invited you to <strong>{preview.data.label}</strong>.</p><p>Respond before {new Date(preview.data.expiresAt).toLocaleString()} · {zone()}.</p><Terms terms={preview.data.terms} /><details><summary>Joining account and payment destination</summary><p>Joining account: <code>{address || preview.data.intendedAddress || 'Your verified Fallback account'}</code></p><p>Payments go to: <code>{preview.data.payee || (preview.data.role === 'payee' ? address || 'Your verified account, once you join' : 'Waiting for the payee')}</code></p></details>{preview.data.requiresVerifiedEmail && <p>Only the Privy account with the invited email verified can join.</p>}<label className="check"><input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} />I reviewed this request and want to join with this account.</label><button disabled={!agreed || busy} onClick={() => respond()}>{busy ? 'Saving response…' : 'Join this plan'}</button><button className="secondary" disabled={busy} onClick={() => respond(true)}>Decline invitation</button><p className="field-help">{preview.data.role === 'payee' ? 'Next, accept the exact payment terms using your account. Joining alone is not payment acceptance.' : 'Next, choose how much support to reserve. Joining alone does not contribute money.'}</p></>}{error && <div className="error" role="alert"><p>{error}</p><p>If this is the wrong account, switch accounts from Account, then reopen this invitation.</p></div>}</section>;
}
