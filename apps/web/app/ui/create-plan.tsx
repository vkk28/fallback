'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { addressSchema, draftSchema } from '../../../../packages/domain/src/terms';
import { inputAmount, Terms, zone, type API } from './core';

const initial = { label: '', payee: '', amount: '', firstDue: '', days: '30', count: '3', grace: '48', minimum: '', maximum: '', cap: '', percent: '100' };
type Fields = typeof initial;
type Saved = { fields: Fields; step: number; version: number; updatedAt: string } | null;
const steps = ['Who receives it', 'Amount and schedule', 'Backup limits', 'Review'];
export function PersonPicker({ api, identity, value, onChange, title = 'Person receiving payments', error, inputId = 'person-address' }: { api: API; identity: string; value: string; onChange: (value: string) => void; title?: string; error?: string | undefined; inputId?: string }) {
  const people = useQuery({ queryKey: ['people', identity], queryFn: () => api<{ address: string; displayName: string | null }[]>('people'), staleTime: 60_000 });
  return <div className="person-picker">{people.isPending ? <p role="status">Checking people you have connected with…</p> : people.isError ? <p role="alert">Connected people are unavailable. <button type="button" className="secondary" onClick={() => people.refetch()}>Retry</button></p> : !!people.data.length && <><label htmlFor={`person-${title.replace(/\W+/g, '-').toLowerCase()}`}>{title}</label><select id={`person-${title.replace(/\W+/g, '-').toLowerCase()}`} value={people.data.some(p => p.address === value) ? value : ''} onChange={e => onChange(e.target.value)}><option value="">Choose a connected person</option>{people.data.map(p => <option key={p.address} value={p.address}>{p.displayName || 'Connected person'} · {p.address.slice(0, 6)}…{p.address.slice(-6)}</option>)}</select><p className="field-help">Previously shared plans establish this connection. Check destination details to distinguish similar names.</p></>}
    <details open={!!error || (!!value && !people.data?.some(p => p.address === value))}><summary>Use an account address</summary><label htmlFor={inputId}>Fallback account address</label><input id={inputId} value={value} spellCheck={false} autoCapitalize="none" autoComplete="off" aria-invalid={!!error} aria-describedby={error ? `${inputId}-error` : undefined} onChange={e => onChange(e.target.value.trim())} />{error && <p id={`${inputId}-error`} className="field-error">{error}</p>}<p className="field-help">For someone new, ask for their Fallback destination from Account. Email invitations are not connected yet. Registered invitees can review invitations on Home.</p></details>
  </div>;
}
export function CreatePlan({ api, identity, online }: { api: API; identity: string; online: boolean }) {
  const saved = useQuery({ queryKey: ['setup-draft', identity], queryFn: () => api<Saved>('setup-draft'), refetchOnWindowFocus: false, refetchOnReconnect: false, refetchOnMount: 'always', retry: false });
  if (saved.isPending || saved.isFetching) return <p role="status">Checking for saved setup…</p>;
  if (saved.isError) return <p className="error" role="alert">Saved setup could not be checked. <button className="secondary" onClick={() => saved.refetch()}>Retry</button></p>;
  return <SetupEditor key={`${identity}:${saved.dataUpdatedAt}`} api={api} identity={identity} online={online} seed={saved.data} onReload={() => saved.refetch()} />;
}
function SetupEditor({ api, identity, online, seed, onReload }: { api: API; identity: string; online: boolean; seed: Saved; onReload: () => Promise<unknown> }) {
  const router = useRouter();
  const [fields, setFields] = useState<Fields>(seed?.fields || initial), [step, setStep] = useState(seed?.step || 0), [dirty, setDirty] = useState(false), [status, setStatus] = useState(seed ? 'Saved setup restored. Review it before continuing.' : ''), [error, setError] = useState(''), [errors, setErrors] = useState<Partial<Record<keyof Fields, string>>>({}), [agree, setAgree] = useState(false), [busy, setBusy] = useState(false), [conflict, setConflict] = useState(false);
  const version = useRef(seed?.version || 0), guard = useRef(false), operation = useRef<{ fields: Fields; step: number; version: number; key: string } | null>(null), finishKey = useRef(crypto.randomUUID());
  const form = useRef<HTMLFormElement>(null), heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    const preserve = (e: MouseEvent) => { const target = e.target instanceof Element ? e.target.closest('a[href]') : null; if (target && !target.getAttribute('href')?.startsWith('#')) { e.preventDefault(); e.stopPropagation(); setError('Save your latest setup changes before leaving this page.'); } };
    window.addEventListener('beforeunload', warn); document.addEventListener('click', preserve, true);
    return () => { window.removeEventListener('beforeunload', warn); document.removeEventListener('click', preserve, true); };
  }, [dirty]);
  async function persist(nextStep = step) {
    if (!online || guard.current || conflict) return false;
    guard.current = true; setBusy(true); setError(''); setStatus('Saving progress…');
    if (!operation.current) operation.current = { fields: { ...fields }, step: nextStep, version: version.current, key: crypto.randomUUID() };
    const o = operation.current;
    try {
      const result = await api<{ version: number }>('setup-draft', { fields: o.fields, step: o.step, version: o.version }, o.key);
      version.current = result.version; operation.current = null;
      const currentMatches = JSON.stringify(fields) === JSON.stringify(o.fields) && nextStep === o.step;
      setDirty(!currentMatches); setStatus(currentMatches ? 'Progress saved privately to your account.' : 'Recovered the previous save. Save your latest changes before continuing.');
      return currentMatches;
    } catch (e) { const message = e instanceof Error ? e.message : 'Progress could not be saved.'; setStatus('Progress is not saved. Keep this page open and retry.'); setError(message); if (message.includes('another tab')) setConflict(true); return false; }
    finally { guard.current = false; setBusy(false); }
  }
  useEffect(() => {
    if (!dirty || !online || busy || conflict || error) return;
    const timer = setTimeout(() => { void persist(); }, 4000);
    return () => clearTimeout(timer);
    // Save after an editing pause; every save is versioned and retries the same key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields, step, dirty, online, busy, conflict, error]);
  function update(name: keyof Fields, value: string) { setFields(f => ({ ...f, [name]: value })); setAgree(false); setDirty(true); setError(''); setErrors(e => ({ ...e, [name]: undefined })); finishKey.current = crypto.randomUUID(); }
  function parsed() {
    const first = Math.floor(new Date(fields.firstDue).getTime() / 1000);
    return draftSchema.parse({ label: fields.label, payee: fields.payee, terms: { amount: inputAmount(fields.amount).toString(), firstDue: String(first), interval: String(Number(fields.days) * 86400), count: Number(fields.count), grace: String(Number(fields.grace) * 3600), fundingDeadline: String(first - 86400), minimumReserve: inputAmount(fields.minimum).toString(), maximumReserve: inputAmount(fields.maximum).toString(), perPaymentCap: inputAmount(fields.cap).toString(), coverBps: Number(inputAmount(fields.percent, 2)) } });
  }
  function validate() {
    const found: Partial<Record<keyof Fields, string>> = {};
    if (step === 0) { if (!fields.label.trim() || fields.label.length > 80) found.label = 'Enter a plan name, up to 80 characters.'; if (!addressSchema.safeParse(fields.payee).success) found.payee = 'Choose a person or enter a valid Fallback destination.'; }
    if (step === 1) {
      try { if (inputAmount(fields.amount) <= 0n) throw new Error(); } catch { found.amount = 'Enter a positive FBTEST amount, with up to six decimals.'; }
      const first = new Date(fields.firstDue).getTime();
      if (!Number.isFinite(first) || first - 86400_000 <= Date.now()) found.firstDue = 'Choose a first payment more than a day from now; funding closes one day earlier.';
      if (!Number.isInteger(Number(fields.days)) || Number(fields.days) < 1) found.days = 'Enter a whole number of days, at least one.';
      if (!Number.isInteger(Number(fields.count)) || Number(fields.count) < 1 || Number(fields.count) > 12) found.count = 'Choose between 1 and 12 payments.';
      if (!Number.isInteger(Number(fields.grace)) || Number(fields.grace) < 1 || Number(fields.grace) >= Number(fields.days) * 24) found.grace = 'Use whole hours, shorter than the interval between payments.';
    }
    if (step === 2 || step === 3) {
      for (const name of ['minimum', 'maximum', 'cap'] as const) try { if (inputAmount(fields[name]) <= 0n) throw new Error(); } catch { found[name] = 'Enter a positive amount, with up to six decimals.'; }
      try { const bps = inputAmount(fields.percent, 2); if (bps < 1n || bps > 10000n) throw new Error(); } catch { found.percent = 'Enter a percentage from 0.01 to 100.'; }
      if (!found.minimum && !found.maximum && inputAmount(fields.minimum) > inputAmount(fields.maximum)) found.maximum = 'Total backup must be at least the minimum needed to start.';
      if (!Object.keys(found).length) try { parsed(); } catch { setError('The amount or schedule exceeds supported limits. Go back and review your details.'); return false; }
    }
    setErrors(found);
    if (Object.keys(found).length) { setError('Review the highlighted fields before continuing.'); const first = Object.keys(found)[0]; setTimeout(() => document.getElementById(`setup-${first}`)?.focus() || form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(), 0); return false; }
    return true;
  }
  async function next() { if (!validate()) return; if (await persist(step + 1)) { setStep(s => s + 1); setAgree(false); heading.current?.focus(); } }
  async function finish() {
    if (!agree || !validate() || guard.current) return;
    if (dirty && !await persist()) return;
    guard.current = true; setBusy(true); setError('');
    try { const result = await api<{ id: string }>('setup-finish', { draft: parsed(), version: version.current }, finishKey.current); setDirty(false); router.push(`/plans/${result.id}`); }
    catch (e) { const message = e instanceof Error ? e.message : 'Your draft could not be completed.'; setError(message); if (message.includes('another tab')) setConflict(true); guard.current = false; setBusy(false); }
  }
  const field = (name: keyof Fields, title: string, type = 'text', help?: string) => <div className="field"><label htmlFor={`setup-${name}`}>{title}</label><input id={`setup-${name}`} type={type} value={fields[name]} maxLength={name === 'label' ? 80 : 50} inputMode={['amount', 'minimum', 'maximum', 'cap', 'percent'].includes(name) ? 'decimal' : undefined} aria-invalid={!!errors[name]} aria-describedby={`help-${name}`} onChange={e => update(name, e.target.value)} /><p id={`help-${name}`} className={errors[name] ? 'field-error' : 'field-help'}>{errors[name] || help}</p></div>;
  let reviewed: ReturnType<typeof parsed> | null = null;
  try { reviewed = parsed(); } catch { /* Partial drafts are valid recovery data; complete terms require validation. */ }
  return <section className="flow-card"><Link href="/dashboard" className="text-action">← Home</Link><p className="eyebrow">Create a plan</p><h1 ref={heading} tabIndex={-1}>{steps[step]}</h1><ol className="stepper" aria-label="Setup progress">{steps.map((title, i) => <li key={title} aria-current={i === step ? 'step' : undefined}><span>{i + 1}</span><small>{title}</small></li>)}</ol><p role="status" className="save-status">{!online ? 'Offline. Keep this page open; no action will be queued.' : dirty && !busy ? 'Changes waiting to save…' : status || 'Setup saves privately. No money moves here.'}</p><form ref={form} noValidate onSubmit={e => { e.preventDefault(); if (step === 3) void finish(); else void next(); }}><fieldset disabled={busy || conflict || !online}><legend className="sr-only">{steps[step]}</legend>
    {step === 0 && <>{field('label', 'What is this plan for?', 'text', 'A private label, such as housing payments.')}<PersonPicker api={api} identity={identity} value={fields.payee} error={errors.payee} inputId="setup-payee" onChange={v => update('payee', v)} /><p>The person receiving payments reviews the exact terms before the plan is created.</p></>}
    {step === 1 && <>{field('amount', 'Each payment · FBTEST', 'text', 'Test tokens, no real value. Your money in the plan is used first.')}{field('firstDue', `First payment · ${zone()}`, 'datetime-local')}<label htmlFor="interval-preset">How often?</label><select id="interval-preset" value={['7', '14', '30'].includes(fields.days) ? fields.days : 'custom'} onChange={e => update('days', e.target.value === 'custom' ? '' : e.target.value)}><option value="7">Every 7 days</option><option value="14">Every 14 days</option><option value="30">Every 30 days</option><option value="custom">Another fixed interval</option></select>{!['7', '14', '30'].includes(fields.days) && field('days', 'Days between payments', 'number')}{field('count', 'How many payments? · 1–12', 'number')}<details><summary>Payment window</summary>{field('grace', 'Hours after the due time', 'number', 'A payment cannot be made at or after the exact closing time.')}</details><p>Intervals are fixed days, not calendar months. Funding closes one day before the first payment.</p></>}
    {step === 2 && <>{field('minimum', 'Backup needed to start · FBTEST', 'text', 'The plan cannot start until this much family backup is reserved.')}{field('maximum', 'Total family backup limit · FBTEST')}{field('cap', 'Backup limit for each payment · FBTEST')}{field('percent', 'Maximum percentage of each payment from backup', 'text', 'Both the amount and percentage limit apply.')}<p>These limits can leave a payment unpaid. Money held outside this plan does not affect backup eligibility.</p></>}
    {step === 3 && <><h2>{fields.label}</h2><>{reviewed ? <Terms terms={reviewed.terms} /> : <p className="error" role="alert">This saved setup needs complete, valid details. Go back to review the fields.</p>}</><details><summary>Payment destination</summary><code>{fields.payee}</code></details><label className="check"><input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} />I reviewed these amounts, dates, limits and locks. These terms will require the other person’s acceptance.</label></>}
  </fieldset>{error && <p className="error" role="alert">{error}</p>}{conflict && <button type="button" className="secondary" onClick={() => { void onReload(); }}>Load saved version</button>}<div className="buttons">{step > 0 && <button type="button" className="secondary" disabled={busy || conflict} onClick={() => { setStep(s => s - 1); setAgree(false); setDirty(true); setError(''); }}>Back</button>}<button disabled={busy || !online || conflict || (step === 3 && (!agree || !reviewed))}>{busy ? 'Saving…' : step === 3 ? 'Save details for acceptance' : 'Continue'}</button>{dirty && <button type="button" className="secondary" disabled={busy || !online || conflict} onClick={() => persist()}>Save progress</button>}</div><p className="field-help">Saving details does not submit a payment or request acceptance.</p></form></section>;
}
