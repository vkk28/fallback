'use client';
import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthorizationSignature } from '@privy-io/react-auth';
import { RequestError, type API, type PlanData } from './core';

type PreparedRequest = { requestId: string; hash: string | null; payloadBase64?: string; requestExpiry?: number };
export function useTransaction(api: API, planId: string, identity: string, recovered: PlanData['outstanding'] | undefined, walletId: string) {
  const { generateAuthorizationSignature } = useAuthorizationSignature();
  const cache = useQueryClient(), guard = useRef(false);
  const intent = useRef<{ action: string; amount?: string; key: string; requestId?: string } | null>(null);
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const [requestId, setRequestId] = useState<string | undefined>(), [actionName, setActionName] = useState<string | undefined>();
  const [message, setMessage] = useState(''), [phase, setPhase] = useState('idle'), [hash, setHash] = useState<string | null>(null);
  useEffect(() => {
    if (!recovered || intent.current || guard.current) return;
    intent.current = { action: recovered.action, key: '', requestId: recovered.id }; setRequestId(recovered.id); setActionName(recovered.action);
    setHash(recovered.hash); setPhase('unknown'); setMessage('A stored request needs confirmation. Check this same request before authorizing another action.');
  }, [recovered]);
  async function authorize(result: PreparedRequest) {
    if (!result.payloadBase64 || !result.requestExpiry) return;
    if (!navigator.onLine) throw new Error('You’re offline. This authorization is not queued.');
    setPhase('submitting'); setMessage('Authorizing the exact stored request with your account…');
    const bytes = Uint8Array.from(atob(result.payloadBase64), c => c.charCodeAt(0));
    const payload = JSON.parse(new TextDecoder().decode(bytes));
    if (payload.version !== 1 || payload.method !== 'POST' || payload.url !== `https://api.privy.io/v1/wallets/${walletId}/rpc` || payload.headers?.['privy-app-id'] !== process.env.NEXT_PUBLIC_PRIVY_APP_ID || payload.headers?.['privy-idempotency-key'] !== result.requestId || payload.headers?.['privy-request-expiry'] !== String(result.requestExpiry) || payload.body?.sponsor !== true || payload.body?.method !== 'eth_sendTransaction' || payload.body?.chain_type !== 'ethereum' || payload.body?.caip2 !== 'eip155:10143' || payload.body?.params?.transaction?.value !== '0x0' || payload.body?.params?.transaction?.chain_id !== 10143) throw new Error('Unexpected authorization request');
    const { signature } = await generateAuthorizationSignature(bytes);
    await api(`transactions/${result.requestId}/submit`, { signature, requestExpiry: result.requestExpiry });
  }
  async function poll(id: string) {
    for (let i = 0; i < 18; i++) {
      if (!active.current) return false;
      const result = await api<{ status: string; hash: string | null; indexed?: boolean }>(`transactions/${id}`);
      if (result.hash) setHash(result.hash);
      if (result.status === 'confirmed') { setPhase('confirmed'); setMessage('Confirmed onchain. History may still be syncing.'); intent.current = null; await cache.invalidateQueries({ queryKey: ['plan', identity, planId] }); await cache.invalidateQueries({ queryKey: ['plan-summaries', identity] }); await cache.invalidateQueries({ queryKey: ['activity', identity] }); return true; }
      if (result.status === 'failed') { setPhase('failed'); setMessage('The transaction failed. Its attempted state change did not complete.'); intent.current = null; return false; }
      setPhase('pending'); setMessage('Waiting for network confirmation. A submitted request is not a completed action.');
      await new Promise(resolve => setTimeout(resolve, 5000));
      if (!navigator.onLine) throw new Error('You’re offline. Keep this request and check it when connected.');
    }
    setPhase('unknown'); setMessage('Confirmation is taking longer. Check this same request before starting another.'); return false;
  }
  async function run(action: string, amount?: string) {
    if (guard.current || !navigator.onLine) return false;
    if (intent.current && (intent.current.action !== action || intent.current.amount !== amount)) { setMessage('Resolve the previous request before authorizing another.'); return false; }
    guard.current = true; setActionName(action);
    if (!intent.current) intent.current = { action, ...(amount ? { amount } : {}), key: crypto.randomUUID() };
    try {
      setPhase('submitting'); setMessage('Requesting your authorization and sponsored submission…');
      if (!intent.current.requestId) {
        const result = await api<PreparedRequest>('transactions', { planId, action, ...(amount ? { amount } : {}) }, intent.current.key);
        intent.current.requestId = result.requestId; setRequestId(result.requestId); setHash(result.hash); await authorize(result);
      }
      return await poll(intent.current.requestId);
    } catch (error) {
      if (error instanceof RequestError && error.noTransactionSent) { intent.current = null; setPhase('failed'); setMessage(error.message); return false; }
      if (error instanceof RequestError && error.requestId && intent.current) { intent.current.requestId = error.requestId; setRequestId(error.requestId); }
      setPhase('unknown'); setMessage(error instanceof RequestError ? error.message : 'Your account did not finish authorizing this request. Check the same stored request again.'); return false;
    } finally { guard.current = false; }
  }
  async function check() {
    if (guard.current || !intent.current || !navigator.onLine) return;
    if (!intent.current.requestId) { setPhase('needs-authorization'); setMessage('No stored reference was returned. Continue the same action to recover its original request.'); return; }
    guard.current = true;
    try {
      const result = await api<{ status: string; hash: string | null }>(`transactions/${intent.current.requestId}`);
      if (result.hash) setHash(result.hash);
      if (result.status === 'confirmed' || result.status === 'failed') {
        setPhase(result.status); setMessage(result.status === 'confirmed' ? 'Confirmed. Activity may still be updating.' : 'The attempted action did not complete.'); intent.current = null;
        await cache.invalidateQueries({ queryKey: ['plan', identity, planId] });
      } else if (result.status === 'prepared' && !result.hash) {
        setPhase('needs-authorization'); setMessage('This stored action still needs authorization. Review its original details before continuing.');
      } else { setPhase('unknown'); setMessage('Still waiting for confirmation. Check this same request again; no new authorization was requested.'); }
    } catch (error) { setPhase('unknown'); setMessage(error instanceof Error ? error.message : 'Status is unavailable. Keep this request and try again.'); }
    finally { guard.current = false; }
  }
  async function reauthorize() {
    if (guard.current || !intent.current || !navigator.onLine || phase !== 'needs-authorization') return;
    if (!intent.current.requestId) { await run(intent.current.action, intent.current.amount); return; }
    guard.current = true;
    try { await authorize(await api<PreparedRequest>(`transactions/${intent.current.requestId}/retry`, {})); await poll(intent.current.requestId); }
    catch (error) { setPhase('unknown'); setMessage(error instanceof Error ? error.message : 'Authorization is incomplete. Check this stored action again.'); }
    finally { guard.current = false; }
  }
  return { run, check, reauthorize, phase, message, hash, requestId, action: actionName, blocked: phase === 'submitting' || phase === 'pending' || phase === 'unknown' || phase === 'needs-authorization' };
}

