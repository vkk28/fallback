'use client';
import dynamic from 'next/dynamic';
const Providers = dynamic(() => import('./privy-gate').then(module => module.Providers), { ssr: false, loading: () => <main id="main"><p role="status">Connecting account services…</p></main> });
export function WorkspaceProvider({ children }: { children: React.ReactNode }) { return process.env.NEXT_PUBLIC_PRIVY_APP_ID ? <Providers>{children}</Providers> : children; }
