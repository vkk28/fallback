import Link from 'next/link';
import { AccountGate } from '../../../ui/account-gate';
export default async function Plan({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <><header><Link href="/dashboard" className="brand"><span aria-hidden="true">f.</span>fallback</Link><span className="network">Monad testnet · No real value</span></header><main id="main"><AccountGate mode="plan" id={id} /></main></>; }
