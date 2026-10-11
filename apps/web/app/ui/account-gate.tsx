'use client';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import type { ConsumerMode } from './core';
const PrivyGate = dynamic(() => import('./privy-gate'), { ssr: false, loading: () => <p role="status">Connecting account services…</p> });
export function AccountGate({ proof = false, mode, id, startLogin = false }: { proof?: boolean; mode?: ConsumerMode; id?: string; startLogin?: boolean }) {
  const [online, setOnline] = useState(true), [connect, setConnect] = useState(startLogin);
  useEffect(() => { const update = () => setOnline(navigator.onLine); update(); window.addEventListener('online', update); window.addEventListener('offline', update); return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); }; }, []);
  return <section className={mode ? 'app-boundary' : 'account'} aria-label={mode ? 'Your Fallback workspace' : 'Start with your account'}>{!mode && <><p className="account-label">Your account</p><h2>A clear place to start.</h2></>}{!online && <p className="offline-notice" role="status">You’re offline. Visible money information may be stale. Payment actions are disabled; keep unfinished forms open.</p>}{process.env.NEXT_PUBLIC_PRIVY_APP_ID ? (proof || mode || connect ? <PrivyGate shared={!!mode && mode !== 'invite'} proof={proof} online={online} startLogin={connect} {...(mode ? { mode } : {})} {...(id ? { id } : {})} /> : <><p>Continue with email. Your Fallback account holds test tokens for the plans you choose.</p><button disabled={!online} onClick={() => setConnect(true)}>Sign in with email</button></>) : <><p>Sign-in is not configured yet. Plans and payment actions are unavailable.</p><button disabled>Sign in to Fallback</button></>}</section>;
}
