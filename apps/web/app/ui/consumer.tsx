'use client';
import { PrimaryNav } from './primary-nav';
import { useAPI, type ConsumerMode } from './core';
import { Dashboard } from './home';
import { CreatePlan } from './create-plan';
import { Plan } from './plan';
import { Invite } from './invitation';
import { Activity } from './activity';
import { Account } from './account';
export type { ConsumerMode } from './core';
export function Consumer({ mode, id, identity, address, online, walletId, signOut }: { mode: ConsumerMode; id?: string; identity: string; address: string; online: boolean; walletId: string; signOut: () => Promise<void> }) {
  const api = useAPI();
  const active = mode === 'activity' ? 'activity' : mode === 'account' ? 'account' : 'home';
  return <div className="consumer"><PrimaryNav active={active} /><div className="consumer-content">{mode === 'dashboard' ? <Dashboard api={api} identity={identity} /> : mode === 'create' ? <CreatePlan api={api} identity={identity} online={online} /> : mode === 'invite' ? <Invite api={api} /> : mode === 'activity' ? <Activity api={api} identity={identity} /> : mode === 'account' ? <Account api={api} identity={identity} address={address} signOut={signOut} /> : id ? <Plan api={api} id={id} identity={identity} online={online} walletId={walletId} /> : <p role="alert">A plan identifier is required.</p>}</div></div>;
}
