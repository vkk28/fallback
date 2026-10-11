'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { AccountGate } from './account-gate';
import { Terms, type API, type Role } from './core';

type Preview = { planId: string; role: Role; label: string; requestedBy: string; terms: Record<string, string | number>; intendedAddress: string; payee: string; expiresAt: string };
async function publicPreview() {
  const token = window.location.hash.slice(1);
  if (!/^[a-zA-Z0-9_-]{43}$/.test(token)) throw new Error('This invitation link is incomplete. Open your Requests on Home or ask for a new invitation.');
  const response = await fetch('/api/invitations/preview', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token }), cache: 'no-store' });
  const result = await response.json();
  if (!response.ok) throw new Error(response.status === 410 ? 'This invitation has expired or was already accepted. Check Home for an accepted plan, or ask for a new invitation.' : 'This invitation is unavailable. Check the link and try again.');
  return result as Preview;
}
export function PublicInvitation({ inbox = false }: { inbox?: boolean }) {
  const [preview, setPreview] = useState<Preview | null>(null), [error, setError] = useState(''), [connect, setConnect] = useState(false), [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (inbox) return;
    let active = true;
    publicPreview().then(p => { if (active) setPreview(p); }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [attempt, inbox]);
  if (inbox || connect) return <AccountGate mode="invite" startLogin={connect} />;
  return <section className="flow-card"><p className="eyebrow">An invitation to Fallback</p><h1>{preview?.role === 'supporter' ? 'Be someone’s backup.' : 'Review a payment plan.'}</h1>{error ? <div role="alert" className="error"><p>{error}</p><button className="secondary" onClick={() => { setError(''); setAttempt(a => a + 1); }}>Check invitation again</button><Link className="text-action" href="/dashboard">Open Home</Link></div> : !preview ? <p role="status">Loading invitation details…</p> : <><p>{preview.requestedBy} invited you to {preview.role === 'supporter' ? 'reserve family backup' : 'receive scheduled payments'} for <strong>{preview.label}</strong>.</p><p>Joining does not move money. You will review the exact terms before authorizing any action.</p><Terms terms={preview.terms} /><button onClick={() => setConnect(true)}>Sign in to review this request</button><p className="field-help">Use the email for the invited Fallback account. Names are profile labels, not identity verification.</p></>}</section>;
}
export function Invite({ api }: { api: API }) {
  const router = useRouter();
  const [source] = useState(() => ({ id: new URLSearchParams(window.location.search).get('request'), token: window.location.hash.slice(1) })), [agreed, setAgreed] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const key = useRef(crypto.randomUUID());
  const preview = useQuery({ queryKey: ['invitation', source?.id, source?.token], enabled: !!source, retry: false, refetchOnWindowFocus: false, queryFn: () => source!.id ? api<Preview>(`requests/${encodeURIComponent(source!.id)}`) : publicPreview() });
  async function accept() { if (busy || !agreed || !source) return; setBusy(true); try { const r = await api<{ planId: string }>(source.id ? 'requests/accept' : 'invitations/accept', source.id ? { id: source.id } : { token: source.token }, key.current); router.push(`/plans/${r.planId}`); } catch (e) { setError(e instanceof Error ? e.message : 'Invitation could not be accepted.'); setBusy(false); } }
  return <section className="flow-card"><Link className="text-action" href="/dashboard">← Home</Link><p className="eyebrow">Review your request</p><h1>{preview.data?.role === 'supporter' ? 'Reserve family backup.' : 'Payments to you.'}</h1>{preview.isPending ? <p role="status">Loading the invitation…</p> : preview.isError ? <p role="alert" className="error">{preview.error.message} <button className="secondary" onClick={() => preview.refetch()}>Check again</button></p> : <><p>{preview.data.requestedBy} invited you to <strong>{preview.data.label}</strong>.</p><Terms terms={preview.data.terms} /><details><summary>Invited account and payment destination</summary><p>Invited account: <code>{preview.data.intendedAddress}</code></p><p>Payments go to: <code>{preview.data.payee}</code></p></details><label className="check"><input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} />I reviewed this request and want to join with the invited account.</label><button disabled={!agreed || busy} onClick={accept}>{busy ? 'Joining…' : 'Join this plan'}</button><p className="field-help">{preview.data.role === 'payee' ? 'Next, accept the exact payment terms using your account. Joining alone is not payment acceptance.' : 'Next, choose how much support to reserve. Joining alone does not contribute money.'}</p></>}{error && <div className="error" role="alert"><p>{error}</p><p>If this is the wrong account, switch accounts from Account, then reopen this invitation.</p></div>}</section>;
}
