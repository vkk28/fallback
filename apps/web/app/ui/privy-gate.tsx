'use client';
import { PrivyProvider, usePrivy, useWallets } from '@privy-io/react-auth';
import { monadTestnet } from 'viem/chains';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query';
import { Consumer, type ConsumerMode } from './consumer';
import type { AuthenticatedIdentity } from '../../../../packages/backend/src/auth';

function clearPrivateFormRecovery() { try { for (const key of Object.keys(sessionStorage)) if (key.startsWith('fallback:funding:')) sessionStorage.removeItem(key); } catch { /* Recovery storage may be unavailable. */ } }

type Props = { proof?: boolean; mode?: ConsumerMode; id?: string; online?: boolean; startLogin?: boolean; shared?: boolean };
function Session({ proof = false, mode, id, online = true, startLogin = false }: Props) {
  const { ready, authenticated, login, logout, getAccessToken, user } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  const cache = useQueryClient();
  const opened = useRef(false);
  useEffect(() => {
    if (startLogin && ready && !authenticated && online && !opened.current) { opened.current = true; login(); }
  }, [startLogin, ready, authenticated, online, login]);
  const [identity, setIdentity] = useState<AuthenticatedIdentity | null>(null), [status, setStatus] = useState(''), [busy, setBusy] = useState(false);
  const account = useQuery({ queryKey: ['account', user?.id], enabled: ready && authenticated && walletsReady && !proof, retry: false, queryFn: async () => {
    const token = await getAccessToken();
    const response = await fetch('/api/session', { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' });
    if (!response.ok) throw new Error('Reconnect your session to verify the account.');
    const result = await response.json() as AuthenticatedIdentity;
    const embedded = wallets.filter(w => w.walletClientType === 'privy' && w.walletIndex === 0);
    if (embedded.length !== 1 || embedded[0]!.address.toLowerCase() !== result.address) throw new Error('The embedded account and verified account must match.');
    return result;
  } });
  const previousUser = useRef(user?.id);
  useEffect(() => { if (previousUser.current && previousUser.current !== user?.id) { cache.clear(); clearPrivateFormRecovery(); setIdentity(null); setStatus(''); } previousUser.current = user?.id; }, [user?.id, cache]);
  async function signOut() { cache.clear(); clearPrivateFormRecovery(); setIdentity(null); setStatus(''); await logout(); }
  async function verify() {
    setBusy(true); setStatus('Verifying your account…');
    try {
      const token = await getAccessToken();
      const response = await fetch('/api/session', { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Account verification failed');
      const embedded = wallets.filter(w => w.walletClientType === 'privy' && w.walletIndex === 0);
      if (embedded.length !== 1 || embedded[0]!.address.toLowerCase() !== result.address) throw new Error('Embedded account does not match verified account');
      setIdentity(result); setStatus('Account verified. No transaction has been submitted.');
    } catch (error) { setIdentity(null); setStatus(error instanceof Error ? error.message : 'Verification failed. Try signing in again.'); }
    finally { setBusy(false); }
  }
  if (!ready) return <p role="status">Loading sign-in…</p>;
  if (!authenticated) return <><h2>Continue with your account</h2><p>Sign in with email to see your plans and requests.</p><button disabled={!online} onClick={login}>Sign in with email</button></>;
  if (!proof) {
    if (account.isPending) return <p role="status">Connecting and verifying your Fallback account…</p>;
    if (account.isError) return <p role="alert" className="error">{account.error.message} <button className="secondary" onClick={() => account.refetch()}>Reconnect</button><button className="secondary" onClick={signOut}>Use another account</button></p>;
    if (mode) return <Consumer key={account.data.id} online={online} mode={mode} {...(id ? { id } : {})} identity={account.data.id} address={account.data.address} walletId={account.data.walletId} signOut={signOut} />;
    return <><p>Your Fallback account is connected.</p><Link className="button-link" href="/dashboard">Open Home</Link></>;
  }
  return <><p>{identity ? 'Your embedded account is connected.' : 'Verify your account before continuing.'}</p><div className="buttons"><button disabled={busy || !navigator.onLine} onClick={verify}>Verify account</button><button className="secondary" onClick={signOut}>Sign out</button><Link className="button-link" href="/dashboard">Open your plans</Link></div><p role="status">{status}</p>{proof && identity && <details><summary>Verified account details</summary><code>{identity.address}</code><p>Reconnect using the configured sign-in or recovery method. A successful sign-in does not yet prove gas sponsorship.</p></details>}</>;
}
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 5000, retry: 1, refetchOnWindowFocus: true, refetchOnReconnect: true, refetchIntervalInBackground: false } } }));
  return <QueryClientProvider client={queryClient}><PrivyProvider appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!} config={{ loginMethods: ['email'], defaultChain: monadTestnet, supportedChains: [monadTestnet], embeddedWallets: { ethereum: { createOnLogin: 'users-without-wallets' } }, appearance: { theme: 'light', accentColor: '#242424' } }}>{children}</PrivyProvider></QueryClientProvider>;
}

export default function Gate(props: Props) { return props.shared ? <Session {...props} /> : <Providers><Session {...props} /></Providers>; }
