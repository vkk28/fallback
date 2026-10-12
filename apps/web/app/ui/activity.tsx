'use client';
import Link from 'next/link';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useState } from 'react';
import type { API } from './core';
export const eventLabels: Record<string, string> = {
  PlanCreated: 'Plan created', Created: 'Plan created', TermsProposed: 'Payment terms requested',
  PayeeAccepted: 'Payment terms accepted', Accepted: 'Payment terms accepted',
  Activated: 'Plan started; agreed funds locked', ShareFrozen: 'Support share fixed when the plan started',
  AllocationChanged: 'Owner’s allocation changed', SupportChanged: 'Family backup contribution changed',
  OwnAdded: 'Money added to the plan', OwnWithdrawn: 'Owner took back money while funding was open',
  SupportAdded: 'Family backup reserved', SupportWithdrawn: 'Support taken back while funding was open',
  Contributed: 'Family backup reserved', PaymentSettled: 'Complete payment confirmed',
  InstallmentMissed: 'Payment missed; no Fallback debt created', InstallmentCancelled: 'Unpaid installment cancelled',
  Closed: 'Plan ended; unused money released for return', Claimed: 'Unused money returned',
  ReceiptReorged: 'Previous receipt removed by a chain reorganization',
};
export function Activity({ api, identity }: { api: API; identity: string }) {
  const [error, setError] = useState('');
  const feed = useInfiniteQuery({ queryKey: ['activity', identity], initialPageParam: '', queryFn: ({ pageParam }) => api<{ items: { id: string; label: string; type: string; verification?: string; planId: string; createdAt: string; readAt: string | null }[]; next: string | null }>(`activity${pageParam ? `?cursor=${encodeURIComponent(pageParam)}` : ''}`), getNextPageParam: p => p.next ?? undefined, staleTime: 30_000 });
  async function acknowledge(id: string) { try { await api('notifications/read', { id }, crypto.randomUUID()); await feed.refetch(); } catch (e) { setError(e instanceof Error ? e.message : 'Could not mark this update read.'); } }
  const rows = feed.data?.pages.flatMap(p => p.items) || [];
  return <section className="reading"><div className="section-head"><div><p className="eyebrow">Plan updates</p><h1>Activity</h1><p>Newest first. Expected payments are shown in each plan’s schedule.</p></div></div>{feed.isPending ? <p role="status">Loading your activity…</p> : feed.isError ? <p role="alert" className="error">Activity could not be loaded. <button className="secondary" onClick={() => feed.refetch()}>Try again</button></p> : !rows.length ? <div className="empty"><h2>No updates yet</h2><p>Confirmed plan updates will appear here. Queued work is never shown as paid.</p></div> : rows.map(n => <article className="activity-row" key={n.id}><div><span className="pill">{n.readAt ? 'Read' : 'Unread'}</span><h2>{n.verification === 'unavailable' ? 'Update awaiting current receipt verification' : eventLabels[n.type] || 'Plan update'}</h2><Link className="text-action" href={`/plans/${n.planId}`}>{n.label} →</Link><p className="subtext">{new Date(n.createdAt).toLocaleString()}</p></div>{!n.readAt && <button className="secondary" onClick={() => acknowledge(n.id)}>Mark read</button>}</article>)}{feed.hasNextPage && <button className="secondary" disabled={feed.isFetchingNextPage} onClick={() => feed.fetchNextPage()}>{feed.isFetchingNextPage ? 'Loading…' : 'Load earlier updates'}</button>}{error && <p role="alert" className="error">{error}</p>}</section>;
}
