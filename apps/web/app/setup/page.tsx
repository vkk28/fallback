import Link from 'next/link';
import { AccountGate } from '../ui/account-gate';
export default function Setup() {
  return <><header><Link href="/" className="brand"><span>f.</span>fallback</Link><span className="network">Monad testnet · No real value</span></header><main id="main"><div className="eyebrow">DEVELOPMENT ACCOUNT CHECK</div><h1>Verify the account<br /><em>before moving money.</em></h1><p className="intro">This checks sign-in, the server-verified account, and reconnection. A transaction is confirmed only after its actual successful receipt.</p><AccountGate proof /><section className="notice"><div><h2>Check each action’s confirmation</h2><p>Account verification checks your identity. On your plan, review each action and wait for its confirmed receipt. Approval and allocation are separate actions; a submitted request alone does not mean money moved.</p></div></section></main></>;
}
