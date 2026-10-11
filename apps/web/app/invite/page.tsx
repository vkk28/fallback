import Link from 'next/link';
import { PublicInvitation } from '../ui/invitation';
export default async function Invitation({ searchParams }: { searchParams: Promise<{ request?: string }> }) { const { request } = await searchParams; return <><header><Link href="/" className="brand"><span aria-hidden="true">f.</span>fallback</Link><span className="network">Monad testnet · No real value</span></header><main id="main"><PublicInvitation inbox={!!request} /></main></>; }
