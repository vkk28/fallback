import Link from 'next/link';
import { AccountGate } from '../../ui/account-gate';
export default function Dashboard() { return <><header><Link href="/dashboard" className="brand"><span aria-hidden="true">f.</span>fallback</Link><span className="network">Monad testnet · No real value</span></header><main id="main"><AccountGate mode="dashboard" /></main></>; }
