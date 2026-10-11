'use client';
import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { type API, zone } from './core';
export function Account({ api, identity, address, signOut }: { api: API; identity: string; address: string; signOut: () => Promise<void> }) {
  const profile = useQuery({ queryKey: ['profile', identity], queryFn: () => api<{ displayName: string | null }>('profile') });
  const [enteredName, setName] = useState<string | null>(null), [edited, setEdited] = useState(false), [status, setStatus] = useState(''), [busy, setBusy] = useState(false);
  const key = useRef(crypto.randomUUID());
  const name = enteredName ?? profile.data?.displayName ?? '';
  async function save() { setBusy(true); try { await api('profile', { displayName: name }, key.current); setStatus('Your profile name is saved.'); await profile.refetch(); setEdited(false); } catch (e) { setStatus(e instanceof Error ? e.message : 'Profile unavailable.'); } finally { setBusy(false); } }
  return <section className="reading"><div className="section-head"><div><p className="eyebrow">Your identity</p><h1>Account</h1></div></div><h2>A name people recognize</h2><p>This name appears on invitations and stays offchain. It is not proof of identity.</p>{profile.isPending ? <p role="status">Loading your profile…</p> : profile.isError ? <p role="alert">Profile could not be loaded. <button className="secondary" onClick={() => profile.refetch()}>Try again</button></p> : <form onSubmit={e => { e.preventDefault(); save(); }}><label htmlFor="display-name">Display name</label><input id="display-name" autoComplete="nickname" maxLength={50} required value={name} onChange={e => { setName(e.target.value); setEdited(true); key.current = crypto.randomUUID(); }} /><button disabled={busy || !name.trim() || !edited}>{busy ? 'Saving…' : 'Save name'}</button><p role="status">{status}</p></form>}<section className="account-section"><h2>Sign-in and recovery</h2><p>Use the same email sign-in to reconnect. Recovery depends on the options offered by your configured account provider.</p><p>Dates use {zone()}.</p><details><summary>Technical account details</summary><p>Your Fallback destination</p><code>{address}</code><p>Monad testnet · FBTEST test tokens have no real value.</p></details><button className="secondary" onClick={signOut}>Sign out</button></section></section>;
}
