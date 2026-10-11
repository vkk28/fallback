import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, HeartHandshake, ShieldCheck, Wallet } from 'lucide-react';
import { PrimaryNav } from '../ui/primary-nav';

export const metadata: Metadata = {
  title: 'About Fallback — how family backup works',
  description: 'Understand reserved family support, how to set up a payment plan, and when a simpler transfer may be a better fit.',
};

const alternatives = [
  { name: 'Send money when it is needed', useful: 'A one-off payment, or support you want to decide on each time.', difference: 'Reserve support in advance, so each scheduled shortfall does not need a new request. The agreed limits decide whether it can be paid.' },
  { name: 'Give the support upfront', useful: 'The person needs money they can spend freely.', difference: 'Keep backup dedicated to an agreed payee and schedule. It is used only for a shortfall in that plan; unused support becomes claimable when the plan ends.' },
  { name: 'Set up a fixed recurring transfer', useful: 'You want to send the same amount regularly.', difference: 'The backup amount depends on the money allocated to this plan. If that money covers the payment, no backup is used.' },
  { name: 'Keep an agreement in messages or a spreadsheet', useful: 'You want flexible arrangements and are happy to move and reconcile money yourself.', difference: 'The plan contract applies the agreed funding and payment rules, and the app shows confirmed activity. You still need to check its status and keep enough money allocated.' },
];

export default function About() {
  return <><header><Link href="/" className="brand"><span aria-hidden="true">f.</span>fallback</Link><span className="network">Monad testnet · No real value</span></header><main id="main"><div className="consumer"><PrimaryNav active="about" /><article className="about-page">
    <div className="about-hero"><p className="eyebrow">About Fallback</p><h1>Family backup.<br />Agreed before you need it.</h1><p className="intro">Fallback helps you and someone who supports you set aside a backup for recurring payments to a person you know. Your money in the plan pays first. Their reserved support fills a shortfall within limits you all agree to.</p><p className="about-status">You can try this version on Monad testnet with FBTEST tokens. They have no real value and do not pay a real housing bill.</p></div>
    <nav className="section-nav" aria-label="About sections"><a href="#about-why">Why use it</a><a href="#about-how">How to use it</a><a href="#about-alternatives">Compare options</a></nav>

    <section className="about-section" aria-labelledby="about-why"><h2 id="about-why">Why use it?</h2><p>When income arrives at uneven times, the awkward part can be asking for help again and again. Fallback lets you agree on the support before a payment is due, with a clear purpose and a clear limit.</p><div className="cards"><div><Wallet aria-hidden="true" /><h3>Use your money first</h3><p>Only money allocated to this plan counts. Having money elsewhere does not change when backup can be used.</p></div><div><ShieldCheck aria-hidden="true" /><h3>Know the boundary</h3><p>Everyone reviews the payee, schedule and backup limits. Published terms stay fixed; changing them needs a new plan and fresh agreement.</p></div><div><HeartHandshake aria-hidden="true" /><h3>Keep unused support</h3><p>Support is reserved for the plan. After it ends, each person can claim their own remaining money through a separate return action.</p></div></div></section>

    <section className="about-section" aria-labelledby="about-example"><h2 id="about-example">A simple example</h2><p className="eyebrow">Illustration only · not your balance</p><div className="about-example"><div><span>Payment due</span><strong>150 <small>FBTEST</small></strong></div><div><span>Your money in the plan</span><strong>110 <small>FBTEST</small></strong></div><div><span>Backup needed</span><strong>40 <small>FBTEST</small></strong></div></div><p>If at least 40 of backup is reserved and both backup limits allow it, processing can send one complete payment of 150 to the payee within the payment window. If you have 150 allocated, no backup is used.</p><p>If the full payment cannot be covered, Fallback sends no partial payment. You can add your own money while the payment window is open. At its closing time, an unpaid installment becomes missed and cannot be paid late through that installment.</p></section>

    <section className="about-section" aria-labelledby="about-how"><h2 id="about-how">How to use Fallback</h2><p>Three people have a part to play: the <strong>owner</strong> sets up the plan, the <strong>payee</strong> receives payments, and a <strong>supporter</strong> reserves backup. They use separate accounts.</p><ol className="about-steps">
      <li><h3>Sign in and set up a plan</h3><p>From Home, choose Create plan. Pick the payee, payment amount, number of payments, fixed interval and backup limits. You can save unfinished setup and return to it.</p></li>
      <li><h3>Agree with the people involved</h3><p>Invite the payee to review and accept the exact terms before publishing them. Then invite supporters to review the published plan. Use Requests on Home or the invitation link with the intended account.</p></li>
      <li><h3>Set aside your money and backup</h3><p>The owner adds their money; supporters contribute backup before the funding deadline. Giving permission to use tokens and depositing them are separate steps. Permission alone does not fund the plan. In this version, Need test tokens? lets you get the entered amount in your own account before depositing it.</p></li>
      <li><h3>Start the plan and follow its payments</h3><p>The owner starts it before funding closes, once the minimum backup is met. Scheduled processing attempts complete payments during their agreed windows. Home shows what is next; Activity shows confirmed updates. The owner can add their own money while active.</p></li>
      <li><h3>End the plan and claim what remains</h3><p>The owner can end it early, cancelling unpaid payments. Once all payments are paid, missed or cancelled, the plan can close. Each person then claims their own available return; ending a plan does not automatically send that money back.</p></li>
    </ol></section>

    <section className="about-section" aria-labelledby="about-alternatives"><h2 id="about-alternatives">Why choose it over another way?</h2><p>Choose Fallback when you want support reserved for a specific payment plan, used only for a shortfall, with agreed limits and separate returns. If you just need to send money, a simpler transfer may fit better.</p><div className="about-comparisons">{alternatives.map(option => <section key={option.name} className="about-comparison"><h3>{option.name}</h3><div><p><strong>A good fit when</strong>{option.useful}</p><p><strong>What Fallback adds</strong>{option.difference}</p></div></section>)}</div><p className="subtext">These compare ways of arranging support, rather than every feature of a particular service. Other tools or custom arrangements can reproduce parts of this process.</p></section>

    <section className="about-section" aria-labelledby="about-fit"><h2 id="about-fit">What to know before choosing it</h2><ul className="about-boundaries">
      <li><strong>Backup has limits.</strong> A payment can still be missed if funds or agreed caps cannot cover it. Scheduled processing needs a running service and network access; timing is not guaranteed.</li>
      <li><strong>Active money is locked to the plan.</strong> Supporters cannot withdraw or add backup once it starts. The owner must end the plan to recover remaining allocated money; that cancels unpaid payments.</li>
      <li><strong>The payee must accept the token.</strong> Fallback does not send bank payments, verify external bills or prove a landlord received fiat. Choose another payment method if that is what you need.</li>
      <li><strong>It relies on trust and public payment records.</strong> Addresses, amounts and timing are visible onchain. The app does not verify someone’s need or prevent people from colluding.</li>
    </ul><p>This works best for people who already know one another and want a bounded commitment for recurring support. It creates no repayment obligation or interest for using backup.</p></section>

    <div className="about-cta"><h2>Try a plan with people you know</h2><p>Start with test tokens, read the terms together, and see whether reserved backup fits your arrangement.</p><Link href="/new" prefetch={false} className="button-link">Set up a test plan <ArrowRight size={18} aria-hidden="true" /></Link><Link href="/dashboard" prefetch={false} className="text-action">Open Home</Link></div>
  </article></div></main></>;
}
